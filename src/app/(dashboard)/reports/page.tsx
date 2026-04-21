import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { parseReportParams, PAGE_SIZE } from '@/lib/report-query'
import type { InvoiceRow, ReportTotals } from '@/lib/report-query'
import { formatDateWIB, formatTimeWIB } from '@/lib/format'
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    deletedAt: null,
    date: { gte: dateFrom, lt: dateTo },
  }

  if (method) {
    // 'Cash' filter from dashboard deep-links covers both Cash and Cash COD
    if (method === 'Cash') {
      where.paymentMethod = { in: ['Cash', 'Cash COD'] }
    } else {
      where.paymentMethod = method
    }
  }

  if (search) {
    where.invoiceNumber = { contains: search }
  }

  const [allForTotals, paginatedRaw, totalCount] = await Promise.all([
    prisma.invoice.findMany({
      where,
      select: { totalAmount: true, paymentMethod: true },
    }),
    prisma.invoice.findMany({
      where,
      include: { bank: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.invoice.count({ where }),
  ])

  const totals: ReportTotals = { total: 0, cash: 0, qris: 0, bank: 0, bon: 0 }
  for (const inv of allForTotals) {
    const amt = Number(inv.totalAmount)
    totals.total += amt
    if (inv.paymentMethod === 'Cash' || inv.paymentMethod === 'Cash COD') totals.cash += amt
    else if (inv.paymentMethod === 'QRIS') totals.qris += amt
    else if (inv.paymentMethod === 'Transfer Bank') totals.bank += amt
    else if (inv.paymentMethod === 'BON') totals.bon += amt
  }

  const rows: InvoiceRow[] = paginatedRaw.map((inv) => ({
    id:            inv.id,
    invoiceNumber: inv.invoiceNumber,
    time:          formatTimeWIB(inv.createdAt.toISOString()),
    date:          formatDateWIB(inv.date.toISOString()),
    totalAmount:   Number(inv.totalAmount),
    paymentMethod: inv.paymentMethod,
    bankName:      inv.bank?.name ?? null,
    paidAt:        inv.paidAt?.toISOString() ?? null,
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
