import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Database utility functions
export const dbUtils = {
  // Get document count
  async getDocumentCount(): Promise<number> {
    return await prisma.document.count()
  },

  // Get favorite documents
  async getFavoriteDocuments() {
    return await prisma.document.findMany({
      where: { favorite: true },
      orderBy: { updatedAt: 'desc' },
    })
  },

  // Search documents by title or authors
  async searchDocuments(query: string) {
    return await prisma.document.findMany({
      where: {
        OR: [
          { title: { contains: query } },
          { authors: { contains: query } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
    })
  },

  // Get documents by category
  async getDocumentsByCategory(category: string) {
    return await prisma.document.findMany({
      where: { category: { startsWith: category } },
      orderBy: { updatedAt: 'desc' },
    })
  },

  // Get document statistics
  async getDocumentStats() {
    const [total, favorites, byDoctype] = await Promise.all([
      prisma.document.count(),
      prisma.document.count({ where: { favorite: true } }),
      prisma.document.groupBy({
        by: ['doctype'],
        _count: { doctype: true },
      }),
    ])

    return {
      total,
      favorites,
      byDoctype: byDoctype.reduce((acc, curr) => {
        acc[curr.doctype] = curr._count.doctype
        return acc
      }, {} as Record<string, number>),
    }
  },
}
