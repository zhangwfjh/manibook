#!/bin/bash

set -e

# PDFium binaries repository
REPO="bblanchon/pdfium-binaries"
VERSION="chromium/7643"  # Latest version

# Determine platform and architecture
if command -v cmd.exe >/dev/null 2>&1; then
    # Windows system
    PLATFORM="win-x64"
    BINARY_NAME="pdfium.dll"
    BIN_DIR="bin"
elif [ "$(uname -s)" = "Darwin" ]; then
    # macOS
    if [ "$(uname -m)" = "arm64" ]; then
        PLATFORM="mac-arm64"
    else
        PLATFORM="mac-x64"
    fi
    BINARY_NAME="libpdfium.dylib"
    BIN_DIR="lib"
elif [ "$(uname -s)" = "Linux" ]; then
    # Linux
    PLATFORM="linux-x64"
    BINARY_NAME="libpdfium.so"
    BIN_DIR="lib"
else
    echo "Unsupported platform: $(uname -s)"
    exit 1
fi

# Download URL
FILENAME="pdfium-${PLATFORM}.tgz"
URL="https://github.com/${REPO}/releases/download/${VERSION}/${FILENAME}"

echo "Downloading PDFium binary from: $URL"
echo "Target file: src-tauri/${BINARY_NAME}"

# Create src-tauri directory if it doesn't exist
mkdir -p src-tauri

# Create temp directory
TEMP_DIR="${TMPDIR:-/tmp}/pdfium-temp"
mkdir -p "$TEMP_DIR"

# Store the project root directory
PROJECT_ROOT=$(pwd)

# Download and extract
if command -v curl >/dev/null 2>&1; then
    curl -L -o "${TEMP_DIR}/${FILENAME}" "$URL"
else
    wget -O "${TEMP_DIR}/${FILENAME}" "$URL"
fi

# Extract the archive
cd "$TEMP_DIR"
tar -xzf "${FILENAME}"

# The binary should be in the current directory after extraction
if [ -f "${BIN_DIR}/${BINARY_NAME}" ]; then
    # Copy to src-tauri using the stored project root
    cp "${BIN_DIR}/${BINARY_NAME}" "${PROJECT_ROOT}/src-tauri"
    echo "Successfully copied ${BINARY_NAME} to src-tauri/"
else
    echo "Error: ${BINARY_NAME} not found after extraction"
    ls -la
    exit 1
fi

# Cleanup
cd ../..
rm -rf "$TEMP_DIR"

echo "PDFium binary downloaded successfully: src-tauri/${BINARY_NAME}"
