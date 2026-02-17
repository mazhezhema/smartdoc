# SmartDoc - 电子书格式互转 WebApp

一站式电子书格式转换工具，支持 **PDF / EPUB / TXT / MOBI / AZW3** 全格式互转。

## 功能特性

- ✅ 选择本地文件夹，批量处理同类型文件
- ✅ 转换完成后自动替换原文件（删除旧格式，保存新格式）
- ✅ PDF / EPUB / TXT 互转（纯前端，无需上传）
- ✅ MOBI / AZW3 转换（通过 CloudConvert API）
- ✅ 可选：大模型增强（文本清洗与结构化）

## 支持的格式转换

| 源格式 | 目标格式 | 实现方式 |
|--------|----------|----------|
| PDF    | EPUB / TXT | 前端（PDF.js） |
| EPUB   | TXT / PDF | 前端（JSZip） |
| TXT    | EPUB / PDF | 前端 |
| 任意格式 | MOBI / AZW3 | 后端（CloudConvert） |
| MOBI / AZW3 | EPUB / TXT / PDF | 后端（CloudConvert） |

## 技术栈

- **前端**：原生 JS（ES Modules）+ Tailwind CSS
- **后端**：Vercel Serverless Functions
- **依赖**：PDF.js、JSZip（CDN）；cloudconvert（Node）
- **部署**：GitHub + Vercel

## 快速开始

### 1. 部署到 Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/你的用户名/smartdoc)

1. Fork 或克隆本仓库到你的 GitHub
2. 在 Vercel 导入该项目
3. 配置环境变量（见下）

### 2. 配置环境变量

在 Vercel 项目的 **Settings → Environment Variables** 中添加：

#### 必须配置（转换 MOBI/AZW3 需要）

- `CLOUDCONVERT_API_KEY`：在 [CloudConvert](https://cloudconvert.com/dashboard/api/v2/keys) 创建

#### 可选配置（大模型增强）

- `GOOGLE_GEMINI_API_KEY`：[获取](https://makersuite.google.com/app/apikey)
- `DASHSCOPE_API_KEY`：[获取](https://dashscope.console.aliyun.com/apiKey)（通义千问）
- `DEEPSEEK_API_KEY`：[获取](https://platform.deepseek.com/api_keys)
- `OPENAI_API_KEY`：[获取](https://platform.openai.com/api-keys)

### 3. 本地开发

```bash
# 安装依赖
npm install

# 运行测试
npm test

# 本地开发服务器（仅静态，API 需 vercel dev）
npx serve .

# 或用 Vercel CLI 测试 API
npx vercel dev
```

## 使用说明

1. 打开网站，点击「**选择文件夹**」
2. 选择一个包含电子书文件的本地文件夹
3. 勾选要转换的文件（可多选同类型）
4. 选择**目标格式**
5. 点击「**开始转换**」
6. 转换成功后，新格式文件会保存到同一文件夹，原文件会被删除

## 注意事项

- **浏览器支持**：需要支持 File System Access API（推荐 Chrome / Edge）
- **PDF 限制**：仅支持非扫描版 PDF（含文本层）
- **MOBI/AZW3**：转换需要网络调用后端 API
- **数据安全**：所有文件处理在本地或加密传输，不会保存到服务器

## 项目结构

```
├── index.html          # 单页入口
├── js/                 # 前端模块
│   ├── app.js          # 主入口
│   ├── fs.js           # 文件系统操作
│   ├── converters.js   # 转换路由
│   ├── convert-*.js    # 各格式转换器
│   └── utils.js        # 工具函数
├── api/                # Vercel Serverless
│   ├── convert.js      # CloudConvert 代理
│   └── llm.js          # 大模型代理（可选）
├── tests/              # 单元测试
└── docs/               # 文档（PRD、UI、架构、TDD）
```

## 开发文档

- [PRD - 产品需求文档](docs/PRD.md)
- [UI 设计说明](docs/UI.md)
- [架构说明](docs/ARCHITECTURE.md)
- [TDD 测试策略](docs/TDD.md)

## License

MIT
