'use client'

import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function StockError({ error, reset }: Props) {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col items-center justify-center py-24 text-center px-4">
        <AlertTriangle size={48} className="text-red-400 mb-4" strokeWidth={1.5} />
        <p className="text-sm font-medium text-gray-700 mb-1">Gagal memuat data stok</p>
        <p className="text-xs text-gray-400 mb-6 max-w-xs">
          {error.message || 'Terjadi kesalahan saat mengambil data dari server.'}
        </p>
        <Button onClick={reset}>Coba Lagi</Button>
      </div>
    </div>
  )
}
