'use client'

import { useState } from 'react'
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

interface ResetPasswordDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  user: User
  onSuccess: () => void
}

export default function ResetPasswordDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: ResetPasswordDialogProps) {
  const [loading, setLoading] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  function handleOpenChange(v: boolean) {
    if (!v) {
      setNewPassword('')
      setConfirmPassword('')
    }
    onOpenChange(v)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword.trim().length < 8) {
      toast.error('Password minimal 8 karakter')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Konfirmasi password tidak cocok')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Terjadi kesalahan')
        return
      }
      toast.success(
        'Password berhasil direset. User harus login ulang dengan password baru.'
      )
      onSuccess()
      handleOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset Password — {user.fullName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label htmlFor="rp-password" className="text-sm font-medium text-gray-700">
              Password Baru <span className="text-red-500">*</span>{' '}
              <span className="text-xs font-normal text-gray-400">(min 8 karakter)</span>
            </label>
            <Input
              id="rp-password"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="rp-confirm" className="text-sm font-medium text-gray-700">
              Konfirmasi Password Baru <span className="text-red-500">*</span>
            </label>
            <Input
              id="rp-confirm"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Mereset...' : 'Reset Password'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
