'use client'

import { useState, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { createBank, updateBank } from '../_actions/bankActions'

interface Bank {
  id: string
  name: string
  accountNumber: string | null
  accountHolder: string | null
}

interface BankDialogProps {
  bank?: Bank
  trigger: React.ReactNode
}

export default function BankDialog({ bank, trigger }: BankDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = bank
        ? await updateBank(bank.id, formData)
        : await createBank(formData)

      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success(bank ? 'Bank berhasil diupdate' : 'Bank berhasil ditambahkan')
        setOpen(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{bank ? 'Edit Bank' : 'Tambah Bank'}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium text-gray-700">
              Nama Bank <span className="text-red-500">*</span>
            </label>
            <Input id="name" name="name" defaultValue={bank?.name ?? ''} required />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="accountNumber" className="text-sm font-medium text-gray-700">
              Nomor Rekening
            </label>
            <Input
              id="accountNumber"
              name="accountNumber"
              defaultValue={bank?.accountNumber ?? ''}
              placeholder="Opsional"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="accountHolder" className="text-sm font-medium text-gray-700">
              Atas Nama
            </label>
            <Input
              id="accountHolder"
              name="accountHolder"
              defaultValue={bank?.accountHolder ?? ''}
              placeholder="Opsional"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
