import { NextResponse } from 'next/server';
import { validateLibraryAccess, getLibraryPrisma, buildCategoryTreeFromAggregatedData } from '@/lib/library/api-utils';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;

    // Validate library access
    const validation = await validateLibraryAccess(name);
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const prisma = await getLibraryPrisma(name);

    // Efficiently get category data with counts using database aggregation
    const categoryData = await prisma.$queryRaw<Array<{
      doctype: string;
      category: string;
      count: bigint;
    }>>`
      SELECT
        doctype,
        category,
        COUNT(*) as count
      FROM documents
      WHERE category IS NOT NULL AND category != ''
      GROUP BY doctype, category
      ORDER BY doctype, category
    `;

    // Convert count from bigint to number
    const processedData = categoryData.map(row => ({
      doctype: row.doctype,
      category: row.category,
      count: Number(row.count)
    }));

    // Build category tree from aggregated data
    const categories = buildCategoryTreeFromAggregatedData(processedData);

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error in categories API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
