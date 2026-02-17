# SmartDoc 架构说明

## 1. 目录结构

```
smartdoc/
├── index.html              # 单页入口，引入 js/css
├── css/
│   └── app.css             # 全局样式（可选，或内联在 index）
├── js/
│   ├── app.js              # 入口：初始化、事件绑定
│   ├── fs.js                # File System Access：选目录、列举、写、删
│   ├── converters.js        # 转换路由 + 各格式 → 中间表示 / 中间表示 → 格式
│   ├── convert-pdf.js       # PDF → 文本（PDF.js）
│   ├── convert-epub.js      # EPUB 解析与生成（JSZip）
│   ├── convert-txt.js       # TXT 读写与中间表示
│   └── convert-mobi-azw3.js # MOBI/AZW3 读（foliate-js 或等效）、调用 /api/convert
├── api/
│   ├── convert.js           # Vercel Serverless：转发 CloudConvert（HTML/EPUB/PDF → MOBI/AZW3 等）
│   └── llm.js               # Vercel Serverless：多 provider 大模型代理（可选）
├── docs/
│   ├── PRD.md
│   ├── UI.md
│   ├── ARCHITECTURE.md
│   └── TDD.md
├── vercel.json              # 可选：静态 + api 路由
└── .env.example             # 需配置的 Key 说明，不提交 .env
```

## 2. 数据流

- **中间表示**：`{ title: string, sections: { type: 'heading'|'paragraph', text: string }[] }`，所有「读」格式产出、所有「写」格式消费（除直接二进制转发）。
- **前端**：选目录 → 列举文件 → 用户选文件 + 目标格式 → 对每个文件：若目标为 PDF/EPUB/TXT 则前端转换并写回+删原文件；若目标为 MOBI/AZW3 或源为 MOBI/AZW3 需后端则调 `/api/convert` 或前端解析（读）后写 EPUB/TXT/PDF。

## 3. API 约定

### POST /api/convert

- **Request**：`multipart/form-data` 或 `application/json`（base64 文件）。
  - `file`: 文件（或 `inputFormat`, `outputFormat`, `content` base64）
  - `outputFormat`: `mobi` | `azw3` | `epub`（当输入为 mobi/azw3 时）
- **Response**：转换后的文件流（Content-Disposition attachment）或 JSON 错误。
- **实现**：Vercel 接收文件，调用 CloudConvert API，流式返回结果。

### POST /api/llm（可选）

- **Request**：`{ provider, model, messages }` 或 `{ provider, model, text, systemPrompt }`。
- **Response**：模型输出文本或流。
- **实现**：按 provider 读 env 中的 Key，请求对应厂商 API。

## 4. 前端模块职责

- **fs.js**：`pickDirectory()`、`listFiles(dirHandle)`、`saveFile(name, blob)`、`removeFile(name)`。
- **converters.js**：`getConverter(sourceExt, targetFormat)` 返回 async (file) => blob；内部区分前端可完成 vs 需调 `/api/convert`。
- **convert-pdf.js**：`pdfToText(file)` → string；依赖 PDF.js。
- **convert-epub.js**：`epubToIntermediate(file)`、`intermediateToEpub(intermediate)`；依赖 JSZip。
- **convert-txt.js**：`txtToIntermediate(file)`、`intermediateToTxt(intermediate)`。
- **convert-mobi-azw3.js**：读：解析为 intermediate（foliate-js 或手动）；写：通过 `fetch('/api/convert', …)` 上传并取回 blob。
