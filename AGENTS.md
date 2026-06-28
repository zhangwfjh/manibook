# AGENTS.md - AI Coding Agent Guidelines for ManiBook

## Project Overview

ManiBook is a desktop application for managing book libraries, built with:
- **Frontend**: Next.js 16 (App Router) + React 19 + TypeScript
- **Desktop**: Tauri 2.x (Rust backend)
- **Styling**: Tailwind CSS 4 + shadcn/ui components
- **State**: Zustand stores
- **i18n**: next-intl

## Build/Lint/Test Commands

### Frontend (Next.js)
```bash
bun run dev          # Start Next.js development server
bun run build        # Production build (Next.js)
bun run lint         # Run ESLint on the codebase
bun run start        # Start production server
```

### Desktop (Tauri)
```bash
bun run tauri:dev    # Start Tauri in development mode
bunx tauri build     # Build production desktop app
```

### Rust Backend (src-tauri/)
```bash
cd src-tauri
cargo build          # Build Rust backend
cargo test           # Run Rust unit tests
cargo clippy         # Run Rust linter
cargo fmt            # Format Rust code
```

### Running Single Tests (Rust)
```bash
cd src-tauri
cargo test test_name           # Run specific test by name
cargo test --test module_name  # Run tests in specific module
cargo test -- --nocapture      # Run with stdout output
```

**Note**: No JavaScript test framework (Vitest/Jest) is currently configured.

## Code Style Guidelines

### TypeScript/React

#### File Structure
- Use `"use client"` directive at the top of client components
- Barrel exports (`index.ts`) for module re-exports

#### Import Order
```typescript
// 1. React/Next.js
import React from "react";
import { useEffect } from "react";
import type { Metadata } from "next";

// 2. Third-party libraries
import { create } from "zustand";
import { useDebounce } from "use-debounce";

// 3. Local imports with @ alias
import { Button } from "@/components/ui/button";
import { useLibraryStore } from "@/stores/library";
import { cn } from "@/lib/utils";
```

#### Component Patterns
```typescript
// Named export for components
export const DocumentCard = ({ document }: { document: Document }) => {
  // Component body
};

// Interface for props (prefer interface over type for objects)
interface CardProps {
  title: string;
  metadata?: Metadata;
}
```

#### Type Definitions
- Use `interface` for object shapes and props
- Use `type` for unions, intersections, or complex types
- Export types from dedicated `types.ts` files

```typescript
// types.ts
export interface Metadata {
  title: string;
  authors: string[];
  page_count: number;
}

export type { Document, Category } from "./types";
```

### State Management (Zustand)

```typescript
"use client";

import { create } from "zustand";

interface UIState {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  isOpen: false,
  setOpen: (open) => set({ isOpen: open }),
  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
}));
```

### Styling (Tailwind CSS)

```typescript
// Use the cn() utility for conditional classes
import { cn } from "@/lib/utils";

<div className={cn(
  "base-classes-here",
  condition && "conditional-class",
  className // Allow prop override
)}>
```

### Rust Backend (Tauri)

#### Command Pattern
```rust
use crate::models::document::Document;
use tauri::AppHandle;

#[tauri::command]
pub async fn get_document(document_id: String) -> Result<Document, String> {
    log::info!("Fetching document: {}", document_id);
    
    // Implementation
    let document = fetch_document(&document_id)?;
    
    Ok(document)
}
```

#### Error Handling
- Return `Result<T, String>` for Tauri commands
- Use `log::info!`, `log::debug!`, `log::error!` for logging
- Provide descriptive error messages with context

```rust
fs::read(&file_path).map_err(|e| {
    log::error!("Failed to read file {}: {}", file_path.display(), e);
    format!("Failed to read file {}: {}", file_path.display(), e)
})?;
```

#### Module Organization
```
src-tauri/src/
├── commands/    # Tauri command handlers
├── models/      # Data structures
├── services/    # Business logic
├── utils/       # Helper functions
├── config/      # Configuration
├── extractors/  # File format handlers
└── lib.rs       # Entry point, command registration
```

## Project Structure

```
manibook/
├── app/                    # Next.js App Router pages
│   ├── [locale]/          # Internationalized routes
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/
│   ├── ui/                # shadcn/ui primitives
│   └── library/           # Feature components
│       ├── dialogs/       # Modal dialogs
│       ├── documents/     # Document display
│       ├── navigation/    # Sidebar, navigation
│       └── views/         # List/grid views
├── lib/                   # Utilities and types
│   ├── utils.ts           # cn() and helpers
│   └── library/           # Library-specific types/utils
├── stores/                # Zustand state stores
│   └── library/           # Library feature stores
├── hooks/                 # Custom React hooks
├── i18n/                  # Internationalization config
└── src-tauri/             # Rust backend
    └── src/
        ├── commands/      # Tauri IPC handlers
        ├── models/        # Rust structs
        └── services/      # Backend services
```

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `DocumentCard.tsx` |
| Hooks | camelCase with `use` prefix | `useLibraryInit.ts` |
| Stores | camelCase with `Store` suffix | `uiStore.ts` |
| Types | PascalCase | `Metadata`, `Document` |
| Functions | camelCase | `formatFileSize()` |
| Rust modules | snake_case | `document_actions.rs` |
| Tauri commands | snake_case | `get_documents` |

## Important Files

- `next.config.ts` - Next.js configuration (React Compiler enabled)
- `tsconfig.json` - TypeScript config (strict mode, @/* alias)
- `eslint.config.mjs` - ESLint flat config
- `src-tauri/Cargo.toml` - Rust dependencies
- `src-tauri/src/lib.rs` - Tauri command registration

## Development Notes

- React Compiler is enabled (`reactCompiler: true`)
- Path alias: `@/*` maps to project root
- Uses Bun as package manager
- PDFium is used for PDF processing (downloaded via script)
- Supports PDF, EPUB, and DJVU formats
