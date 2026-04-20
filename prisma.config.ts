import path from 'node:path'
import { defineConfig } from 'prisma/config'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const dbPath = path.join(__dirname, 'prisma', 'dev.db')
const dbUrl = `file:${dbPath}`

export default defineConfig({
  schema: 'prisma/schema.prisma',
})
