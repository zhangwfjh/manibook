import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DownloadIcon,
  UsersIcon,
  CalendarIcon,
  BookOpenIcon,
  FileTextIcon,
  GlobeIcon,
  TrashIcon,
  EditIcon,
  SaveIcon,
  XIcon,
} from "lucide-react";
import { LibraryDocument } from "@/lib/library";
import { useState } from "react";

interface DocumentDetailDialogProps {
  library: string;
  document: LibraryDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload?: (document: LibraryDocument) => void;
  onDelete?: (document: LibraryDocument) => void;
  onUpdate?: (updatedDoc: LibraryDocument) => void;
}

export function DocumentDetailDialog({
  library,
  document,
  open,
  onOpenChange,
  onDownload,
  onDelete,
  onUpdate,
}: DocumentDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedMetadata, setEditedMetadata] = useState(document?.metadata);
  const [newKeyword, setNewKeyword] = useState("");
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  if (!document) return null;

  const { metadata } = document;

  const handleDownload = () => {
    onDownload?.(document);
    onOpenChange(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedMetadata(metadata);
    setNewKeyword("");
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedMetadata(metadata);
    setNewKeyword("");
  };

  const handleSave = async () => {
    if (!editedMetadata) return;

    // Validate required fields
    const errors: Record<string, string> = {};
    if (!editedMetadata.title?.trim()) {
      errors.title = "Title is required";
    }
    if (!editedMetadata.doctype) {
      errors.doctype = "Document type is required";
    }
    if (!editedMetadata.category?.split(" > ")[0]?.trim()) {
      errors.category = "Category is required";
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Clear any previous errors
    setValidationErrors({});

    // Ensure authors have a default value if empty
    const metadataToSave = { ...editedMetadata };
    if (
      !metadataToSave.authors ||
      metadataToSave.authors.length === 0 ||
      metadataToSave.authors.every((author) => !author.trim())
    ) {
      metadataToSave.authors = ["Unknown Author"];
    }

    // Create updated document with new metadata
    const updatedDocument: LibraryDocument = {
      ...document,
      metadata: metadataToSave,
    };

    try {
      onUpdate?.(updatedDocument);
      setIsEditing(false);
      setNewKeyword("");
    } catch (error) {
      console.error("Error updating document:", error);
      alert("Error updating document");
    }
  };

  const handleDelete = async () => {
    if (
      window.confirm(
        "Are you sure you want to delete this document? This action cannot be undone."
      )
    ) {
      try {
        const response = await fetch(
          `/api/libraries/${library}/documents/${encodeURIComponent(
            document.filename
          )}`,
          {
            method: "DELETE",
          }
        );

        if (response.ok) {
          onDelete?.(document);
          onOpenChange(false);
        } else {
          alert("Failed to delete document");
        }
      } catch (error) {
        console.error("Error deleting document:", error);
        alert("Error deleting document");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-full min-w-3xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              <Image
                src={`/api/libraries/${library}/files/${document.url
                  .substring(6)
                  .replace(
                    document.filename,
                    `[Cover] ${document.filename.replace(
                      /\.(pdf|epub|djvu)$/i,
                      ".jpg"
                    )}`
                  )}`}
                alt={`${metadata.title} cover`}
                width={150}
                height={200}
                className="w-24 h-32 object-cover rounded-lg border shadow-sm"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl font-semibold">
                {metadata.title}
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <Label
                    htmlFor="title"
                    className="text-sm font-medium text-muted-foreground"
                  >
                    TITLE *
                  </Label>
                  {isEditing ? (
                    <>
                      <Input
                        id="title"
                        value={editedMetadata?.title || ""}
                        onChange={(e) =>
                          setEditedMetadata((prev) =>
                            prev ? { ...prev, title: e.target.value } : prev
                          )
                        }
                        className="mt-1"
                      />
                      {validationErrors.title && (
                        <p className="text-sm text-red-500 mt-1">
                          {validationErrors.title}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="mt-1 text-lg font-semibold">
                      {metadata.title}
                    </div>
                  )}
                </div>

                <div>
                  <Label
                    htmlFor="authors"
                    className="text-sm font-medium text-muted-foreground"
                  >
                    AUTHORS
                  </Label>
                  {isEditing ? (
                    <Input
                      id="authors"
                      value={editedMetadata?.authors?.join(", ") || ""}
                      onChange={(e) =>
                        setEditedMetadata((prev) =>
                          prev
                            ? {
                                ...prev,
                                authors: e.target.value
                                  .split(",")
                                  .map((a) => a.trim())
                                  .filter((a) => a),
                              }
                            : prev
                        )
                      }
                      className="mt-1"
                      placeholder="Author 1, Author 2, Author 3"
                    />
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <UsersIcon className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {metadata.authors && metadata.authors.length > 0
                          ? metadata.authors.join(", ")
                          : "Not specified"}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <Label
                    htmlFor="publication_year"
                    className="text-sm font-medium text-muted-foreground"
                  >
                    PUBLICATION YEAR
                  </Label>
                  {isEditing ? (
                    <Input
                      id="publication_year"
                      type="number"
                      value={editedMetadata?.publication_year || ""}
                      onChange={(e) =>
                        setEditedMetadata((prev) =>
                          prev
                            ? {
                                ...prev,
                                publication_year: e.target.value
                                  ? parseInt(e.target.value)
                                  : undefined,
                              }
                            : prev
                        )
                      }
                      className="mt-1"
                      placeholder="2023"
                    />
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      {metadata.publication_year && (
                        <>
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                          <span>{metadata.publication_year}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <Label
                    htmlFor="publisher"
                    className="text-sm font-medium text-muted-foreground"
                  >
                    PUBLISHER
                  </Label>
                  {isEditing ? (
                    <Input
                      id="publisher"
                      value={editedMetadata?.publisher || ""}
                      onChange={(e) =>
                        setEditedMetadata((prev) =>
                          prev ? { ...prev, publisher: e.target.value } : prev
                        )
                      }
                      className="mt-1"
                      placeholder="Publisher name"
                    />
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      {metadata.publisher && (
                        <>
                          <GlobeIcon className="h-4 w-4 text-muted-foreground" />
                          <span>{metadata.publisher}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <Label
                    htmlFor="language"
                    className="text-sm font-medium text-muted-foreground"
                  >
                    LANGUAGE
                  </Label>
                  {isEditing ? (
                    <Input
                      id="language"
                      value={editedMetadata?.language || ""}
                      onChange={(e) =>
                        setEditedMetadata((prev) =>
                          prev ? { ...prev, language: e.target.value } : prev
                        )
                      }
                      className="mt-1"
                      placeholder="English"
                    />
                  ) : (
                    <span className="mt-1 block text-sm">
                      {metadata.language || "Not specified"}
                    </span>
                  )}
                </div>

                <div>
                  <Label
                    htmlFor="pages"
                    className="text-sm font-medium text-muted-foreground"
                  >
                    PAGES
                  </Label>
                  {isEditing ? (
                    <Input
                      id="pages"
                      value={editedMetadata?.numPages || ""}
                      onChange={(e) =>
                        setEditedMetadata((prev) =>
                          prev
                            ? {
                                ...prev,
                                numPages: parseInt(e.target.value) || 0,
                              }
                            : prev
                        )
                      }
                      className="mt-1"
                      placeholder="100"
                    />
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      {metadata.numPages && (
                        <>
                          <FileTextIcon className="h-4 w-4 text-muted-foreground" />
                          <span>{metadata.numPages}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label
                    htmlFor="doctype"
                    className="text-sm font-medium text-muted-foreground"
                  >
                    DOCUMENT TYPE *
                  </Label>
                  {isEditing ? (
                    <>
                      <Select
                        value={editedMetadata?.doctype || ""}
                        onValueChange={(value) =>
                          setEditedMetadata((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  doctype: value as
                                    | "Article"
                                    | "Book"
                                    | "Others",
                                }
                              : prev
                          )
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Article">Article</SelectItem>
                          <SelectItem value="Book">Book</SelectItem>
                          <SelectItem value="Others">Others</SelectItem>
                        </SelectContent>
                      </Select>
                      {validationErrors.doctype && (
                        <p className="text-sm text-red-500 mt-1">
                          {validationErrors.doctype}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant={
                          metadata.doctype === "Book" ? "default" : "secondary"
                        }
                      >
                        <BookOpenIcon className="h-3 w-3 mr-1" />
                        {metadata.doctype}
                      </Badge>
                    </div>
                  )}
                </div>

                <div>
                  <Label
                    htmlFor="category"
                    className="text-sm font-medium text-muted-foreground"
                  >
                    CATEGORY *
                  </Label>
                  {isEditing ? (
                    <>
                      <div className="mt-1 space-y-2">
                        <div>
                          <Label
                            htmlFor="main-category"
                            className="text-xs text-muted-foreground"
                          >
                            Main Category
                          </Label>
                          <Input
                            id="main-category"
                            value={
                              editedMetadata?.category?.split(" > ")[0] || ""
                            }
                            onChange={(e) => {
                              const newMain = e.target.value;
                              const currentParts =
                                editedMetadata?.category?.split(" > ") || [];
                              const currentSub =
                                currentParts.slice(1).join(" > ") || "";
                              const newCategory =
                                newMain +
                                (currentSub ? ` > ${currentSub}` : "");
                              setEditedMetadata((prev) =>
                                prev ? { ...prev, category: newCategory } : prev
                              );
                            }}
                            placeholder="e.g., Science"
                          />
                        </div>
                        <div>
                          <Label
                            htmlFor="sub-category"
                            className="text-xs text-muted-foreground"
                          >
                            Sub Category
                          </Label>
                          <Input
                            id="sub-category"
                            value={
                              editedMetadata?.category
                                ?.split(" > ")
                                .slice(1)
                                .join(" > ") || ""
                            }
                            onChange={(e) => {
                              const newSub = e.target.value;
                              const currentParts =
                                editedMetadata?.category?.split(" > ") || [];
                              const currentMain = currentParts[0] || "";
                              const newCategory =
                                currentMain + (newSub ? ` > ${newSub}` : "");
                              setEditedMetadata((prev) =>
                                prev ? { ...prev, category: newCategory } : prev
                              );
                            }}
                            placeholder="e.g., Physics"
                          />
                        </div>
                      </div>
                      {validationErrors.category && (
                        <p className="text-sm text-red-500 mt-1">
                          {validationErrors.category}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="mt-1">
                      {metadata.category && (
                        <Badge variant="outline">
                          <FileTextIcon className="h-3 w-3 mr-1" />
                          {metadata.category}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <Label
                    htmlFor="keywords"
                    className="text-sm font-medium text-muted-foreground"
                  >
                    KEYWORDS
                  </Label>
                  {isEditing ? (
                    <div className="mt-1">
                      <div className="flex flex-wrap gap-2 items-center">
                        {editedMetadata?.keywords?.map((keyword, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            {keyword}
                            <button
                              type="button"
                              className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditedMetadata((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        keywords:
                                          prev.keywords?.filter(
                                            (_, i) => i !== index
                                          ) || [],
                                      }
                                    : prev
                                );
                              }}
                            >
                              <XIcon className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                        <Input
                          value={newKeyword}
                          onChange={(e) => setNewKeyword(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === ",") {
                              e.preventDefault();
                              if (newKeyword.trim()) {
                                setEditedMetadata((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        keywords: [
                                          ...(prev.keywords || []),
                                          newKeyword.trim(),
                                        ],
                                      }
                                    : prev
                                );
                                setNewKeyword("");
                              }
                            } else if (e.key === "Backspace" && !newKeyword) {
                              setEditedMetadata((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      keywords:
                                        prev.keywords?.slice(0, -1) || [],
                                    }
                                  : prev
                              );
                            }
                          }}
                          placeholder="Add keyword..."
                          className="flex-1 min-w-20 border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-auto"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1">
                      {metadata.keywords && metadata.keywords.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {metadata.keywords.map((keyword, index) => (
                            <Badge key={index} variant="secondary">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">
                          No keywords
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <Label
                htmlFor="abstract"
                className="text-sm font-medium text-muted-foreground"
              >
                ABSTRACT
              </Label>
              {isEditing ? (
                <Textarea
                  id="abstract"
                  value={editedMetadata?.abstract || ""}
                  onChange={(e) =>
                    setEditedMetadata((prev) =>
                      prev ? { ...prev, abstract: e.target.value } : prev
                    )
                  }
                  className="mt-1 min-h-25"
                  placeholder="Document abstract or summary..."
                />
              ) : (
                <div className="mt-1">
                  {metadata.abstract ? (
                    <div className="text-sm leading-relaxed bg-muted/50 p-4 rounded-md">
                      {metadata.abstract}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">No abstract</span>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium text-muted-foreground">
                ADDITIONAL METADATA
              </Label>
              {isEditing ? (
                <div className="mt-1 space-y-2">
                  {editedMetadata?.metadata &&
                  Object.keys(editedMetadata.metadata).length > 0 ? (
                    Object.entries(editedMetadata.metadata).map(
                      ([key, value], _index) => (
                        <div key={key} className="flex gap-2 items-center">
                          <Input
                            placeholder="Key"
                            value={key}
                            onChange={(e) => {
                              const newKey = e.target.value;
                              setEditedMetadata((prev) => {
                                if (!prev?.metadata) return prev;
                                const newMetadata = { ...prev.metadata };
                                delete newMetadata[key];
                                newMetadata[newKey] = value;
                                return { ...prev, metadata: newMetadata };
                              });
                            }}
                            className="flex-1"
                          />
                          <Input
                            placeholder="Value"
                            value={
                              Array.isArray(value)
                                ? value.join(", ")
                                : String(value)
                            }
                            onChange={(e) =>
                              setEditedMetadata((prev) => {
                                if (!prev?.metadata) return prev;
                                const newMetadata = { ...prev.metadata };
                                newMetadata[key] = e.target.value;
                                return { ...prev, metadata: newMetadata };
                              })
                            }
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setEditedMetadata((prev) => {
                                if (!prev?.metadata) return prev;
                                const newMetadata = { ...prev.metadata };
                                delete newMetadata[key];
                                return { ...prev, metadata: newMetadata };
                              })
                            }
                          >
                            <XIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      )
                    )
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      No additional metadata
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setEditedMetadata((prev) => {
                        const currentMetadata = prev?.metadata || {};
                        const newKey = `field_${
                          Object.keys(currentMetadata).length + 1
                        }`;
                        return prev
                          ? {
                              ...prev,
                              metadata: { ...currentMetadata, [newKey]: "" },
                            }
                          : prev;
                      })
                    }
                  >
                    Add Field
                  </Button>
                </div>
              ) : (
                <div className="mt-1">
                  {metadata.metadata &&
                  Object.keys(metadata.metadata).length > 0 ? (
                    <div className="space-y-1 text-sm bg-muted/50 p-4 rounded-md">
                      {Object.entries(metadata.metadata).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-muted-foreground capitalize">
                            {key.replace(/_/g, " ")}:
                          </span>
                          <span className="ml-2 text-right">
                            {Array.isArray(value)
                              ? value.join(", ")
                              : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">
                      No additional metadata
                    </span>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* File Information */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                FILE INFORMATION
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Filename:</span>
                  <div className="font-mono text-xs bg-muted px-2 py-1 rounded mt-1">
                    {document.filename}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">File path:</span>
                  <div className="font-mono text-xs bg-muted px-2 py-1 rounded mt-1 break-all">
                    {document.path}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isEditing}
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            Delete
          </Button>

          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancel}>
                  <XIcon className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  <SaveIcon className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleEdit}>
                  <EditIcon className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button onClick={handleDownload}>
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
