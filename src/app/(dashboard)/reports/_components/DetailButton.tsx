'use client'

import { useState } from 'react'
import DetailModal from './DetailModal'

export default function DetailButton({ invoiceId }: { invoiceId: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
      >
        Detail
      </button>
      <DetailModal invoiceId={invoiceId} open={open} onClose={() => setOpen(false)} />
    </>
  )
}
