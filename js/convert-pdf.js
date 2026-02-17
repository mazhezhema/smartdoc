/**
 * PDF 转换（依赖 PDF.js CDN，全局 pdfjsLib）
 */
import { textToIntermediate } from './intermediate.js';

/** PDF File → 纯文本 */
export async function pdfToText(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    const lines = content.items
      .sort(
        (a, b) =>
          b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4]
      )
      .map(item => item.str);

    fullText += lines.join(' ') + '\n\n';
  }

  return fullText;
}

/** PDF File → 中间表示 */
export async function pdfToIntermediate(file) {
  const text = await pdfToText(file);
  const title = file.name.replace(/\.pdf$/i, '');
  return textToIntermediate(text, title);
}
