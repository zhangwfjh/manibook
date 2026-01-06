"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  LayoutGridIcon,
  ListIcon,
  SearchIcon,
  UploadIcon,
  FolderIcon,
} from "lucide-react";
import { toast } from "sonner";
import { DocumentCard } from "@/components/library/document-card";
import { DocumentList } from "@/components/library/document-list";
import { LibraryManager } from "@/components/library/library-manager";
import { TagFilter } from "@/components/library/tag-filter";
import { FormatFilter } from "@/components/library/format-filter";
import { DocumentDetailDialog } from "@/components/library/document-detail-dialog";
import { SettingsDialog } from "@/components/library/settings-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LibraryDocument, LibraryCategory } from "@/lib/library";
import { Library } from "@/lib/library";

type ViewMode = "card" | "list";

export default function LibraryPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [categories, setCategories] = useState<LibraryCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("title-asc");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] =
    useState<LibraryDocument | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [uploadProgressPercent, setUploadProgressPercent] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Library management
  const [currentLibrary, setCurrentLibrary] = useState<string>("");
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [createLibraryOpen, setCreateLibraryOpen] = useState(false);
  const [newLibraryName, setNewLibraryName] = useState("");
  const [newLibraryPath, setNewLibraryPath] = useState("");
  const [renameLibraryOpen, setRenameLibraryOpen] = useState(false);
  const [archiveLibraryOpen, setArchiveLibraryOpen] = useState(false);
  const [renameLibraryName, setRenameLibraryName] = useState("");

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchLibraries = useCallback(async () => {
    try {
      const response = await fetch("/api/libraries");
      const data = await response.json();
      const libs = data.libraries || [];
      setLibraries(libs);
      if (libs.length > 0 && !currentLibrary) {
        setCurrentLibrary(libs[0].name);
      }
    } catch (error) {
      console.error("Error fetching libraries:", error);
    }
  }, []); // Remove currentLibrary dependency to avoid cycles

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchLibraryData = useCallback(async () => {
    if (!currentLibrary) return;
    try {
      const response = await fetch(
        `/api/libraries/${currentLibrary}/documents`
      );
      const data = await response.json();
      setDocuments(data.documents || []);
      setCategories(data.categories || []);
    } catch (error) {
      console.error("Error fetching library data:", error);
    } finally {
      setLoading(false);
    }
  }, [currentLibrary]);

  useEffect(() => {
    fetchLibraries();
  }, []); // Only run once on mount

  useEffect(() => {
    if (currentLibrary) {
      // Clear documents immediately when switching libraries to prevent stale cover requests
      setDocuments([]);
      fetchLibraryData();
      // Reset filters and close dialogs when switching libraries
      setSelectedCategory("");
      setSelectedTags([]);
      setSelectedFormats([]);
      setSearchQuery("");
      setSelectedDocument(null);
      setDialogOpen(false);
    }
  }, [currentLibrary, fetchLibraryData]); // Only run when currentLibrary changes

  const handleCreateLibrary = async () => {
    if (!newLibraryName || !newLibraryPath) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const response = await fetch("/api/libraries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newLibraryName, path: newLibraryPath }),
      });

      if (response.ok) {
        toast.success("Library created successfully");
        setCreateLibraryOpen(false);
        setCurrentLibrary(newLibraryName); // Switch to the new library
        setNewLibraryName("");
        setNewLibraryPath("");
        await fetchLibraries();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create library");
      }
    } catch (error) {
      console.error("Error creating library:", error);
      toast.error("Failed to create library");
    }
  };

  const handleRenameLibrary = async () => {
    if (!renameLibraryName.trim()) {
      toast.error("Please enter a new library name");
      return;
    }

    if (renameLibraryName === currentLibrary) {
      toast.error("New name must be different from current name");
      return;
    }

    try {
      const response = await fetch(`/api/libraries/${currentLibrary}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newName: renameLibraryName }),
      });

      if (response.ok) {
        toast.success("Library renamed successfully");
        setRenameLibraryOpen(false);
        setCurrentLibrary(renameLibraryName); // Switch to the renamed library
        setRenameLibraryName("");
        await fetchLibraries();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to rename library");
      }
    } catch (error) {
      console.error("Error renaming library:", error);
      toast.error("Failed to rename library");
    }
  };

  const handleArchiveLibrary = async () => {
    try {
      const response = await fetch(`/api/libraries/${currentLibrary}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Library archived successfully");
        setArchiveLibraryOpen(false);
        // Switch to the first available library
        const remainingLibraries = libraries.filter(
          (lib) => lib.name !== currentLibrary
        );
        if (remainingLibraries.length > 0) {
          setCurrentLibrary(remainingLibraries[0].name);
        } else {
          setCurrentLibrary("");
        }
        await fetchLibraries();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to archive library");
      }
    } catch (error) {
      console.error("Error archiving library:", error);
      toast.error("Failed to archive library");
    }
  };

  const handleOpenRenameDialog = (libraryName: string) => {
    setRenameLibraryName(libraryName);
    setRenameLibraryOpen(true);
  };

  const handleOpenArchiveDialog = (libraryName: string) => {
    // For archive, we need to switch to the library first, then open archive dialog
    setCurrentLibrary(libraryName);
    setArchiveLibraryOpen(true);
  };

  const filteredDocuments = documents.filter((doc) => {
    let matchesCategory = !selectedCategory;
    if (selectedCategory) {
      // Handle the new category structure: selectedCategory includes doctype prefix
      const selectedParts = selectedCategory.split(" > ");
      if (selectedParts.length >= 1) {
        const selectedDoctype = selectedParts[0];
        const selectedCategoryPath =
          selectedParts.length > 1 ? selectedParts.slice(1).join(" > ") : null;

        // Check if doctype matches
        const doctypeMatches = doc.metadata.doctype === selectedDoctype;
        // Check if category path matches (if specified)
        const categoryMatches =
          !selectedCategoryPath ||
          (doc.metadata.category &&
            doc.metadata.category.startsWith(selectedCategoryPath));

        matchesCategory = doctypeMatches && Boolean(categoryMatches);
      }
    }

    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.some((tag) =>
        doc.metadata.keywords?.some((kw) => kw === tag)
      );
    const matchesFormats =
      selectedFormats.length === 0 ||
      selectedFormats.includes(doc.metadata.format?.toUpperCase() || "");
    const matchesSearch =
      !searchQuery ||
      doc.metadata.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.metadata.authors?.some((author) =>
        author.toLowerCase().includes(searchQuery.toLowerCase())
      ) ||
      doc.metadata.keywords?.some((keyword) =>
        keyword.toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesFavorites = !showFavoritesOnly || doc.metadata.favorite;
    return (
      matchesCategory &&
      matchesTags &&
      matchesFormats &&
      matchesSearch &&
      matchesFavorites
    );
  });

  const sortedDocuments = useMemo(() => {
    const sorted = [...filteredDocuments];
    sorted.sort((a, b) => {
      const [field, order] = sortBy.split("-");
      let aVal: string | number | Date, bVal: string | number | Date;

      switch (field) {
        case "title":
          aVal = a.metadata.title.toLowerCase();
          bVal = b.metadata.title.toLowerCase();
          break;
        case "author":
          aVal = a.metadata.authors?.[0]?.toLowerCase() || "";
          bVal = b.metadata.authors?.[0]?.toLowerCase() || "";
          break;
        case "publisher":
          aVal = a.metadata.publisher?.toLowerCase() || "";
          bVal = b.metadata.publisher?.toLowerCase() || "";
          break;
        case "publicationYear":
          aVal = a.metadata.publication_year || 0;
          bVal = b.metadata.publication_year || 0;
          break;
        case "language":
          aVal = a.metadata.language?.toLowerCase() || "";
          bVal = b.metadata.language?.toLowerCase() || "";
          break;
        case "doctype":
          aVal = a.metadata.doctype;
          bVal = b.metadata.doctype;
          break;
        case "numPages":
          aVal = a.metadata.numPages || 0;
          bVal = b.metadata.numPages || 0;
          break;
        case "favorite":
          aVal = a.metadata.favorite ? 1 : 0;
          bVal = b.metadata.favorite ? 1 : 0;
          break;
        case "updatedAt":
          aVal = a.metadata.updatedAt
            ? new Date(a.metadata.updatedAt)
            : new Date(0);
          bVal = b.metadata.updatedAt
            ? new Date(b.metadata.updatedAt)
            : new Date(0);
          break;
        case "filesize":
          aVal = a.metadata.filesize || 0;
          bVal = b.metadata.filesize || 0;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return order === "asc" ? -1 : 1;
      if (aVal > bVal) return order === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredDocuments, sortBy]);

  const handleDownload = (doc: LibraryDocument) => {
    // Create a temporary link to download the file
    const link = window.document.createElement("a");
    link.href = doc.url.startsWith("lib://")
      ? `/api/libraries/${currentLibrary}/files/${doc.url.substring(6)}`
      : doc.url;
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
    try {
      await fetch(
        `/api/libraries/${currentLibrary}/documents/${encodeURIComponent(
          document.filename
        )}`,
        {
          method: "DELETE",
        }
      );
    } catch (error) {
      console.error("Error deleting document:", error);
    }
    // Refresh the library data after deletion
    await fetchLibraryData();
  };

  const handleDocumentUpdate = async (updatedDoc: LibraryDocument) => {
    try {
      const response = await fetch(
        `/api/libraries/${currentLibrary}/documents/${encodeURIComponent(
          updatedDoc.filename
        )}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            metadata: updatedDoc.metadata,
          }),
        }
      );
      if (response.ok) {
        const result = await response.json();
        setSelectedDocument(result.document);
        // Also refresh the library data
        await fetchLibraryData();
      } else {
        console.error("Error updating document");
      }
    } catch (error) {
      console.error("Error updating document:", error);
    }
  };

  const handleFavoriteToggle = async (document: LibraryDocument) => {
    try {
      await fetch(
        `/api/libraries/${currentLibrary}/documents/${encodeURIComponent(
          document.filename
        )}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ favorite: !document.metadata.favorite }),
        }
      );
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
    // Refresh the library data after favorite toggle
    await fetchLibraryData();
  };

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
          console.error(`Upload failed for ${file.name}`);
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
    await fetchLibraryData();

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
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Library</h1>
              <p className="text-muted-foreground">
                Organize and browse your collection of books and articles
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Dialog
                open={createLibraryOpen}
                onOpenChange={setCreateLibraryOpen}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Library</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="library-name">Library Name</Label>
                      <Input
                        id="library-name"
                        value={newLibraryName}
                        onChange={(e) => setNewLibraryName(e.target.value)}
                        placeholder="Enter library name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="library-path">Library Location</Label>
                      <Input
                        id="library-path"
                        value={newLibraryPath}
                        onChange={(e) => setNewLibraryPath(e.target.value)}
                        placeholder="Enter full path to library directory (e.g., C:\Users\John\Documents\Library or /home/john/library)"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Enter the full path to an empty directory where you want
                        to store your library files. The directory will be
                        created if it does not exist.
                      </p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setCreateLibraryOpen(false);
                          setNewLibraryName("");
                          setNewLibraryPath("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleCreateLibrary}>Create</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-80 shrink-0 space-y-6">
            {/* Library Manager */}
            <LibraryManager
              libraries={libraries}
              currentLibrary={currentLibrary}
              categories={categories}
              selectedCategory={selectedCategory}
              onLibrarySelect={setCurrentLibrary}
              onCategorySelect={setSelectedCategory}
              onCreateLibrary={() => setCreateLibraryOpen(true)}
              onRenameLibrary={handleOpenRenameDialog}
              onArchiveLibrary={handleOpenArchiveDialog}
            />

            <Separator />

            {/* Favorites Filter */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Favorites
              </h3>
              <div className="flex items-center space-x-2">
                <Switch
                  id="favorites"
                  checked={showFavoritesOnly}
                  onCheckedChange={setShowFavoritesOnly}
                />
                <Label htmlFor="favorites" className="text-sm">
                  Show only favorites
                </Label>
              </div>
            </div>

            <Separator />

            {/* Format Filter */}
            <FormatFilter
              documents={documents}
              selectedFormats={selectedFormats}
              onFormatsChange={setSelectedFormats}
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
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Sort by..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="title-asc">Title A-Z</SelectItem>
                      <SelectItem value="title-desc">Title Z-A</SelectItem>
                      <SelectItem value="author-asc">Author A-Z</SelectItem>
                      <SelectItem value="author-desc">Author Z-A</SelectItem>
                      <SelectItem value="publisher-asc">
                        Publisher A-Z
                      </SelectItem>
                      <SelectItem value="publisher-desc">
                        Publisher Z-A
                      </SelectItem>
                      <SelectItem value="publicationYear-desc">
                        Publication Year Newest
                      </SelectItem>
                      <SelectItem value="publicationYear-asc">
                        Publication Year Oldest
                      </SelectItem>
                      <SelectItem value="language-asc">Language A-Z</SelectItem>
                      <SelectItem value="language-desc">
                        Language Z-A
                      </SelectItem>
                      <SelectItem value="doctype-asc">Type A-Z</SelectItem>
                      <SelectItem value="doctype-desc">Type Z-A</SelectItem>
                      <SelectItem value="numPages-asc">Pages Fewest</SelectItem>
                      <SelectItem value="numPages-desc">Pages Most</SelectItem>
                      <SelectItem value="favorite-desc">
                        Favorites First
                      </SelectItem>
                      <SelectItem value="favorite-asc">
                        Non-Favorites First
                      </SelectItem>
                      <SelectItem value="updatedAt-desc">
                        Recently Updated
                      </SelectItem>
                      <SelectItem value="updatedAt-asc">
                        Least Recently Updated
                      </SelectItem>
                      <SelectItem value="filesize-asc">
                        File Size Smallest
                      </SelectItem>
                      <SelectItem value="filesize-desc">
                        File Size Largest
                      </SelectItem>
                    </SelectContent>
                  </Select>
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
                    disabled={libraries.length === 0}
                  >
                    <UploadIcon className="h-4 w-4 mr-2" />
                    Upload Files
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => folderInputRef.current?.click()}
                    disabled={libraries.length === 0}
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
                    style={{ display: "none" }}
                  />
                  <input
                    ref={folderInputRef}
                    type="file"
                    accept=".pdf,.epub,.djvu"
                    multiple
                    // @ts-expect-error - webkitdirectory is not in the standard types
                    webkitdirectory=""
                    onChange={handleFileUpload}
                    style={{ display: "none" }}
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
                    <Progress
                      value={uploadProgressPercent}
                      className="w-full"
                    />
                  )}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="mb-4 flex flex-row justify-between">
              {/* Breadcrumb */}
              {currentLibrary && (
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>Location:</BreadcrumbItem>
                    <BreadcrumbItem>
                      <BreadcrumbLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedCategory("");
                        }}
                      >
                        {currentLibrary}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    {selectedCategory &&
                      selectedCategory
                        .split(" > ")
                        .map((part, index, array) => (
                          <React.Fragment key={index}>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                              {index === array.length - 1 ? (
                                <BreadcrumbPage>{part}</BreadcrumbPage>
                              ) : (
                                <BreadcrumbLink
                                  href="#"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    const newCategory = array
                                      .slice(0, index + 1)
                                      .join(" > ");
                                    setSelectedCategory(newCategory);
                                  }}
                                >
                                  {part}
                                </BreadcrumbLink>
                              )}
                            </BreadcrumbItem>
                          </React.Fragment>
                        ))}
                  </BreadcrumbList>
                </Breadcrumb>
              )}

              {/* Document count */}
              <p className="text-sm text-muted-foreground">
                {sortedDocuments.length} document
                {sortedDocuments.length !== 1 ? "s" : ""} found
              </p>
            </div>

            {sortedDocuments.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-muted-foreground">
                  <p className="text-lg mb-2">No documents found</p>
                  <p>Try adjusting your search or category filter.</p>
                </div>
              </div>
            ) : viewMode === "card" ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {sortedDocuments.map((document) => (
                  <DocumentCard
                    key={`${currentLibrary}-${document.filename}`}
                    library={currentLibrary}
                    document={document}
                    onClick={handleDocumentClick}
                    onDownload={handleDownload}
                    onFavoriteToggle={handleFavoriteToggle}
                  />
                ))}
              </div>
            ) : (
              <DocumentList
                documents={sortedDocuments}
                onClick={handleDocumentClick}
                onDownload={handleDownload}
                onFavoriteToggle={handleFavoriteToggle}
              />
            )}
          </div>
        </div>

        {/* Document Detail Dialog */}
        <DocumentDetailDialog
          library={currentLibrary}
          document={selectedDocument}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onDownload={handleDownload}
          onDelete={handleDocumentDelete}
          onUpdate={handleDocumentUpdate}
        />

        {/* Rename Library Dialog */}
        <Dialog open={renameLibraryOpen} onOpenChange={setRenameLibraryOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename Library</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="rename-library-name">New Library Name</Label>
                <Input
                  id="rename-library-name"
                  value={renameLibraryName}
                  onChange={(e) => setRenameLibraryName(e.target.value)}
                  placeholder="Enter new library name"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setRenameLibraryOpen(false);
                    setRenameLibraryName("");
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleRenameLibrary}>Rename</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Archive Library Dialog */}
        <Dialog open={archiveLibraryOpen} onOpenChange={setArchiveLibraryOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Archive Library</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to archive the library &quot;
                {currentLibrary}&quot;? All documents and data in this library
                will be preserved on disk.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setArchiveLibraryOpen(false)}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleArchiveLibrary}>
                  Archive Library
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
