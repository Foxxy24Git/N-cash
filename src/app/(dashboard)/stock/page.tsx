import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import StockFilterBar, { type StatusFilter } from './_components/StockFilterBar'
import StockTable, { type ProductRow } from './_components/StockTable'
import { ProductFormDialog } from './_components/ProductFormDialog'
import { ImportDialog } from './_components/ImportDialog'
import { ExportStockButton } from './_components/ExportStockButton'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Stok — N-Cash' }

const PAGE_SIZE = 50

interface PageProps {
  searchParams: Record<string, string | string[] | undefined>
}

function parseParams(searchParams: Record<string, string | string[] | undefined>) {
  const q = typeof searchParams.q === 'string' ? searchParams.q.trim() : ''
  const filterAlias = typeof searchParams.filter === 'string' ? searchParams.filter : ''
  const rawStatus = typeof searchParams.status === 'string' ? searchParams.status : 'all'
  const validStatuses: StatusFilter[] = ['all', 'normal', 'low', 'out', 'low_out']
  const status: StatusFilter = filterAlias === 'low_stock'
    ? 'low_out'
    : validStatuses.includes(rawStatus as StatusFilter)
      ? (rawStatus as StatusFilter)
      : 'all'
  const raw = typeof searchParams.page === 'string' ? parseInt(searchParams.page, 10) : 1
  const page = isNaN(raw) || raw < 1 ? 1 : raw
  return { q, status, page }
}

export default async function StockPage({ searchParams }: PageProps) {
  const { q, status, page } = parseParams(searchParams)

  const allProducts = await prisma.product.findMany({
    where: {
      isActive: true,
      ...(q ? { name: { contains: q } } : {}),
    },
    orderBy: { name: 'asc' },
    select: {
      id:           true,
      name:         true,
      unit:         true,
      buyPrice:     true,
      sellingPrice: true,
      stock:        true,
      minStock:     true,
      notes:        true,
    },
  })

  const withComputed = allProducts.map((p): ProductRow => {
    const buyPrice     = Number(p.buyPrice)
    const sellingPrice = Number(p.sellingPrice)
    const margin = buyPrice > 0
      ? `${(((sellingPrice - buyPrice) / buyPrice) * 100).toFixed(1)}%`
      : '—'
    const stockStatus: 'normal' | 'low' | 'out' =
      p.stock === 0           ? 'out'
      : p.stock <= p.minStock ? 'low'
      : 'normal'
    return {
      id: p.id,
      name: p.name,
      unit: p.unit,
      buyPrice,
      sellingPrice,
      margin,
      stock: p.stock,
      minStock: p.minStock,
      stockStatus,
      notes: p.notes,
    }
  })

  const filtered =
    status === 'all'     ? withComputed
    : status === 'low_out' ? withComputed.filter((p) => p.stockStatus !== 'normal')
    : withComputed.filter((p) => p.stockStatus === status)

  const totalCount  = filtered.length
  const totalPages  = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const currentPage = Math.min(Math.max(1, page), totalPages)
  const rows        = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const buildUrl = (p: number) => {
    const qs = new URLSearchParams()
    if (q) qs.set('q', q)
    if (status !== 'all') qs.set('status', status)
    qs.set('page', String(p))
    return `/stock?${qs.toString()}`
  }

  const prevUrl = currentPage > 1          ? buildUrl(currentPage - 1) : null
  const nextUrl = currentPage < totalPages ? buildUrl(currentPage + 1) : null

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Manajemen Stok</h1>
        <div className="flex items-center gap-2">
          <ExportStockButton />
          <ImportDialog />
          <ProductFormDialog mode="add" />
        </div>
      </div>

      <Suspense fallback={<div className="h-16 bg-white rounded-xl border border-gray-200 animate-pulse" />}>
        <StockFilterBar q={q} status={status} />
      </Suspense>

      <StockTable
        rows={rows}
        totalCount={totalCount}
        page={currentPage}
        totalPages={totalPages}
        prevUrl={prevUrl}
        nextUrl={nextUrl}
      />
    </div>
  )
}
