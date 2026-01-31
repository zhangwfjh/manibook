# ManiBook

ManiBook is a manager of many books.

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS version)
- [Rust](https://rustup.rs/)
- [Bun](https://bun.sh/) (recommended)

### Platform-specific requirements

**Linux:**

```bash
sudo apt-get update
sudo apt-get install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
```

**macOS:**

- Xcode command line tools: `xcode-select --install`

**Windows:**

- Visual Studio C++ Build Tools

## Development Setup

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd manibook
   ```

2. **Install dependencies:**

   ```bash
   bun install
   ```

3. **Download PDFium binaries:**

   ```bash
   ./scripts/download-pdfium.sh
   ```

4. **Start development:**

   ```bash
   bun run dev
   ```

## Building for Production

### Local Build

```bash
# Download PDFium binaries first
./scripts/download-pdfium.sh

# Build the application
bunx tauri build
```

### Cross-platform Releases

Push a version tag to trigger automated builds:

```bash
git tag v1.0.0
git push origin v1.0.0
```

This will create releases for Windows, macOS, and Linux via GitHub Actions.

## PDFium Dependency

This application uses PDFium for PDF processing. The binaries are automatically downloaded during the build process from [pdfium-binaries](https://github.com/bblanchon/pdfium-binaries).

For local development, run the download script before building. The binaries are excluded from version control to keep the repository size manageable.

## Project Structure

- `src-tauri/` - Rust backend and Tauri configuration
- `app/` - Next.js frontend (App Router)
- `components/` - React components
- `lib/` - Utility functions and shared code
- `scripts/` - Build and utility scripts

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

[Add your license here]
