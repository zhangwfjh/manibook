import { useState, useRef } from "react";
import { toast } from "sonner";

interface UseFileUploadProps {
  currentLibrary: string;
  onUploadComplete: () => void;
}

export function useFileUpload({ currentLibrary, onUploadComplete }: UseFileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [uploadProgressPercent, setUploadProgressPercent] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (
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

    setUploading(true);
    setUploadProgressPercent(0);
    setUploadProgress(
      `Uploading ${filteredFiles.length} file${
        filteredFiles.length > 1 ? "s" : ""
      }...`
    );

    let successCount = 0;
    let errorCount = 0;

    // Process files sequentially to avoid overwhelming the server
    for (let i = 0; i < filteredFiles.length; i++) {
      const file = filteredFiles[i];
      setUploadProgress(
        `Uploading ${file.name} (${i + 1}/${filteredFiles.length})...`
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
        console.error(`Error uploading ${file.name}:`, error);
      }

      // Update progress percentage
      const progress = Math.round(((i + 1) / filteredFiles.length) * 100);
      setUploadProgressPercent(progress);
    }

    // Refresh the library data
    onUploadComplete();

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (folderInputRef.current) {
      folderInputRef.current.value = "";
    }

    setUploading(false);
    setUploadProgressPercent(0);

    // Show toast notifications
    if (errorCount === 0) {
      toast.success(
        `Successfully uploaded ${successCount} file${
          successCount > 1 ? "s" : ""
        }!`
      );
      setUploadProgress(
        `${successCount} file${
          successCount > 1 ? "s" : ""
        } uploaded successfully!`
      );
    } else if (successCount === 0) {
      toast.error(
        `Failed to upload ${errorCount} file${errorCount > 1 ? "s" : ""}`
      );
      setUploadProgress(
        `Failed to upload ${errorCount} file${errorCount > 1 ? "s" : ""}`
      );
    } else {
      toast.warning(`${successCount} uploaded, ${errorCount} failed`);
      setUploadProgress(`${successCount} uploaded, ${errorCount} failed`);
    }

    // Clear progress message after 3 seconds
    setTimeout(() => setUploadProgress(""), 3000);
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const triggerFolderUpload = () => {
    folderInputRef.current?.click();
  };

  return {
    uploading,
    uploadProgress,
    uploadProgressPercent,
    fileInputRef,
    folderInputRef,
    handleFileUpload,
    triggerFileUpload,
    triggerFolderUpload,
  };
}
