import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

interface ImportError {
  row: number
  name: string
  reason: string
}

interface ValidRow {
  rowNum: number
  name: string
  unit: string
  buyPrice: number
  sellingPrice: number
  stock: number
  minStock: number
  notes: string | null
}

function toNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null
  const n = Number(val)
  return isNaN(n) ? null : n
}

function toInt(val: unknown): number | null {
  const n = toNumber(val)
  if (n === null) return null
  return Math.floor(n)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file')
  const mode = formData.get('mode') === 'upsert' ? 'upsert' : 'add_new'

  if (!file || typeof file === 'string') {
    return Response.json({ error: 'File tidak ditemukan' }, { status: 400 })
  }

  const arrayBuffer = await (file as Blob).arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(buffer, { type: 'buffer' })
  } catch {
    return Response.json({ error: 'File tidak valid atau bukan format .xlsx' }, { status: 400 })
  }

  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    return Response.json({ error: 'File kosong, tidak ada sheet' }, { status: 400 })
  }

  const sheet = workbook.Sheets[sheetName]
  // raw: true agar angka tidak diformat sebagai string
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' })

  // Baris 0-2 = judul/petunjuk, baris 3 = header → data mulai baris 4 (index 4)
  const dataRows = rows.slice(4)

  const validRows: ValidRow[] = []
  const errors: ImportError[] = []

  dataRows.forEach((row, idx) => {
    const rowNum = idx + 5 // nomor baris di Excel (1-based, data mulai baris 5)
    const [nameRaw, unitRaw, buyRaw, sellRaw, stockRaw, minStockRaw, notesRaw] = row as unknown[]

    // Skip baris kosong
    const name = String(nameRaw ?? '').trim()
    const unit = String(unitRaw ?? '').trim()
    if (!name && !unit) return

    if (!name) {
      errors.push({ row: rowNum, name: '', reason: 'Nama barang wajib diisi' })
      return
    }
    if (!unit) {
      errors.push({ row: rowNum, name, reason: 'Satuan wajib diisi' })
      return
    }

    const buyPrice = toNumber(buyRaw)
    if (buyPrice === null || buyPrice < 0) {
      errors.push({ row: rowNum, name, reason: 'Harga beli bukan angka valid (min 0)' })
      return
    }

    const sellingPrice = toNumber(sellRaw)
    if (sellingPrice === null || sellingPrice < 0) {
      errors.push({ row: rowNum, name, reason: 'Harga jual bukan angka valid (min 0)' })
      return
    }

    const stock = toInt(stockRaw)
    if (stock === null || stock < 0) {
      errors.push({ row: rowNum, name, reason: 'Stok awal bukan angka valid (min 0)' })
      return
    }

    const minStockVal = toInt(minStockRaw)
    const minStock = minStockVal !== null && minStockVal >= 0 ? minStockVal : 0

    const notes = String(notesRaw ?? '').trim() || null

    validRows.push({ rowNum, name, unit, buyPrice, sellingPrice, stock, minStock, notes })
  })

  // Batch processing: 100 baris per transaksi
  const BATCH_SIZE = 100
  let imported = 0
  let updated = 0
  let skipped = 0

  for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
    const batch = validRows.slice(i, i + BATCH_SIZE)

    await prisma.$transaction(async (tx) => {
      for (const row of batch) {
        // mode: 'insensitive' tidak didukung SQLite — gunakan raw SQL LOWER()
        const results = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM "Product"
          WHERE lower(name) = lower(${row.name}) AND "isActive" = 1
          LIMIT 1
        `
        const existing = results[0] ?? null

        if (mode === 'add_new') {
          if (existing) {
            skipped++
          } else {
            await tx.product.create({
              data: {
                name: row.name,
                unit: row.unit,
                buyPrice: row.buyPrice,
                sellingPrice: row.sellingPrice,
                stock: row.stock,
                minStock: row.minStock,
                notes: row.notes,
                isActive: true,
              },
            })
            imported++
          }
        } else {
          // upsert
          if (existing) {
            await tx.product.update({
              where: { id: existing.id },
              data: {
                unit: row.unit,
                buyPrice: row.buyPrice,
                sellingPrice: row.sellingPrice,
                stock: row.stock,
                minStock: row.minStock,
                notes: row.notes,
              },
            })
            updated++
          } else {
            await tx.product.create({
              data: {
                name: row.name,
                unit: row.unit,
                buyPrice: row.buyPrice,
                sellingPrice: row.sellingPrice,
                stock: row.stock,
                minStock: row.minStock,
                notes: row.notes,
                isActive: true,
              },
            })
            imported++
          }
        }
      }
    })
  }

  return Response.json({
    success: true,
    imported,
    updated,
    skipped,
    errors,
  })
}
