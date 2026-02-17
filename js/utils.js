/**
 * 工具函数
 */

/** 获取文件扩展名（小写，不含点） */
export function getExtension(filename) {
  const m = filename.match(/\.([^.]+)$/);
  return m ? m[1].toLowerCase() : '';
}

/** 支持的格式列表 */
export const SUPPORTED_FORMATS = ['pdf', 'epub', 'txt', 'mobi', 'azw3'];

/** 判断是否为支持的格式 */
export function isSupportedFormat(ext) {
  return SUPPORTED_FORMATS.includes(ext.toLowerCase());
}

/** 需要后端（CloudConvert）的目标格式 */
export const BACKEND_OUTPUT_FORMATS = ['mobi', 'azw3'];

/** 判断目标格式是否需要后端 */
export function needsBackend(outputFormat) {
  return BACKEND_OUTPUT_FORMATS.includes(outputFormat.toLowerCase());
}

/** HTML 转义（防 XSS） */
export function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 根据文件名去掉扩展名得到基础名 */
export function baseName(filename) {
  return filename.replace(/\.[^.]+$/, '');
}
