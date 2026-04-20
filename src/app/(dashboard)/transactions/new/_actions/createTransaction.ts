'use server'

import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const PAYMENT_METHODS = ['Cash', 'Cash COD', 'QRIS', 'Transfer Bank', 'BON'] as const

const itemSchema = z.object({
  itemName: z.string().min(1, 'Nama barang wajib diisi'),
  qty: z.number().positive('Qty harus lebih dari 0'),
  unitPrice: z.number().min(0),
  subtotal: z.number().min(0),
})

const schema = z
  .object({
    invoiceNumber: z.string().min(1, 'Nomor faktur wajib diisi'),
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

export async function createTransaction(payload: unknown): Promise<Result> {
  const parsed = schema.safeParse(payload)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const { invoiceNumber, date, paymentMethod, bankId, items } = parsed.data

  const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0)

  try {
    await prisma.invoice.create({
      data: {
        invoiceNumber,
        date: new Date(date + 'T00:00:00Z'),
        totalAmount,
        paymentMethod,
        bankId: paymentMethod === 'Transfer Bank' ? bankId : null,
        items: {
          create: items.map((item) => ({
            itemName: item.itemName,
            quantity: item.qty,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
          })),
        },
      },
    })

    return { success: true }
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      return { success: false, error: 'Nomor faktur sudah digunakan' }
    }
    return { success: false, error: 'Terjadi kesalahan, coba lagi' }
  }
}
