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
