'use server'

import { prisma } from '@/lib/prisma'

export async function getBanks() {
  return prisma.bank.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
}
