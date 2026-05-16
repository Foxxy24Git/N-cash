'use client'

export function ExportStockButton() {
  return (
    <button
      type="button"
      onClick={() => { window.location.href = '/api/stock/export' }}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
    >
      📤 Export
    </button>
  )
}
