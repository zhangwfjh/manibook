import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  UploadIcon,
  LinkIcon,
  XIcon,
  PlusIcon,
  FileTextIcon,
} from "lucide-react";
import { toast } from "sonner";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentLibrary: string;
  onUploadComplete: () => void;
}

export function UploadDialog({
  open,
  onOpenChange,
  currentLibrary,
  onUploadComplete,
}: UploadDialogProps) {
  const [activeTab, setActiveTab] = useState("files");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [uploadProgressPercent, setUploadProgressPercent] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const [urls, setUrls] = useState<string[]>([""]);
  const [urlErrors, setUrlErrors] = useState<string[]>([]);

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

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

        const progress = Math.round(((i + 1) / filteredFiles.length) * 100);
        setUploadProgressPercent(progress);
      }

      onUploadComplete();

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      if (folderInputRef.current) {
        folderInputRef.current.value = "";
      }

      setUploading(false);
      setUploadProgressPercent(0);

      if (errorCount === 0) {
        toast.success(
          `Successfully uploaded ${successCount} file${
            successCount > 1 ? "s" : ""
          }!`
        );
        setUploadProgress(`All files uploaded successfully!`);
      } else if (successCount === 0) {
        toast.error(
          `Failed to upload ${errorCount} file${errorCount > 1 ? "s" : ""}`
        );
        setUploadProgress(`Failed to upload all files`);
      } else {
        toast.warning(`${successCount} uploaded, ${errorCount} failed`);
        setUploadProgress(`${successCount} uploaded, ${errorCount} failed`);
      }

      setTimeout(() => setUploadProgress(""), 3000);
    },
    [currentLibrary, onUploadComplete]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileUpload({
          target: { files: e.dataTransfer.files },
        } as React.ChangeEvent<HTMLInputElement>);
      }
    },
    [handleFileUpload]
  );

  const addUrl = () => {
    setUrls([...urls, ""]);
    setUrlErrors([...urlErrors, ""]);
  };

  const removeUrl = (index: number) => {
    const newUrls = urls.filter((_, i) => i !== index);
    const newErrors = urlErrors.filter((_, i) => i !== index);
    setUrls(newUrls.length > 0 ? newUrls : [""]);
    setUrlErrors(newErrors.length > 0 ? newErrors : [""]);
  };

  const updateUrl = (index: number, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);

    const newErrors = [...urlErrors];
    if (newErrors[index]) {
      newErrors[index] = "";
      setUrlErrors(newErrors);
    }
  };

  const validateUrl = (url: string): string => {
    if (!url.trim()) return "";
    try {
      new URL(url);
      return "";
    } catch {
      return "Invalid URL format";
    }
  };

  const handleUrlImport = async () => {
    const validUrls = urls.filter((url) => url.trim());
    if (validUrls.length === 0) {
      toast.error("Please enter at least one URL");
      return;
    }

    const newErrors = urls.map((url) => validateUrl(url));
    setUrlErrors(newErrors);

    if (newErrors.some((error) => error)) {
      toast.error("Please fix the URL errors before importing");
      return;
    }

    setUploading(true);
    setUploadProgressPercent(0);
    setUploadProgress(
      `Importing ${validUrls.length} URL${validUrls.length > 1 ? "s" : ""}...`
    );

    try {
      const formData = new FormData();
      formData.append("urls", JSON.stringify(validUrls));

      const response = await fetch(
        `/api/libraries/${currentLibrary}/documents`,
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();

      if (response.ok) {
        const { successCount, errorCount, errors } = result;
        onUploadComplete();

        if (errorCount === 0) {
          toast.success(
            `Successfully imported ${successCount} document${
              successCount > 1 ? "s" : ""
            }!`
          );
          setUploadProgress(`All documents imported successfully!`);
        } else {
          toast.warning(`${successCount} imported, ${errorCount} failed`);
          setUploadProgress(`${successCount} imported, ${errorCount} failed`);

          if (errors && errors.length > 0) {
            toast.error(`Import error: ${errors[0].error}`);
          }
        }

        setUrls([""]);
        setUrlErrors([""]);
        onOpenChange(false);
      } else {
        toast.error(result.error || "Import failed");
        setUploadProgress("Import failed");
      }
    } catch (error) {
      console.error("Error importing URLs:", error);
      toast.error("Import failed");
      setUploadProgress("Import failed");
    }

    setUploading(false);
    setUploadProgressPercent(0);

    setTimeout(() => setUploadProgress(""), 3000);
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const triggerFolderUpload = () => {
    folderInputRef.current?.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Documents</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="files" className="flex items-center gap-2">
              <UploadIcon className="h-4 w-4" />
              Files & Folders
            </TabsTrigger>
            <TabsTrigger value="urls" className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Import from URLs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="files" className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <FileTextIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Drop files here</h3>
              <p className="text-muted-foreground mb-4">
                Drag and drop PDF, EPUB, or DJVU files, or click the buttons
                below
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={triggerFileUpload} disabled={uploading}>
                  <UploadIcon className="h-4 w-4 mr-2" />
                  Select Files
                </Button>
                <Button
                  variant="outline"
                  onClick={triggerFolderUpload}
                  disabled={uploading}
                >
                  <UploadIcon className="h-4 w-4 mr-2" />
                  Select Folder
                </Button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.epub,.djvu"
              multiple
              onChange={handleFileUpload}
              style={{ display: "none" }}
            />
            <input
              ref={folderInputRef}
              type="file"
              accept=".pdf,.epub,.djvu"
              multiple
              onChange={handleFileUpload}
              style={{ display: "none" }}
              // @ts-expect-error - webkitdirectory is not in the standard types
              webkitdirectory=""
            />
          </TabsContent>

          <TabsContent value="urls" className="space-y-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                PDF URLs (one per line or separate inputs)
              </Label>

              {urls.map((url, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="https://example.com/document.pdf"
                      value={url}
                      onChange={(e) => updateUrl(index, e.target.value)}
                      className={urlErrors[index] ? "border-red-500" : ""}
                    />
                    {urlErrors[index] && (
                      <p className="text-sm text-red-500 mt-1">
                        {urlErrors[index]}
                      </p>
                    )}
                  </div>
                  {urls.length > 1 && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => removeUrl(index)}
                      className="shrink-0"
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}

              <Button
                variant="outline"
                onClick={addUrl}
                className="w-full"
                disabled={uploading}
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Another URL
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>Supported formats: PDF, EPUB, DJVU</p>
              <p>Maximum file size: 100MB per document</p>
            </div>
          </TabsContent>
        </Tabs>

        {uploadProgress && (
          <div className="space-y-2">
            <div className="text-sm text-blue-600 dark:text-blue-400">
              {uploading && (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  {uploadProgress}
                </div>
              )}
              {!uploading && uploadProgress}
            </div>
            {uploading && uploadProgressPercent > 0 && (
              <Progress value={uploadProgressPercent} className="w-full" />
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={uploading}
          >
            Cancel
          </Button>
          {activeTab === "urls" && (
            <Button onClick={handleUrlImport} disabled={uploading}>
              Import URLs
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
