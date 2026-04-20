'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { updateInvoice } from '../_actions/updateInvoice'
import { getBanks } from '../../transactions/new/_actions/getBanks'

// ─── Types ─────────────────────────────────────────────────────────────────────

type PaymentMethod = 'Cash' | 'Cash COD' | 'QRIS' | 'Transfer Bank' | 'BON'

interface EditItem {
  tempId: string
  itemName: string
  qty: number
  unitPrice: number
  subtotal: number
  isOverridden: boolean
}

interface InvoiceDetail {
  invoiceNumber: string
  date: string
  totalAmount: string
  paymentMethod: string
  bankId: string | null
  bank: { name: string } | null
  items: {
    id: string
    itemName: string
    quantity: string
    unitPrice: string
    subtotal: string
  }[]
}

interface Props {
  invoiceId: string
  open: boolean
  onClose: () => void
}

// ─── Utilities ─────────────────────────────────────────────────────────────────

function formatThousands(value: number): string {
  return value.toLocaleString('id-ID')
}

function parseDigits(raw: string): number {
  const cleaned = raw.replace(/[^0-9]/g, '')
  return cleaned ? parseInt(cleaned, 10) : 0
}

function CurrencyInput({
  value,
  onChange,
  className = '',
}: {
  value: number
  onChange: (v: number) => void
  className?: string
}) {
  return (
    <div className={`relative flex items-center ${className}`}>
      <span className="absolute left-2.5 text-xs text-gray-400 pointer-events-none select-none">Rp</span>
      <input
        type="text"
        inputMode="numeric"
        value={value > 0 ? formatThousands(value) : ''}
        onChange={(e) => onChange(parseDigits(e.target.value))}
        placeholder="0"
        className="w-full pl-7 pr-2 py-2 text-right text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  )
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'Cash',          label: 'Cash' },
  { value: 'Cash COD',      label: 'Cash COD' },
  { value: 'QRIS',          label: 'QRIS' },
  { value: 'Transfer Bank', label: 'Transfer Bank' },
  { value: 'BON',           label: 'BON' },
]

// ─── Component ─────────────────────────────────────────────────────────────────

export default function EditModal({ invoiceId, open, onClose }: Props) {
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)

  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [date, setDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash')
  const [bankId, setBankId] = useState<string>('')
  const [items, setItems] = useState<EditItem[]>([])
  const [banks, setBanks] = useState<{ id: string; name: string }[]>([])

  const total = items.reduce((sum, i) => sum + i.subtotal, 0)

  // Fetch invoice data + banks when modal opens
  useEffect(() => {
    if (!open) return
    setError(false)
    setLoading(true)

    Promise.all([
      fetch(`/api/invoices/${invoiceId}`).then((r) => {
        if (!r.ok) throw new Error('fetch failed')
        return r.json() as Promise<InvoiceDetail>
      }),
      getBanks(),
    ])
      .then(([inv, bankList]) => {
        setInvoiceNumber(inv.invoiceNumber)
        // Convert ISO date to YYYY-MM-DD for <input type="date">
        setDate(inv.date.slice(0, 10))
        setPaymentMethod(inv.paymentMethod as PaymentMethod)
        setBankId(inv.bankId ?? '')
        setBanks(bankList)
        setItems(
          inv.items.map((item) => ({
            tempId: item.id,
            itemName: item.itemName,
            qty: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            subtotal: Number(item.subtotal),
            isOverridden: false,
          }))
        )
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [open, invoiceId])

  // ─── Item helpers ─────────────────────────────────────────────────────────────

  function updateItem(tempId: string, patch: Partial<EditItem>) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.tempId !== tempId) return item
        const next = { ...item, ...patch }
        if (!next.isOverridden && (patch.qty !== undefined || patch.unitPrice !== undefined)) {
          next.subtotal = next.qty * next.unitPrice
        }
        return next
      })
    )
  }

  function resetSubtotal(tempId: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.tempId === tempId
          ? { ...item, subtotal: item.qty * item.unitPrice, isOverridden: false }
          : item
      )
    )
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      { tempId: crypto.randomUUID(), itemName: '', qty: 1, unitPrice: 0, subtotal: 0, isOverridden: false },
    ])
  }

  function removeItem(tempId: string) {
    setItems((prev) => prev.filter((i) => i.tempId !== tempId))
  }

  // ─── Submit ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true)
    const result = await updateInvoice(invoiceId, {
      date,
      paymentMethod,
      bankId: paymentMethod === 'Transfer Bank' ? bankId : undefined,
      items: items.map((i) => ({
        itemName: i.itemName,
        qty: i.qty,
        unitPrice: i.unitPrice,
        subtotal: i.subtotal,
      })),
    })
    setSaving(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Transaksi berhasil diperbarui')
    onClose()
    router.refresh()
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Edit Transaksi{invoiceNumber ? ` — ${invoiceNumber}` : ''}
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="py-10 text-center text-sm text-gray-400">Memuat data...</div>
        )}

        {error && (
          <div className="py-10 text-center text-sm text-red-500">
            Gagal memuat data. Tutup dan coba lagi.
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-5">
            {/* Header fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">No Faktur</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  readOnly
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Payment method */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Metode Pembayaran</label>
              <select
                value={paymentMethod}
                onChange={(e) => {
                  setPaymentMethod(e.target.value as PaymentMethod)
                  setBankId('')
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Bank dropdown — only for Transfer Bank */}
            {paymentMethod === 'Transfer Bank' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Pilih Bank</label>
                {banks.length === 0 ? (
                  <p className="text-xs text-red-500">Belum ada bank terdaftar. Tambah di Menu Setting.</p>
                ) : (
                  <select
                    value={bankId}
                    onChange={(e) => setBankId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Pilih Bank --</option>
                    {banks.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Items table */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Detail Barang</label>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm min-w-[560px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-3 py-2.5 font-semibold text-gray-700">Nama Barang</th>
                      <th className="text-center px-3 py-2.5 font-semibold text-gray-700 w-20">QTY</th>
                      <th className="text-right px-3 py-2.5 font-semibold text-gray-700 w-32">Harga Satuan</th>
                      <th className="text-right px-3 py-2.5 font-semibold text-gray-700 w-32">Subtotal</th>
                      <th className="w-16" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={item.tempId} className={idx % 2 === 1 ? 'bg-gray-50/50' : ''}>
                        <td className="px-2 py-1.5">
                          <input
                            type="text"
                            value={item.itemName}
                            onChange={(e) => updateItem(item.tempId, { itemName: e.target.value })}
                            placeholder="Nama barang"
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.qty || ''}
                            onChange={(e) => updateItem(item.tempId, { qty: parseFloat(e.target.value) || 0 })}
                            className="w-full px-2 py-1.5 text-sm text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <CurrencyInput
                            value={item.unitPrice}
                            onChange={(v) => updateItem(item.tempId, { unitPrice: v })}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="flex items-center gap-1">
                            <CurrencyInput
                              value={item.subtotal}
                              onChange={(v) => updateItem(item.tempId, { subtotal: v, isOverridden: true })}
                              className="flex-1"
                            />
                            {item.isOverridden && (
                              <button
                                type="button"
                                onClick={() => resetSubtotal(item.tempId)}
                                title="Reset ke otomatis"
                                className="p-1 text-gray-400 hover:text-blue-500 transition-colors flex-shrink-0"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => removeItem(item.tempId)}
                            disabled={items.length <= 1}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={addItem}
                className="mt-2 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <Plus className="w-4 h-4" />
                Tambah Barang
              </button>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between py-3 border-t border-gray-200">
              <span className="text-sm font-medium text-gray-600">TOTAL BELANJA</span>
              <span className="text-xl font-bold text-gray-900 font-mono">
                Rp {formatThousands(total)}
              </span>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading || error || items.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
