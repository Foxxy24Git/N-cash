'use client'

import { useRef, useEffect, useTransition } from 'react'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { changePassword } from '../_actions/passwordActions'

export default function PasswordTab() {
  const [isPending, startTransition] = useTransition()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await changePassword(formData)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('Password berhasil diubah. Logout dalam 1.5 detik...')
      timerRef.current = setTimeout(() => signOut({ callbackUrl: '/login' }), 1500)
    })
  }

  return (
    <form action={handleSubmit} className="space-y-5 max-w-sm">
      <div className="space-y-1.5">
        <label htmlFor="oldPassword" className="text-sm font-medium text-gray-700">
          Password Lama
        </label>
        <Input id="oldPassword" name="oldPassword" type="password" required />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
          Password Baru{' '}
          <span className="text-xs font-normal text-gray-400">(min. 8 karakter)</span>
        </label>
        <Input id="newPassword" name="newPassword" type="password" required minLength={8} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
          Konfirmasi Password Baru
        </label>
        <Input id="confirmPassword" name="confirmPassword" type="password" required />
      </div>

      <div className="space-y-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Menyimpan...' : 'Simpan Password'}
        </Button>
        <p className="text-xs text-gray-400">
          Setelah berhasil, Anda akan otomatis logout dan perlu login ulang.
        </p>
      </div>
    </form>
  )
}
