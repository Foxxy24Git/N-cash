# Stock Mobile Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish `/stock` and `/transactions/new` pages for mobile (375px) without changing any business logic.

**Architecture:** Pure UI layer changes — shared badge constants extracted to `src/lib/stock-status.ts`, new shadcn components (Sheet, DropdownMenu, Skeleton) already installed, Next.js `loading.tsx`/`error.tsx` added for route-level states. Dialog components gain optional controlled-mode props so `StockCrudButtons` can drive them from a DropdownMenu.

**Tech Stack:** Next.js 14 App Router, shadcn/ui (Sheet, DropdownMenu, Skeleton already at `src/components/ui/`), Tailwind CSS, TypeScript

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/lib/stock-status.ts` | Shared badge/text color constants and status helper |
| Create | `src/app/(dashboard)/stock/loading.tsx` | Route-level skeleton shown during page fetch |
| Create | `src/app/(dashboard)/stock/error.tsx` | Route-level error boundary with retry button |
| Modify | `src/app/(dashboard)/stock/_components/StockTable.tsx` | Sticky first column + use shared badge constants |
| Modify | `src/app/(dashboard)/stock/_components/StockFilterBar.tsx` | Mobile Sheet trigger + isPending spinner in search input |
| Modify | `src/app/(dashboard)/stock/_components/StockAdjustmentDialog.tsx` | Accept optional `open`/`onOpenChange` props |
| Modify | `src/app/(dashboard)/stock/_components/ProductFormDialog.tsx` | Accept optional `open`/`onOpenChange` props |
| Modify | `src/app/(dashboard)/stock/_components/DeleteProductDialog.tsx` | Accept optional `open`/`onOpenChange` props |
| Modify | `src/app/(dashboard)/stock/_components/StockCrudButtons.tsx` | Lift open state; DropdownMenu on mobile, inline buttons on desktop |
| Modify | `src/app/(dashboard)/transactions/new/_components/NewTransactionForm.tsx` | Autocomplete: 44px touch targets, viewport-aware direction, shared badge colors |

---

## Task 1: Create `src/lib/stock-status.ts`

**Files:**
- Create: `src/lib/stock-status.ts`

- [ ] **Step 1: Create the file**

```ts
export type StockStatus = 'normal' | 'low' | 'out'

export function getStockStatus(stock: number, minStock: number): StockStatus {
  if (stock === 0) return 'out'
  if (minStock > 0 && stock <= minStock) return 'low'
  return 'normal'
}

export const STOCK_BADGE_CLASS: Record<StockStatus, string> = {
  normal: 'bg-green-100 text-green-800 border-green-200',
  low:    'bg-orange-100 text-orange-800 border-orange-200',
  out:    'bg-red-100 text-red-800 border-red-200',
}

export const STOCK_TEXT_CLASS: Record<StockStatus, string> = {
  normal: 'text-green-700',
  low:    'text-orange-600',
  out:    'text-red-600',
}

export const STOCK_BADGE_LABEL: Record<StockStatus, string> = {
  normal: 'Normal',
  low:    'Menipis',
  out:    'Habis',
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/user/N-Cash && npx tsc --noEmit 2>&1 | head -20`

Expected: no errors (or only pre-existing errors unrelated to this file)

- [ ] **Step 3: Commit**

```bash
git add src/lib/stock-status.ts
git commit -m "feat: add shared stock-status badge constants"
```

---

## Task 2: Add `loading.tsx` for `/stock` route

**Files:**
- Create: `src/app/(dashboard)/stock/loading.tsx`

- [ ] **Step 1: Create the skeleton loading page**

```tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function StockLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-44" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header row */}
        <div className="bg-gray-50 px-4 py-3 flex gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24 ml-auto" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        {/* Data rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="px-4 py-3 border-t border-gray-100 flex gap-4 items-center">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-24 ml-auto" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-7 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/user/N-Cash && npx tsc --noEmit 2>&1 | head -20`

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/stock/loading.tsx
git commit -m "feat(stock): add skeleton loading state"
```

---

## Task 3: Add `error.tsx` for `/stock` route

**Files:**
- Create: `src/app/(dashboard)/stock/error.tsx`

- [ ] **Step 1: Create the error boundary**

```tsx
'use client'

import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function StockError({ error, reset }: Props) {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col items-center justify-center py-24 text-center px-4">
        <AlertTriangle size={48} className="text-red-400 mb-4" strokeWidth={1.5} />
        <p className="text-sm font-medium text-gray-700 mb-1">Gagal memuat data stok</p>
        <p className="text-xs text-gray-400 mb-6 max-w-xs">
          {error.message || 'Terjadi kesalahan saat mengambil data dari server.'}
        </p>
        <Button onClick={reset}>Coba Lagi</Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/user/N-Cash && npx tsc --noEmit 2>&1 | head -20`

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/stock/error.tsx
git commit -m "feat(stock): add error boundary with retry"
```

---

## Task 4: Update `StockTable.tsx` — sticky column + shared badge

**Files:**
- Modify: `src/app/(dashboard)/stock/_components/StockTable.tsx`

- [ ] **Step 1: Replace the file**

Replace the full content of `src/app/(dashboard)/stock/_components/StockTable.tsx`:

```tsx
import { Package } from 'lucide-react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty-state'
import { formatRupiah } from '@/lib/format'
import { STOCK_BADGE_CLASS, STOCK_BADGE_LABEL } from '@/lib/stock-status'
import { StockCrudButtons } from './StockCrudButtons'

export interface ProductRow {
  id: string
  name: string
  unit: string
  buyPrice: number
  sellingPrice: number
  margin: string
  stock: number
  minStock: number
  stockStatus: 'normal' | 'low' | 'out'
  notes: string | null
}

interface Props {
  rows: ProductRow[]
  totalCount: number
  page: number
  totalPages: number
  prevUrl: string | null
  nextUrl: string | null
}

const PAGE_SIZE = 50

export default function StockTable({ rows, totalCount, page, totalPages, prevUrl, nextUrl }: Props) {
  const start = (page - 1) * PAGE_SIZE + 1
  const end   = Math.min(page * PAGE_SIZE, totalCount)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold text-gray-700 whitespace-nowrap sticky left-0 z-10 bg-gray-50">
                Nama Barang
              </TableHead>
              <TableHead className="font-semibold text-gray-700 whitespace-nowrap">Satuan</TableHead>
              <TableHead className="font-semibold text-gray-700 text-right whitespace-nowrap">Harga Beli</TableHead>
              <TableHead className="font-semibold text-gray-700 text-right whitespace-nowrap">Harga Jual</TableHead>
              <TableHead className="font-semibold text-gray-700 text-right whitespace-nowrap">Margin</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center whitespace-nowrap">Stok</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center whitespace-nowrap">Stok Min</TableHead>
              <TableHead className="font-semibold text-gray-700 whitespace-nowrap">Status</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center whitespace-nowrap">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={9} className="p-0">
                  <EmptyState
                    icon={Package}
                    title="Belum ada data barang"
                    subtitle="Klik [+ Tambah Barang] atau [📥 Import Excel] untuk mulai."
                  />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} className="group hover:bg-gray-50/50">
                  <TableCell className="font-medium text-gray-900 sticky left-0 z-10 bg-white group-hover:bg-gray-50/50">
                    {row.name}
                  </TableCell>
                  <TableCell className="text-gray-600 text-sm">{row.unit}</TableCell>
                  <TableCell className="text-right font-mono text-sm text-gray-700">
                    {formatRupiah(row.buyPrice)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-gray-700">
                    {formatRupiah(row.sellingPrice)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-gray-700">{row.margin}</TableCell>
                  <TableCell className="text-center font-mono font-semibold text-gray-900">
                    {row.stock}
                  </TableCell>
                  <TableCell className="text-center text-sm text-gray-500">{row.minStock}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STOCK_BADGE_CLASS[row.stockStatus]}`}>
                      {STOCK_BADGE_LABEL[row.stockStatus]}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <StockCrudButtons row={row} />
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
            {start}–{end} dari {totalCount} barang · halaman {page}/{totalPages}
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

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/user/N-Cash && npx tsc --noEmit 2>&1 | head -20`

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/stock/_components/StockTable.tsx
git commit -m "feat(stock): sticky Nama Barang column + unified badge colors"
```

---

## Task 5: Update `StockFilterBar.tsx` — mobile Sheet + isPending indicator

**Files:**
- Modify: `src/app/(dashboard)/stock/_components/StockFilterBar.tsx`

- [ ] **Step 1: Replace the file**

Replace the full content of `src/app/(dashboard)/stock/_components/StockFilterBar.tsx`:

```tsx
'use client'

import { useState, useRef, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, SlidersHorizontal, Loader2 } from 'lucide-react'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

export type StatusFilter = 'all' | 'normal' | 'low' | 'out' | 'low_out'

interface Props {
  q: string
  status: StatusFilter
}

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all',     label: 'Semua Status' },
  { value: 'normal',  label: 'Normal' },
  { value: 'low',     label: 'Menipis' },
  { value: 'out',     label: 'Habis' },
  { value: 'low_out', label: 'Menipis & Habis' },
]

export default function StockFilterBar({ q: initialQ, status: initialStatus }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [q, setQ] = useState(initialQ)
  const [status, setStatus] = useState<StatusFilter>(initialStatus)
  const [sheetOpen, setSheetOpen] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout>>()

  const activeFilterCount = (q !== '' ? 1 : 0) + (status !== 'all' ? 1 : 0)

  const navigate = useCallback(
    (newQ: string, newStatus: StatusFilter) => {
      const qs = new URLSearchParams()
      if (newQ) qs.set('q', newQ)
      if (newStatus !== 'all') qs.set('status', newStatus)
      qs.set('page', '1')
      startTransition(() => router.push(`/stock?${qs.toString()}`))
    },
    [router],
  )

  const handleSearch = (val: string) => {
    setQ(val)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => navigate(val, status), 300)
  }

  const handleStatus = (val: string) => {
    const s = val as StatusFilter
    setStatus(s)
    navigate(q, s)
  }

  const filterControls = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={q}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Cari nama barang..."
          className="w-full h-9 pl-8 pr-7 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {isPending ? (
          <Loader2 size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
        ) : q ? (
          <button
            onClick={() => handleSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={13} />
          </button>
        ) : null}
      </div>

      <div className="min-w-[180px]">
        <Select value={status} onValueChange={handleStatus}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop filter bar */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-200 p-4">
        {filterControls}
      </div>

      {/* Mobile: single trigger button + Sheet */}
      <div className="md:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="h-9 gap-2">
              <SlidersHorizontal size={14} />
              Filter
              {activeFilterCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold leading-none">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl">
            <SheetHeader className="mb-4">
              <SheetTitle>Filter Barang</SheetTitle>
            </SheetHeader>
            {filterControls}
            <div className="mt-4">
              <Button className="w-full" onClick={() => setSheetOpen(false)}>
                Terapkan
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/user/N-Cash && npx tsc --noEmit 2>&1 | head -20`

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/stock/_components/StockFilterBar.tsx
git commit -m "feat(stock): mobile filter Sheet + isPending spinner"
```

---

## Task 6: Add controlled-mode props to dialog components

**Files:**
- Modify: `src/app/(dashboard)/stock/_components/StockAdjustmentDialog.tsx`
- Modify: `src/app/(dashboard)/stock/_components/ProductFormDialog.tsx`
- Modify: `src/app/(dashboard)/stock/_components/DeleteProductDialog.tsx`

Each dialog already uses `const [open, setOpen] = useState(false)`. We extend them to accept optional `open`/`onOpenChange` props. When provided, the internal trigger button is hidden.

- [ ] **Step 1: Update `StockAdjustmentDialog.tsx`**

Change the `Props` interface and the top of the component body. Replace the existing interface and function signature:

Old:
```tsx
interface Props {
  productId: string
  productName: string
  currentStock: number
  unit: string
}

export function StockAdjustmentDialog({ productId, productName, currentStock, unit }: Props) {
  const [open, setOpen] = useState(false)
```

New:
```tsx
interface Props {
  productId: string
  productName: string
  currentStock: number
  unit: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function StockAdjustmentDialog({ productId, productName, currentStock, unit, open: externalOpen, onOpenChange }: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = externalOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
```

Then wrap the `DialogTrigger` so it only renders in uncontrolled mode. Change:
```tsx
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
          ✏️ Stok
        </button>
      </DialogTrigger>
```

To:
```tsx
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!onOpenChange && (
        <DialogTrigger asChild>
          <button className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
            ✏️ Stok
          </button>
        </DialogTrigger>
      )}
```

- [ ] **Step 2: Update `ProductFormDialog.tsx`**

Change the `Props` type union and function signature:

Old:
```tsx
type Props =
  | { mode: 'add'; product?: undefined }
  | { mode: 'edit'; product: ProductRow }

export function ProductFormDialog({ mode, product }: Props) {
  const [open, setOpen] = useState(false)
```

New:
```tsx
type Props =
  | { mode: 'add'; product?: undefined; open?: boolean; onOpenChange?: (open: boolean) => void }
  | { mode: 'edit'; product: ProductRow; open?: boolean; onOpenChange?: (open: boolean) => void }

export function ProductFormDialog({ mode, product, open: externalOpen, onOpenChange }: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = externalOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
```

Then wrap the `DialogTrigger`:

Old:
```tsx
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
```

New:
```tsx
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!onOpenChange && <DialogTrigger asChild>{trigger}</DialogTrigger>}
```

- [ ] **Step 3: Update `DeleteProductDialog.tsx`**

Change the `Props` interface and function signature:

Old:
```tsx
interface Props {
  id: string
  name: string
}

export function DeleteProductDialog({ id, name }: Props) {
  const [open, setOpen] = useState(false)
```

New:
```tsx
interface Props {
  id: string
  name: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function DeleteProductDialog({ id, name, open: externalOpen, onOpenChange }: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = externalOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
```

Then wrap the `AlertDialogTrigger`. First check its current render — it uses `AlertDialog open={open} onOpenChange={setOpen}` with `AlertDialogTrigger` inside. Wrap it:

Old:
```tsx
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
```

New:
```tsx
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {!onOpenChange && <AlertDialogTrigger asChild>}
```

Wait — JSX conditional wrapping of `AlertDialogTrigger` must close properly. Read the actual file structure to find the exact trigger block, then wrap it with `{!onOpenChange && (...)}`.

The trigger block in `DeleteProductDialog` looks like:
```tsx
<AlertDialogTrigger asChild>
  <button className="px-2 py-1 text-xs rounded border border-gray-200 text-red-500 hover:bg-red-50 transition-colors">
    🗑️ Hapus
  </button>
</AlertDialogTrigger>
```

Replace it with:
```tsx
{!onOpenChange && (
  <AlertDialogTrigger asChild>
    <button className="px-2 py-1 text-xs rounded border border-gray-200 text-red-500 hover:bg-red-50 transition-colors">
      🗑️ Hapus
    </button>
  </AlertDialogTrigger>
)}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd /Users/user/N-Cash && npx tsc --noEmit 2>&1 | head -20`

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/stock/_components/StockAdjustmentDialog.tsx \
        src/app/\(dashboard\)/stock/_components/ProductFormDialog.tsx \
        src/app/\(dashboard\)/stock/_components/DeleteProductDialog.tsx
git commit -m "feat(stock): add optional controlled-mode props to dialog components"
```

---

## Task 7: Rewrite `StockCrudButtons.tsx` — DropdownMenu on mobile

**Files:**
- Modify: `src/app/(dashboard)/stock/_components/StockCrudButtons.tsx`

- [ ] **Step 1: Replace the file**

```tsx
'use client'

import { useState } from 'react'
import { MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ProductFormDialog } from './ProductFormDialog'
import { DeleteProductDialog } from './DeleteProductDialog'
import { StockAdjustmentDialog } from './StockAdjustmentDialog'
import type { ProductRow } from './StockTable'

interface Props {
  row: ProductRow
}

export function StockCrudButtons({ row }: Props) {
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [editOpen, setEditOpen]     = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      {/* Desktop: inline trigger buttons (dialogs manage their own open state) */}
      <div className="hidden sm:flex items-center justify-center gap-1">
        <StockAdjustmentDialog
          productId={row.id}
          productName={row.name}
          currentStock={row.stock}
          unit={row.unit}
        />
        <ProductFormDialog mode="edit" product={row} />
        <DeleteProductDialog id={row.id} name={row.name} />
      </div>

      {/* Mobile: three-dot dropdown + controlled dialogs */}
      <div className="flex sm:hidden items-center justify-center">
        <StockAdjustmentDialog
          productId={row.id}
          productName={row.name}
          currentStock={row.stock}
          unit={row.unit}
          open={adjustOpen}
          onOpenChange={setAdjustOpen}
        />
        <ProductFormDialog
          mode="edit"
          product={row}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
        <DeleteProductDialog
          id={row.id}
          name={row.name}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
              aria-label="Aksi"
            >
              <MoreVertical size={16} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setAdjustOpen(true)}>
              ✏️ Sesuaikan Stok
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setEditOpen(true)}>
              ✏️ Edit Barang
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => setDeleteOpen(true)}
              className="text-red-600 focus:text-red-600"
            >
              🗑️ Hapus Barang
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/user/N-Cash && npx tsc --noEmit 2>&1 | head -20`

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/stock/_components/StockCrudButtons.tsx
git commit -m "feat(stock): DropdownMenu action menu on mobile"
```

---

## Task 8: Update `NewTransactionForm.tsx` — autocomplete touch/viewport + shared badge colors

**Files:**
- Modify: `src/app/(dashboard)/transactions/new/_components/NewTransactionForm.tsx`

This task has three sub-changes, all within `ProductAutocomplete`:
1. Touch-friendly item height (min 44px)
2. Viewport-aware dropdown direction
3. Shared badge/text colors via `stock-status.ts`
4. `onPointerDown` instead of `onMouseDown` for touch support

- [ ] **Step 1: Update imports at the top of the file**

Add the import after the existing imports:

```tsx
import { getStockStatus, STOCK_BADGE_CLASS, STOCK_TEXT_CLASS } from '@/lib/stock-status'
```

- [ ] **Step 2: Replace the `ProductAutocomplete` component**

Find the entire `ProductAutocomplete` function (lines ~124–263) and replace it with:

```tsx
function ProductAutocomplete({
  value,
  onChange,
  onSelect,
}: {
  value: string
  onChange: (text: string) => void
  onSelect: (product: ProductResult) => void
}) {
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<ProductResult[]>([])
  const [highlighted, setHighlighted] = useState(-1)
  const [loading, setLoading] = useState(false)
  const [dropUp, setDropUp] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])

  // Click/touch outside to close
  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
        setHighlighted(-1)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlighted >= 0 && itemRefs.current[highlighted]) {
      itemRefs.current[highlighted]?.scrollIntoView({ block: 'nearest' })
    }
  }, [highlighted])

  // Debounced fetch + measure drop direction
  useEffect(() => {
    if (value.length < 2) {
      setOpen(false)
      setResults([])
      return
    }

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      // Measure available space before opening
      if (wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect()
        const spaceBelow = window.innerHeight - rect.bottom
        setDropUp(spaceBelow < 240 && rect.top > 240)
      }

      setLoading(true)
      try {
        const res = await fetch(
          `/api/stock/search?q=${encodeURIComponent(value)}&limit=10`,
          { signal: controller.signal }
        )
        const data: ProductResult[] = await res.json()
        setResults(data)
        setHighlighted(-1)
        setOpen(true)
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => { clearTimeout(timer); controller.abort() }
  }, [value])

  const handleSelect = (product: ProductResult) => {
    onChange(product.name)
    onSelect(product)
    setOpen(false)
    setResults([])
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((prev) => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      if (highlighted >= 0 && highlighted < results.length) {
        e.preventDefault()
        handleSelect(results[highlighted])
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setHighlighted(-1)
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Nama barang..."
        className="w-full px-2.5 py-2 text-sm border border-gray-300 rounded-lg
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      {open && (
        <div
          className={cn(
            'absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto',
            dropUp ? 'bottom-full mb-1' : 'top-full mt-1'
          )}
        >
          {loading ? (
            <p className="px-3 py-2 text-sm text-gray-400 italic">Mencari...</p>
          ) : results.length > 0 ? (
            results.map((product, idx) => {
              const status = getStockStatus(product.stock, product.minStock)
              return (
                <div
                  key={product.id}
                  ref={(el) => { itemRefs.current[idx] = el }}
                  onPointerDown={() => handleSelect(product)}
                  className={cn(
                    'px-3 min-h-[44px] flex items-center cursor-pointer hover:bg-gray-50',
                    idx === highlighted && 'bg-blue-50'
                  )}
                >
                  <span className="font-medium">{product.name}</span>
                  {' — '}
                  <span className={cn('text-xs', STOCK_TEXT_CLASS[status])}>
                    Stok: {product.stock} {product.unit}
                  </span>
                </div>
              )
            })
          ) : (
            <p className="px-3 py-2 text-sm text-gray-400 italic">
              Tidak ditemukan — lanjut ketik manual
            </p>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Update `stockBadgeColor` in `ItemRow`**

Find the `stockBadgeColor` constant in `ItemRow` (around line 320):

Old:
```tsx
  const stockBadgeColor =
    item.stock === 0
      ? 'bg-red-100 text-red-600'
      : item.stock !== null && item.minStock !== null && item.stock <= item.minStock
      ? 'bg-yellow-100 text-yellow-600'
      : 'bg-green-100 text-green-600'
```

New:
```tsx
  const stockBadgeColor = item.stock !== null && item.minStock !== null
    ? STOCK_BADGE_CLASS[getStockStatus(item.stock, item.minStock)]
    : 'bg-green-100 text-green-800 border-green-200'
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd /Users/user/N-Cash && npx tsc --noEmit 2>&1 | head -20`

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/transactions/new/_components/NewTransactionForm.tsx
git commit -m "feat(transactions): autocomplete touch-friendly + viewport-aware + unified badge colors"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Mobile `/stock` sticky column → Task 4
- [x] Mobile filter Sheet → Task 5
- [x] Action DropdownMenu → Tasks 6 & 7
- [x] Autocomplete 44px touch targets → Task 8
- [x] Autocomplete viewport overflow prevention → Task 8
- [x] Touch event support (`onPointerDown`) → Task 8
- [x] Skeleton loading state → Task 2
- [x] Error state with retry → Task 3
- [x] Empty state: verified unchanged (no task needed)
- [x] Badge color unification → Tasks 1, 4, 8

**Type consistency:**
- `StockStatus` defined in Task 1, used in Tasks 4 and 8
- `getStockStatus`, `STOCK_BADGE_CLASS`, `STOCK_TEXT_CLASS`, `STOCK_BADGE_LABEL` defined in Task 1
- `StockTable` imports `STOCK_BADGE_CLASS`, `STOCK_BADGE_LABEL` from `@/lib/stock-status`
- `NewTransactionForm` imports `getStockStatus`, `STOCK_BADGE_CLASS`, `STOCK_TEXT_CLASS`
- Dialog `open`/`onOpenChange` props defined in Task 6, consumed in Task 7

**No placeholder scan:** No TBDs, TODOs, or vague "handle X" steps found.

---

*Total: 8 tasks, ~40 steps*
