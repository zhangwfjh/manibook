'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { LayoutGridIcon, ListIcon, SearchIcon, UploadIcon } from 'lucide-react';
import { DocumentCard } from '@/components/library/document-card';
import { DocumentList } from '@/components/library/document-list';
import { CategoryTree } from '@/components/library/category-tree';
import { TagFilter } from '@/components/library/tag-filter';
import { DocumentDetailDialog } from '@/components/library/document-detail-dialog';
import { LibraryDocument, LibraryCategory } from '@/lib/library';

type ViewMode = 'card' | 'list';

export default function LibraryPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [categories, setCategories] = useState<LibraryCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<LibraryDocument | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchLibraryData();
  }, []);

  const fetchLibraryData = async () => {
    try {
      const response = await fetch('/api/library');
      const data = await response.json();
      setDocuments(data.documents || []);
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Error fetching library data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    let matchesCategory = !selectedCategory;
    if (selectedCategory) {
      // Handle the new category structure: selectedCategory includes doctype prefix
      const selectedParts = selectedCategory.split(' > ');
      if (selectedParts.length >= 2) {
        const selectedDoctype = selectedParts[0];
        const selectedCategoryPath = selectedParts.slice(1).join(' > ');

        // Check if doctype matches and category path matches
        const doctypeMatches = doc.metadata.doctype === selectedDoctype;
        const categoryMatches = !selectedCategoryPath ||
          (doc.metadata.category && doc.metadata.category.startsWith(selectedCategoryPath));

        matchesCategory = doctypeMatches && Boolean(categoryMatches);
      }
    }

    const matchesTags = selectedTags.length === 0 ||
      selectedTags.some(tag => doc.metadata.keywords?.includes(tag));
    const matchesSearch = !searchQuery ||
      doc.metadata.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.metadata.authors?.some(author =>
        author.toLowerCase().includes(searchQuery.toLowerCase())
      ) ||
      doc.metadata.keywords?.some(keyword =>
        keyword.toLowerCase().includes(searchQuery.toLowerCase())
      );
    return matchesCategory && matchesTags && matchesSearch;
  });

  const handleDownload = (doc: LibraryDocument) => {
    // Create a temporary link to download the file
    const link = window.document.createElement('a');
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
                    variant={viewMode === 'card' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('card')}
                  >
                    <LayoutGridIcon className="h-4 w-4 mr-2" />
                    Cards
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <ListIcon className="h-4 w-4 mr-2" />
                    List
                  </Button>
                  <Button variant="outline" size="sm">
                    <UploadIcon className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''} found
              </p>
            </div>

            {filteredDocuments.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-muted-foreground">
                  <p className="text-lg mb-2">No documents found</p>
                  <p>Try adjusting your search or category filter</p>
                </div>
              </div>
            ) : viewMode === 'card' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDocuments.map((document, index) => (
                  <DocumentCard
                    key={index}
                    document={document}
                    onClick={handleDocumentClick}
                    onDownload={handleDownload}
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
        />
      </div>
    </div>
  );
}
