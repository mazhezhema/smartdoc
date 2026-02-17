/**
 * SmartDoc 主入口：UI 事件绑定与任务队列
 */
import { getExtension, baseName, SUPPORTED_FORMATS, needsBackend } from './utils.js';
import { pickDirectory, listFiles, readFile, saveFile, removeFile } from './fs.js';
import { convertFile } from './converters.js';

let dirHandle = null;
let fileEntries = [];   // { name, ext, handle, selected }[]
let isProcessing = false;

const $ = (id) => document.getElementById(id);

/* ========== DOM 元素 ========== */
const elPickDir = $('pickDir');
const elDirName = $('dirName');
const elTargetFormat = $('targetFormat');
const elFilterBtns = $('filterBtns');
const elFileList = $('fileList');
const elStartBtn = $('startBtn');
const elTaskList = $('taskList');
const elSelectAll = $('selectAll');

/* ========== 选择文件夹 ========== */
elPickDir.addEventListener('click', async () => {
  try {
    dirHandle = await pickDirectory();
    elDirName.textContent = dirHandle.name;
    await refreshFileList();
  } catch (e) {
    if (e.name !== 'AbortError') console.error(e);
  }
});

/* ========== 刷新文件列表 ========== */
async function refreshFileList() {
  fileEntries = (await listFiles(dirHandle)).map(f => ({ ...f, selected: false, status: '' }));
  renderFileList();
  renderFilterButtons();
  updateTargetOptions();
  updateStartBtn();
}

/* ========== 筛选按钮 ========== */
function renderFilterButtons() {
  const types = [...new Set(fileEntries.map(f => f.ext))];
  elFilterBtns.innerHTML = `<button class="filter-btn active" data-filter="all">全部 (${fileEntries.length})</button>` +
    types.map(t => {
      const count = fileEntries.filter(f => f.ext === t).length;
      return `<button class="filter-btn" data-filter="${t}">${t.toUpperCase()} (${count})</button>`;
    }).join('');

  elFilterBtns.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      elFilterBtns.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderFileList(btn.dataset.filter);
    });
  });
}

let currentFilter = 'all';

/* ========== 渲染文件列表 ========== */
function renderFileList(filter = 'all') {
  currentFilter = filter;
  const visible = filter === 'all' ? fileEntries : fileEntries.filter(f => f.ext === filter);

  if (!visible.length) {
    elFileList.innerHTML = '<p class="empty-msg">该文件夹下无支持的电子书文件</p>';
    return;
  }

  elFileList.innerHTML = visible.map((f, _) => {
    const idx = fileEntries.indexOf(f);
    const statusHtml = f.status ? `<span class="status status-${f.status}">${statusLabel(f.status)}</span>` : '';
    return `<label class="file-row" data-idx="${idx}">
      <input type="checkbox" ${f.selected ? 'checked' : ''} ${isProcessing ? 'disabled' : ''} />
      <span class="file-name">${f.name}</span>
      <span class="file-ext">${f.ext.toUpperCase()}</span>
      ${statusHtml}
    </label>`;
  }).join('');

  elFileList.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const row = e.target.closest('.file-row');
      const idx = parseInt(row.dataset.idx);
      fileEntries[idx].selected = e.target.checked;
      updateTargetOptions();
      updateStartBtn();
    });
  });

  // 更新全选状态
  const allSelected = visible.length > 0 && visible.every(f => f.selected);
  elSelectAll.checked = allSelected;
}

function statusLabel(s) {
  const map = { waiting: '等待中', converting: '转换中…', success: '已替换', error: '失败' };
  return map[s] || s;
}

/* ========== 全选 ========== */
elSelectAll.addEventListener('change', (e) => {
  const checked = e.target.checked;
  const visible = currentFilter === 'all' ? fileEntries : fileEntries.filter(f => f.ext === currentFilter);
  visible.forEach(f => f.selected = checked);
  renderFileList(currentFilter);
  updateTargetOptions();
  updateStartBtn();
});

/* ========== 目标格式下拉 ========== */
function updateTargetOptions() {
  const currentVal = elTargetFormat.value; // 记录当前选中的值
  const selected = fileEntries.filter(f => f.selected);
  const sourceTypes = [...new Set(selected.map(f => f.ext))];
  const options = SUPPORTED_FORMATS.filter(fmt => !sourceTypes.includes(fmt));

  elTargetFormat.innerHTML = options.map(fmt =>
    `<option value="${fmt}">${fmt.toUpperCase()}</option>`
  ).join('');
  
  // 如果之前选中的值在新列表中依然存在，则保持选中；否则选中第一个
  if (currentVal && options.includes(currentVal)) {
    elTargetFormat.value = currentVal;
  }
}

elTargetFormat.addEventListener('change', updateStartBtn);

/* ========== 开始转换按钮 ========== */
function updateStartBtn() {
  // updateTargetOptions(); // 移除此行，避免死循环重置
  const selected = fileEntries.filter(f => f.selected);
  const hasTarget = elTargetFormat.value;
  elStartBtn.disabled = isProcessing || !selected.length || !hasTarget;
  elStartBtn.textContent = isProcessing ? '转换中…' : `开始转换 (${selected.length} 个文件)`;
}

/* ========== 执行转换 ========== */
elStartBtn.addEventListener('click', async () => {
  const selected = fileEntries.filter(f => f.selected);
  const targetFormat = elTargetFormat.value;

  if (!selected.length || !targetFormat) return;

  const confirmed = confirm(`将转换 ${selected.length} 个文件为 ${targetFormat.toUpperCase()}，转换成功后删除原文件。是否继续？`);
  if (!confirmed) return;

  isProcessing = true;
  elPickDir.disabled = true;
  updateStartBtn();

  // 标记等待
  selected.forEach(f => f.status = 'waiting');
  renderFileList(currentFilter);

  // 逐文件转换
  for (const entry of selected) {
    entry.status = 'converting';
    renderFileList(currentFilter);

    try {
      const file = await readFile(entry.handle);
      const blob = await convertFile(file, entry.ext, targetFormat);
      const newName = baseName(entry.name) + '.' + targetFormat;

      await saveFile(dirHandle, newName, blob);
      await removeFile(dirHandle, entry.name);

      entry.status = 'success';
      entry.name = newName;
      entry.ext = targetFormat;
    } catch (e) {
      console.error(`转换失败: ${entry.name}`, e);
      entry.status = 'error';
      entry.errorMsg = e.message;
    }

    renderFileList(currentFilter);
  }

  isProcessing = false;
  elPickDir.disabled = false;
  updateTargetOptions();
  updateStartBtn();
  renderFilterButtons();
});

/* ========== 初始化 ========== */
updateTargetOptions();
updateStartBtn();
