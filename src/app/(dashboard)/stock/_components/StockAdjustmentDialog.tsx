'use client'

import { useState, useTransition, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { adjustStock } from '../_actions/productActions'

const REASONS = [
  { value: 'STOCK_OPNAME', label: 'Stok Opname' },
  { value: 'RECEIVE',      label: 'Terima Barang' },
  { value: 'DAMAGE',       label: 'Barang Rusak' },
  { value: 'LOST',         label: 'Barang Hilang' },
  { value: 'OTHER',        label: 'Koreksi Lain' },
]

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
  const [isPending, startTransition] = useTransition()
  const [newStock, setNewStock] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setNewStock(String(currentStock))
    setReason('')
    setNotes('')
    setError(null)
  }, [open, currentStock])

  const newStockNum = parseInt(newStock, 10)
  const delta = !isNaN(newStockNum) ? newStockNum - currentStock : null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isNaN(newStockNum) || newStockNum < 0) {
      setError('Stok baru tidak valid')
      return
    }
    if (!reason) {
      setError('Pilih alasan penyesuaian')
      return
    }
    setError(null)

    startTransition(async () => {
      const result = await adjustStock(productId, newStockNum, reason, notes || undefined)
      if ('error' in result) {
        setError(result.error)
      } else {
        toast.success('Stok berhasil disesuaikan')
        setOpen(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!onOpenChange && (
        <DialogTrigger asChild>
          <button className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
            ✏️ Stok
          </button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Sesuaikan Stok — {productName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
            <span className="text-sm text-gray-600">Stok Saat Ini</span>
            <span className="font-semibold font-mono text-gray-900">
              {currentStock} {unit}
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              Stok Baru <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={0}
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
                className="w-32"
                inputMode="numeric"
              />
              {delta !== null && (
                <span
                  className={`text-sm font-semibold ${
                    delta > 0
                      ? 'text-green-600'
                      : delta < 0
                        ? 'text-red-600'
                        : 'text-gray-400'
                  }`}
                >
                  {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '—'}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              Alasan <span className="text-red-500">*</span>
            </label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih alasan..." />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Catatan</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Opsional"
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Menyimpan...' : 'Simpan Penyesuaian'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
