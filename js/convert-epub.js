/**
 * EPUB 解析与生成（依赖 JSZip CDN，全局 JSZip）
 */
import { escapeHtml } from './utils.js';
import { textToIntermediate } from './intermediate.js';

/* ========== EPUB → 中间表示 ========== */

/** 解析 EPUB 文件 → 中间表示 */
export async function epubToIntermediate(file) {
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

  // 读 container.xml 找到 OPF 路径
  const containerXml = await zip.file('META-INF/container.xml')?.async('string');
  if (!containerXml) throw new Error('Invalid EPUB: missing container.xml');

  const opfPathMatch = containerXml.match(/full-path="([^"]+)"/);
  const opfPath = opfPathMatch ? opfPathMatch[1] : '';
  const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

  // 读 OPF
  const opfContent = opfPath ? await zip.file(opfPath)?.async('string') : null;

  // 提取标题
  let title = file.name.replace(/\.epub$/i, '');
  if (opfContent) {
    const titleMatch = opfContent.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i);
    if (titleMatch) title = titleMatch[1].trim();
  }

  // 解析 spine → manifest → 按顺序读取 XHTML
  let htmlFiles = [];
  if (opfContent) {
    const manifestItems = {};
    const manifestRegex = /<item\s+[^>]*id="([^"]+)"[^>]*href="([^"]+)"[^>]*media-type="([^"]+)"[^>]*/gi;
    let m;
    while ((m = manifestRegex.exec(opfContent)) !== null) {
      manifestItems[m[1]] = { href: m[2], type: m[3] };
    }
    // 也处理 href 在 id 前面的情况
    const manifestRegex2 = /<item\s+[^>]*href="([^"]+)"[^>]*id="([^"]+)"[^>]*media-type="([^"]+)"[^>]*/gi;
    while ((m = manifestRegex2.exec(opfContent)) !== null) {
      if (!manifestItems[m[2]]) manifestItems[m[2]] = { href: m[1], type: m[3] };
    }

    const spineRegex = /<itemref\s+idref="([^"]+)"/gi;
    while ((m = spineRegex.exec(opfContent)) !== null) {
      const item = manifestItems[m[1]];
      if (item && (item.type.includes('html') || item.type.includes('xml'))) {
        htmlFiles.push(opfDir + item.href);
      }
    }
  }

  // 若 spine 解析失败，回退到直接找 xhtml/html
  if (!htmlFiles.length) {
    zip.forEach((path) => {
      if (/\.(xhtml|html|htm)$/i.test(path)) htmlFiles.push(path);
    });
    htmlFiles.sort();
  }

  // 读取每个 HTML 文件并提取文本
  let allText = '';
  for (const path of htmlFiles) {
    const content = await zip.file(path)?.async('string');
    if (!content) continue;
    const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const bodyHtml = bodyMatch ? bodyMatch[1] : content;
    const text = bodyHtml.replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    allText += text + '\n\n';
  }

  return textToIntermediate(allText, title);
}

/* ========== 中间表示 → EPUB ========== */

/** 中间表示 → EPUB Blob */
export async function intermediateToEpub(intermediate) {
  const zip = new JSZip();
  const { title, sections } = intermediate;

  // mimetype（EPUB 规范要求第一个、无压缩）
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // container.xml
  zip.folder('META-INF').file('container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

  // 生成 body HTML
  const bodyHtml = sections
    .map(s => {
      const safe = escapeHtml(s.text);
      return s.type === 'heading' ? `<h2>${safe}</h2>` : `<p>${safe}</p>`;
    })
    .join('\n');

  const safeTitle = escapeHtml(title);

  // content.xhtml
  zip.folder('OEBPS').file('content.xhtml',
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${safeTitle}</title></head>
<body>
<h1>${safeTitle}</h1>
${bodyHtml}
</body>
</html>`);

  // content.opf（最小 OPF）
  zip.folder('OEBPS').file('content.opf',
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${safeTitle}</dc:title>
    <dc:language>zh</dc:language>
    <dc:identifier id="uid">urn:uuid:${crypto.randomUUID()}</dc:identifier>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta>
  </metadata>
  <manifest>
    <item id="content" href="content.xhtml" media-type="application/xhtml+xml"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
  </manifest>
  <spine>
    <itemref idref="content"/>
  </spine>
</package>`);

  // nav.xhtml（最小导航）
  zip.folder('OEBPS').file('nav.xhtml',
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Navigation</title></head>
<body>
<nav epub:type="toc">
  <ol><li><a href="content.xhtml">${safeTitle}</a></li></ol>
</nav>
</body>
</html>`);

  return await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
}
