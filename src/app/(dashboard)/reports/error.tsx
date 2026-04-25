'use client'

import { AlertTriangle } from 'lucide-react'

export default function ReportsError({
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <AlertTriangle size={40} className="text-red-400 mb-4" strokeWidth={1.5} />
      <p className="text-sm font-medium text-gray-700">Gagal memuat laporan</p>
      <p className="text-xs text-gray-400 mt-1">Terjadi kesalahan saat mengambil data.</p>
      <button
        onClick={reset}
        className="mt-4 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Coba Lagi
      </button>
    </div>
  )
}
