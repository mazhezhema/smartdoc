/**
 * File System Access API 封装
 */
import { getExtension, isSupportedFormat } from './utils.js';

let _dirHandle = null;

/** 选择文件夹，返回 dirHandle */
export async function pickDirectory() {
  _dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
  return _dirHandle;
}

/** 获取当前 dirHandle */
export function getDirHandle() {
  return _dirHandle;
}

/** 设置 dirHandle（用于测试） */
export function setDirHandle(handle) {
  _dirHandle = handle;
}

/** 列举目录下支持的电子书文件，返回 { name, ext, handle }[] */
export async function listFiles(dirHandle) {
  const files = [];
  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind !== 'file') continue;
    const ext = getExtension(name);
    if (isSupportedFormat(ext)) {
      files.push({ name, ext, handle });
    }
  }
  return files.sort((a, b) => a.name.localeCompare(b.name));
}

/** 读取文件内容，返回 File 对象 */
export async function readFile(fileHandle) {
  return await fileHandle.getFile();
}

/** 保存文件到当前目录 */
export async function saveFile(dirHandle, name, blob) {
  const handle = await dirHandle.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
}

/** 删除文件 */
export async function removeFile(dirHandle, name) {
  await dirHandle.removeEntry(name);
}
