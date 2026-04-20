'use client'

import { useEffect, useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { formatRupiah } from '@/lib/format'

interface Item {
  id: string
  itemName: string
  quantity: string   // Decimal serialized as string by Prisma
  unitPrice: string
  subtotal: string
}

interface InvoiceDetail {
  invoiceNumber: string
  date: string
  totalAmount: string
  paymentMethod: string
  bank: { name: string } | null
  items: Item[]
}

interface Props {
  invoiceId: string
  open: boolean
  onClose: () => void
}

export default function DetailModal({ invoiceId, open, onClose }: Props) {
  const [data, setData] = useState<InvoiceDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch(`/api/invoices/${invoiceId}`)
      .then((r) => r.json())
      .then((d: InvoiceDetail) => setData(d))
      .finally(() => setLoading(false))
  }, [open, invoiceId])

  const dateLabel = data
    ? new Date(data.date).toLocaleDateString('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit', month: '2-digit', year: 'numeric',
      })
    : ''

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Detail Faktur{data ? ` — ${data.invoiceNumber}` : ''}
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="py-10 text-center text-sm text-gray-400">Memuat data...</div>
        )}

        {!loading && data && (
          <div className="space-y-4">
            {/* Header info */}
            <div className="grid grid-cols-2 gap-2 text-sm bg-gray-50 rounded-lg p-3">
              <div>
                <span className="text-gray-500">No Faktur</span>
                <p className="font-medium text-gray-900">{data.invoiceNumber}</p>
              </div>
              <div>
                <span className="text-gray-500">Tanggal</span>
                <p className="font-medium text-gray-900">{dateLabel}</p>
              </div>
              <div>
                <span className="text-gray-500">Metode</span>
                <p className="font-medium text-gray-900">{data.paymentMethod}</p>
              </div>
              {data.bank && (
                <div>
                  <span className="text-gray-500">Bank</span>
                  <p className="font-medium text-gray-900">{data.bank.name}</p>
                </div>
              )}
            </div>

            {/* Items table */}
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-3 py-2.5 font-semibold text-gray-700">Nama Barang</th>
                    <th className="text-center px-3 py-2.5 font-semibold text-gray-700">QTY</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-gray-700">Harga Satuan</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-gray-700">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item, i) => (
                    <tr key={item.id} className={i % 2 === 1 ? 'bg-gray-50/50' : ''}>
                      <td className="px-3 py-2 text-gray-900">{item.itemName}</td>
                      <td className="px-3 py-2 text-center text-gray-600">{Number(item.quantity)}</td>
                      <td className="px-3 py-2 text-right font-mono text-gray-700">
                        {formatRupiah(Number(item.unitPrice))}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-gray-900">
                        {formatRupiah(Number(item.subtotal))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <span className="text-sm font-medium text-gray-600">TOTAL BELANJA</span>
              <span className="text-xl font-bold text-gray-900 font-mono">
                {formatRupiah(Number(data.totalAmount))}
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
