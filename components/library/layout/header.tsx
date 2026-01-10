import { Button } from "@/components/ui/button";

interface HeaderProps {
  onCreateLibraryClick: () => void;
}

export function Header({
  onCreateLibraryClick,
}: HeaderProps) {
  return (
    <div className="mb-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Library
          </h1>
          <p className="text-muted-foreground text-lg max-w-md">
            Organize and browse your collection of books and articles with
            powerful search and filtering
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button onClick={onCreateLibraryClick}>
            Create Library
          </Button>
        </div>
      </div>
    </div>
  );
}
