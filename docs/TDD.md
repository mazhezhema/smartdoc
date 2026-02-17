# SmartDoc TDD 测试策略与用例

## 1. 测试分层

- **单元测试**：纯函数（中间表示 ↔ 文本/HTML、转义、扩展名判断）；在 Node 或浏览器 test runner 中跑。
- **集成测试**：转换管线（给定 Blob/ArrayBuffer，执行 converter，断言输出类型与基本内容）；可 mock File System 与 fetch。
- **E2E（可选）**：Playwright 等，需真实浏览器支持 File System Access API，且需用户授权目录，自动化成本高；一期可主要依赖手动验证。

## 2. 单元测试用例（核心逻辑）

- **扩展名与格式**
  - `getExtension("a.pdf") === "pdf"`；`getExtension("a.epub") === "epub"`。
  - `isSupportedFormat("pdf") === true`；`isSupportedFormat("doc") === false`。
- **中间表示**
  - `textToSections("标题\n\n段落")` 返回 `[{ type: 'heading', text: '标题' }, { type: 'paragraph', text: '段落' }]`（规则可简化：短行=标题）。
  - `sectionsToHtml(sections)` 输出合法 HTML 且对文本做转义（如 `<` → `&lt;`）。
- **EPUB 生成**
  - `intermediateToEpubBlob({ title: "Test", sections: [...] })` 返回 Blob，type 可检查；解压后含 mimetype、META-INF/container.xml、OEBPS 下 content。

## 3. 集成测试（转换管线）

- **PDF → 文本**：给定一个小型 PDF（非扫描）的 ArrayBuffer，`pdfToText(file)` 返回非空字符串。
- **文本 → EPUB**：`intermediateToEpubBlob(intermediate)` 再解析 zip，能读到 content 中对应标题与段落。
- **API /api/convert**：给定一个小 EPUB 的 multipart 请求，`outputFormat=mobi`，响应 200，Content-Type 为 application/octet-stream 或 mobi；或 mock CloudConvert 返回固定 blob，断言前端收到后可保存。

## 4. 回归检查清单（发布前）

- [ ] 选择文件夹后列表正确显示支持的格式文件。
- [ ] 只选 PDF、目标 EPUB：转换成功，同目录生成 .epub，原 .pdf 删除。
- [ ] 只选 EPUB、目标 MOBI：调 /api/convert 成功，生成 .mobi，原 .epub 删除。
- [ ] 选一个文件转换失败（如损坏 PDF）：该任务标记失败，原文件不删，其余任务继续。
- [ ] 转换中「开始转换」禁用；转换完成后可再次转换。
- [ ] 目标格式与源相同不可选或「开始转换」禁用。
- [ ] 替换前确认（若实现）：点击「开始转换」弹出确认，取消则不执行。

## 5. 测试运行方式

- 单元/集成：使用 **Vitest** 或 **Jest** 在 Node 环境跑；浏览器相关用 jsdom 或 happy-dom；需 mock `pdfjsLib`、`JSZip`、`fetch`。
- 命令：`npm test`（在 package.json 中配置 scripts.test）。
