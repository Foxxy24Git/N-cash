'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import bcrypt from 'bcryptjs'

type Result = { success: true } | { error: string }

export async function changePassword(formData: FormData): Promise<Result> {
  const session = await auth()
  if (!session?.user?.name) return { error: 'Tidak terautentikasi' }

  const oldPassword = formData.get('oldPassword') as string
  const newPassword = formData.get('newPassword') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!oldPassword || !newPassword || !confirmPassword) {
    return { error: 'Semua field wajib diisi' }
  }
  if (newPassword.length < 8) {
    return { error: 'Password baru minimal 8 karakter' }
  }
  if (newPassword !== confirmPassword) {
    return { error: 'Konfirmasi password tidak cocok' }
  }
  if (newPassword.trim().length < 8) {
    return { error: 'Password tidak boleh hanya spasi' }
  }

  const user = await prisma.user.findUnique({ where: { username: session.user.name } })
  if (!user) return { error: 'User tidak ditemukan' }

  const match = await bcrypt.compare(oldPassword, user.password)
  if (!match) return { error: 'Password lama tidak cocok' }

  const hashed = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } })

  return { success: true }
}
