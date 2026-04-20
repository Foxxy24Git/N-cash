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
      const from = params.dateFrom ?? fromDate
      const to   = params.dateTo   ?? toDate
      const m    = params.method   !== undefined ? params.method : method
      const s    = params.search   !== undefined ? params.search : searchVal
      const qs = new URLSearchParams()
      qs.set('dateFrom', toYMD(from))
      qs.set('dateTo',   toYMD(to))
      if (m) qs.set('method', m)
      if (s) qs.set('search', s)
      startTransition(() => router.push(`/reports?${qs.toString()}`))
    },
    [fromDate, toDate, method, searchVal, router]
  )

  const today = new Date()

  const shortcuts = [
    {
      label: 'Hari Ini',
      onClick: () => {
        const d = toDateInput(toYMD(today))
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
            value={method || '_all'}
            onValueChange={(val) => applyFilters({ method: val === '_all' ? '' : val })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Semua Metode" />
            </SelectTrigger>
            <SelectContent>
              {METHODS.map((m) => (
                <SelectItem key={m.value || '_all'} value={m.value || '_all'}>{m.label}</SelectItem>
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
              autoFocus
            />
          </PopoverContent>
        </Popover>

        <span className="text-xs text-gray-400">s/d</span>

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
              autoFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
