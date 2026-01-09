import { NextRequest, NextResponse } from 'next/server';
import { getLibraryPrisma, validateLibraryAccess } from '@/lib/library/api-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const { searchParams } = new URL(request.url);

    // Filter parameters (same as documents endpoint)
    const category = searchParams.get('category');
    const searchQuery = searchParams.get('search');
    const selectedKeywords = searchParams.get('keywords')?.split(',').filter(Boolean) || [];
    const selectedFormats = searchParams.get('formats')?.split(',').filter(Boolean) || [];
    const selectedAuthors = searchParams.get('authors')?.split(',').filter(Boolean) || [];
    const selectedPublishers = searchParams.get('publishers')?.split(',').filter(Boolean) || [];
    const showFavoritesOnly = searchParams.get('favoritesOnly') === 'true';

    // Validate library access
    const validation = await validateLibraryAccess(name);
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const prisma = await getLibraryPrisma(name);

    // Build WHERE conditions for filtering (same as documents endpoint)
    const whereConditions: Record<string, unknown> = {};

    // Category filtering
    if (category) {
      const categoryParts = category.split(" > ");
      if (categoryParts.length >= 1) {
        const selectedDoctype = categoryParts[0];
        whereConditions.doctype = selectedDoctype;

        if (categoryParts.length > 1) {
          const selectedCategoryPath = categoryParts.slice(1).join(" > ");
          whereConditions.category = {
            startsWith: selectedCategoryPath
          };
        }
      }
    }

    // Keywords filtering
    if (selectedKeywords.length > 0) {
      whereConditions.OR = selectedKeywords.map((keyword: string) => ({
        keywords: {
          contains: keyword
        }
      }));
    }

    // Format filtering
    if (selectedFormats.length > 0) {
      whereConditions.format = {
        in: selectedFormats.map((f: string) => f.toLowerCase())
      };
    }

    // Authors filtering
    if (selectedAuthors.length > 0) {
      const authorConditions = selectedAuthors.map((author: string) => ({
        authors: {
          contains: author
        }
      }));

      const orConditions = (whereConditions.OR as unknown[] | undefined);
      if (orConditions) {
        orConditions.push(...authorConditions);
      } else {
        whereConditions.OR = authorConditions;
      }
    }

    // Publishers filtering
    if (selectedPublishers.length > 0) {
      whereConditions.publisher = {
        in: selectedPublishers
      };
    }

    // Favorites filtering
    if (showFavoritesOnly) {
      whereConditions.favorite = true;
    }

    // Search query filtering
    if (searchQuery) {
      const searchCondition = {
        OR: [
          { title: { contains: searchQuery } },
          { authors: { contains: searchQuery } },
          { keywords: { contains: searchQuery } },
          { publisher: { contains: searchQuery } },
        ]
      };

      const andConditions = (whereConditions.AND as unknown[] | undefined);
      if (!andConditions) {
        whereConditions.AND = [];
      }
      (whereConditions.AND as unknown[]).push(searchCondition);
    }

    // Fetch all documents matching filters (no pagination)
    const dbDocuments = await prisma.document.findMany({
      where: whereConditions,
      select: {
        format: true,
        keywords: true,
        authors: true,
        publisher: true,
      },
    });

    // Aggregate filter options
    const formatCounts: Record<string, number> = {};
    const keywordCounts: Record<string, number> = {};
    const authorCounts: Record<string, number> = {};
    const publisherCounts: Record<string, number> = {};

    for (const doc of dbDocuments) {
      // Format (uppercase)
      if (doc.format) {
        const format = doc.format.toUpperCase();
        formatCounts[format] = (formatCounts[format] || 0) + 1;
      }

      // Keywords (title case)
      if (doc.keywords) {
        try {
          const keywordArray = JSON.parse(doc.keywords as string) as string[];
          for (const kw of keywordArray) {
            const titleCaseKw = kw.replace(/\b\w/g, (l: string) => l.toUpperCase());
            keywordCounts[titleCaseKw] = (keywordCounts[titleCaseKw] || 0) + 1;
          }
        } catch {
          continue;
        }
      }

      // Authors (title case)
      if (doc.authors) {
        try {
          const authorArray = JSON.parse(doc.authors as string) as string[];
          for (const author of authorArray) {
            const titleCaseAuthor = author.replace(/\b\w/g, (l: string) => l.toUpperCase());
            authorCounts[titleCaseAuthor] = (authorCounts[titleCaseAuthor] || 0) + 1;
          }
        } catch {
          continue;
        }
      }

      // Publisher (exact case)
      if (doc.publisher) {
        publisherCounts[doc.publisher] = (publisherCounts[doc.publisher] || 0) + 1;
      }
    }

    return NextResponse.json({
      formats: formatCounts,
      keywords: keywordCounts,
      authors: authorCounts,
      publishers: publisherCounts,
    });
  } catch (error) {
    console.error('Error in filter-options API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
