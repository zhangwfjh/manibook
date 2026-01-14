export function HomeHeader() {
  return (
    <div className="mb-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          ManiBook
        </h1>
        <p className="text-muted-foreground text-lg max-w-md">
          Organize and browse your collection of books with powerful search
          and filtering
        </p>
      </div>
    </div>
  );
}