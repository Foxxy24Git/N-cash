'use client'

import { useEffect, useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { formatRupiah } from '@/lib/format'
import LunasiDialog from './LunasiDialog'

interface Item {
  id: string
  itemName: string
  quantity: string
  unitPrice: string
  buyPriceSnapshot: string | null
  productId: string | null
  subtotal: string
}

interface InvoiceDetail {
  invoiceNumber: string
  date: string
  createdAt: string
  totalAmount: string
  paymentMethod: string
  bank: { name: string } | null
  items: Item[]
  paidAt: string | null
  paidMethod: string | null
  paidBank: { name: string } | null
  createdBy: { fullName: string | null; username: string } | null
}

interface Props {
  invoiceId: string
  open: boolean
  onClose: () => void
}

export default function DetailModal({ invoiceId, open, onClose }: Props) {
  const [data, setData] = useState<InvoiceDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [lunasiOpen, setLunasiOpen] = useState(false)

  useEffect(() => {
    setData(null)
    setError(false)
    if (!open) return
    setLoading(true)
    fetch(`/api/invoices/${invoiceId}`)
      .then((r) => {
        if (!r.ok) throw new Error('fetch failed')
        return r.json()
      })
      .then((d: InvoiceDetail) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [open, invoiceId])

  const dateLabel = data
    ? new Date(data.date).toLocaleDateString('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit', month: '2-digit', year: 'numeric',
      })
    : ''

  const paidAtLabel = data?.paidAt
    ? new Date(data.paidAt).toLocaleDateString('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit', month: '2-digit', year: 'numeric',
      })
    : null

  const paidMethodLabel = data?.paidMethod === 'CASH' ? 'Cash'
    : data?.paidMethod === 'CASH_COD' ? 'Cash COD'
    : data?.paidMethod === 'QRIS' ? 'QRIS'
    : data?.paidBank ? `Transfer — ${data.paidBank.name}`
    : 'Transfer Bank'

  const isBon = data?.paymentMethod === 'UNPAID' || data?.paymentMethod === 'BON'

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

        {error && (
          <div className="py-10 text-center text-sm text-red-500">
            Gagal memuat data. Coba lagi.
          </div>
        )}

        {!loading && data && (
          <div className="space-y-4">
            {/* Status BON */}
            {isBon && (
              <div className="flex items-center justify-between rounded-lg px-3 py-2.5 border">
                {data.paidAt ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border bg-green-100 text-green-800 border-green-200">
                      ✅ LUNAS
                    </span>
                    <span className="text-xs text-gray-500">
                      dibayar {paidAtLabel} via {paidMethodLabel}
                    </span>
                  </div>
                ) : (
                  <>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border bg-red-100 text-red-800 border-red-200">
                      ⚠️ BELUM LUNAS
                    </span>
                    <button
                      onClick={() => setLunasiOpen(true)}
                      className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      💰 Lunasi
                    </button>
                  </>
                )}
              </div>
            )}

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
              {data.createdBy && (
                <div className="col-span-2">
                  <span className="text-gray-500">Dibuat oleh</span>
                  <p className="font-medium text-gray-900">
                    {data.createdBy.fullName || `@${data.createdBy.username}`}
                    {data.createdAt && (
                      <span className="font-normal text-gray-500">
                        {' '}pada{' '}
                        {new Date(data.createdAt).toLocaleDateString('id-ID', {
                          timeZone: 'Asia/Jakarta',
                          day: '2-digit', month: '2-digit', year: 'numeric',
                        })}
                        {' '}
                        {new Date(data.createdAt).toLocaleTimeString('id-ID', {
                          timeZone: 'Asia/Jakarta',
                          hour: '2-digit', minute: '2-digit', hour12: false,
                        })}
                      </span>
                    )}
                  </p>
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
                    <th className="text-right px-3 py-2.5 font-semibold text-gray-700">Harga Beli</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-gray-700">Laba Item</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-gray-700">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item, i) => {
                    const bp = item.buyPriceSnapshot !== null ? Number(item.buyPriceSnapshot) : null
                    const itemProfit = bp !== null && item.productId
                      ? (Number(item.unitPrice) - bp) * Number(item.quantity)
                      : null
                    return (
                      <tr key={item.id} className={i % 2 === 1 ? 'bg-gray-50/50' : ''}>
                        <td className="px-3 py-2 text-gray-900">{item.itemName}</td>
                        <td className="px-3 py-2 text-center text-gray-600">{Number(item.quantity)}</td>
                        <td className="px-3 py-2 text-right font-mono text-gray-700">
                          {formatRupiah(Number(item.unitPrice))}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-gray-500">
                          {bp !== null ? formatRupiah(bp) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          {itemProfit === null ? (
                            <span className="text-gray-300">—</span>
                          ) : itemProfit < 0 ? (
                            <span className="text-red-600">{formatRupiah(itemProfit)}</span>
                          ) : (
                            <span className="text-emerald-700">{formatRupiah(itemProfit)}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-semibold text-gray-900">
                          {formatRupiah(Number(item.subtotal))}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            {(() => {
              const invoiceProfit = data.items.reduce((sum, item) => {
                if (item.productId && item.buyPriceSnapshot !== null) {
                  return sum + (Number(item.unitPrice) - Number(item.buyPriceSnapshot)) * Number(item.quantity)
                }
                return sum
              }, 0)
              const hasLinked = data.items.some(i => i.productId && i.buyPriceSnapshot !== null)
              return (
                <div className="space-y-2 pt-2 border-t border-gray-200">
                  {hasLinked && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-emerald-700">LABA BERSIH FAKTUR</span>
                      <span className={`text-base font-bold font-mono ${invoiceProfit < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                        {formatRupiah(invoiceProfit)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">TOTAL BELANJA</span>
                    <span className="text-xl font-bold text-gray-900 font-mono">
                      {formatRupiah(Number(data.totalAmount))}
                    </span>
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </DialogContent>

      {data && (
        <LunasiDialog
          invoiceId={invoiceId}
          invoiceDate={data.date}
          open={lunasiOpen}
          onClose={() => {
            setLunasiOpen(false)
            onClose()
          }}
        />
      )}
    </Dialog>
  )
}
