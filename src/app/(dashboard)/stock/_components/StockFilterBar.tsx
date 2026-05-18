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
    setSheetOpen(false)
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
