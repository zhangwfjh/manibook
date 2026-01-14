import { toProperTitleCase } from "./formatting";
import { DocumentMetadata } from "../types";

export function normalizeMetadata(metadata: DocumentMetadata): DocumentMetadata {
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
