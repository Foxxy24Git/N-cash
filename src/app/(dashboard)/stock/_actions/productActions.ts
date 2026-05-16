'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

type ActionResult = { success: true } | { error: string }

function parseCurrency(val: FormDataEntryValue | null): number {
  return parseInt(String(val ?? '').replace(/\D/g, ''), 10) || 0
}

export async function createProduct(formData: FormData): Promise<ActionResult> {
  const name = (formData.get('name') as string | null)?.trim()
  const unit = (formData.get('unit') as string | null)?.trim()
  if (!name) return { error: 'Nama barang wajib diisi' }
  if (!unit) return { error: 'Satuan wajib diisi' }

  const buyPrice     = parseCurrency(formData.get('buyPrice'))
  const sellingPrice = parseCurrency(formData.get('sellingPrice'))
  const stock        = Math.max(0, parseInt(String(formData.get('stock') ?? '0'), 10) || 0)
  const minStock     = Math.max(0, parseInt(String(formData.get('minStock') ?? '0'), 10) || 0)
  const notes        = (formData.get('notes') as string | null)?.trim() || null

  if (buyPrice <= 0)     return { error: 'Harga beli wajib diisi' }
  if (sellingPrice <= 0) return { error: 'Harga jual wajib diisi' }

  try {
    await prisma.product.create({
      data: { name, unit, buyPrice, sellingPrice, stock, minStock, notes, isActive: true },
    })
  } catch {
    return { error: 'Gagal menyimpan barang. Coba lagi.' }
  }

  revalidatePath('/stock')
  return { success: true }
}

export async function updateProduct(id: string, formData: FormData): Promise<ActionResult> {
  const name = (formData.get('name') as string | null)?.trim()
  const unit = (formData.get('unit') as string | null)?.trim()
  if (!name) return { error: 'Nama barang wajib diisi' }
  if (!unit) return { error: 'Satuan wajib diisi' }

  const buyPrice     = parseCurrency(formData.get('buyPrice'))
  const sellingPrice = parseCurrency(formData.get('sellingPrice'))
  const stock        = Math.max(0, parseInt(String(formData.get('stock') ?? '0'), 10) || 0)
  const minStock     = Math.max(0, parseInt(String(formData.get('minStock') ?? '0'), 10) || 0)
  const notes        = (formData.get('notes') as string | null)?.trim() || null

  if (buyPrice <= 0)     return { error: 'Harga beli wajib diisi' }
  if (sellingPrice <= 0) return { error: 'Harga jual wajib diisi' }

  try {
    await prisma.product.update({
      where: { id },
      data: { name, unit, buyPrice, sellingPrice, stock, minStock, notes },
    })
  } catch {
    return { error: 'Gagal mengupdate barang. Coba lagi.' }
  }

  revalidatePath('/stock')
  return { success: true }
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  try {
    await prisma.product.update({ where: { id }, data: { isActive: false } })
  } catch {
    return { error: 'Gagal menghapus barang. Coba lagi.' }
  }

  revalidatePath('/stock')
  return { success: true }
}

export async function adjustStock(
  productId: string,
  newStock: number,
  reason: string,
  notes?: string,
): Promise<ActionResult> {
  if (newStock < 0) return { error: 'Stok tidak boleh negatif' }

  const validReasons = ['STOCK_OPNAME', 'RECEIVE', 'DAMAGE', 'LOST', 'OTHER']
  if (!validReasons.includes(reason)) return { error: 'Alasan tidak valid' }

  let stockBefore: number

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId, isActive: true },
      select: { stock: true },
    })
    if (!product) return { error: 'Barang tidak ditemukan' }
    stockBefore = product.stock

    await prisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id: productId }, data: { stock: newStock } })
      const adjustment = await tx.stockAdjustment.create({
        data: {
          productId,
          oldStock: stockBefore,
          newStock,
          reason,
          notes: notes ?? null,
        },
      })
      await tx.stockMovement.create({
        data: {
          productId,
          type: 'ADJUST',
          quantity: newStock - stockBefore,
          stockBefore,
          stockAfter: newStock,
          referenceId: adjustment.id,
          notes: notes ?? null,
        },
      })
    })
  } catch {
    return { error: 'Gagal menyimpan penyesuaian stok. Coba lagi.' }
  }

  revalidatePath('/stock')
  return { success: true }
}
