'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

type Result = { success: true } | { success: false; error: string }

export async function deleteInvoice(id: string): Promise<Result> {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }

  try {
    await prisma.invoice.delete({ where: { id } })
    return { success: true }
  } catch {
    return { success: false, error: 'Terjadi kesalahan, coba lagi' }
  }
}
