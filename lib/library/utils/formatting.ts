import {
    FileTextIcon,
    BookIcon,
    ImageIcon,
    FileIcon,
    LucideIcon,
} from "lucide-react";

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
