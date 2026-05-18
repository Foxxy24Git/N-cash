'use client'

import { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { Plus, Trash2, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getBanks } from '../_actions/getBanks'
import { toast } from 'sonner'
import { createTransaction } from '../_actions/createTransaction'
import { getStockStatus, STOCK_BADGE_CLASS, STOCK_TEXT_CLASS } from '@/lib/stock-status'

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatThousands(value: number): string {
  return value.toLocaleString('id-ID')
}

function parseDigits(raw: string): number {
  const cleaned = raw.replace(/[^0-9]/g, '')
  return cleaned ? parseInt(cleaned, 10) : 0
}

function parseQty(raw: string): number {
  const cleaned = raw.replace(/[^0-9.]/g, '')
  return cleaned ? parseFloat(cleaned) : 0
}

// ─── Payment Method Config ────────────────────────────────────────────────────

type PaymentMethod = 'Cash' | 'Cash COD' | 'QRIS' | 'Transfer Bank' | 'BON'

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'Cash', label: 'Cash' },
  { value: 'Cash COD', label: 'Cash COD' },
  { value: 'QRIS', label: 'QRIS' },
  { value: 'Transfer Bank', label: 'Transfer Bank' },
  { value: 'BON', label: 'BON' },
]

const METHOD_COLORS: Record<PaymentMethod, { base: string; active: string }> = {
  Cash:           { base: 'border-green-200 text-green-700 hover:bg-green-50',  active: 'bg-green-100 border-green-400 text-green-800 font-semibold' },
  'Cash COD':     { base: 'border-green-200 text-green-700 hover:bg-green-50',  active: 'bg-green-100 border-green-400 text-green-800 font-semibold' },
  QRIS:           { base: 'border-blue-200 text-blue-700 hover:bg-blue-50',     active: 'bg-blue-100 border-blue-400 text-blue-800 font-semibold' },
  'Transfer Bank':{ base: 'border-yellow-200 text-yellow-700 hover:bg-yellow-50', active: 'bg-yellow-100 border-yellow-400 text-yellow-800 font-semibold' },
  BON:            { base: 'border-red-200 text-red-700 hover:bg-red-50',        active: 'bg-red-100 border-red-400 text-red-800 font-semibold' },
}

// ─── Currency Input ───────────────────────────────────────────────────────────

function CurrencyInput({
  value,
  onChange,
  className,
}: {
  value: number
  onChange: (value: number) => void
  className?: string
}) {
  const display = value > 0 ? formatThousands(value) : ''

  return (
    <div className={cn('relative flex items-center', className)}>
      <span className="absolute left-2.5 text-xs text-gray-400 pointer-events-none select-none">
        Rp
      </span>
      <input
        type="text"
        inputMode="numeric"
        value={display}
        onChange={(e) => onChange(parseDigits(e.target.value))}
        placeholder="0"
        className="w-full pl-7 pr-2 py-2 text-right text-sm border border-gray-300 rounded-lg
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  )
}

// ─── Item types & helpers ─────────────────────────────────────────────────────

interface Item {
  id: string
  itemName: string
  qty: string
  unitPrice: number
  subtotal: number
  isOverridden: boolean
  productId: string | null
  stock: number | null
  unit: string | null
  minStock: number | null
}

function createItem(): Item {
  return {
    id: crypto.randomUUID(),
    itemName: '',
    qty: '',
    unitPrice: 0,
    subtotal: 0,
    isOverridden: false,
    productId: null,
    stock: null,
    unit: null,
    minStock: null,
  }
}

function autoSubtotal(qty: string, unitPrice: number): number {
  const q = parseQty(qty)
  return q > 0 && unitPrice > 0 ? Math.round(q * unitPrice) : 0
}

// ─── Product Autocomplete ─────────────────────────────────────────────────────

interface ProductResult {
  id: string
  name: string
  unit: string
  sellingPrice: number
  stock: number
  minStock: number
}

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

// ─── Item Row ─────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  canDelete,
  onUpdate,
  onDelete,
}: {
  item: Item
  canDelete: boolean
  onUpdate: (id: string, changes: Partial<Item>) => void
  onDelete: (id: string) => void
}) {
  const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const qty = e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')
    const changes: Partial<Item> = { qty }
    if (!item.isOverridden) changes.subtotal = autoSubtotal(qty, item.unitPrice)
    onUpdate(item.id, changes)
  }

  const handleUnitPriceChange = (unitPrice: number) => {
    const changes: Partial<Item> = { unitPrice }
    if (!item.isOverridden) changes.subtotal = autoSubtotal(item.qty, unitPrice)
    onUpdate(item.id, changes)
  }

  const handleSubtotalChange = (subtotal: number) => {
    onUpdate(item.id, { subtotal, isOverridden: true })
  }

  const resetSubtotal = () => {
    onUpdate(item.id, {
      subtotal: autoSubtotal(item.qty, item.unitPrice),
      isOverridden: false,
    })
  }

  const handleProductSelect = (product: ProductResult) => {
    onUpdate(item.id, {
      itemName: product.name,
      productId: product.id,
      unitPrice: product.sellingPrice,
      stock: product.stock,
      unit: product.unit,
      minStock: product.minStock,
      subtotal: !item.isOverridden
        ? autoSubtotal(item.qty, product.sellingPrice)
        : item.subtotal,
    })
  }

  const handleProductTextChange = (text: string) => {
    onUpdate(item.id, { itemName: text, productId: null, stock: null, unit: null, minStock: null })
  }

  const stockBadgeColor = item.stock !== null && item.minStock !== null
    ? STOCK_BADGE_CLASS[getStockStatus(item.stock, item.minStock)]
    : 'bg-green-100 text-green-800 border-green-200'

  return (
    <tr className="border-t border-gray-100 hover:bg-gray-50/50">
      <td className="px-2 py-2">
        <ProductAutocomplete
          value={item.itemName}
          onChange={handleProductTextChange}
          onSelect={handleProductSelect}
        />
        {item.unit !== null && item.stock !== null && (
          <div className="flex items-center gap-1 mt-1">
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', stockBadgeColor)}>
              📦 {item.stock} {item.unit}
            </span>
          </div>
        )}
      </td>

      <td className="px-2 py-2">
        <input
          type="text"
          inputMode="decimal"
          value={item.qty}
          onChange={handleQtyChange}
          placeholder="0"
          className="w-full px-2 py-2 text-sm text-center border border-gray-300 rounded-lg
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {item.stock !== null && parseQty(item.qty) > item.stock && (
          <p className="text-xs text-yellow-600 mt-0.5">
            ⚠️ Stok tersedia: {item.stock} {item.unit}
          </p>
        )}
      </td>

      <td className="px-2 py-2">
        <CurrencyInput value={item.unitPrice} onChange={handleUnitPriceChange} />
      </td>

      <td className="px-2 py-2">
        <div className="flex items-center gap-1">
          <CurrencyInput
            value={item.subtotal}
            onChange={handleSubtotalChange}
            className="flex-1"
          />
          {item.isOverridden && (
            <button
              type="button"
              onClick={resetSubtotal}
              title="Reset ke auto-calculate"
              className="shrink-0 p-1.5 rounded-md text-amber-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
            >
              <RotateCcw size={13} />
            </button>
          )}
        </div>
      </td>

      <td className="px-2 py-2 text-center">
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          disabled={!canDelete}
          title="Hapus baris"
          className={cn(
            'p-1.5 rounded-md transition-colors',
            canDelete
              ? 'text-gray-400 hover:text-red-500 hover:bg-red-50'
              : 'text-gray-200 cursor-not-allowed'
          )}
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  )
}

// ─── Main Form ────────────────────────────────────────────────────────────────

type Bank = { id: string; name: string }

export default function NewTransactionForm() {
  const today = format(new Date(), 'yyyy-MM-dd')

  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [date, setDate] = useState(today)
  const [items, setItems] = useState<Item[]>([createItem()])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash')
  const [selectedBankId, setSelectedBankId] = useState('')
  const [banks, setBanks] = useState<Bank[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    getBanks().then(setBanks)
  }, [])

  const updateItem = (id: string, changes: Partial<Item>) =>
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...changes } : item))
    )

  const addItem = () => setItems((prev) => [...prev, createItem()])

  const removeItem = (id: string) =>
    setItems((prev) =>
      prev.length > 1 ? prev.filter((item) => item.id !== id) : prev
    )

  const totalBelanja = items.reduce((sum, item) => sum + item.subtotal, 0)

  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setPaymentMethod(method)
    if (method !== 'Transfer Bank') setSelectedBankId('')
  }

  const resetForm = () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    setInvoiceNumber('')
    setDate(today)
    setItems([createItem()])
    setPaymentMethod('Cash')
    setSelectedBankId('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      console.log('[N-Cash] items saat submit:', items.map(i => ({
        itemName: i.itemName,
        productId: i.productId,
        qty: parseQty(i.qty),
        unitPrice: i.unitPrice,
        subtotal: i.subtotal,
        stock: i.stock,
        unit: i.unit,
      })))

      const result = await createTransaction({
        invoiceNumber,
        date,
        paymentMethod,
        bankId: selectedBankId || undefined,
        items: items.map((item) => ({
          itemName: item.itemName,
          productId: item.productId ?? null,
          qty: parseQty(item.qty),
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
        })),
      })

      if (result.success) {
        toast.success('Transaksi berhasil disimpan')
        if (result.warning) {
          toast.warning(result.warning)
        }
        resetForm()
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error('Terjadi kesalahan, coba lagi')
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputBase =
    'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* ── Section 1: Header Faktur ────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">📋 Header Faktur</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nomor Faktur <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Contoh: 0-ABC-001"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className={inputBase}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tanggal <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputBase}
            />
          </div>
        </div>
      </div>

      {/* ── Section 2: Detail Barang ────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">🛒 Detail Barang</h2>

        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full min-w-[580px] text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-2 py-2.5 font-medium text-gray-600 text-xs uppercase tracking-wide rounded-l-lg w-[34%]">
                  Nama Barang
                </th>
                <th className="text-center px-2 py-2.5 font-medium text-gray-600 text-xs uppercase tracking-wide w-[10%]">
                  QTY
                </th>
                <th className="text-right px-2 py-2.5 font-medium text-gray-600 text-xs uppercase tracking-wide w-[24%]">
                  Harga Satuan
                </th>
                <th className="text-right px-2 py-2.5 font-medium text-gray-600 text-xs uppercase tracking-wide w-[24%]">
                  Subtotal
                </th>
                <th className="text-center px-2 py-2.5 font-medium text-gray-600 text-xs uppercase tracking-wide rounded-r-lg w-[8%]">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  canDelete={items.length > 1}
                  onUpdate={updateItem}
                  onDelete={removeItem}
                />
              ))}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={addItem}
          className="mt-4 flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          <Plus size={15} />
          Tambah Barang
        </button>
      </div>

      {/* ── Section 3: Pembayaran ───────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">💳 Pembayaran</h2>

        {/* Payment method pills */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Metode Pembayaran <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_METHODS.map(({ value, label }) => {
              const isActive = paymentMethod === value
              const colors = METHOD_COLORS[value]
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => handlePaymentMethodChange(value)}
                  className={cn(
                    'px-4 py-1.5 rounded-full border text-sm transition-all',
                    isActive ? colors.active : `border-gray-200 text-gray-500 hover:bg-gray-50 ${colors.base}`
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Bank dropdown — only shown when Transfer Bank is selected */}
        {paymentMethod === 'Transfer Bank' && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pilih Bank <span className="text-red-500">*</span>
            </label>
            {banks.length > 0 ? (
              <select
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className={cn(inputBase, 'bg-white')}
              >
                <option value="">-- Pilih bank --</option>
                {banks.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.name}
                  </option>
                ))}
              </select>
            ) : (
              <select
                disabled
                className={cn(inputBase, 'bg-gray-50 text-gray-400 cursor-not-allowed')}
              >
                <option>Tambahkan bank di Setting</option>
              </select>
            )}
          </div>
        )}

        {/* Total Belanja */}
        <div className="mt-6 pt-5 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">TOTAL BELANJA</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {items.length} barang · auto-sum semua subtotal
              </p>
            </div>
            <span className="text-3xl font-bold text-gray-900 font-mono tracking-tight">
              Rp {formatThousands(totalBelanja)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Submit ──────────────────────────────────────────────────────── */}
      <div className="pb-6">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 bg-blue-600 text-white font-semibold rounded-xl
            hover:bg-blue-700 active:bg-blue-800 transition-colors text-base
            disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi'}
        </button>
      </div>

    </form>
  )
}
