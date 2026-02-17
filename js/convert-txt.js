/**
 * TXT 转换
 */
import { textToIntermediate, intermediateToText } from './intermediate.js';

/** TXT File → 中间表示 */
export async function txtToIntermediate(file) {
  const text = await file.text();
  const title = file.name.replace(/\.txt$/i, '');
  return textToIntermediate(text, title);
}

/** 中间表示 → TXT Blob */
export function intermediateToTxt(intermediate) {
  const text = intermediateToText(intermediate);
  return new Blob([text], { type: 'text/plain;charset=utf-8' });
}
