import { Suspense } from 'react'
import { type Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { parseReportParams, PAGE_SIZE } from '@/lib/report-query'
import type { InvoiceRow, ReportTotals } from '@/lib/report-query'
import { formatDateWIB, formatTimeWIB } from '@/lib/format'

interface ProfitItem {
  productId: string | null
  unitPrice: Prisma.Decimal
  buyPriceSnapshot: Prisma.Decimal | null
  quantity: Prisma.Decimal
}
import SummaryCards from './_components/SummaryCards'
import InvoiceTable from './_components/InvoiceTable'
import FilterBar from './_components/FilterBar'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Report — N-Cash' }

interface PageProps {
  searchParams: Record<string, string | string[] | undefined>
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const params = parseReportParams(searchParams)
  const { dateFrom, dateTo, method, search, page } = params

  const where: Prisma.InvoiceWhereInput = {
    deletedAt: null,
    date: { gte: dateFrom, lt: dateTo },
  }

  if (method) {
    if (method === 'Cash') {
      where.OR = [
        { paymentMethod: { in: ['Cash', 'Cash COD'] } },
        { paymentMethod: 'BON', paidMethod: { in: ['Cash', 'Cash COD'] } },
      ]
    } else if (method === 'Cash COD') {
      where.OR = [
        { paymentMethod: 'Cash COD' },
        { paymentMethod: 'BON', paidMethod: 'Cash COD' },
      ]
    } else if (method === 'QRIS') {
      where.OR = [
        { paymentMethod: 'QRIS' },
        { paymentMethod: 'BON', paidMethod: 'QRIS' },
      ]
    } else if (method === 'Transfer Bank') {
      where.OR = [
        { paymentMethod: 'Transfer Bank' },
        { paymentMethod: 'BON', paidMethod: 'Transfer Bank' },
      ]
    } else if (method === 'BON') {
      where.paymentMethod = 'BON'
      where.paidAt = null
    } else {
      where.paymentMethod = method
    }
  }

  if (search) {
    where.invoiceNumber = { contains: search }
  }

  const itemsProfitSelect = {
    select: { productId: true, unitPrice: true, buyPriceSnapshot: true, quantity: true },
  }

  const [allForTotals, paginatedRaw, totalCount] = await Promise.all([
    prisma.invoice.findMany({
      where,
      select: {
        totalAmount: true,
        paymentMethod: true,
        paidMethod: true,
        paidAt: true,
        items: itemsProfitSelect,
      },
    }),
    prisma.invoice.findMany({
      where,
      include: {
        bank: { select: { name: true } },
        createdBy: { select: { id: true, fullName: true, username: true } },
        items: itemsProfitSelect,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.invoice.count({ where }),
  ]).catch((error: unknown) => {
    console.error('[ReportsPage] Failed to fetch invoices:', error)
    throw error
  })

  const calcProfit = (items: ProfitItem[]): number | null => {
    const linked = items.filter((i) => i.productId !== null && i.buyPriceSnapshot !== null)
    if (linked.length === 0) return null
    return linked.reduce((sum: number, i) => sum + (Number(i.unitPrice) - Number(i.buyPriceSnapshot)) * Number(i.quantity), 0)
  }

  const totals: ReportTotals = { total: 0, cash: 0, qris: 0, bank: 0, bon: 0, totalProfit: 0 }
  for (const inv of allForTotals) {
    const amt = Number(inv.totalAmount)
    totals.total += amt
    if (inv.paymentMethod === 'BON') {
      if (inv.paidAt !== null && inv.paidMethod) {
        // settled BON: count in the method it was paid with
        if (inv.paidMethod === 'Cash' || inv.paidMethod === 'Cash COD') totals.cash += amt
        else if (inv.paidMethod === 'QRIS') totals.qris += amt
        else if (inv.paidMethod === 'Transfer Bank') totals.bank += amt
      } else {
        totals.bon += amt
      }
    } else if (inv.paymentMethod === 'Cash' || inv.paymentMethod === 'Cash COD') {
      totals.cash += amt
    } else if (inv.paymentMethod === 'QRIS') {
      totals.qris += amt
    } else if (inv.paymentMethod === 'Transfer Bank') {
      totals.bank += amt
    }
    for (const item of inv.items) {
      if (item.productId && item.buyPriceSnapshot !== null) {
        totals.totalProfit += (Number(item.unitPrice) - Number(item.buyPriceSnapshot)) * Number(item.quantity)
      }
    }
  }

  const rows: InvoiceRow[] = paginatedRaw.map((inv) => ({
    id:            inv.id,
    invoiceNumber: inv.invoiceNumber,
    time:          formatTimeWIB(inv.createdAt.toISOString()),
    date:          formatDateWIB(inv.date.toISOString()),
    totalAmount:   Number(inv.totalAmount),
    profit:        calcProfit(inv.items),
    paymentMethod: inv.paymentMethod,
    bankName:      inv.bank?.name ?? null,
    paidAt:        inv.paidAt?.toISOString() ?? null,
    createdByName: inv.createdBy?.fullName || (inv.createdBy?.username ? `@${inv.createdBy.username}` : null),
  }))

  const baseParams = new URLSearchParams()
  baseParams.set('dateFrom', params.dateFromStr)
  baseParams.set('dateTo',   params.dateToStr)
  if (method) baseParams.set('method', method)
  if (search) baseParams.set('search', search)

  const buildPageUrl = (p: number) => {
    const qs = new URLSearchParams(baseParams)
    qs.set('page', String(p))
    return `/reports?${qs.toString()}`
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const prevUrl = page > 1           ? buildPageUrl(page - 1) : null
  const nextUrl = page < totalPages  ? buildPageUrl(page + 1) : null

  const exportParams = new URLSearchParams(baseParams)
  exportParams.delete('page')
  const exportHref = `/api/reports/export?${exportParams.toString()}`

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <h1 className="text-xl font-semibold text-gray-900">Laporan Transaksi</h1>

      <Suspense fallback={<div className="h-24 bg-white rounded-xl border border-gray-200 animate-pulse" />}>
        <FilterBar
          dateFromStr={params.dateFromStr}
          dateToStr={params.dateToStr}
          method={method}
          search={search}
        />
      </Suspense>

      <div className="flex justify-end">
        <a
          href={totalCount > 0 ? exportHref : undefined}
          aria-disabled={totalCount === 0}
          className={[
            'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            totalCount > 0
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed pointer-events-none',
          ].join(' ')}
        >
          📥 Download Laporan Excel
        </a>
      </div>

      <SummaryCards totals={totals} />

      <InvoiceTable
        rows={rows}
        totalCount={totalCount}
        page={page}
        prevUrl={prevUrl}
        nextUrl={nextUrl}
      />
    </div>
  )
}
