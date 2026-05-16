import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import ExcelJS from 'exceljs'

export async function GET() {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const [products, company] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        name:         true,
        unit:         true,
        buyPrice:     true,
        sellingPrice: true,
        stock:        true,
        minStock:     true,
        notes:        true,
      },
    }),
    prisma.companyProfile.findFirst(),
  ])

  // ─── Workbook setup ────────────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Stok Barang')

  // Set minimum widths; auto-width pass runs after data rows are inserted
  ws.columns = [
    { width: 20 }, // A Nama Barang
    { width: 10 }, // B Satuan
    { width: 14 }, // C Harga Beli
    { width: 14 }, // D Harga Jual
    { width: 10 }, // E Margin %
    { width: 8  }, // F Stok
    { width: 8  }, // G Stok Min
    { width: 14 }, // H Keterangan
  ]

  const COLS = 8

  type Fill = ExcelJS.Fill
  const whiteFill:  Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }
  const orangeFill: Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFED7AA' } }
  const redFill:    Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }
  const headerFill: Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } }

  const center: Partial<ExcelJS.Alignment> = { horizontal: 'center', vertical: 'middle' }

  // WIB date string e.g. "16 Mei 2026"
  const nowWIB = new Date().toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day:      '2-digit',
    month:    'long',
    year:     'numeric',
  })

  // DDMMYYYY for filename
  const ddmmyyyy = new Date()
    .toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit', year: 'numeric' })
    .replace(/\//g, '')  // "16/05/2026" → "16052026"

  let row = 1

  const mergeRow = (text: string, fontSize: number, bold: boolean) => {
    ws.mergeCells(row, 1, row, COLS)
    const c = ws.getCell(row, 1)
    c.value     = text
    c.font      = { size: fontSize, bold }
    c.alignment = center
    ws.getRow(row).height = fontSize + 8
    row++
  }

  // ─── Header block ──────────────────────────────────────────────────────────
  mergeRow(company?.name ?? 'N-Cash', 14, true)
  mergeRow('DATA STOK BARANG — N-Cash', 13, true)
  mergeRow(`Dicetak: ${nowWIB}`, 10, false)
  row++ // empty row 4

  // ─── Column headers (row 5) ────────────────────────────────────────────────
  const colHeaders = ['Nama Barang', 'Satuan', 'Harga Beli', 'Harga Jual', 'Margin %', 'Stok', 'Stok Min', 'Keterangan']
  colHeaders.forEach((h, i) => {
    const c = ws.getCell(row, i + 1)
    c.value     = h
    c.font      = { bold: true, color: { argb: 'FFFFFFFF' } }
    c.fill      = headerFill
    c.alignment = center
    c.border    = {
      top:    { style: 'thin' },
      left:   { style: 'thin' },
      bottom: { style: 'thin' },
      right:  { style: 'thin' },
    }
  })
  ws.getRow(row).height = 22
  row++

  // ─── Data rows (row 6+) ────────────────────────────────────────────────────
  for (const p of products) {
    const buyPrice     = Number(p.buyPrice)
    const sellingPrice = Number(p.sellingPrice)
    const marginValue  = buyPrice > 0 ? (sellingPrice - buyPrice) / buyPrice : null

    const rowFill: Fill =
      p.stock === 0             ? redFill
      : p.stock <= p.minStock   ? orangeFill
      : whiteFill

    const border: Partial<ExcelJS.Borders> = {
      top:    { style: 'thin' },
      left:   { style: 'thin' },
      bottom: { style: 'thin' },
      right:  { style: 'thin' },
    }

    const setCell = (
      col: number,
      value: ExcelJS.CellValue,
      opts?: { numFmt?: string; alignment?: Partial<ExcelJS.Alignment> }
    ) => {
      const c = ws.getCell(row, col)
      c.value  = value
      c.fill   = rowFill
      c.border = border
      if (opts?.numFmt)    c.numFmt    = opts.numFmt
      if (opts?.alignment) c.alignment = opts.alignment
    }

    setCell(1, p.name,       { alignment: { horizontal: 'left',   vertical: 'middle' } })
    setCell(2, p.unit,       { alignment: { horizontal: 'center', vertical: 'middle' } })
    setCell(3, buyPrice,     { numFmt: '#,##0', alignment: { horizontal: 'right', vertical: 'middle' } })
    setCell(4, sellingPrice, { numFmt: '#,##0', alignment: { horizontal: 'right', vertical: 'middle' } })

    // Margin: numeric % or em-dash string
    if (marginValue !== null) {
      setCell(5, marginValue, { numFmt: '0.00%', alignment: { horizontal: 'right', vertical: 'middle' } })
    } else {
      setCell(5, '—', { alignment: { horizontal: 'center', vertical: 'middle' } })
    }

    setCell(6, p.stock,    { alignment: { horizontal: 'center', vertical: 'middle' } })
    setCell(7, p.minStock, { alignment: { horizontal: 'center', vertical: 'middle' } })
    setCell(8, p.notes ?? '', { alignment: { horizontal: 'left', vertical: 'middle' } })

    row++
  }

  // ─── Auto-width: measure max char length per column ───────────────────────
  ws.columns.forEach((col) => {
    let maxLen = 10
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = cell.value == null ? 0 : String(cell.value).length
      if (len > maxLen) maxLen = len
    })
    col.width = Math.min(maxLen + 2, 60) // cap at 60 to avoid huge columns
  })

  // ─── Response ──────────────────────────────────────────────────────────────
  const buffer   = await wb.xlsx.writeBuffer()
  const filename = `Stok-NCash-${ddmmyyyy}.xlsx`

  return new Response(buffer as ArrayBuffer, {
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
