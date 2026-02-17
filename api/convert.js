import CloudConvert from 'cloudconvert';

const ALLOWED_INPUT = ['pdf', 'epub', 'txt', 'html', 'mobi', 'azw3'];
const ALLOWED_OUTPUT = ['pdf', 'epub', 'txt', 'mobi', 'azw3'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const key = process.env.CLOUDCONVERT_API_KEY;
  if (!key) {
    return res.status(503).json({ error: 'CLOUDCONVERT_API_KEY not configured' });
  }

  const { fileBase64, filename = 'input', inputFormat: rawInput, outputFormat: rawOutput } = req.body || {};

  if (!fileBase64) {
    return res.status(400).json({ error: 'Missing fileBase64 in request body' });
  }

  const inputFormat = (rawInput || filename.split('.').pop() || '').toLowerCase();
  const outputFormat = (rawOutput || '').toLowerCase();

  if (!ALLOWED_INPUT.includes(inputFormat)) {
    return res.status(400).json({ error: `Unsupported input: ${inputFormat}. Allowed: ${ALLOWED_INPUT.join(', ')}` });
  }
  if (!ALLOWED_OUTPUT.includes(outputFormat)) {
    return res.status(400).json({ error: `Unsupported output: ${outputFormat}. Allowed: ${ALLOWED_OUTPUT.join(', ')}` });
  }

  const fileBuffer = Buffer.from(fileBase64, 'base64');
  const outFilename = filename.replace(/\.[^.]+$/, '') + '.' + outputFormat;

  const cloudConvert = new CloudConvert(key);

  try {
    // 创建 Job: upload → convert → export/url
    let job = await cloudConvert.jobs.create({
      tasks: {
        'upload': { operation: 'import/upload' },
        'convert': {
          operation: 'convert',
          input: 'upload',
          input_format: inputFormat,
          output_format: outputFormat,
          filename: outFilename,
        },
        'export': {
          operation: 'export/url',
          input: 'convert',
        },
      },
    });

    // 上传文件
    const uploadTask = job.tasks.find(t => t.name === 'upload');
    const { Readable } = await import('stream');
    const inputStream = Readable.from(fileBuffer);
    await cloudConvert.tasks.upload(uploadTask, inputStream, filename);

    // 等待完成
    job = await cloudConvert.jobs.wait(job.id);

    if (job.status !== 'finished') {
      const errTask = job.tasks?.find(t => t.status === 'error');
      return res.status(502).json({ error: errTask?.message || 'Conversion failed' });
    }

    // 下载结果
    const exportTask = job.tasks.find(t => t.name === 'export');
    const fileUrl = exportTask?.result?.files?.[0]?.url;
    if (!fileUrl) {
      return res.status(502).json({ error: 'No output file URL from CloudConvert' });
    }

    const fileRes = await fetch(fileUrl);
    if (!fileRes.ok) {
      return res.status(502).json({ error: 'Failed to download converted file' });
    }

    const resultBuffer = Buffer.from(await fileRes.arrayBuffer());
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(outFilename)}"`);
    return res.send(resultBuffer);
  } catch (e) {
    console.error('CloudConvert error:', e);
    return res.status(500).json({ error: e.message || 'Internal conversion error' });
  }
}
