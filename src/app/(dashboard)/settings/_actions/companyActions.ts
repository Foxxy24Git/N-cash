'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

interface CompanyData {
  name: string
  address: string
  phone: string
  logoUrl: string | null
}

type ActionResult = { success: true } | { error: string }

export async function upsertCompany(data: CompanyData): Promise<ActionResult> {
  const name = data.name.trim()
  const address = data.address.trim()
  if (!name) return { error: 'Nama perusahaan wajib diisi' }
  if (!address) return { error: 'Alamat wajib diisi' }

  try {
    const existing = await prisma.companyProfile.findFirst()
    if (existing) {
      await prisma.companyProfile.update({
        where: { id: existing.id },
        data: { name, address, phone: data.phone.trim() || null, logoUrl: data.logoUrl },
      })
    } else {
      await prisma.companyProfile.create({
        data: { name, address, phone: data.phone.trim() || null, logoUrl: data.logoUrl },
      })
    }
  } catch {
    return { error: 'Gagal menyimpan. Coba lagi.' }
  }

  revalidatePath('/settings')
  return { success: true }
}
