import {
    FileTextIcon,
    BookIcon,
    ImageIcon,
    FileIcon,
    LucideIcon,
} from "lucide-react";
import { LibraryDocument } from "./index";

export function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function getFormatIcon(format: string): LucideIcon {
    switch (format.toLowerCase()) {
        case "pdf":
            return FileTextIcon;
        case "epub":
            return BookIcon;
        case "djvu":
            return ImageIcon;
        default:
            return FileIcon;
    }
}

export function getCoverUrl(library: string, document: LibraryDocument): string {
    return `/api/libraries/${library}/documents/${document.id}/cover`;
}

const SMALL_WORDS = new Set([
    "a", "an", "the", "and", "but", "or", "for", "nor", "on", "at", "to", "by", "in", "of"
]);

export function toProperTitleCase(str: string): string {
    if (!str || typeof str !== "string") return str;

    return str
        .toLowerCase()
        .split(/\s+/)
        .map((word, index, words) => {
            const isFirstOrLast = index === 0 || index === words.length - 1;
            const isSmallWord = SMALL_WORDS.has(word);
            const isHyphenated = word.includes("-");

            if (isHyphenated) {
                return word
                    .split("-")
                    .map((part, i, parts) => {
                        if (i === 0 || i === parts.length - 1 || !SMALL_WORDS.has(part)) {
                            return part.charAt(0).toUpperCase() + part.slice(1);
                        }
                        return part;
                    })
                    .join("-");
            }

            if (isFirstOrLast || !isSmallWord) {
                return word.charAt(0).toUpperCase() + word.slice(1);
            }

            return word;
        })
        .join(" ");
}

export function normalizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    const result = { ...metadata };

    if (result.doctype && typeof result.doctype === "string") {
        result.doctype = toProperTitleCase(result.doctype);
    }

    if (result.title && typeof result.title === "string") {
        result.title = toProperTitleCase(result.title);
    }

    if (result.authors && Array.isArray(result.authors)) {
        result.authors = result.authors.map((author) =>
            typeof author === "string" ? toProperTitleCase(author) : author
        );
    }

    if (result.publisher && typeof result.publisher === "string") {
        result.publisher = toProperTitleCase(result.publisher);
    }

    if (result.category && typeof result.category === "string") {
        result.category = result.category
            .split(" > ")
            .map((part) => toProperTitleCase(part))
            .join(" > ");
    }

    if (result.language && typeof result.language === "string") {
        result.language = toProperTitleCase(result.language);
    }

    if (result.keywords && Array.isArray(result.keywords)) {
        result.keywords = result.keywords.map((keyword) =>
            typeof keyword === "string" ? toProperTitleCase(keyword) : keyword
        );
    }

    return result;
}

