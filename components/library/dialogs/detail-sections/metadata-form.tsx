import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { XIcon } from "lucide-react";
import { Metadata } from "@/lib/library";

interface DialogMetadataFormProps {
  editedMetadata: Metadata | null;
  onChange: (metadata: Metadata) => void;
  validationErrors: Record<string, string>;
}

export function MetadataForm({
  editedMetadata,
  onChange,
  validationErrors,
}: DialogMetadataFormProps) {
  const handleFieldChange = (field: keyof Metadata, value: unknown) => {
    const updated = {
      ...editedMetadata,
      [field]: value,
    };
    onChange(updated as Metadata);
  };

  const handleAuthorsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const authors = e.target.value
      .split(",")
      .map((a) => a.trim())
      .filter((a) => a);
    handleFieldChange("authors", authors);
  };

  const handleCategoryMainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMain = e.target.value;
    const currentParts = editedMetadata?.category?.split(" > ") || [];
    const currentSub = currentParts.slice(1).join(" > ") || "";
    const newCategory = newMain + (currentSub ? ` > ${currentSub}` : "");
    handleFieldChange("category", newCategory);
  };

  const handleCategorySubChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSub = e.target.value;
    const currentParts = editedMetadata?.category?.split(" > ") || [];
    const currentMain = currentParts[0] || "";
    const newCategory = currentMain + (newSub ? ` > ${newSub}` : "");
    handleFieldChange("category", newCategory);
  };

  const handleKeywordRemove = (index: number) => {
    const keywords =
      editedMetadata?.keywords?.filter((_, i) => i !== index) || [];
    handleFieldChange("keywords", keywords);
  };

  const handleKeywordKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    newValue: string,
  ) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (newValue.trim()) {
        const keywords = [...(editedMetadata?.keywords || []), newValue.trim()];
        handleFieldChange("keywords", keywords);
      }
    } else if (e.key === "Backspace" && !newValue) {
      handleKeywordRemove((editedMetadata?.keywords?.length || 0) - 1);
    }
  };

  if (!editedMetadata) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-3">
        <div>
          <Label
            htmlFor="title"
            className="text-sm font-medium text-muted-foreground"
          >
            TITLE *
          </Label>
          <Input
            id="title"
            value={editedMetadata.title || ""}
            onChange={(e) => handleFieldChange("title", e.target.value)}
            className="mt-1"
          />
          {validationErrors.title && (
            <Alert variant="destructive" className="mt-1">
              <AlertDescription>{validationErrors.title}</AlertDescription>
            </Alert>
          )}
        </div>

        <div>
          <Label
            htmlFor="authors"
            className="text-sm font-medium text-muted-foreground"
          >
            AUTHORS
          </Label>
          <Input
            id="authors"
            value={editedMetadata.authors?.join(", ") || ""}
            onChange={handleAuthorsChange}
            className="mt-1"
            placeholder="Author 1, Author 2, Author 3"
          />
        </div>

        <div>
          <Label
            htmlFor="publicationYear"
            className="text-sm font-medium text-muted-foreground"
          >
            PUBLICATION YEAR
          </Label>
          <Input
            id="publicationYear"
            type="number"
            value={editedMetadata.publicationYear || "?"}
            onChange={(e) =>
              handleFieldChange(
                "publicationYear",
                e.target.value ? parseInt(e.target.value) : undefined,
              )
            }
            className="mt-1"
            placeholder="2023"
          />
        </div>

        <div>
          <Label
            htmlFor="publisher"
            className="text-sm font-medium text-muted-foreground"
          >
            PUBLISHER
          </Label>
          <Input
            id="publisher"
            value={editedMetadata.publisher || ""}
            onChange={(e) => handleFieldChange("publisher", e.target.value)}
            className="mt-1"
            placeholder="Publisher name"
          />
        </div>

        <div>
          <Label
            htmlFor="language"
            className="text-sm font-medium text-muted-foreground"
          >
            LANGUAGE
          </Label>
          <Input
            id="language"
            value={editedMetadata.language || ""}
            onChange={(e) => handleFieldChange("language", e.target.value)}
            className="mt-1"
            placeholder="English"
          />
        </div>

        <div>
          <Label
            htmlFor="pages"
            className="text-sm font-medium text-muted-foreground"
          >
            PAGES
          </Label>
          <Input
            id="pages"
            value={editedMetadata.numPages || ""}
            onChange={(e) =>
              handleFieldChange("numPages", parseInt(e.target.value) || 0)
            }
            className="mt-1"
            placeholder="100"
          />
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
          <Input
            id="doctype"
            value={editedMetadata.doctype || ""}
            onChange={(e) => handleFieldChange("doctype", e.target.value)}
            className="mt-1"
            placeholder="e.g., Book, Paper, Report, Manual, Others"
          />
          {validationErrors.doctype && (
            <Alert variant="destructive" className="mt-1">
              <AlertDescription>{validationErrors.doctype}</AlertDescription>
            </Alert>
          )}
        </div>

        <div>
          <Label
            htmlFor="category"
            className="text-sm font-medium text-muted-foreground"
          >
            CATEGORY *
          </Label>
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
                value={editedMetadata.category?.split(" > ")[0] || ""}
                onChange={handleCategoryMainChange}
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
                  editedMetadata.category?.split(" > ").slice(1).join(" > ") ||
                  ""
                }
                onChange={handleCategorySubChange}
                placeholder="e.g., Physics"
              />
            </div>
          </div>
          {validationErrors.category && (
            <Alert variant="destructive" className="mt-1">
              <AlertDescription>{validationErrors.category}</AlertDescription>
            </Alert>
          )}
        </div>

        <div>
          <Label
            htmlFor="keywords"
            className="text-sm font-medium text-muted-foreground"
          >
            KEYWORDS
          </Label>
          <div className="mt-1">
            <KeywordEditor
              keywords={editedMetadata.keywords || []}
              onRemove={handleKeywordRemove}
              onKeyDown={handleKeywordKeyDown}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface KeywordEditorProps {
  keywords: string[];
  onRemove: (index: number) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, value: string) => void;
}

export const KeywordEditor = ({
  keywords,
  onRemove,
  onKeyDown,
}: KeywordEditorProps) => {
  const [inputValue, setInputValue] = React.useState("");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    onKeyDown(e, inputValue);
    if (e.key === "Enter" || e.key === ",") {
      setInputValue("");
    }
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {keywords.map((keyword, index) => (
        <Badge
          key={index}
          variant="secondary"
          className="flex items-center gap-1"
        >
          {keyword}
          <button
            type="button"
            className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
            onClick={() => onRemove(index)}
          >
            <XIcon className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add keyword..."
        className="flex-1 min-w-20 border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-auto"
      />
    </div>
  );
};
