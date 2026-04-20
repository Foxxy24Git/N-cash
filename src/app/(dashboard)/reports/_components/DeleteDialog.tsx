'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { deleteInvoice } from '../_actions/deleteInvoice'

interface Props {
  invoiceId: string
  invoiceNumber: string
  open: boolean
  onClose: () => void
}

export default function DeleteDialog({ invoiceId, invoiceNumber, open, onClose }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    const result = await deleteInvoice(invoiceId)
    setLoading(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Transaksi berhasil dihapus')
    onClose()
    router.refresh()
  }

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus Transaksi?</AlertDialogTitle>
          <AlertDialogDescription>
            Transaksi <span className="font-semibold text-gray-900">{invoiceNumber}</span> akan
            dihapus permanen. Tindakan ini tidak dapat dibatalkan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600"
          >
            {loading ? 'Menghapus...' : 'Ya, Hapus'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
