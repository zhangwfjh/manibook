import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DownloadIcon, UsersIcon, CalendarIcon, BookOpenIcon, FileTextIcon, GlobeIcon, TagIcon, TrashIcon } from "lucide-react";
import { LibraryDocument } from "@/lib/library";

interface DocumentDetailDialogProps {
  document: LibraryDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload?: (document: LibraryDocument) => void;
  onDelete?: (document: LibraryDocument) => void;
}

export function DocumentDetailDialog({
  document,
  open,
  onOpenChange,
  onDownload,
  onDelete
}: DocumentDetailDialogProps) {
  if (!document) return null;

  const { metadata } = document;

  const handleDownload = () => {
    onDownload?.(document);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      try {
        const response = await fetch(`/api/library/delete?filename=${encodeURIComponent(document.filename)}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          onDelete?.(document);
          onOpenChange(false);
        } else {
          alert('Failed to delete document');
        }
      } catch (error) {
        console.error('Error deleting document:', error);
        alert('Error deleting document');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-start gap-4">
            {document.coverUrl && (
              <div className="flex-shrink-0">
                <img
                  src={document.coverUrl}
                  alt={`${metadata.title} cover`}
                  className="w-24 h-32 object-cover rounded-lg border shadow-sm"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
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
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">TYPE & CATEGORY</h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={metadata.doctype === 'Book' ? 'default' : 'secondary'}>
                      <BookOpenIcon className="h-3 w-3 mr-1" />
                      {metadata.doctype}
                    </Badge>
                    {metadata.category && (
                      <Badge variant="outline">
                        <FileTextIcon className="h-3 w-3 mr-1" />
                        {metadata.category}
                      </Badge>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">AUTHORS</h3>
                  {metadata.authors && metadata.authors.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <UsersIcon className="h-4 w-4 text-muted-foreground" />
                      <span>{metadata.authors.join(', ')}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Not specified</span>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">PUBLICATION</h3>
                  <div className="space-y-1">
                    {metadata.publication_year && (
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        <span>{metadata.publication_year}</span>
                      </div>
                    )}
                    {metadata.publisher && (
                      <div className="flex items-center gap-2">
                        <GlobeIcon className="h-4 w-4 text-muted-foreground" />
                        <span>{metadata.publisher}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">LANGUAGE</h3>
                  <span className="text-sm">{metadata.language || 'Not specified'}</span>
                </div>

                {metadata.metadata && Object.keys(metadata.metadata).length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">ADDITIONAL METADATA</h3>
                    <div className="space-y-1 text-sm">
                      {Object.entries(metadata.metadata).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-muted-foreground capitalize">
                            {key.replace(/_/g, ' ')}:
                          </span>
                          <span className="ml-2 text-right">
                            {Array.isArray(value) ? value.join(', ') : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Keywords */}
            {metadata.keywords && metadata.keywords.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <TagIcon className="h-4 w-4" />
                  KEYWORDS
                </h3>
                <div className="flex flex-wrap gap-2">
                  {metadata.keywords.map((keyword, index) => (
                    <Badge key={index} variant="secondary">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Abstract */}
            {metadata.abstract && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">ABSTRACT</h3>
                <div className="text-sm leading-relaxed bg-muted/50 p-4 rounded-md">
                  {metadata.abstract}
                </div>
              </div>
            )}

            {/* File Information */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">FILE INFORMATION</h3>
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
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            Delete Document
          </Button>
          <Button onClick={handleDownload}>
            <DownloadIcon className="h-4 w-4 mr-2" />
            Download Document
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
