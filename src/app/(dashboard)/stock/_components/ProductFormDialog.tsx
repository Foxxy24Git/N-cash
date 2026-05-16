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
import { Combobox } from '@/components/ui/combobox'
import { createProduct, updateProduct } from '../_actions/productActions'
import type { ProductRow } from './StockTable'

const UNIT_OPTIONS = [
  'SAK', 'PCS', 'BATANG', 'LEMBAR', 'METER',
  'KG', 'LITER', 'ROLL', 'SET', 'KARDUS', 'PASANG', 'UNIT', 'BOX',
]

type Props =
  | { mode: 'add'; product?: undefined }
  | { mode: 'edit'; product: ProductRow }

export function ProductFormDialog({ mode, product }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [unit, setUnit]                 = useState('')
  const [buyPrice, setBuyPrice]         = useState('')
  const [sellingPrice, setSellingPrice] = useState('')
  const [error, setError]               = useState<string | null>(null)

  const buyNum  = parseInt(buyPrice, 10)    || 0
  const sellNum = parseInt(sellingPrice, 10) || 0
  const priceWarning = buyNum > 0 && sellNum > 0 && sellNum < buyNum

  useEffect(() => {
    if (!open) return
    setUnit(product?.unit ?? '')
    setBuyPrice(product ? String(product.buyPrice) : '')
    setSellingPrice(product ? String(product.sellingPrice) : '')
    setError(null)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('unit', unit)
    formData.set('buyPrice', buyPrice)
    formData.set('sellingPrice', sellingPrice)
    setError(null)

    startTransition(async () => {
      const result =
        mode === 'edit' && product
          ? await updateProduct(product.id, formData)
          : await createProduct(formData)

      if ('error' in result) {
        setError(result.error)
      } else {
        toast.success(
          mode === 'edit' ? 'Barang berhasil diupdate' : 'Barang berhasil ditambahkan',
        )
        setOpen(false)
      }
    })
  }

  const trigger =
    mode === 'add' ? (
      <Button className="h-9 px-3 text-sm font-medium">+ Tambah Barang</Button>
    ) : (
      <button className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
        ✏️ Edit
      </button>
    )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Tambah Barang' : 'Edit Barang'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Nama Barang <span className="text-red-500">*</span>
            </label>
            <Input
              name="name"
              defaultValue={product?.name}
              placeholder="Contoh: Semen Gresik 40kg"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              Satuan <span className="text-red-500">*</span>
            </label>
            <Combobox
              value={unit}
              onChange={setUnit}
              options={UNIT_OPTIONS}
              placeholder="Pilih atau ketik satuan..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Harga Beli <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
                  Rp
                </span>
                <Input
                  className="pl-8"
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value.replace(/\D/g, ''))}
                  placeholder="0"
                  inputMode="numeric"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Harga Jual <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
                  Rp
                </span>
                <Input
                  className="pl-8"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value.replace(/\D/g, ''))}
                  placeholder="0"
                  inputMode="numeric"
                />
              </div>
            </div>
          </div>

          {priceWarning && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              ⚠️ Harga jual lebih kecil dari harga beli — barang akan dijual rugi.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Stok Awal <span className="text-red-500">*</span>
              </label>
              <Input
                name="stock"
                type="number"
                min={0}
                defaultValue={product?.stock ?? 0}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Stok Minimum</label>
              <Input
                name="minStock"
                type="number"
                min={0}
                defaultValue={product?.minStock ?? 0}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Keterangan</label>
            <textarea
              name="notes"
              defaultValue={product?.notes ?? ''}
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
              {isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
