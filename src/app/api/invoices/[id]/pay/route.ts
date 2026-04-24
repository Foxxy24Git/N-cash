import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
const TIMEZONE = 'Asia/Jakarta'

function jakartaDateToUtc(dateStr: string): Date {
  // dateStr = 'YYYY-MM-DD', interpreted as midnight Jakarta time
  return new Date(`${dateStr}T00:00:00+07:00`)
}

function todayJakartaUtc(): Date {
  const str = new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE })
  return jakartaDateToUtc(str)
}

const paySchema = z.object({
  paidMethod: z.enum(['CASH', 'CASH_COD', 'QRIS', 'BANK_TRANSFER']),
  paidBankId: z.string().optional(),
  paidAt: z.string().optional(),
  notes: z.string().optional(),
})

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = paySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { paidMethod, paidBankId, paidAt: paidAtStr, notes } = parsed.data

  if (paidMethod === 'BANK_TRANSFER' && !paidBankId) {
    return NextResponse.json(
      { success: false, error: 'paidBankId wajib diisi untuk metode BANK_TRANSFER' },
      { status: 400 }
    )
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id, deletedAt: null },
  })

  if (!invoice) {
    return NextResponse.json({ success: false, error: 'Invoice tidak ditemukan' }, { status: 404 })
  }

  if (invoice.paymentMethod !== 'BON') {
    return NextResponse.json(
      { success: false, error: 'Hanya invoice BON (UNPAID) yang bisa dilunasi' },
      { status: 400 }
    )
  }

  if (invoice.paidAt !== null) {
    return NextResponse.json(
      { success: false, error: 'Invoice ini sudah pernah dilunasi' },
      { status: 400 }
    )
  }

  // Resolve paidAt: default = today in Jakarta timezone
  const paidAt = paidAtStr ? jakartaDateToUtc(paidAtStr) : todayJakartaUtc()

  // paidAt tidak boleh sebelum tanggal invoice
  const invoiceDateStr = new Date(invoice.date).toLocaleDateString('en-CA', { timeZone: TIMEZONE })
  const invoiceDateUtc = jakartaDateToUtc(invoiceDateStr)
  if (paidAt < invoiceDateUtc) {
    return NextResponse.json(
      { success: false, error: 'Tanggal pelunasan tidak boleh sebelum tanggal transaksi' },
      { status: 400 }
    )
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.invoice.update({
      where: { id: params.id },
      data: {
        paidAt,
        paidMethod,
        paidBankId: paidBankId ?? null,
      },
      include: {
        items: true,
        bank: { select: { name: true } },
        paidBank: { select: { name: true } },
      },
    })

    await tx.paymentLog.create({
      data: {
        invoiceId: params.id,
        paidAt,
        paidMethod,
        paidBankId: paidBankId ?? null,
        amount: invoice.totalAmount,
        notes: notes ?? null,
      },
    })

    return updated
  })

  return NextResponse.json({ success: true, invoice: result })
}
