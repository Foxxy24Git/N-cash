# Stock Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambah menu Stok ke navigasi dan buat halaman `/stock` dengan tabel daftar barang, filter via URL params, dan pagination 50 item/halaman.

**Architecture:** Server component `page.tsx` membaca `searchParams`, query Prisma, hitung margin & status di server, lalu pass data ke `StockTable` (server) dan `StockFilterBar` (client). Filter state hidup sepenuhnya di URL — bookmarkable dan consistent dengan pola `/reports`.

**Tech Stack:** Next.js 14 App Router, TypeScript, Prisma + SQLite, Tailwind CSS, shadcn/ui (`Table`, `Select`, `EmptyState`), lucide-react (`Package`)

---

## File Map

| File | Status | Tanggung jawab |
|------|--------|----------------|
| `src/app/(dashboard)/_components/Sidebar.tsx` | Modify | Tambah menu Stok (Package icon) antara Report dan Setting |
| `src/app/(dashboard)/_components/BottomNav.tsx` | Modify | Tambah menu Stok (Package icon) antara Report dan Setting |
| `src/app/(dashboard)/stock/page.tsx` | Create | Server component: parse params, query Prisma, hitung computed fields, render |
| `src/app/(dashboard)/stock/_components/StockFilterBar.tsx` | Create | Client component: search debounce 300ms + status dropdown |
| `src/app/(dashboard)/stock/_components/StockTable.tsx` | Create | Server component: tabel 9 kolom, badge status, tombol disabled, pagination |

---

## Task 1: Update Navigation

**Files:**
- Modify: `src/app/(dashboard)/_components/Sidebar.tsx`
- Modify: `src/app/(dashboard)/_components/BottomNav.tsx`

- [ ] **Step 1: Update Sidebar.tsx**

Replace seluruh isi file dengan:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, PlusCircle, BarChart3, Package, Settings, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { logoutAction } from '../_actions/auth'

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions/new', label: 'Tambah Transaksi', icon: PlusCircle },
  { href: '/reports', label: 'Report', icon: BarChart3 },
  { href: '/stock', label: 'Stok', icon: Package },
  { href: '/settings', label: 'Setting', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-60 bg-white border-r border-gray-200 flex-col z-30">
      <div className="px-6 py-5 border-b border-gray-200">
        <h1 className="text-xl font-bold text-blue-600">N-Cash</h1>
        <p className="text-xs text-gray-500 mt-0.5">Rekap Keuangan Toko</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {menuItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-200">
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors w-full"
          >
            <LogOut size={18} />
            Logout
          </button>
        </form>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Update BottomNav.tsx**

Replace seluruh isi file dengan:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, PlusCircle, BarChart3, Package, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions/new', label: 'Tambah', icon: PlusCircle },
  { href: '/reports', label: 'Report', icon: BarChart3 },
  { href: '/stock', label: 'Stok', icon: Package },
  { href: '/settings', label: 'Setting', icon: Settings },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
      <div className="flex">
        {menuItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors',
                isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/_components/Sidebar.tsx src/app/(dashboard)/_components/BottomNav.tsx
git commit -m "feat(stock): add Stock menu item to sidebar and bottom nav"
```

---

## Task 2: Create StockTable Component

**Files:**
- Create: `src/app/(dashboard)/stock/_components/StockTable.tsx`

- [ ] **Step 1: Buat file StockTable.tsx**

```tsx
import { Package } from 'lucide-react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty-state'
import { formatRupiah } from '@/lib/format'

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
}

interface Props {
  rows: ProductRow[]
  totalCount: number
  page: number
  totalPages: number
  prevUrl: string | null
  nextUrl: string | null
}

const STATUS_BADGE: Record<'normal' | 'low' | 'out', { label: string; className: string }> = {
  normal: { label: 'Normal',  className: 'bg-green-100 text-green-800 border-green-200' },
  low:    { label: 'Menipis', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  out:    { label: 'Habis',   className: 'bg-red-100 text-red-800 border-red-200' },
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
              <TableHead className="font-semibold text-gray-700 whitespace-nowrap">Nama Barang</TableHead>
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
              rows.map((row) => {
                const badge = STATUS_BADGE[row.stockStatus]
                return (
                  <TableRow key={row.id} className="hover:bg-gray-50/50">
                    <TableCell className="font-medium text-gray-900">{row.name}</TableCell>
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
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badge.className}`}>
                        {badge.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button disabled className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-400 cursor-not-allowed">
                          ✏️ Stok
                        </button>
                        <button disabled className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-400 cursor-not-allowed">
                          ✏️ Edit
                        </button>
                        <button disabled className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-400 cursor-not-allowed">
                          🗑️ Hapus
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
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

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/stock/_components/StockTable.tsx
git commit -m "feat(stock): add StockTable component with status badges and pagination"
```

---

## Task 3: Create StockFilterBar Component

**Files:**
- Create: `src/app/(dashboard)/stock/_components/StockFilterBar.tsx`

- [ ] **Step 1: Buat file StockFilterBar.tsx**

```tsx
'use client'

import { useState, useRef, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

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
  const [, startTransition] = useTransition()
  const [q, setQ] = useState(initialQ)
  const [status, setStatus] = useState<StatusFilter>(initialStatus)
  const searchTimer = useRef<ReturnType<typeof setTimeout>>()

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

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={q}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Cari nama barang..."
            className="w-full h-9 pl-8 pr-7 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {q && (
            <button
              onClick={() => handleSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={13} />
            </button>
          )}
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
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/stock/_components/StockFilterBar.tsx
git commit -m "feat(stock): add StockFilterBar client component with debounced search"
```

---

## Task 4: Create Stock Page (Server Component)

**Files:**
- Create: `src/app/(dashboard)/stock/page.tsx`

- [ ] **Step 1: Buat file stock/page.tsx**

```tsx
import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import StockFilterBar, { type StatusFilter } from './_components/StockFilterBar'
import StockTable, { type ProductRow } from './_components/StockTable'

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
    return { id: p.id, name: p.name, unit: p.unit, buyPrice, sellingPrice, margin, stock: p.stock, minStock: p.minStock, stockStatus }
  })

  const filtered =
    status === 'all'     ? withComputed
    : status === 'low_out' ? withComputed.filter((p) => p.stock <= p.minStock)
    : withComputed.filter((p) => p.stockStatus === status)

  const totalCount = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const currentPage = Math.min(Math.max(1, page), totalPages)
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const buildUrl = (p: number) => {
    const qs = new URLSearchParams()
    if (q) qs.set('q', q)
    if (status !== 'all') qs.set('status', status)
    qs.set('page', String(p))
    return `/stock?${qs.toString()}`
  }

  const prevUrl = currentPage > 1           ? buildUrl(currentPage - 1) : null
  const nextUrl = currentPage < totalPages  ? buildUrl(currentPage + 1) : null

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Manajemen Stok</h1>
        <div className="flex items-center gap-2">
          <button
            disabled
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-400 cursor-not-allowed"
          >
            📤 Export
          </button>
          <button
            disabled
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-400 cursor-not-allowed"
          >
            📥 Import Excel
          </button>
          <button
            disabled
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-400 cursor-not-allowed"
          >
            + Tambah Barang
          </button>
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
```

- [ ] **Step 2: Run lint check**

```bash
npm run lint
```

Expected: No errors. If ada error TypeScript/ESLint, fix sebelum commit.

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/stock/page.tsx
git commit -m "feat(stock): add /stock server page with filter, pagination, and computed fields"
```

---

## Self-Review Checklist

### Spec Coverage
- [x] Navigasi Sidebar + BottomNav → Task 1
- [x] Halaman `/stock` sebagai server component → Task 4
- [x] Tabel 9 kolom (Nama, Satuan, Harga Beli, Harga Jual, Margin, Stok, Stok Min, Status, Aksi) → Task 2
- [x] Badge status: hijau Normal / oranye Menipis / merah Habis → Task 2
- [x] Margin hitung server-side → Task 4
- [x] Filter `q` dengan debounce 300ms → Task 3
- [x] Filter `status` (all/normal/low/out) + `low_out` → Task 3, 4
- [x] `?filter=low_stock` → status=low_out, mengabaikan param status lain → Task 4
- [x] Pagination 50/page via URL `?page=N` → Task 2, 4
- [x] Tombol placeholder disabled: Tambah Barang, Import Excel, Export → Task 4
- [x] Kolom Aksi: 3 tombol disabled (Stok, Edit, Hapus) → Task 2
- [x] Empty state: icon Package + teks sesuai spec → Task 2
- [x] `buyPrice=0` → margin tampil "—" (bukan divide-by-zero) → Task 4
- [x] `stock=0` selalu Habis, meski `minStock=0` → Task 4 (`p.stock === 0` dicek duluan)
