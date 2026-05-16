import { Package } from 'lucide-react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty-state'
import { formatRupiah } from '@/lib/format'
import { StockCrudButtons } from './StockCrudButtons'

export interface ProductRow {
  id: string
  name: string
  unit: string
  buyPrice: number
  sellingPrice: number
  margin: string
  stock: number
  minStock: number
  stockStatus: 'normal' | 'low' | 'out'
  notes: string | null
}

interface Props {
  rows: ProductRow[]
  totalCount: number
  page: number
  totalPages: number
  prevUrl: string | null
  nextUrl: string | null
}

const STATUS_BADGE: Record<'normal' | 'low' | 'out', { label: string; className: string }> = {
  normal: { label: 'Normal',  className: 'bg-green-100 text-green-800 border-green-200' },
  low:    { label: 'Menipis', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  out:    { label: 'Habis',   className: 'bg-red-100 text-red-800 border-red-200' },
}

const PAGE_SIZE = 50

export default function StockTable({ rows, totalCount, page, totalPages, prevUrl, nextUrl }: Props) {
  const start = (page - 1) * PAGE_SIZE + 1
  const end   = Math.min(page * PAGE_SIZE, totalCount)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold text-gray-700 whitespace-nowrap">Nama Barang</TableHead>
              <TableHead className="font-semibold text-gray-700 whitespace-nowrap">Satuan</TableHead>
              <TableHead className="font-semibold text-gray-700 text-right whitespace-nowrap">Harga Beli</TableHead>
              <TableHead className="font-semibold text-gray-700 text-right whitespace-nowrap">Harga Jual</TableHead>
              <TableHead className="font-semibold text-gray-700 text-right whitespace-nowrap">Margin</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center whitespace-nowrap">Stok</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center whitespace-nowrap">Stok Min</TableHead>
              <TableHead className="font-semibold text-gray-700 whitespace-nowrap">Status</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center whitespace-nowrap">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={9} className="p-0">
                  <EmptyState
                    icon={Package}
                    title="Belum ada data barang"
                    subtitle="Klik [+ Tambah Barang] atau [📥 Import Excel] untuk mulai."
                  />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const badge = STATUS_BADGE[row.stockStatus]
                return (
                  <TableRow key={row.id} className="hover:bg-gray-50/50">
                    <TableCell className="font-medium text-gray-900">{row.name}</TableCell>
                    <TableCell className="text-gray-600 text-sm">{row.unit}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-gray-700">
                      {formatRupiah(row.buyPrice)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-gray-700">
                      {formatRupiah(row.sellingPrice)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-gray-700">{row.margin}</TableCell>
                    <TableCell className="text-center font-mono font-semibold text-gray-900">
                      {row.stock}
                    </TableCell>
                    <TableCell className="text-center text-sm text-gray-500">{row.minStock}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badge.className}`}>
                        {badge.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <StockCrudButtons row={row} />
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalCount > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm">
          <span className="text-gray-500">
            {start}–{end} dari {totalCount} barang · halaman {page}/{totalPages}
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
