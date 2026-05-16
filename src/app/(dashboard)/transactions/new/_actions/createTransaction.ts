'use server'

import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

const PAYMENT_METHODS = ['Cash', 'Cash COD', 'QRIS', 'Transfer Bank', 'BON'] as const

const itemSchema = z.object({
  itemName: z.string().min(1, 'Nama barang wajib diisi'),
  productId: z.string().nullable().optional(),
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

type Result =
  | { success: true; warning?: string }
  | { success: false; error: string }

export async function createTransaction(payload: unknown): Promise<Result> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }
  const userId = session.user.id

  const parsed = schema.safeParse(payload)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const { invoiceNumber, date, paymentMethod, bankId, items } = parsed.data

  const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0)

  // Sum qty per productId (handles duplicate product in same invoice)
  const productQtyMap = new Map<string, number>()
  for (const item of items) {
    if (item.productId) {
      productQtyMap.set(item.productId, (productQtyMap.get(item.productId) ?? 0) + item.qty)
    }
  }

  // Fetch product data needed before transaction
  const products = await prisma.product.findMany({
    where: { id: { in: Array.from(productQtyMap.keys()) } },
    select: { id: true, buyPrice: true, stock: true, name: true },
  })
  const productMap = new Map(products.map((p) => [p.id, p]))

  // Detect insufficient stock for warning (checked after successful save)
  const warningParts: string[] = []
  for (const [productId, totalQty] of Array.from(productQtyMap.entries())) {
    const product = productMap.get(productId)
    if (product && totalQty > product.stock) {
      warningParts.push(`Stok ${product.name} tidak mencukupi, ditulis 0`)
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Insert Invoice + all InvoiceItems
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          date: new Date(date + 'T00:00:00Z'),
          totalAmount,
          paymentMethod,
          bankId: paymentMethod === 'Transfer Bank' ? bankId : null,
          createdById: userId,
          items: {
            create: items.map((item) => {
              const product = item.productId ? productMap.get(item.productId) : null
              return {
                itemName: item.itemName,
                quantity: item.qty,
                unitPrice: item.unitPrice,
                buyPriceSnapshot: product ? product.buyPrice : null,
                subtotal: item.subtotal,
                productId: item.productId ?? null,
              }
            }),
          },
        },
      })

      // 2. Update stock + insert StockMovement per product
      for (const [productId, totalQty] of Array.from(productQtyMap.entries())) {
        const product = productMap.get(productId)
        if (!product) continue

        const qtyInt = Math.round(totalQty)
        const newStock = Math.max(0, product.stock - qtyInt)

        await tx.product.update({
          where: { id: productId },
          data: { stock: newStock },
        })

        await tx.stockMovement.create({
          data: {
            productId,
            type: 'OUT',
            quantity: -qtyInt,
            stockBefore: product.stock,
            stockAfter: newStock,
            referenceId: invoice.id,
            notes: `Transaksi ${invoiceNumber}`,
          },
        })
      }
    })

    return warningParts.length > 0
      ? { success: true, warning: warningParts.join('. ') }
      : { success: true }
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
