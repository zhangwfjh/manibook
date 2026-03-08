# ManiBook

[English](README.md) | [简体中文](README.zh-CN.md)

**ManiBook** (**Man**agement of **Many** **Book**s) is a modern desktop application for managing your digital book library. Built with Tauri 2.x and Next.js 16 for a fast, native experience across Windows, macOS, and Linux.

## Features

### AI-Powered Metadata Extraction

ManiBook leverages AI (via OpenAI-compatible APIs) to automatically extract and populate book metadata, eliminating manual data entry:

- **Automatic metadata extraction** - Title, authors, publisher, publication year, language, keywords, and abstract
- **Smart document classification** - Auto-categorize documents as Book, Paper, Report, Manual, or Others
- **Hierarchical category inference** - Intelligent categorization (e.g., "Computer Science > Artificial Intelligence")
- **OCR for scanned documents** - Extract text from images in scanned PDFs

### Keywords & Tagging

- **Keyword-based organization** - Assign multiple keywords to documents for flexible categorization
- **Tag-based search** - Filter and find books using keywords
- **Auto-extracted keywords** - AI extracts relevant keywords during import

### Multi-Format Support

- **PDF** - Full support with PDFium rendering engine
- **EPUB** - E-book format support
- **DJVU** - Scanned document format support
- **Cover extraction** - Auto-generate cover images from documents

### Library Management

- **Multiple libraries** - Create and manage separate libraries for different collections
- **Hierarchical categories** - Organize books by document type and category
- **Automatic file organization** - Files are organized by doctype/category/title
- **Favorites** - Mark frequently accessed books for quick access

### Advanced Search & Filtering

- **Full-text search** - Search across title, authors, keywords, publisher, and summary
- **Multi-faceted filtering** - Filter by format, author, publisher, language, keywords
- **Favorites filter** - Quick access to marked books
- **Sortable results** - Sort by title, author, date, page count, file size, etc.

### Modern UI/UX

- **Native performance** - Built with Tauri for a lightweight, native desktop experience
- **Clean interface** - Modern design with shadcn/ui and Tailwind CSS
- **Dark/Light themes** - Built-in theme support
- **Internationalization** - Multi-language support via next-intl

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | Next.js 16 (App Router) / React 19 / TypeScript |
| **Desktop** | Tauri 2.x (Rust backend) |
| **Styling** | Tailwind CSS 4 / shadcn/ui |
| **State** | Zustand |
| **i18n** | next-intl |
| **PDF Processing** | PDFium |
| **EPUB** | epub-parser |

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS version)
- [Rust](https://rustup.rs/) (1.77.2+)
- [Bun](https://bun.sh/) (recommended package manager)

### Platform-specific Requirements

**Linux (Debian/Ubuntu):**

```bash
sudo apt-get update
sudo apt-get install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
```

**macOS:**

- Xcode command line tools: `xcode-select --install`

**Windows:**

- [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- Microsoft Edge WebView2 (usually pre-installed on Windows 10/11)

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd manibook
```

### 2. Install dependencies

```bash
bun install
```

### 3. Download PDFium binaries

```bash
# Linux/macOS
./scripts/download-pdfium.sh

# Windows (Git Bash or WSL)
bash ./scripts/download-pdfium.sh
```

### 4. Start development

```bash
# Start Next.js dev server
bun run dev

# Or start the full Tauri desktop app
bun run tauri:dev
```

### 5. Configure AI (Optional but Recommended)

To enable AI-powered metadata extraction, configure your LLM provider in the app settings:

1. Open the app and go to **Settings > LLM**
2. Add your API key for an OpenAI-compatible provider
3. Select models for:
   - **Metadata Extraction** - For extracting book metadata
   - **Image Text Extraction** - For OCR on scanned documents

Supported providers include OpenAI, Azure OpenAI, Ollama, and any OpenAI-compatible API.

## Available Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start Next.js development server |
| `bun run build` | Build Next.js for production |
| `bun run start` | Start Next.js production server |
| `bun run lint` | Run ESLint on the codebase |
| `bun run tauri:dev` | Start Tauri in development mode |
| `bunx tauri build` | Build production desktop app |

### Rust Commands

```bash
cd src-tauri

cargo build          # Build Rust backend
cargo test           # Run Rust unit tests
cargo clippy         # Run Rust linter
cargo fmt            # Format Rust code
```

## Building for Production

### Local Build

```bash
# Ensure PDFium binaries are downloaded
./scripts/download-pdfium.sh

# Build the desktop application
bunx tauri build
```

The built application will be available in `src-tauri/target/release/bundle/`.

### Cross-platform Releases

Push a version tag to trigger automated builds via GitHub Actions:

```bash
git tag v1.0.0
git push origin v1.0.0
```

This creates releases for Windows (.msi, .exe), macOS (.dmg, .app), and Linux (.deb, .AppImage).

## Project Structure

```
manibook/
├── app/                    # Next.js App Router pages
│   └── [locale]/          # Internationalized routes
├── components/
│   ├── ui/                # shadcn/ui primitive components
│   └── library/           # Feature-specific components
│       ├── dialogs/       # Modal dialogs
│       ├── documents/     # Document display components
│       ├── navigation/    # Sidebar and navigation
│       └── views/         # List and grid views
├── lib/                   # Utility functions and types
│   └── library/           # Library-specific utilities
├── stores/                # Zustand state stores
│   └── library/           # Library feature stores
├── hooks/                 # Custom React hooks
├── i18n/                  # Internationalization config
├── scripts/               # Build and utility scripts
└── src-tauri/             # Rust backend (Tauri)
    └── src/
        ├── commands/      # Tauri IPC command handlers
        ├── models/        # Rust data structures
        ├── services/      # Business logic services
        ├── extractors/    # File format handlers
        ├── utils/         # Helper functions
        └── config/        # Configuration
```

## PDFium Dependency

This application uses [PDFium](https://pdfium.googlesource.com/pdfium/) for PDF rendering and processing. Binaries are automatically downloaded from [pdfium-binaries](https://github.com/bblanchon/pdfium-binaries) during setup.

The binaries are excluded from version control to keep the repository size manageable. Run the download script before building or developing.

## Development Notes

- **React Compiler** is enabled for automatic optimization
- **Path alias**: `@/*` maps to the project root
- **Package manager**: Bun (npm/yarn also work)
- **TypeScript**: Strict mode enabled

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run linting and tests (`bun run lint` and `cargo test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
