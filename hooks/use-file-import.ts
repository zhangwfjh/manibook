import { useState, useRef } from "react";
import { toast } from "sonner";

interface UseFileImportProps {
  currentLibrary: string;
  onImportComplete: () => void;
}

export function useFileImport({ currentLibrary, onImportComplete }: UseFileImportProps) {
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<string>("");
  const [importProgressPercent, setImportProgressPercent] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFileImport = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;

    if (!files || files.length === 0) return;

    // Filter files to only include PDF, DJVU, EPUB formats
    const allowedExtensions = ["pdf", "djvu", "epub"];
    const filteredFiles = Array.from(files).filter((file) => {
      const extension = file.name.split(".").pop()?.toLowerCase();
      return allowedExtensions.includes(extension || "");
    });

    if (filteredFiles.length === 0) {
      toast.error(
        "No valid files selected. Only PDF, DJVU, and EPUB files are allowed."
      );
      return;
    }

    setImporting(true);
    setImportProgressPercent(0);
    setImportProgress(
      `Importing ${filteredFiles.length} file${filteredFiles.length > 1 ? "s" : ""
      }...`
    );

    let successCount = 0;
    let errorCount = 0;

    // Process files sequentially to avoid overwhelming the server
    for (let i = 0; i < filteredFiles.length; i++) {
      const file = filteredFiles[i];
      setImportProgress(
        `Importing ${file.name} (${i + 1}/${filteredFiles.length})...`
      );

      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch(
          `/api/libraries/${currentLibrary}/documents`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        errorCount++;
        console.error(`Error importing ${file.name}:`, error);
      }

      // Update progress percentage
      const progress = Math.round(((i + 1) / filteredFiles.length) * 100);
      setImportProgressPercent(progress);
    }

    // Refresh the library data
    onImportComplete();

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (folderInputRef.current) {
      folderInputRef.current.value = "";
    }

    setImporting(false);
    setImportProgressPercent(0);

    // Show toast notifications
    if (errorCount === 0) {
      toast.success(
        `Successfully imported ${successCount} file${successCount > 1 ? "s" : ""
        }!`
      );
      setImportProgress(
        `${successCount} file${successCount > 1 ? "s" : ""
        } imported successfully!`
      );
    } else if (successCount === 0) {
      toast.error(
        `Failed to import ${errorCount} file${errorCount > 1 ? "s" : ""}`
      );
      setImportProgress(
        `Failed to import ${errorCount} file${errorCount > 1 ? "s" : ""}`
      );
    } else {
      toast.warning(`${successCount} imported, ${errorCount} failed`);
      setImportProgress(`${successCount} imported, ${errorCount} failed`);
    }

    // Clear progress message after 3 seconds
    setTimeout(() => setImportProgress(""), 3000);
  };

  const triggerFileImport = () => {
    fileInputRef.current?.click();
  };

  const triggerFolderImport = () => {
    folderInputRef.current?.click();
  };

  return {
    importing,
    importProgress,
    importProgressPercent,
    fileInputRef,
    folderInputRef,
    handleFileImport,
    triggerFileImport,
    triggerFolderImport,
  };
}
