'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface User {
  id: string
  username: string
  fullName: string
  isActive: boolean
  createdAt: string
}

interface EditUserDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  user: User
  currentUserId: string
  onSuccess: () => void
}

export default function EditUserDialog({
  open,
  onOpenChange,
  user,
  currentUserId,
  onSuccess,
}: EditUserDialogProps) {
  const [loading, setLoading] = useState(false)
  const [fullName, setFullName] = useState(user.fullName)
  const [isActive, setIsActive] = useState(user.isActive)

  useEffect(() => {
    setFullName(user.fullName)
    setIsActive(user.isActive)
  }, [user])

  const isSelf = user.id === currentUserId

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (fullName.trim().length < 3 || fullName.trim().length > 100) {
      toast.error('Nama lengkap harus 3-100 karakter')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, isActive }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Terjadi kesalahan')
        return
      }
      toast.success('User berhasil diperbarui')
      onSuccess()
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Username</label>
            <Input value={user.username} disabled />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="eu-fullName" className="text-sm font-medium text-gray-700">
              Nama Lengkap <span className="text-red-500">*</span>
            </label>
            <Input
              id="eu-fullName"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Status Aktif</label>
            <div>
              <Button
                type="button"
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsActive(v => !v)}
                disabled={isSelf}
                className={isActive ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {isActive ? 'Aktif' : 'Nonaktif'}
              </Button>
              {isSelf && (
                <p className="text-xs text-gray-400 mt-1">
                  Tidak bisa menonaktifkan akun sendiri
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
