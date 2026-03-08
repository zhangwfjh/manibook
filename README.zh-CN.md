# ManiBook

[English](README.md) | [简体中文](README.zh-CN.md)

**ManiBook**（**Many Books** 的缩写，意为"管理多本书籍"）是一款现代化的桌面应用程序，用于管理您的数字图书库。基于 Tauri 2.x 和 Next.js 16 构建，在 Windows、macOS 和 Linux 上提供快速的原生体验。

## 功能特性

### AI 驱动的元数据提取

ManiBook 利用 AI（通过 OpenAI 兼容 API）自动提取和填充书籍元数据，无需手动录入：

- **自动元数据提取** - 标题、作者、出版社、出版年份、语言、关键词和摘要
- **智能文档分类** - 自动将文档分类为书籍、论文、报告、手册或其他
- **层级分类推断** - 智能分类（如"计算机科学 > 人工智能"）
- **扫描文档 OCR** - 从扫描 PDF 的图像中提取文字

### 关键词与标签系统

- **基于关键词的组织** - 为文档分配多个关键词，实现灵活分类
- **标签搜索** - 使用关键词筛选和查找书籍
- **自动提取关键词** - AI 在导入时自动提取相关关键词

### 多格式支持

- **PDF** - 使用 PDFium 渲染引擎全面支持
- **EPUB** - 电子书格式支持
- **DJVU** - 扫描文档格式支持
- **封面提取** - 从文档自动生成封面图像

### 图书库管理

- **多图书库支持** - 为不同收藏创建和管理独立的图书库
- **层级分类** - 按文档类型和分类组织书籍
- **自动文件组织** - 文件按文档类型/分类/标题自动整理
- **收藏夹** - 标记常用书籍以便快速访问

### 高级搜索与筛选

- **全文搜索** - 搜索标题、作者、关键词、出版社和摘要
- **多维度筛选** - 按格式、作者、出版社、语言、关键词筛选
- **收藏夹筛选** - 快速访问已标记的书籍
- **可排序结果** - 按标题、作者、日期、页数、文件大小等排序

### 现代化界面

- **原生性能** - 基于 Tauri 构建，提供轻量级的原生桌面体验
- **简洁界面** - 使用 shadcn/ui 和 Tailwind CSS 构建的现代化设计
- **深色/浅色主题** - 内置主题支持
- **国际化** - 通过 next-intl 支持多语言

## 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | Next.js 16 (App Router) / React 19 / TypeScript |
| **桌面端** | Tauri 2.x (Rust 后端) |
| **样式** | Tailwind CSS 4 / shadcn/ui |
| **状态管理** | Zustand |
| **国际化** | next-intl |
| **PDF 处理** | PDFium |
| **EPUB** | epub-parser |

## 环境要求

- [Node.js](https://nodejs.org/) (LTS 版本)
- [Rust](https://rustup.rs/) (1.77.2+)
- [Bun](https://bun.sh/) (推荐的包管理器)

### 平台特定要求

**Linux (Debian/Ubuntu):**

```bash
sudo apt-get update
sudo apt-get install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
```

**macOS:**

- Xcode 命令行工具: `xcode-select --install`

**Windows:**

- [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- Microsoft Edge WebView2 (通常 Windows 10/11 已预装)

## 快速开始

### 1. 克隆仓库

```bash
git clone <repository-url>
cd manibook
```

### 2. 安装依赖

```bash
bun install
```

### 3. 下载 PDFium 二进制文件

```bash
# Linux/macOS
./scripts/download-pdfium.sh

# Windows (Git Bash 或 WSL)
bash ./scripts/download-pdfium.sh
```

### 4. 启动开发环境

```bash
# 启动 Next.js 开发服务器
bun run dev

# 或启动完整的 Tauri 桌面应用
bun run tauri:dev
```

### 5. 配置 AI（可选但推荐）

要启用 AI 驱动的元数据提取功能，请在应用设置中配置 LLM 提供商：

1. 打开应用，进入 **设置 > LLM**
2. 添加 OpenAI 兼容提供商的 API 密钥
3. 选择以下功能的模型：
   - **元数据提取** - 用于提取书籍元数据
   - **图像文字提取** - 用于扫描文档的 OCR

支持的提供商包括 OpenAI、Azure OpenAI、Ollama 以及任何兼容 OpenAI API 的服务。

## 可用脚本

| 命令 | 描述 |
|------|------|
| `bun run dev` | 启动 Next.js 开发服务器 |
| `bun run build` | 构建生产环境的 Next.js |
| `bun run start` | 启动 Next.js 生产服务器 |
| `bun run lint` | 运行 ESLint 检查 |
| `bun run tauri:dev` | 以开发模式启动 Tauri |
| `bunx tauri build` | 构建生产环境桌面应用 |

### Rust 命令

```bash
cd src-tauri

cargo build          # 构建 Rust 后端
cargo test           # 运行 Rust 单元测试
cargo clippy         # 运行 Rust 代码检查
cargo fmt            # 格式化 Rust 代码
```

## 生产环境构建

### 本地构建

```bash
# 确保已下载 PDFium 二进制文件
./scripts/download-pdfium.sh

# 构建桌面应用
bunx tauri build
```

构建完成后的应用程序位于 `src-tauri/target/release/bundle/`。

### 跨平台发布

推送版本标签以触发 GitHub Actions 自动构建：

```bash
git tag v1.0.0
git push origin v1.0.0
```

这将创建 Windows (.msi, .exe)、macOS (.dmg, .app) 和 Linux (.deb, .AppImage) 的发布版本。

## 项目结构

```
manibook/
├── app/                    # Next.js App Router 页面
│   └── [locale]/          # 国际化路由
├── components/
│   ├── ui/                # shadcn/ui 基础组件
│   └── library/           # 功能组件
│       ├── dialogs/       # 模态对话框
│       ├── documents/     # 文档展示组件
│       ├── navigation/    # 侧边栏和导航
│       └── views/         # 列表和网格视图
├── lib/                   # 工具函数和类型
│   └── library/           # 图书库相关工具
├── stores/                # Zustand 状态存储
│   └── library/           # 图书库功能存储
├── hooks/                 # 自定义 React Hooks
├── i18n/                  # 国际化配置
├── scripts/               # 构建和工具脚本
└── src-tauri/             # Rust 后端 (Tauri)
    └── src/
        ├── commands/      # Tauri IPC 命令处理
        ├── models/        # Rust 数据结构
        ├── services/      # 业务逻辑服务
        ├── extractors/    # 文件格式处理
        ├── utils/         # 辅助函数
        └── config/        # 配置
```

## PDFium 依赖

本应用使用 [PDFium](https://pdfium.googlesource.com/pdfium/) 进行 PDF 渲染和处理。二进制文件会在设置过程中自动从 [pdfium-binaries](https://github.com/bblanchon/pdfium-binaries) 下载。

二进制文件不纳入版本控制，以保持仓库大小合理。在构建或开发前请运行下载脚本。

## 开发说明

- **React Compiler** 已启用，自动优化
- **路径别名**: `@/*` 映射到项目根目录
- **包管理器**: Bun (也支持 npm/yarn)
- **TypeScript**: 启用严格模式

## 参与贡献

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 进行更改
4. 运行代码检查和测试 (`bun run lint` 和 `cargo test`)
5. 提交更改 (`git commit -m 'Add amazing feature'`)
6. 推送到分支 (`git push origin feature/amazing-feature`)
7. 提交 Pull Request

## 许可证

本项目采用 MIT 许可证 - 详情请查看 [LICENSE](LICENSE) 文件。
