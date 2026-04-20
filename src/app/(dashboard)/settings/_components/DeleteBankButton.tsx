'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { deleteBank } from '../_actions/bankActions'

export default function DeleteBankButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!window.confirm('Hapus bank ini? Tindakan ini tidak bisa dibatalkan.')) return
    startTransition(async () => {
      const result = await deleteBank(id)
      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success('Bank berhasil dihapus')
      }
    })
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      disabled={isPending}
      className="text-red-600 hover:text-red-700 hover:bg-red-50"
    >
      {isPending ? 'Menghapus...' : 'Hapus'}
    </Button>
  )
}
