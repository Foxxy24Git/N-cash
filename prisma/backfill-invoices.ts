import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'node:path'

const dbPath = path.join(__dirname, 'dev.db')
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` })
const prisma = new PrismaClient({ adapter })

async function main() {
  const admin = await prisma.user.findUnique({ where: { username: 'admin' } })
  if (!admin) throw new Error('Admin user not found. Run seed first.')

  const result = await prisma.invoice.updateMany({
    where: { createdById: null },
    data: { createdById: admin.id },
  })

  console.log(`Backfilled ${result.count} invoice(s) → createdById = ${admin.id}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
