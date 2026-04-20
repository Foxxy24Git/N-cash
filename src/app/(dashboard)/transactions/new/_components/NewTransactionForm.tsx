'use client'

import { useState } from 'react'
import { Plus, Trash2, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

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
  qty: string        // stored as string to allow "1.", "0.5" etc while typing
  unitPrice: number
  subtotal: number
  isOverridden: boolean
}

function createItem(): Item {
  return {
    id: crypto.randomUUID(),
    itemName: '',
    qty: '',
    unitPrice: 0,
    subtotal: 0,
    isOverridden: false,
  }
}

function autoSubtotal(qty: string, unitPrice: number): number {
  const q = parseQty(qty)
  return q > 0 && unitPrice > 0 ? Math.round(q * unitPrice) : 0
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
    // Allow digits and one decimal point only
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

  return (
    <tr className="border-t border-gray-100 hover:bg-gray-50/50">
      {/* Nama Barang */}
      <td className="px-2 py-2">
        <input
          type="text"
          value={item.itemName}
          onChange={(e) => onUpdate(item.id, { itemName: e.target.value })}
          placeholder="Nama barang..."
          className="w-full px-2.5 py-2 text-sm border border-gray-300 rounded-lg
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </td>

      {/* QTY */}
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
      </td>

      {/* Harga Satuan */}
      <td className="px-2 py-2">
        <CurrencyInput value={item.unitPrice} onChange={handleUnitPriceChange} />
      </td>

      {/* Subtotal */}
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

      {/* Aksi */}
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

export default function NewTransactionForm() {
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [date, setDate] = useState(today)
  const [items, setItems] = useState<Item[]>([createItem()])

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form data:', {
      invoiceNumber,
      date,
      items: items.map((item) => ({
        itemName: item.itemName,
        qty: parseQty(item.qty),
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
        isSubtotalOverridden: item.isOverridden,
      })),
      totalBelanja,
    })
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

      {/* ── Section 3: Pembayaran (placeholder) ────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">💳 Pembayaran</h2>

        <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 py-8 text-center">
          <p className="text-sm text-gray-400">
            Metode pembayaran akan ditambahkan di tahap berikutnya
          </p>
        </div>

        {/* Total Belanja */}
        <div className="mt-5 pt-5 border-t border-gray-200 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Total Belanja</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Jumlah dari semua subtotal ({items.length} barang)
            </p>
          </div>
          <span className="text-2xl font-bold text-gray-900 font-mono tracking-tight">
            Rp {formatThousands(totalBelanja)}
          </span>
        </div>
      </div>

      {/* ── Submit ──────────────────────────────────────────────────────── */}
      <div className="flex justify-end pb-4">
        <button
          type="submit"
          className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg
            hover:bg-blue-700 active:bg-blue-800 transition-colors"
        >
          Simpan Transaksi
        </button>
      </div>

    </form>
  )
}
