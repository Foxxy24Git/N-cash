'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

type ActionResult = { success: true } | { error: string }

export async function createBank(formData: FormData): Promise<ActionResult> {
  const name = (formData.get('name') as string | null)?.trim()
  if (!name) return { error: 'Nama bank wajib diisi' }

  try {
    await prisma.bank.create({
      data: {
        name,
        accountNumber: (formData.get('accountNumber') as string)?.trim() || null,
        accountHolder: (formData.get('accountHolder') as string)?.trim() || null,
      },
    })
  } catch {
    return { error: 'Gagal menyimpan bank. Coba lagi.' }
  }

  revalidatePath('/settings')
  return { success: true }
}

export async function updateBank(id: string, formData: FormData): Promise<ActionResult> {
  const name = (formData.get('name') as string | null)?.trim()
  if (!name) return { error: 'Nama bank wajib diisi' }

  try {
    await prisma.bank.update({
      where: { id },
      data: {
        name,
        accountNumber: (formData.get('accountNumber') as string)?.trim() || null,
        accountHolder: (formData.get('accountHolder') as string)?.trim() || null,
      },
    })
  } catch {
    return { error: 'Gagal mengupdate bank. Coba lagi.' }
  }

  revalidatePath('/settings')
  return { success: true }
}

export async function deleteBank(id: string): Promise<ActionResult> {
  try {
    await prisma.bank.delete({ where: { id } })
  } catch {
    return { error: 'Gagal menghapus bank. Coba lagi.' }
  }

  revalidatePath('/settings')
  return { success: true }
}
