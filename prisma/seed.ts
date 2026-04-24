import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'node:path'

const dbPath = path.join(__dirname, 'dev.db')
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` })
const prisma = new PrismaClient({ adapter })

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10)

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: { fullName: 'Administrator', isActive: true },
    create: {
      username: 'admin',
      password: hashedPassword,
      fullName: 'Administrator',
      isActive: true,
    },
  })

  const profileCount = await prisma.companyProfile.count()
  if (profileCount === 0) {
    await prisma.companyProfile.create({
      data: {
        name: 'Toko Bangunan Saya',
        address: 'Padang, Sumatera Barat',
      },
    })
  }

  const banks = ['Bank Nagari', 'BRI', 'BSI']
  for (const bankName of banks) {
    const existing = await prisma.bank.findFirst({ where: { name: bankName } })
    if (!existing) {
      await prisma.bank.create({ data: { name: bankName } })
    }
  }

  console.log('Seed completed successfully.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
