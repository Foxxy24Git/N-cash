'use client'

import { useState } from 'react'

export function ExportStockButton() {
  const [loading, setLoading] = useState(false)

  const handleExport = () => {
    setLoading(true)
    window.location.href = '/api/stock/export'
    setTimeout(() => setLoading(false), 3000)
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={loading}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? '⏳ Mengekspor...' : '📤 Export'}
    </button>
  )
}
