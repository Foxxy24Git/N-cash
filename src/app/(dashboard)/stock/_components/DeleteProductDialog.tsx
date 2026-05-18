'use client'

import { useState, useTransition } from 'react'
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { deleteProduct } from '../_actions/productActions'

interface Props {
  id: string
  name: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function DeleteProductDialog({ id, name, open: externalOpen, onOpenChange }: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = externalOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteProduct(id)
      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success('Barang berhasil disembunyikan dari daftar')
        setOpen(false)
      }
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {!onOpenChange && (
        <AlertDialogTrigger asChild>
          <button className="px-2 py-1 text-xs rounded border border-gray-200 text-red-500 hover:bg-red-50 transition-colors">
            🗑️ Hapus
          </button>
        </AlertDialogTrigger>
      )}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sembunyikan Barang?</AlertDialogTitle>
          <AlertDialogDescription>
            Barang <strong className="text-foreground">{name}</strong> akan
            disembunyikan dari daftar. Data transaksi historis tetap tersimpan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-600"
          >
            {isPending ? 'Menghapus...' : 'Ya, Sembunyikan'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
