import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

type ProductRow = {
  id: string
  name: string
  unit: string
  sellingPrice: string | number
  stock: number
  minStock: string | number
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? ''
  const limitParam = searchParams.get('limit')
  const limit = Math.min(limitParam ? parseInt(limitParam, 10) || 10 : 10, 50)

  if (q.length < 2) {
    return Response.json([])
  }

  try {
    // SQLite does not support mode: 'insensitive' — use raw SQL with LOWER()
    const pattern = `%${q.toLowerCase()}%`
    const products = await prisma.$queryRaw<ProductRow[]>`
      SELECT id, name, unit, sellingPrice, stock, "minStock"
      FROM "Product"
      WHERE "isActive" = 1
        AND lower(name) LIKE ${pattern}
      ORDER BY name ASC
      LIMIT ${limit}
    `

    return Response.json(
      products.map((p) => ({
        id: p.id,
        name: p.name,
        unit: p.unit,
        sellingPrice: Number(p.sellingPrice),
        stock: p.stock,
        minStock: Number(p.minStock),
      }))
    )
  } catch (err) {
    console.error('[stock/search]', err)
    return Response.json({ error: 'Gagal mencari produk' }, { status: 500 })
  }
}
