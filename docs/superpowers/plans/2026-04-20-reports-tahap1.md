# Menu Report (Tahap 1) — Tabel + Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/reports` page with filter bar (date range, shortcuts, method, search), 5 summary cards, paginated invoice table, and per-invoice detail modal — all filter state synced to URL query params.

**Architecture:** Hybrid Server/Client. `page.tsx` is a Next.js Server Component that reads `searchParams`, fetches filtered Prisma data, and passes plain serializable props down. `FilterBar.tsx` (Client) owns all filter UI and calls `router.push` to update URL. `DetailButton.tsx` (Client) manages per-row modal open state and embeds `DetailModal.tsx` (Client) which fetches `/api/invoices/[id]`. Pagination uses plain `<a>` tag hrefs built server-side. No function props cross the server/client boundary.

**Tech Stack:** Next.js 14 App Router, TypeScript, Prisma/SQLite, shadcn/ui (Calendar, Popover, Dialog, Badge, Table, Select), date-fns, Tailwind CSS, Lucide React.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/lib/format.ts` | **Create** | `formatRupiah`, `formatDateWIB`, `formatTimeWIB` |
| `src/lib/report-query.ts` | **Create** | `parseReportParams`, shared types `InvoiceRow` / `ReportTotals` / `PAGE_SIZE` |
| `src/app/api/invoices/[id]/route.ts` | **Create** | GET endpoint: returns invoice + items + bank |
| `src/app/(dashboard)/reports/_components/SummaryCards.tsx` | **Create** | 5 read-only cards (server-renderable, props-driven) |
| `src/app/(dashboard)/reports/_components/InvoiceTable.tsx` | **Create** | shadcn Table with rows + `<a>`-based pagination (server-renderable) |
| `src/app/(dashboard)/reports/_components/DetailModal.tsx` | **Create** | Client Dialog — fetches API on open, renders item list |
| `src/app/(dashboard)/reports/_components/DetailButton.tsx` | **Create** | Client — per-row "Detail" button that manages modal open state |
| `src/app/(dashboard)/reports/_components/FilterBar.tsx` | **Create** | Client — date pickers, shortcuts, method select, search input |
| `src/app/(dashboard)/reports/page.tsx` | **Rewrite** | Server Component — reads searchParams, fetches data, composes all components |
| `src/app/(dashboard)/dashboard/page.tsx` | **Modify** | Replace inline `formatRupiah` with import from `@/lib/format` |

---

### Task 1: Install shadcn components + date-fns

**Files:**
- Modify: `package.json` (via CLI — adds react-day-picker, date-fns)
- Create: `src/components/ui/calendar.tsx`, `popover.tsx`, `dialog.tsx`, `badge.tsx`, `table.tsx`, `select.tsx`

- [ ] **Step 1: Add shadcn components**

```bash
npx shadcn@latest add calendar popover dialog badge table select --yes
```

Expected output: each component echoes "✔ Done." No errors.

- [ ] **Step 2: Verify date-fns installed**

```bash
node -e "require('date-fns'); console.log('ok')"
```

Expected: `ok`. If missing: `npm install date-fns`

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 new errors (pre-existing skipLibCheck errors are fine).

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/calendar.tsx src/components/ui/popover.tsx src/components/ui/dialog.tsx src/components/ui/badge.tsx src/components/ui/table.tsx src/components/ui/select.tsx package.json package-lock.json
git commit -m "feat(reports): install shadcn calendar/popover/dialog/badge/table/select"
```

---

### Task 2: Shared format utilities + report-query types

**Files:**
- Create: `src/lib/format.ts`
- Create: `src/lib/report-query.ts`
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Create `src/lib/format.ts`**

```typescript
export function formatRupiah(amount: number): string {
  return 'Rp ' + new Intl.NumberFormat('id-ID').format(amount)
}

export function formatDateWIB(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatTimeWIB(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
```

- [ ] **Step 2: Create `src/lib/report-query.ts`**

```typescript
export const PAGE_SIZE = 20

export type PaymentMethodFilter = 'Cash' | 'QRIS' | 'Transfer Bank' | 'BON' | ''

export interface ReportParams {
  dateFrom: Date   // inclusive lower bound (Jakarta midnight as UTC)
  dateTo: Date     // exclusive upper bound (Jakarta midnight+1day as UTC)
  method: PaymentMethodFilter
  search: string
  page: number
  // raw strings for handing back to FilterBar
  dateFromStr: string  // YYYY-MM-DD
  dateToStr: string    // YYYY-MM-DD
}

/** Resolve searchParams → typed ReportParams.
 *  Handles both ?date=today (dashboard deep-links) and ?dateFrom=X&dateTo=Y (FilterBar). */
export function parseReportParams(
  searchParams: Record<string, string | string[] | undefined>
): ReportParams {
  const get = (key: string): string => {
    const v = searchParams[key]
    return typeof v === 'string' ? v : ''
  }

  const todayJakarta = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })

  const dateShortcut = get('date')
  let fromStr = get('dateFrom') || todayJakarta
  let toStr   = get('dateTo')   || todayJakarta

  if (dateShortcut === 'today') { fromStr = todayJakarta; toStr = todayJakarta }

  const dateFrom = new Date(`${fromStr}T00:00:00+07:00`)
  const dateTo   = new Date(`${toStr}T00:00:00+07:00`)
  dateTo.setDate(dateTo.getDate() + 1)  // exclusive upper bound

  const method = get('method') as PaymentMethodFilter
  const search = get('search').trim()
  const page   = Math.max(1, parseInt(get('page') || '1', 10))

  return { dateFrom, dateTo, method, search, page, dateFromStr: fromStr, dateToStr: toStr }
}

/** Plain-object row passed from server to InvoiceTable (no Date objects). */
export interface InvoiceRow {
  id: string
  invoiceNumber: string
  time: string        // pre-formatted "HH:mm"
  date: string        // pre-formatted "DD/MM/YYYY"
  totalAmount: number
  paymentMethod: string
  bankName: string | null
}

export interface ReportTotals {
  total: number
  cash: number
  qris: number
  bank: number
  bon: number
}
```

- [ ] **Step 3: Update `src/app/(dashboard)/dashboard/page.tsx`**

Remove lines 17–19 (the inline `formatRupiah` function):
```typescript
// DELETE these lines:
function formatRupiah(amount: number): string {
  return 'Rp ' + new Intl.NumberFormat('id-ID').format(amount)
}
```

Add import at the top of the file (after the last existing import):
```typescript
import { formatRupiah } from '@/lib/format'
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 new errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/format.ts src/lib/report-query.ts src/app/(dashboard)/dashboard/page.tsx
git commit -m "feat(reports): add shared format utils and report-query types"
```

---

### Task 3: API route — GET /api/invoices/[id]

**Files:**
- Create: `src/app/api/invoices/[id]/route.ts`

- [ ] **Step 1: Create `src/app/api/invoices/[id]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id, deletedAt: null },
    include: {
      items: true,
      bank: { select: { name: true } },
    },
  })

  if (!invoice) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(invoice)
}
```

The response shape (Prisma serializes Decimal → string automatically):
```
{
  id, invoiceNumber, date, totalAmount, paymentMethod, createdAt,
  bank: { name } | null,
  items: [{ id, itemName, quantity, unitPrice, subtotal }, ...]
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 new errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/invoices/[id]/route.ts
git commit -m "feat(reports): add GET /api/invoices/[id] endpoint"
```

---

### Task 4: SummaryCards component

**Files:**
- Create: `src/app/(dashboard)/reports/_components/SummaryCards.tsx`

- [ ] **Step 1: Create `src/app/(dashboard)/reports/_components/SummaryCards.tsx`**

```typescript
import { Wallet, Banknote, Smartphone, Landmark, AlertCircle } from 'lucide-react'
import { formatRupiah } from '@/lib/format'
import type { ReportTotals } from '@/lib/report-query'

const CARDS = [
  { key: 'total' as const, label: 'Total Keuntungan', Icon: Wallet,        bg: 'bg-gray-50',   iconCls: 'text-gray-500',   labelCls: 'text-gray-600' },
  { key: 'cash'  as const, label: 'Total Cash',       Icon: Banknote,      bg: 'bg-green-50',  iconCls: 'text-green-600',  labelCls: 'text-green-700' },
  { key: 'qris'  as const, label: 'Total QRIS',       Icon: Smartphone,    bg: 'bg-blue-50',   iconCls: 'text-blue-600',   labelCls: 'text-blue-700' },
  { key: 'bank'  as const, label: 'Total Bank',       Icon: Landmark,      bg: 'bg-yellow-50', iconCls: 'text-yellow-600', labelCls: 'text-yellow-700' },
  { key: 'bon'   as const, label: 'Total BON',        Icon: AlertCircle,   bg: 'bg-red-50',    iconCls: 'text-red-600',    labelCls: 'text-red-700' },
]

export default function SummaryCards({ totals }: { totals: ReportTotals }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {CARDS.map(({ key, label, Icon, bg, iconCls, labelCls }) => (
        <div key={key} className={`${bg} rounded-xl p-4 flex items-center gap-3`}>
          <Icon size={24} className={`${iconCls} shrink-0`} strokeWidth={1.5} />
          <div className="min-w-0">
            <p className={`text-xs font-medium ${labelCls} truncate`}>{label}</p>
            <p className="text-sm font-bold text-gray-900 font-mono mt-0.5">
              {formatRupiah(totals[key])}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 new errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/reports/_components/SummaryCards.tsx
git commit -m "feat(reports): add SummaryCards component"
```

---

### Task 5: InvoiceTable + DetailButton + DetailModal

**Files:**
- Create: `src/app/(dashboard)/reports/_components/DetailModal.tsx`
- Create: `src/app/(dashboard)/reports/_components/DetailButton.tsx`
- Create: `src/app/(dashboard)/reports/_components/InvoiceTable.tsx`

- [ ] **Step 1: Create `src/app/(dashboard)/reports/_components/DetailModal.tsx`**

```typescript
'use client'

import { useEffect, useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { formatRupiah } from '@/lib/format'

interface Item {
  id: string
  itemName: string
  quantity: string   // Decimal serialized as string by Prisma
  unitPrice: string
  subtotal: string
}

interface InvoiceDetail {
  invoiceNumber: string
  date: string
  totalAmount: string
  paymentMethod: string
  bank: { name: string } | null
  items: Item[]
}

interface Props {
  invoiceId: string
  open: boolean
  onClose: () => void
}

export default function DetailModal({ invoiceId, open, onClose }: Props) {
  const [data, setData] = useState<InvoiceDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch(`/api/invoices/${invoiceId}`)
      .then((r) => r.json())
      .then((d: InvoiceDetail) => setData(d))
      .finally(() => setLoading(false))
  }, [open, invoiceId])

  const dateLabel = data
    ? new Date(data.date).toLocaleDateString('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit', month: '2-digit', year: 'numeric',
      })
    : ''

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Detail Faktur{data ? ` — ${data.invoiceNumber}` : ''}
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="py-10 text-center text-sm text-gray-400">Memuat data...</div>
        )}

        {!loading && data && (
          <div className="space-y-4">
            {/* Header info */}
            <div className="grid grid-cols-2 gap-2 text-sm bg-gray-50 rounded-lg p-3">
              <div>
                <span className="text-gray-500">No Faktur</span>
                <p className="font-medium text-gray-900">{data.invoiceNumber}</p>
              </div>
              <div>
                <span className="text-gray-500">Tanggal</span>
                <p className="font-medium text-gray-900">{dateLabel}</p>
              </div>
              <div>
                <span className="text-gray-500">Metode</span>
                <p className="font-medium text-gray-900">{data.paymentMethod}</p>
              </div>
              {data.bank && (
                <div>
                  <span className="text-gray-500">Bank</span>
                  <p className="font-medium text-gray-900">{data.bank.name}</p>
                </div>
              )}
            </div>

            {/* Items table */}
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-3 py-2.5 font-semibold text-gray-700">Nama Barang</th>
                    <th className="text-center px-3 py-2.5 font-semibold text-gray-700">QTY</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-gray-700">Harga Satuan</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-gray-700">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item, i) => (
                    <tr key={item.id} className={i % 2 === 1 ? 'bg-gray-50/50' : ''}>
                      <td className="px-3 py-2 text-gray-900">{item.itemName}</td>
                      <td className="px-3 py-2 text-center text-gray-600">{Number(item.quantity)}</td>
                      <td className="px-3 py-2 text-right font-mono text-gray-700">
                        {formatRupiah(Number(item.unitPrice))}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-gray-900">
                        {formatRupiah(Number(item.subtotal))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <span className="text-sm font-medium text-gray-600">TOTAL BELANJA</span>
              <span className="text-xl font-bold text-gray-900 font-mono">
                {formatRupiah(Number(data.totalAmount))}
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Create `src/app/(dashboard)/reports/_components/DetailButton.tsx`**

```typescript
'use client'

import { useState } from 'react'
import DetailModal from './DetailModal'

export default function DetailButton({ invoiceId }: { invoiceId: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
      >
        Detail
      </button>
      <DetailModal invoiceId={invoiceId} open={open} onClose={() => setOpen(false)} />
    </>
  )
}
```

- [ ] **Step 3: Create `src/app/(dashboard)/reports/_components/InvoiceTable.tsx`**

```typescript
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { formatRupiah } from '@/lib/format'
import { PAGE_SIZE } from '@/lib/report-query'
import type { InvoiceRow } from '@/lib/report-query'
import DetailButton from './DetailButton'

const METHOD_BADGE: Record<string, string> = {
  'Cash':          'bg-green-100 text-green-800 border-green-200',
  'Cash COD':      'bg-green-100 text-green-800 border-green-200',
  'QRIS':          'bg-blue-100 text-blue-800 border-blue-200',
  'Transfer Bank': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'BON':           'bg-red-100 text-red-800 border-red-200',
}

interface Props {
  rows: InvoiceRow[]
  totalCount: number
  page: number
  prevUrl: string | null
  nextUrl: string | null
}

export default function InvoiceTable({ rows, totalCount, page, prevUrl, nextUrl }: Props) {
  const start = (page - 1) * PAGE_SIZE + 1
  const end   = Math.min(page * PAGE_SIZE, totalCount)
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold text-gray-700 whitespace-nowrap">No Faktur</TableHead>
              <TableHead className="font-semibold text-gray-700 whitespace-nowrap">Jam</TableHead>
              <TableHead className="font-semibold text-gray-700 whitespace-nowrap">Tanggal</TableHead>
              <TableHead className="font-semibold text-gray-700 text-right whitespace-nowrap">Total Belanja</TableHead>
              <TableHead className="font-semibold text-gray-700 whitespace-nowrap">Status</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center whitespace-nowrap">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-14 text-gray-400 text-sm">
                  Tidak ada transaksi ditemukan untuk filter ini
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-gray-50/50">
                  <TableCell className="font-medium text-gray-900">{row.invoiceNumber}</TableCell>
                  <TableCell className="text-gray-600 font-mono text-sm">{row.time}</TableCell>
                  <TableCell className="text-gray-600 text-sm">{row.date}</TableCell>
                  <TableCell className="text-right font-mono font-semibold text-gray-900">
                    {formatRupiah(row.totalAmount)}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${METHOD_BADGE[row.paymentMethod] ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                      {row.paymentMethod}{row.bankName ? ` — ${row.bankName}` : ''}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <DetailButton invoiceId={row.id} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalCount > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm">
          <span className="text-gray-500">
            {start}–{end} dari {totalCount} transaksi · halaman {page}/{totalPages}
          </span>
          <div className="flex items-center gap-2">
            {prevUrl ? (
              <a href={prevUrl} className="px-3 py-1.5 font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                ← Sebelumnya
              </a>
            ) : (
              <span className="px-3 py-1.5 font-medium rounded-lg border border-gray-100 text-gray-300 cursor-not-allowed">
                ← Sebelumnya
              </span>
            )}
            {nextUrl ? (
              <a href={nextUrl} className="px-3 py-1.5 font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                Berikutnya →
              </a>
            ) : (
              <span className="px-3 py-1.5 font-medium rounded-lg border border-gray-100 text-gray-300 cursor-not-allowed">
                Berikutnya →
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 new errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/reports/_components/
git commit -m "feat(reports): add DetailModal, DetailButton, InvoiceTable components"
```

---

### Task 6: FilterBar component

**Files:**
- Create: `src/app/(dashboard)/reports/_components/FilterBar.tsx`

This is a Client Component. It reads `dateFromStr`, `dateToStr`, `method`, `search` as initial values from props (passed by the server page), then syncs changes to URL via `router.push`. The shadcn `<Calendar>` component is wrapped in a `<Popover>`. The `<Select>` is used for method. A debounced `<input>` for search.

- [ ] **Step 1: Create `src/app/(dashboard)/reports/_components/FilterBar.tsx`**

```typescript
'use client'

import { useState, useCallback, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { format, subDays, startOfMonth } from 'date-fns'
import { CalendarIcon, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

interface Props {
  dateFromStr: string  // YYYY-MM-DD
  dateToStr: string    // YYYY-MM-DD
  method: string
  search: string
}

const METHODS = [
  { value: '', label: 'Semua Metode' },
  { value: 'Cash', label: 'Cash' },
  { value: 'Cash COD', label: 'Cash COD' },
  { value: 'QRIS', label: 'QRIS' },
  { value: 'Transfer Bank', label: 'Transfer Bank' },
  { value: 'BON', label: 'BON' },
]

function toDateInput(str: string): Date {
  // Parse YYYY-MM-DD as local date (avoids UTC midnight shifting)
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toYMD(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

export default function FilterBar({ dateFromStr, dateToStr, method, search: initialSearch }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [fromDate, setFromDate] = useState<Date>(toDateInput(dateFromStr))
  const [toDate, setToDate]     = useState<Date>(toDateInput(dateToStr))
  const [searchVal, setSearchVal] = useState(initialSearch)
  const searchTimer = useRef<ReturnType<typeof setTimeout>>()

  const applyFilters = useCallback(
    (params: {
      dateFrom?: Date
      dateTo?: Date
      method?: string
      search?: string
    }) => {
      const from   = params.dateFrom ?? fromDate
      const to     = params.dateTo   ?? toDate
      const m      = params.method   !== undefined ? params.method : method
      const s      = params.search   !== undefined ? params.search : searchVal
      const qs = new URLSearchParams()
      qs.set('dateFrom', toYMD(from))
      qs.set('dateTo',   toYMD(to))
      if (m) qs.set('method', m)
      if (s) qs.set('search', s)
      startTransition(() => router.push(`/reports?${qs.toString()}`))
    },
    [fromDate, toDate, method, searchVal, router]
  )

  const today     = new Date()
  const todayYMD  = toYMD(today)

  const shortcuts = [
    {
      label: 'Hari Ini',
      onClick: () => {
        const d = toDateInput(todayYMD)
        setFromDate(d); setToDate(d)
        applyFilters({ dateFrom: d, dateTo: d })
      },
    },
    {
      label: 'Kemarin',
      onClick: () => {
        const d = subDays(today, 1)
        setFromDate(d); setToDate(d)
        applyFilters({ dateFrom: d, dateTo: d })
      },
    },
    {
      label: '7 Hari',
      onClick: () => {
        const from = subDays(today, 6)
        setFromDate(from); setToDate(today)
        applyFilters({ dateFrom: from, dateTo: today })
      },
    },
    {
      label: 'Bulan Ini',
      onClick: () => {
        const from = startOfMonth(today)
        setFromDate(from); setToDate(today)
        applyFilters({ dateFrom: from, dateTo: today })
      },
    },
  ]

  // Debounced search
  const handleSearchChange = (val: string) => {
    setSearchVal(val)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      applyFilters({ search: val })
    }, 350)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      {/* Row 1: shortcuts + method select + search */}
      <div className="flex flex-wrap items-center gap-2">
        {shortcuts.map((s) => (
          <button
            key={s.label}
            onClick={s.onClick}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
          >
            {s.label}
          </button>
        ))}

        <div className="flex-1 min-w-[160px]">
          <Select
            value={method}
            onValueChange={(val) => applyFilters({ method: val })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Semua Metode" />
            </SelectTrigger>
            <SelectContent>
              {METHODS.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchVal}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Cari no. faktur..."
            className="w-full h-8 pl-8 pr-7 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchVal && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Row 2: date range pickers */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-500 font-medium">Periode:</span>

        {/* From date */}
        <Popover>
          <PopoverTrigger asChild>
            <button className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors',
              'border-gray-200 text-gray-700 hover:bg-gray-50'
            )}>
              <CalendarIcon size={13} />
              {format(fromDate, 'dd/MM/yyyy')}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={fromDate}
              onSelect={(d) => {
                if (!d) return
                const newTo = d > toDate ? d : toDate
                setFromDate(d); setToDate(newTo)
                applyFilters({ dateFrom: d, dateTo: newTo })
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <span className="text-xs text-gray-400">s/d</span>

        {/* To date */}
        <Popover>
          <PopoverTrigger asChild>
            <button className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors',
              'border-gray-200 text-gray-700 hover:bg-gray-50'
            )}>
              <CalendarIcon size={13} />
              {format(toDate, 'dd/MM/yyyy')}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={toDate}
              onSelect={(d) => {
                if (!d) return
                const newFrom = d < fromDate ? d : fromDate
                setToDate(d); setFromDate(newFrom)
                applyFilters({ dateTo: d, dateFrom: newFrom })
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 new errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/reports/_components/FilterBar.tsx
git commit -m "feat(reports): add FilterBar client component with date pickers and shortcuts"
```

---

### Task 7: Main page.tsx — Server Component

**Files:**
- Rewrite: `src/app/(dashboard)/reports/page.tsx`

This fetches filtered invoices from Prisma, computes totals, maps to `InvoiceRow[]`, builds pagination URLs, and renders all components.

- [ ] **Step 1: Rewrite `src/app/(dashboard)/reports/page.tsx`**

```typescript
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

  // Build Prisma where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    deletedAt: null,
    date: { gte: dateFrom, lt: dateTo },
  }
  if (method) {
    // Cash filter includes both Cash and Cash COD
    if (method === 'Cash') {
      where.paymentMethod = { in: ['Cash', 'Cash COD'] }
    } else {
      where.paymentMethod = method
    }
  }
  if (search) {
    where.invoiceNumber = { contains: search }
  }

  // Two parallel queries: paginated rows + all for totals
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

  // Compute totals
  const totals: ReportTotals = { total: 0, cash: 0, qris: 0, bank: 0, bon: 0 }
  for (const inv of allForTotals) {
    const amt = Number(inv.totalAmount)
    totals.total += amt
    if (inv.paymentMethod === 'Cash' || inv.paymentMethod === 'Cash COD') totals.cash += amt
    else if (inv.paymentMethod === 'QRIS') totals.qris += amt
    else if (inv.paymentMethod === 'Transfer Bank') totals.bank += amt
    else if (inv.paymentMethod === 'BON') totals.bon += amt
  }

  // Map to plain InvoiceRow (no Date objects)
  const rows: InvoiceRow[] = paginatedRaw.map((inv) => ({
    id:            inv.id,
    invoiceNumber: inv.invoiceNumber,
    time:          formatTimeWIB(inv.createdAt.toISOString()),
    date:          formatDateWIB(inv.date.toISOString()),
    totalAmount:   Number(inv.totalAmount),
    paymentMethod: inv.paymentMethod,
    bankName:      inv.bank?.name ?? null,
  }))

  // Build pagination URLs
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

  const prevUrl = page > 1                                     ? buildPageUrl(page - 1) : null
  const nextUrl = page < Math.ceil(totalCount / PAGE_SIZE)    ? buildPageUrl(page + 1) : null

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <h1 className="text-xl font-semibold text-gray-900">Laporan Transaksi</h1>

      {/* Filter bar — wrapped in Suspense because FilterBar uses useSearchParams indirectly */}
      <Suspense fallback={<div className="h-24 bg-white rounded-xl border border-gray-200 animate-pulse" />}>
        <FilterBar
          dateFromStr={params.dateFromStr}
          dateToStr={params.dateToStr}
          method={method}
          search={search}
        />
      </Suspense>

      {/* Summary cards */}
      <SummaryCards totals={totals} />

      {/* Invoice table */}
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
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 new errors (or only pre-existing unrelated issues).

- [ ] **Step 3: Start dev server and manually verify**

```bash
npm run dev
```

Open http://localhost:3000/reports and verify:
- Page loads showing today's transactions (default filter)
- Summary cards show correct totals
- Table shows invoices with correct columns
- Dashboard → click any card → redirects to /reports with correct filter pre-applied
- Quick shortcuts (Hari Ini, Kemarin, etc.) update the date range
- Date pickers open and selecting a date updates the table
- Method dropdown filters correctly
- Search input filters by invoice number
- Pagination appears when > 20 rows
- [Detail] button opens dialog with invoice items

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/reports/page.tsx
git commit -m "feat(reports): implement reports page with filter/summary/table/pagination"
```

---

### Task 8: Final verification commit

- [ ] **Step 1: Full TypeScript check**

```bash
npx tsc --noEmit 2>&1
```

Expected: 0 errors.

- [ ] **Step 2: Lint check**

```bash
npx next lint 2>&1 | tail -20
```

Expected: No errors (warnings OK).

- [ ] **Step 3: Verify dashboard deep-links**

In the running dev server:
1. Go to /dashboard
2. Click "Total Pembayaran Cash" card
3. Verify redirected to /reports with Cash filter pre-applied and summary cards show only Cash total
4. Click "Total Belum Bayar (BON)" card
5. Verify redirected to /reports with BON filter active

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(reports): Menu Report Tahap 1 complete — filter, summary cards, table, detail modal"
```
