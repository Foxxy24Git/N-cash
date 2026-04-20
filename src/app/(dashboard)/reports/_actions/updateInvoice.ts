'use server'

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

const PAYMENT_METHODS = ['Cash', 'Cash COD', 'QRIS', 'Transfer Bank', 'BON'] as const

const itemSchema = z.object({
  itemName: z.string().min(1, 'Nama barang wajib diisi'),
  qty: z.number().positive('Qty harus lebih dari 0'),
  unitPrice: z.number().min(0),
  subtotal: z.number().min(0),
})

const schema = z
  .object({
    date: z.string().min(1, 'Tanggal wajib diisi'),
    paymentMethod: z.enum(PAYMENT_METHODS),
    bankId: z.string().optional(),
    items: z.array(itemSchema).min(1, 'Minimal 1 barang harus diisi'),
  })
  .refine(
    (data) => data.paymentMethod !== 'Transfer Bank' || !!data.bankId,
    { message: 'Pilih bank untuk metode Transfer Bank', path: ['bankId'] }
  )

type Result = { success: true } | { success: false; error: string }

export async function updateInvoice(id: string, payload: unknown): Promise<Result> {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }

  const parsed = schema.safeParse(payload)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const { date, paymentMethod, bankId, items } = parsed.data
  const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0)

  try {
    await prisma.$transaction([
      prisma.invoiceItem.deleteMany({ where: { invoiceId: id } }),
      prisma.invoice.update({
        where: { id },
        data: {
          date: new Date(date + 'T00:00:00Z'),
          totalAmount,
          paymentMethod,
          bankId: paymentMethod === 'Transfer Bank' ? (bankId ?? null) : null,
          items: {
            create: items.map((item) => ({
              itemName: item.itemName,
              quantity: item.qty,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
            })),
          },
        },
      }),
    ])

    return { success: true }
  } catch {
    return { success: false, error: 'Terjadi kesalahan, coba lagi' }
  }
}
