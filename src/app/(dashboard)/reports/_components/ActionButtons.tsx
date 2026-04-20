'use client'

import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import DetailModal from './DetailModal'
import EditModal from './EditModal'
import DeleteDialog from './DeleteDialog'

interface Props {
  invoiceId: string
  invoiceNumber: string
}

export default function ActionButtons({ invoiceId, invoiceNumber }: Props) {
  const [detailOpen, setDetailOpen] = useState(false)
  const [editOpen, setEditOpen]     = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <div className="flex items-center justify-center gap-1">
        <button
          onClick={() => setDetailOpen(true)}
          className="px-2.5 py-1 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
        >
          Detail
        </button>
        <button
          onClick={() => setEditOpen(true)}
          title="Edit transaksi"
          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={() => setDeleteOpen(true)}
          title="Hapus transaksi"
          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <DetailModal
        invoiceId={invoiceId}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
      <EditModal
        invoiceId={invoiceId}
        open={editOpen}
        onClose={() => setEditOpen(false)}
      />
      <DeleteDialog
        invoiceId={invoiceId}
        invoiceNumber={invoiceNumber}
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
      />
    </>
  )
}
