'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Plus, Search, Trash2, List, Grid3X3, Tag, BookMarked, XCircleIcon, ArrowUpDown, Eye, Image as ImageIcon, MoreVertical } from 'lucide-react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LibrarySidebar } from '@/components/library-sidebar';
import {
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

interface Ebook {
  id: string;
  title: string;
  author: string;
  description?: string;
  coverUrl?: string;
  addedDate: Date;
  genre?: string;
  tags?: string[];
  pages?: number;
}

const GENRES = [
  "Fiction", "Non-Fiction", "Science Fiction", "Fantasy", "Mystery", 
  "Thriller", "Romance", "Biography", "History", "Science", 
  "Self-Help", "Children", "Young Adult", "Poetry", "Drama"
];

interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
}

export default function LibraryPage() {
  const [ebooks, setEbooks] = useState<Ebook[]>([
    {
      id: '1',
      title: 'The Art of Computer Programming',
      author: 'Donald Knuth',
      description: 'Fundamental algorithms and combinatorial algorithms',
      addedDate: new Date(),
      genre: 'Science',
      tags: ['programming', 'algorithms', 'computer science'],
      pages: 3168,
      coverUrl: ''
    },
    {
      id: '2',
      title: 'Design Patterns',
      author: 'Gang of Four',
      description: 'Elements of Reusable Object-Oriented Software',
      addedDate: new Date(),
      genre: 'Science',
      tags: ['programming', 'software engineering', 'design'],
      pages: 416,
      coverUrl: ''
    }
  ]);
  
  const [genres, setGenres] = useState<TreeNode[]>([
    {
      id: 'fiction',
      name: 'Fiction',
      children: [
        { id: 'sci-fi', name: 'Science Fiction' },
        { id: 'fantasy', name: 'Fantasy' },
        { id: 'mystery', name: 'Mystery' },
      ]
    },
    {
      id: 'non-fiction',
      name: 'Non-Fiction',
      children: [
        { id: 'biography', name: 'Biography' },
        { id: 'history', name: 'History' },
        { id: 'science', name: 'Science' },
      ]
    }
  ]);
  
  const [tags, setTags] = useState<TreeNode[]>([
    { id: 'programming', name: 'Programming' },
    { id: 'adventure', name: 'Adventure' },
    { id: 'classic', name: 'Classic' },
    { id: 'bestseller', name: 'Bestseller' },
  ]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    description: '',
    genre: '',
    tags: '',
    pages: '',
    coverUrl: ''
  });
  const [bookToDelete, setBookToDelete] = useState<Ebook | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [sortOption, setSortOption] = useState<string>('title');

  const filteredBooks = ebooks.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          book.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesGenre = selectedGenre === 'all' || book.genre === selectedGenre;
    
    return matchesSearch && matchesGenre;
  }).sort((a, b) => {
    switch (sortOption) {
      case 'title':
        return a.title.localeCompare(b.title);
      case 'author':
        return a.author.localeCompare(b.author);
      case 'addedDate':
        return b.addedDate.getTime() - a.addedDate.getTime(); // Newest first
      case 'pages':
        if (a.pages === undefined && b.pages === undefined) return 0;
        if (a.pages === undefined) return 1;
        if (b.pages === undefined) return -1;
        return b.pages - a.pages; // Highest page count first
      case 'genre':
        if (!a.genre && !b.genre) return 0;
        if (!a.genre) return 1;
        if (!b.genre) return -1;
        return a.genre.localeCompare(b.genre);
      default:
        return 0;
    }
  });

  const allTags = Array.from(new Set(ebooks.flatMap(book => book.tags || [])));

  const handleAddBook = () => {
    if (newBook.title && newBook.author) {
      const book: Ebook = {
        id: Date.now().toString(),
        title: newBook.title,
        author: newBook.author,
        description: newBook.description,
        addedDate: new Date(),
        genre: newBook.genre || undefined,
        tags: newBook.tags ? newBook.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
        pages: newBook.pages ? parseInt(newBook.pages, 10) : undefined,
        coverUrl: newBook.coverUrl || undefined
      };
      
      setEbooks([book, ...ebooks]);
      setNewBook({ title: '', author: '', description: '', genre: '', tags: '', pages: '', coverUrl: '' });
      setShowAddForm(false);
    }
  };

  const confirmDelete = (book: Ebook) => {
    setBookToDelete(book);
  };

  const handleDelete = () => {
    if (bookToDelete) {
      setEbooks(ebooks.filter(book => book.id !== bookToDelete.id));
      setBookToDelete(null);
    }
  };

  const handleAddGenre = (parentId: string | null) => {
    // In a real app, this would open a dialog to add a new genre
    console.log('Add genre under parent:', parentId);
  };

  const handleEditGenre = (id: string) => {
    // In a real app, this would open a dialog to edit the genre
    console.log('Edit genre:', id);
  };

  const handleDeleteGenre = (id: string) => {
    // In a real app, this would delete the genre
    console.log('Delete genre:', id);
  };

  const handleAddTag = (parentId: string | null) => {
    // In a real app, this would open a dialog to add a new tag
    console.log('Add tag under parent:', parentId);
  };

  const handleEditTag = (id: string) => {
    // In a real app, this would open a dialog to edit the tag
    console.log('Edit tag:', id);
  };

  const handleDeleteTag = (id: string) => {
    // In a real app, this would delete the tag
    console.log('Delete tag:', id);
  };

  return (
    <SidebarProvider>
      <div className="flex flex-1">
        <LibrarySidebar 
          items={genres}
          onAddItem={handleAddGenre}
          onEditItem={handleEditGenre}
          onDeleteItem={handleDeleteGenre}
          title="Genres"
        />
        <div className="flex-1">
          <div className="container mx-auto py-8">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <SidebarTrigger />
                <h1 className="text-3xl font-bold">My eBook Library</h1>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setViewMode('card')}
                  className={viewMode === 'card' ? 'bg-gray-100 dark:bg-gray-800' : ''}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setViewMode('list')}
                  className={viewMode === 'list' ? 'bg-gray-100 dark:bg-gray-800' : ''}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button onClick={() => setShowAddForm(!showAddForm)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Book
                </Button>
              </div>
            </div>

            {showAddForm && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Add New Book</CardTitle>
                  <CardDescription>Add a new eBook to your library</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input 
                      id="title" 
                      value={newBook.title} 
                      onChange={(e) => setNewBook({...newBook, title: e.target.value})} 
                      placeholder="Book title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="author">Author</Label>
                    <Input 
                      id="author" 
                      value={newBook.author} 
                      onChange={(e) => setNewBook({...newBook, author: e.target.value})} 
                      placeholder="Author name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="coverUrl">Cover Image URL</Label>
                    <Input 
                      id="coverUrl" 
                      value={newBook.coverUrl} 
                      onChange={(e) => setNewBook({...newBook, coverUrl: e.target.value})} 
                      placeholder="https://example.com/book-cover.jpg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pages">Pages</Label>
                    <Input 
                      id="pages" 
                      type="number"
                      value={newBook.pages} 
                      onChange={(e) => setNewBook({...newBook, pages: e.target.value})} 
                      placeholder="Number of pages"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="genre">Genre</Label>
                    <Select value={newBook.genre} onValueChange={(value) => setNewBook({...newBook, genre: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a genre" />
                      </SelectTrigger>
                      <SelectContent>
                        {GENRES.map(genre => (
                          <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags</Label>
                    <Input 
                      id="tags" 
                      value={newBook.tags} 
                      onChange={(e) => setNewBook({...newBook, tags: e.target.value})} 
                      placeholder="Comma separated tags (e.g. fiction, adventure, classic)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea 
                      id="description" 
                      value={newBook.description} 
                      onChange={(e) => setNewBook({...newBook, description: e.target.value})} 
                      placeholder="Book description"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddBook}>Save Book</Button>
                    <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search books..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setSearchTerm('')}
                  >
                    <span className="sr-only">Clear search</span>
                    <XCircleIcon className="h-4 w-4 text-gray-400" />
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <div className="w-full sm:w-48">
                  <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by genre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Genres</SelectItem>
                      {GENRES.map(genre => (
                        <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full sm:w-48">
                  <Select value={sortOption} onValueChange={setSortOption}>
                    <SelectTrigger>
                      <div className="flex items-center gap-2">
                        <ArrowUpDown className="h-4 w-4" />
                        <SelectValue placeholder="Sort by" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="title">Title (A-Z)</SelectItem>
                      <SelectItem value="author">Author (A-Z)</SelectItem>
                      <SelectItem value="pages">Pages</SelectItem>
                      <SelectItem value="genre">Genre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Tag className="h-4 w-4 text-gray-500 mt-1" />
                {allTags.map(tag => (
                  <Badge 
                    key={tag} 
                    variant={searchTerm === tag ? "default" : "secondary"}
                    className="cursor-pointer"
                    onClick={() => setSearchTerm(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {filteredBooks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg text-gray-500">No books found</p>
                <p className="text-sm text-gray-400">Add your first book to get started</p>
              </div>
            ) : viewMode === 'card' ? (
              // Card View
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBooks.map((book) => (
                  <Card key={book.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="line-clamp-2">{book.title}</CardTitle>
                          <CardDescription>by {book.author}</CardDescription>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              <span>View</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => confirmDelete(book)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-4">
                        <div className="grow min-w-0">
                          {book.description && (
                            <p className="text-sm text-gray-600 line-clamp-3 mb-2">{book.description}</p>
                          )}
                          <div className="flex flex-wrap gap-2 mb-2">
                            {book.genre && (
                              <Badge variant="outline" className="flex items-center gap-1">
                                <BookMarked className="h-3 w-3" />
                                {book.genre}
                              </Badge>
                            )}
                            {book.tags?.map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="shrink-0">
                          {book.coverUrl ? (
                            <div className="relative w-24 h-36">
                              <Image 
                                src={book.coverUrl} 
                                alt={`${book.title} cover`} 
                                fill
                                className="object-cover rounded shadow"
                                onErrorCapture={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            </div>
                          ) : (
                            <div className="flex items-center justify-center w-24 h-36 bg-gray-200 dark:bg-gray-700 rounded shadow">
                              <ImageIcon className="h-12 w-12 text-gray-400" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          Added: {book.addedDate.toLocaleDateString()}
                          {book.pages && ` • ${book.pages} pages`}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              // List View
              <div className="border rounded-lg">
                <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-100 dark:bg-gray-800 font-semibold border-b">
                  <div className="col-span-3">Title</div>
                  <div className="col-span-2">Author</div>
                  <div className="col-span-2">Genre</div>
                  <div className="col-span-1">Pages</div>
                  <div className="col-span-2">Tags</div>
                  <div className="col-span-2">Cover</div>
                </div>
                {filteredBooks.map((book) => (
                  <div key={book.id} className="grid grid-cols-12 gap-4 px-4 py-3 border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                    <div className="col-span-3 font-medium truncate">
                      <div className="truncate">{book.title}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Added: {book.addedDate.toLocaleDateString()}
                      </div>
                    </div>
                    <div className="col-span-2 truncate">{book.author}</div>
                    <div className="col-span-2">
                      {book.genre && (
                        <Badge variant="outline" className="text-xs">
                          {book.genre}
                        </Badge>
                      )}
                    </div>
                    <div className="col-span-1">
                      {book.pages ? book.pages : '-'}
                    </div>
                    <div className="col-span-2">
                      <div className="flex flex-wrap gap-1">
                        {book.tags?.slice(0, 2).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {book.tags && book.tags.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{book.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="col-span-1">
                      {book.coverUrl ? (
                        <div className="relative w-8 h-10">
                          <Image 
                            src={book.coverUrl} 
                            alt={`${book.title} cover`} 
                            fill
                            className="object-cover rounded"
                            onErrorCapture={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center w-8 h-10 bg-gray-200 dark:bg-gray-700 rounded">
                          <ImageIcon className="h-4 w-4 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            <span>View</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => confirmDelete(book)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <LibrarySidebar 
          items={tags}
          onAddItem={handleAddTag}
          onEditItem={handleEditTag}
          onDeleteItem={handleDeleteTag}
          title="Tags"
          side="right"
        />
      </div>

      <Dialog open={!!bookToDelete} onOpenChange={(open) => !open && setBookToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Book</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{bookToDelete?.title}&quot; by {bookToDelete?.author}? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}