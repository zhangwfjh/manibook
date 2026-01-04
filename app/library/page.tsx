"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { LayoutGridIcon, ListIcon, SearchIcon, UploadIcon, FolderIcon } from "lucide-react";
import { toast } from "sonner";
import { DocumentCard } from "@/components/library/document-card";
import { DocumentList } from "@/components/library/document-list";
import { CategoryTree } from "@/components/library/category-tree";
import { TagFilter } from "@/components/library/tag-filter";
import { DocumentDetailDialog } from "@/components/library/document-detail-dialog";
import { SettingsDialog } from "@/components/library/settings-dialog";
import { LibraryDocument, LibraryCategory } from "@/lib/library";

type ViewMode = "card" | "list";

export default function LibraryPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [categories, setCategories] = useState<LibraryCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] =
    useState<LibraryDocument | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [uploadProgressPercent, setUploadProgressPercent] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchLibraryData();
  }, []);

  const fetchLibraryData = async () => {
    try {
      const response = await fetch("/api/library");
      const data = await response.json();
      setDocuments(data.documents || []);
      setCategories(data.categories || []);
    } catch (error) {
      console.error("Error fetching library data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    let matchesCategory = !selectedCategory;
    if (selectedCategory) {
      // Handle the new category structure: selectedCategory includes doctype prefix
      const selectedParts = selectedCategory.split(" > ");
      if (selectedParts.length >= 2) {
        const selectedDoctype = selectedParts[0];
        const selectedCategoryPath = selectedParts.slice(1).join(" > ");

        // Check if doctype matches and category path matches
        const doctypeMatches = doc.metadata.doctype === selectedDoctype;
        const categoryMatches =
          !selectedCategoryPath ||
          (doc.metadata.category &&
            doc.metadata.category.startsWith(selectedCategoryPath));

        matchesCategory = doctypeMatches && Boolean(categoryMatches);
      }
    }

    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.some((tag) => doc.metadata.keywords?.includes(tag));
    const matchesSearch =
      !searchQuery ||
      doc.metadata.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.metadata.authors?.some((author) =>
        author.toLowerCase().includes(searchQuery.toLowerCase())
      ) ||
      doc.metadata.keywords?.some((keyword) =>
        keyword.toLowerCase().includes(searchQuery.toLowerCase())
      );
    return matchesCategory && matchesTags && matchesSearch;
  });

  const handleDownload = (doc: LibraryDocument) => {
    // Create a temporary link to download the file
    const link = window.document.createElement("a");
    link.href = doc.url;
    link.download = doc.filename;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  const handleDocumentClick = (document: LibraryDocument) => {
    setSelectedDocument(document);
    setDialogOpen(true);
  };

  const handleDocumentDelete = async (document: LibraryDocument) => {
    // Refresh the library data after deletion
    await fetchLibraryData();
  };

  const handleDocumentUpdate = async (document: LibraryDocument) => {
    // Refresh the library data after update
    await fetchLibraryData();
  };

  const handleFavoriteToggle = async (document: LibraryDocument) => {
    // Refresh the library data after favorite toggle
    await fetchLibraryData();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgressPercent(0);
    setUploadProgress(`Uploading ${files.length} file${files.length > 1 ? 's' : ''}...`);

    let successCount = 0;
    let errorCount = 0;

    // Process files sequentially to avoid overwhelming the server
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(`Uploading ${file.name} (${i + 1}/${files.length})...`);

      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('/api/library/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
          console.error(`Upload failed for ${file.name}`);
        }
      } catch (error) {
        errorCount++;
        console.error(`Error uploading ${file.name}:`, error);
      }

      // Update progress percentage
      const progress = Math.round(((i + 1) / files.length) * 100);
      setUploadProgressPercent(progress);
    }

    // Refresh the library data
    await fetchLibraryData();

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }

    setUploading(false);
    setUploadProgressPercent(0);

    // Show toast notifications
    if (errorCount === 0) {
      toast.success(`Successfully uploaded ${successCount} file${successCount > 1 ? 's' : ''}!`);
      setUploadProgress(`${successCount} file${successCount > 1 ? 's' : ''} uploaded successfully!`);
    } else if (successCount === 0) {
      toast.error(`Failed to upload ${errorCount} file${errorCount > 1 ? 's' : ''}`);
      setUploadProgress(`Failed to upload ${errorCount} file${errorCount > 1 ? 's' : ''}`);
    } else {
      toast.warning(`${successCount} uploaded, ${errorCount} failed`);
      setUploadProgress(`${successCount} uploaded, ${errorCount} failed`);
    }

    // Clear progress message after 3 seconds
    setTimeout(() => setUploadProgress(""), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Library</h1>
          <p className="text-muted-foreground">
            Organize and browse your collection of books and articles
          </p>
        </div>

        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-80 shrink-0 space-y-6">
            {/* Category Tree */}
            <CategoryTree
              categories={categories}
              selectedCategory={selectedCategory}
              onCategorySelect={setSelectedCategory}
            />

            <Separator />

            {/* Tag Filter */}
            <TagFilter
              documents={documents}
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
            />
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Controls */}
            <div className="mb-6 space-y-4">
              {/* Search and Actions */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search by title, author, or keywords..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={viewMode === "card" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("card")}
                  >
                    <LayoutGridIcon className="h-4 w-4 mr-2" />
                    Cards
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                  >
                    <ListIcon className="h-4 w-4 mr-2" />
                    List
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <UploadIcon className="h-4 w-4 mr-2" />
                    Upload Files
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => folderInputRef.current?.click()}
                  >
                    <FolderIcon className="h-4 w-4 mr-2" />
                    Upload Folder
                  </Button>
                  <SettingsDialog />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.epub,.djvu"
                    multiple
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                  <input
                    ref={folderInputRef}
                    type="file"
                    accept=".pdf,.epub,.djvu"
                    multiple
                    // @ts-expect-error - webkitdirectory is not in the standard types
                    webkitdirectory=""
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                </div>
              </div>

              {/* Upload Progress */}
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
            </div>

            {/* Content */}
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                {filteredDocuments.length} document
                {filteredDocuments.length !== 1 ? "s" : ""} found
              </p>
            </div>

            {filteredDocuments.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-muted-foreground">
                  <p className="text-lg mb-2">No documents found</p>
                  <p>Try adjusting your search or category filter</p>
                </div>
              </div>
            ) : viewMode === "card" ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredDocuments.map((document, index) => (
                  <DocumentCard
                    key={index}
                    document={document}
                    onClick={handleDocumentClick}
                    onDownload={handleDownload}
                    onFavoriteToggle={handleFavoriteToggle}
                  />
                ))}
              </div>
            ) : (
              <DocumentList
                documents={filteredDocuments}
                onClick={handleDocumentClick}
                onDownload={handleDownload}
              />
            )}
          </div>
        </div>

        {/* Document Detail Dialog */}
        <DocumentDetailDialog
          document={selectedDocument}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onDownload={handleDownload}
          onDelete={handleDocumentDelete}
          onUpdate={handleDocumentUpdate}
        />
      </div>
    </div>
  );
}
