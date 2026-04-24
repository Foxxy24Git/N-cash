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

interface AddUserDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: () => void
}

export default function AddUserDialog({ open, onOpenChange, onSuccess }: AddUserDialogProps) {
  const [loading, setLoading] = useState(false)
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  function resetForm() {
    setUsername('')
    setFullName('')
    setPassword('')
    setConfirmPassword('')
  }

  function handleOpenChange(v: boolean) {
    if (!v) resetForm()
    onOpenChange(v)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!/^[a-z0-9_]+$/.test(username)) {
      toast.error('Username hanya boleh huruf kecil, angka, dan underscore')
      return
    }
    if (username.length < 3 || username.length > 20) {
      toast.error('Username harus 3-20 karakter')
      return
    }
    if (password.length < 8) {
      toast.error('Password minimal 8 karakter')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Konfirmasi password tidak cocok')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, fullName, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Terjadi kesalahan')
        return
      }
      toast.success('User berhasil ditambahkan')
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
          <DialogTitle>Tambah User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label htmlFor="au-username" className="text-sm font-medium text-gray-700">
              Username <span className="text-red-500">*</span>
            </label>
            <Input
              id="au-username"
              value={username}
              onChange={e => setUsername(e.target.value.toLowerCase())}
              placeholder="3-20 karakter, huruf/angka/_"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="au-fullName" className="text-sm font-medium text-gray-700">
              Nama Lengkap <span className="text-red-500">*</span>
            </label>
            <Input
              id="au-fullName"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="au-password" className="text-sm font-medium text-gray-700">
              Password <span className="text-red-500">*</span>{' '}
              <span className="text-xs font-normal text-gray-400">(min 8 karakter)</span>
            </label>
            <Input
              id="au-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="au-confirm" className="text-sm font-medium text-gray-700">
              Konfirmasi Password <span className="text-red-500">*</span>
            </label>
            <Input
              id="au-confirm"
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
              {loading ? 'Menyimpan...' : 'Tambah User'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
