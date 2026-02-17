/**
 * 转换路由：根据源格式和目标格式分派到对应转换函数
 */
import { needsBackend } from './utils.js';
import { pdfToIntermediate } from './convert-pdf.js';
import { epubToIntermediate, intermediateToEpub } from './convert-epub.js';
import { txtToIntermediate, intermediateToTxt } from './convert-txt.js';
import { convertViaBackend } from './convert-backend.js';

/** 源格式 → 中间表示 */
const toIntermediate = {
  pdf: pdfToIntermediate,
  epub: epubToIntermediate,
  txt: txtToIntermediate,
};

/** 中间表示 → 目标格式 Blob（前端可完成的） */
const fromIntermediate = {
  epub: intermediateToEpub,
  txt: intermediateToTxt,
};

/**
 * 转换单个文件
 * @param {File} file - 源文件对象
 * @param {string} sourceExt - 源文件扩展名
 * @param {string} targetFormat - 目标格式
 * @returns {Promise<Blob>} 转换后的 Blob
 */
export async function convertFile(file, sourceExt, targetFormat) {
  const src = sourceExt.toLowerCase();
  const tgt = targetFormat.toLowerCase();

  if (src === tgt) throw new Error('源格式与目标格式相同');

  // 情况 1：目标是 MOBI/AZW3 → 需要后端
  if (needsBackend(tgt)) {
    // 先在前端转成 EPUB（CloudConvert 接受 EPUB 转 MOBI/AZW3 效果好）
    // 若源已是 EPUB 则直接发；否则先转 EPUB
    let epubFile = file;
    if (src !== 'epub') {
      const parser = toIntermediate[src];
      if (!parser) throw new Error(`不支持从 ${src} 读取`);
      const intermediate = await parser(file);
      const epubBlob = await intermediateToEpub(intermediate);
      epubFile = new File([epubBlob], file.name.replace(/\.[^.]+$/, '.epub'), { type: 'application/epub+zip' });
    }
    return await convertViaBackend(epubFile, 'epub', tgt);
  }

  // 情况 2：源是 MOBI/AZW3 但目标不需要后端 → 前端暂不支持解析 MOBI/AZW3
  // TODO: 集成 foliate-js 解析 MOBI/AZW3
  if (src === 'mobi' || src === 'azw3') {
    // 回退：发给后端先转 EPUB，再前端处理
    const epubBlob = await convertViaBackend(file, src, 'epub');
    if (tgt === 'epub') return epubBlob;
    const epubFile = new File([epubBlob], 'temp.epub', { type: 'application/epub+zip' });
    const intermediate = await epubToIntermediate(epubFile);
    const builder = fromIntermediate[tgt];
    if (!builder) throw new Error(`不支持输出为 ${tgt}`);
    return await builder(intermediate);
  }

  // 情况 3：前端可完成（PDF/EPUB/TXT 互转，目标为 EPUB 或 TXT）
  const parser = toIntermediate[src];
  if (!parser) throw new Error(`不支持从 ${src} 读取`);
  const intermediate = await parser(file);

  const builder = fromIntermediate[tgt];
  if (builder) return await builder(intermediate);

  // 情况 4：目标为 PDF → 暂不支持前端生成 PDF（需 jsPDF，后续可加）
  if (tgt === 'pdf') {
    throw new Error('前端暂不支持生成 PDF，后续版本会加入');
  }

  throw new Error(`不支持 ${src} → ${tgt}`);
}
