import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { FileSearch } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { formatRupiah } from '@/lib/format'
import { PAGE_SIZE } from '@/lib/report-query'
import type { InvoiceRow } from '@/lib/report-query'
import ActionButtons from './ActionButtons'

const METHOD_BADGE: Record<string, string> = {
  'Cash':          'bg-green-100 text-green-800 border-green-200',
  'Cash COD':      'bg-green-100 text-green-800 border-green-200',
  'QRIS':          'bg-blue-100 text-blue-800 border-blue-200',
  'Transfer Bank': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'BON':           'bg-red-100 text-red-800 border-red-200',
}

interface Props {
  rows: InvoiceRow[]
  totalCount: number
  page: number
  prevUrl: string | null
  nextUrl: string | null
}

export default function InvoiceTable({ rows, totalCount, page, prevUrl, nextUrl }: Props) {
  const start = (page - 1) * PAGE_SIZE + 1
  const end   = Math.min(page * PAGE_SIZE, totalCount)
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold text-gray-700 whitespace-nowrap">No Faktur</TableHead>
              <TableHead className="font-semibold text-gray-700 whitespace-nowrap">Jam</TableHead>
              <TableHead className="font-semibold text-gray-700 whitespace-nowrap">Tanggal</TableHead>
              <TableHead className="font-semibold text-gray-700 text-right whitespace-nowrap">Total Belanja</TableHead>
              <TableHead className="font-semibold text-gray-700 text-right whitespace-nowrap">Laba</TableHead>
              <TableHead className="font-semibold text-gray-700 whitespace-nowrap">Status</TableHead>
              <TableHead className="font-semibold text-gray-700 whitespace-nowrap">Dibuat Oleh</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center whitespace-nowrap">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="p-0">
                  <EmptyState
                    icon={FileSearch}
                    title="Tidak ada transaksi"
                    subtitle="Coba ubah filter atau rentang tanggal."
                  />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-gray-50/50">
                  <TableCell className="font-medium text-gray-900">{row.invoiceNumber}</TableCell>
                  <TableCell className="text-gray-600 font-mono text-sm">{row.time}</TableCell>
                  <TableCell className="text-gray-600 text-sm">{row.date}</TableCell>
                  <TableCell className="text-right font-mono font-semibold text-gray-900">
                    {formatRupiah(row.totalAmount)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {row.profit === null ? (
                      <span className="text-gray-400">—</span>
                    ) : row.profit < 0 ? (
                      <span className="text-red-600">{formatRupiah(row.profit)}</span>
                    ) : (
                      <span className="text-emerald-700">{formatRupiah(row.profit)}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const isBon = row.paymentMethod === 'BON' || row.paymentMethod === 'UNPAID'
                      const isLunas = isBon && row.paidAt !== null
                      if (isLunas) {
                        const tgl = new Date(row.paidAt!).toLocaleDateString('id-ID', {
                          timeZone: 'Asia/Jakarta',
                          day: '2-digit', month: '2-digit', year: 'numeric',
                        })
                        return (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-gray-100 text-gray-600 border-gray-300">
                            🔴 BON (Lunas {tgl})
                          </span>
                        )
                      }
                      if (isBon) {
                        return (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-red-100 text-red-800 border-red-200">
                            🔴 BON
                          </span>
                        )
                      }
                      return (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${METHOD_BADGE[row.paymentMethod] ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                          {row.paymentMethod}{row.bankName ? ` — ${row.bankName}` : ''}
                        </span>
                      )
                    })()}
                  </TableCell>
                  <TableCell className="text-gray-500 text-sm whitespace-nowrap">
                    {row.createdByName ?? <span className="text-gray-300">—</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    <ActionButtons invoiceId={row.id} invoiceNumber={row.invoiceNumber} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalCount > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm">
          <span className="text-gray-500">
            {start}–{end} dari {totalCount} transaksi · halaman {page}/{totalPages}
          </span>
          <div className="flex items-center gap-2">
            {prevUrl ? (
              <a href={prevUrl} className="px-3 py-1.5 font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                ← Sebelumnya
              </a>
            ) : (
              <span className="px-3 py-1.5 font-medium rounded-lg border border-gray-100 text-gray-300 cursor-not-allowed">
                ← Sebelumnya
              </span>
            )}
            {nextUrl ? (
              <a href={nextUrl} className="px-3 py-1.5 font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                Berikutnya →
              </a>
            ) : (
              <span className="px-3 py-1.5 font-medium rounded-lg border border-gray-100 text-gray-300 cursor-not-allowed">
                Berikutnya →
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
