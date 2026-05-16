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
