/**
 * 后端转换：前端将文件上传到 /api/convert，获取转换结果
 * 用于 → MOBI/AZW3 等需要 CloudConvert 的格式
 */

/**
 * 通过后端 API 转换文件
 * @param {File|Blob} file - 源文件
 * @param {string} inputFormat - 源格式（如 'epub'）
 * @param {string} outputFormat - 目标格式（如 'mobi'）
 * @returns {Promise<Blob>} 转换后的 Blob
 */
export async function convertViaBackend(file, inputFormat, outputFormat) {
  const arrayBuffer = await file.arrayBuffer();
  const base64 = btoa(
    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );

  const response = await fetch('/api/convert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileBase64: base64,
      filename: file.name || `input.${inputFormat}`,
      inputFormat,
      outputFormat,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err.error || `Conversion failed: ${response.status}`);
  }

  return await response.blob();
}
