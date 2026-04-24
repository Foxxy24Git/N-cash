import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { updateUserSchema } from '@/lib/schemas/user'

const USER_SELECT = {
  id: true,
  username: true,
  fullName: true,
  isActive: true,
  createdAt: true,
} as const

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { id: params.id } })
  if (!user) {
    return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
  }

  const body = await req.json()
  const result = updateUserSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    )
  }

  const { fullName, isActive, newPassword } = result.data

  if (params.id === session.user.id && isActive === false) {
    return NextResponse.json(
      { error: 'Tidak bisa menonaktifkan akun sendiri' },
      { status: 400 }
    )
  }

  const data: { fullName?: string; isActive?: boolean; password?: string } = {}
  if (fullName !== undefined) data.fullName = fullName
  if (isActive !== undefined) data.isActive = isActive
  if (newPassword !== undefined) data.password = await bcrypt.hash(newPassword, 10)

  try {
    const updated = await prisma.user.update({
      where: { id: params.id },
      data,
      select: USER_SELECT,
    })
    return NextResponse.json(updated)
  } catch (e) {
    console.error('[PATCH /api/users/[id]]', e)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { id: params.id } })
  if (!user) {
    return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
  }

  if (params.id === session.user.id) {
    return NextResponse.json(
      { error: 'Tidak bisa menghapus akun sendiri' },
      { status: 400 }
    )
  }

  const invoiceCount = await prisma.invoice.count({
    where: { createdById: params.id },
  })
  if (invoiceCount > 0) {
    return NextResponse.json(
      {
        error:
          'User tidak bisa dihapus karena memiliki riwayat transaksi. Nonaktifkan saja (isActive = false).',
      },
      { status: 400 }
    )
  }

  try {
    await prisma.user.delete({ where: { id: params.id } })
    return NextResponse.json({ message: 'User berhasil dihapus' })
  } catch (e) {
    console.error('[DELETE /api/users/[id]]', e)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
