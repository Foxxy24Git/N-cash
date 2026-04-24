import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id, deletedAt: null },
    include: {
      items: true,
      bank: { select: { name: true } },
      createdBy: { select: { fullName: true, username: true } },
    },
  })

  if (!invoice) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(invoice)
}
