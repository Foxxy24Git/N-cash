'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

type ActionResult = { success: true } | { error: string }

export async function createBank(formData: FormData): Promise<ActionResult> {
  const name = (formData.get('name') as string | null)?.trim()
  if (!name) return { error: 'Nama bank wajib diisi' }

  await prisma.bank.create({
    data: {
      name,
      accountNumber: (formData.get('accountNumber') as string)?.trim() || null,
      accountHolder: (formData.get('accountHolder') as string)?.trim() || null,
    },
  })
  revalidatePath('/settings')
  return { success: true }
}

export async function updateBank(id: string, formData: FormData): Promise<ActionResult> {
  const name = (formData.get('name') as string | null)?.trim()
  if (!name) return { error: 'Nama bank wajib diisi' }

  await prisma.bank.update({
    where: { id },
    data: {
      name,
      accountNumber: (formData.get('accountNumber') as string)?.trim() || null,
      accountHolder: (formData.get('accountHolder') as string)?.trim() || null,
    },
  })
  revalidatePath('/settings')
  return { success: true }
}

export async function deleteBank(id: string): Promise<ActionResult> {
  await prisma.bank.delete({ where: { id } })
  revalidatePath('/settings')
  return { success: true }
}
