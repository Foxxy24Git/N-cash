import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { parseReportParams } from '@/lib/report-query'
import ExcelJS from 'exceljs'

export async function GET(request: Request) {
  const session = await auth()
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const rawParams = Object.fromEntries(url.searchParams.entries())
  const { dateFrom, dateTo, method, search, dateFromStr, dateToStr } = parseReportParams(rawParams)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    deletedAt: null,
    date: { gte: dateFrom, lt: dateTo },
  }

  if (method) {
    where.paymentMethod = method === 'Cash'
      ? { in: ['Cash', 'Cash COD'] }
      : method
  }

  if (search) {
    where.invoiceNumber = { contains: search }
  }

  const [invoices, company] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { items: true, bank: { select: { name: true } } },
      orderBy: { date: 'asc' },
    }),
    prisma.companyProfile.findFirst(),
  ])

  // Totals + per-bank breakdown
  const totals = { total: 0, cash: 0, qris: 0, bank: 0, bon: 0 }
  const bankBreakdown = new Map<string, number>()

  for (const inv of invoices) {
    const amt = Number(inv.totalAmount)
    totals.total += amt
    const pm = inv.paymentMethod
    if (pm === 'Cash' || pm === 'Cash COD') totals.cash += amt
    else if (pm === 'QRIS') totals.qris += amt
    else if (pm === 'Transfer Bank') {
      totals.bank += amt
      const bName = inv.bank?.name ?? 'Lainnya'
      bankBreakdown.set(bName, (bankBreakdown.get(bName) ?? 0) + amt)
    }
    else if (pm === 'BON') totals.bon += amt
  }

  // ─── Build workbook ───────────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Laporan N-Cash')

  const COLS = 8
  ws.columns = [
    { width: 18 }, // A No Faktur
    { width: 14 }, // B Tanggal
    { width: 8  }, // C Jam
    { width: 30 }, // D Nama Barang
    { width: 8  }, // E QTY
    { width: 16 }, // F Harga Satuan
    { width: 16 }, // G Subtotal
    { width: 20 }, // H Metode
  ]

  type Fill    = ExcelJS.Fill
  type Borders = Partial<ExcelJS.Borders>

  const navyFill:  Fill    = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } }
  const blueFill:  Fill    = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }
  const grayFill:  Fill    = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }
  const zebraFill: Fill    = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } }
  const whiteFill: Fill    = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }

  const thin: Borders = {
    top:    { style: 'thin' },
    left:   { style: 'thin' },
    bottom: { style: 'thin' },
    right:  { style: 'thin' },
  }

  const center: Partial<ExcelJS.Alignment> = { horizontal: 'center', vertical: 'middle' }
  const currFmt = '"Rp"#,##0'

  const fmtDMY = (str: string) => {
    const [y, m, d] = str.split('-')
    return `${d}-${m}-${y}`
  }
  const fmtDMYFile = (str: string) => {
    const [y, m, d] = str.split('-')
    return `${d}${m}${y}`
  }
  const fmtDateWIB = (d: Date) =>
    d.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')
  const fmtTimeWIB = (d: Date) =>
    d.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false })

  const methodFill = (pm: string): Fill => {
    const argb =
      pm === 'Cash' || pm === 'Cash COD' ? 'FFDCFCE7' :
      pm === 'QRIS'                       ? 'FFDBEAFE' :
      pm === 'Transfer Bank'              ? 'FFFEF9C3' :
      pm === 'BON'                        ? 'FFFEE2E2' : 'FFFFFFFF'
    return { type: 'pattern', pattern: 'solid', fgColor: { argb } }
  }

  let row = 1

  const mergeRow = (text: string, fontSize: number, bold: boolean, color = '00000000') => {
    ws.mergeCells(row, 1, row, COLS)
    const c = ws.getCell(row, 1)
    c.value = text
    c.font = { size: fontSize, bold, color: { argb: color } }
    c.alignment = center
    ws.getRow(row).height = fontSize + 8
    row++
  }

  // ─── Company header ───────────────────────────────────────────────────────
  mergeRow(company?.name    ?? 'N-Cash', 14, true)
  if (company?.address) mergeRow(company.address, 10, false)
  if (company?.phone)   mergeRow(`Telp: ${company.phone}`, 10, false)
  row++ // empty

  // Title
  ws.mergeCells(row, 1, row, COLS)
  const titleCell = ws.getCell(row, 1)
  titleCell.value     = 'LAPORAN KEUANGAN'
  titleCell.font      = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
  titleCell.fill      = navyFill
  titleCell.alignment = center
  ws.getRow(row).height = 32
  row++

  // Periode
  ws.mergeCells(row, 1, row, COLS)
  const periodeCell = ws.getCell(row, 1)
  periodeCell.value     = `Periode: ${fmtDMY(dateFromStr)} s/d ${fmtDMY(dateToStr)}`
  periodeCell.alignment = { horizontal: 'center', vertical: 'middle' }
  periodeCell.font      = { italic: true }
  ws.getRow(row).height = 18
  row++
  row++ // empty

  // ─── Summary section ──────────────────────────────────────────────────────
  ws.mergeCells(row, 1, row, COLS)
  const summHdr = ws.getCell(row, 1)
  summHdr.value     = 'RINGKASAN'
  summHdr.font      = { bold: true, color: { argb: 'FF1E3A5F' } }
  summHdr.fill      = blueFill
  summHdr.alignment = { horizontal: 'left', vertical: 'middle' }
  ws.getRow(row).height = 20
  row++

  const summaryRows: [string, number][] = [
    ['Total Keuntungan',             totals.total],
    ['Total Cash (Cash + Cash COD)', totals.cash],
    ['Total QRIS',                   totals.qris],
    ['Total Transfer Bank',          totals.bank],
    ...Array.from(bankBreakdown.entries()).map(([n, v]) => [`  - ${n}`, v] as [string, number]),
    ['Total BON',                    totals.bon],
  ]

  summaryRows.forEach(([label, value], idx) => {
    const fill = idx % 2 === 1 ? zebraFill : whiteFill

    // Label spans A–G (cols 1–7)
    ws.mergeCells(row, 1, row, COLS - 1)
    const lc = ws.getCell(row, 1)
    lc.value     = label
    lc.fill      = fill
    lc.border    = thin
    lc.alignment = { horizontal: 'left', vertical: 'middle' }

    // Value in col H
    const vc = ws.getCell(row, COLS)
    vc.value     = value
    vc.numFmt    = currFmt
    vc.fill      = fill
    vc.border    = thin
    vc.alignment = { horizontal: 'right', vertical: 'middle' }

    row++
  })

  row++ // empty

  // ─── Detail section header ────────────────────────────────────────────────
  ws.mergeCells(row, 1, row, COLS)
  const detHdr = ws.getCell(row, 1)
  detHdr.value     = 'DETAIL TRANSAKSI'
  detHdr.font      = { bold: true, color: { argb: 'FFFFFFFF' } }
  detHdr.fill      = navyFill
  detHdr.alignment = { horizontal: 'left', vertical: 'middle' }
  ws.getRow(row).height = 22
  row++

  // Column headers
  const colHeaders = ['No Faktur', 'Tanggal', 'Jam', 'Nama Barang', 'QTY', 'Harga Satuan', 'Subtotal', 'Metode Pembayaran']
  colHeaders.forEach((h, i) => {
    const c = ws.getCell(row, i + 1)
    c.value     = h
    c.font      = { bold: true, color: { argb: 'FFFFFFFF' } }
    c.fill      = navyFill
    c.alignment = center
    c.border    = thin
  })
  ws.getRow(row).height = 20
  row++

  // ─── Invoice rows ─────────────────────────────────────────────────────────
  if (invoices.length === 0) {
    ws.mergeCells(row, 1, row, COLS)
    const ec = ws.getCell(row, 1)
    ec.value     = 'Tidak ada data transaksi untuk periode ini'
    ec.alignment = center
    ec.font      = { italic: true, color: { argb: 'FF6B7280' } }
    row++
  }

  for (const inv of invoices) {
    if (inv.items.length === 0) continue

    const invDate    = fmtDateWIB(inv.date)
    const invTime    = fmtTimeWIB(inv.createdAt)
    const methodLabel = inv.paymentMethod + (inv.bank ? ` — ${inv.bank.name}` : '')
    const mFill      = methodFill(inv.paymentMethod)
    const firstRow   = row

    inv.items.forEach((item) => {
      // D: Nama Barang
      const dC = ws.getCell(row, 4)
      dC.value  = item.itemName
      dC.border = thin

      // E: QTY
      const eC = ws.getCell(row, 5)
      eC.value     = Number(item.quantity)
      eC.alignment = { horizontal: 'center' }
      eC.border    = thin

      // F: Harga Satuan
      const fC = ws.getCell(row, 6)
      fC.value     = Number(item.unitPrice)
      fC.numFmt    = currFmt
      fC.alignment = { horizontal: 'right' }
      fC.border    = thin

      // G: Subtotal
      const gC = ws.getCell(row, 7)
      gC.value     = Number(item.subtotal)
      gC.numFmt    = currFmt
      gC.alignment = { horizontal: 'right' }
      gC.border    = thin

      row++
    })

    const lastRow = row - 1

    // Set values for merged cols (A B C H) on first item row
    ws.getCell(firstRow, 1).value = inv.invoiceNumber
    ws.getCell(firstRow, 2).value = invDate
    ws.getCell(firstRow, 3).value = invTime

    const hC = ws.getCell(firstRow, 8)
    hC.value = methodLabel
    hC.fill  = mFill

    // Merge A B C H vertically if >1 item
    if (inv.items.length > 1) {
      ;([1, 2, 3, 8] as const).forEach(col => {
        ws.mergeCells(firstRow, col, lastRow, col)
        const c = ws.getCell(firstRow, col)
        c.alignment = { vertical: 'middle', wrapText: false }
        c.border    = thin
        if (col === 8) c.fill = mFill
      })
    } else {
      ;([1, 2, 3, 8] as const).forEach(col => {
        const c = ws.getCell(firstRow, col)
        c.alignment = { vertical: 'middle' }
        c.border    = thin
        if (col === 8) c.fill = mFill
      })
    }

    // Subtotal row per faktur
    ws.mergeCells(row, 1, row, 6)
    const stLabel = ws.getCell(row, 1)
    stLabel.value     = `Total Faktur  ${inv.invoiceNumber}`
    stLabel.font      = { bold: true }
    stLabel.alignment = { horizontal: 'left', vertical: 'middle' }

    for (let col = 1; col <= 6; col++) {
      const c = ws.getCell(row, col)
      c.fill   = grayFill
      c.border = thin
    }

    const stVal = ws.getCell(row, 7)
    stVal.value     = Number(inv.totalAmount)
    stVal.numFmt    = currFmt
    stVal.font      = { bold: true }
    stVal.fill      = grayFill
    stVal.border    = thin
    stVal.alignment = { horizontal: 'right' }

    const stH = ws.getCell(row, 8)
    stH.fill   = grayFill
    stH.border = thin

    row++
  }

  row++ // empty

  // ─── Footer ───────────────────────────────────────────────────────────────
  const now = new Date()
  const footerDate = now.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit', year: 'numeric' })
  const footerTime = now.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false })

  ws.mergeCells(row, 1, row, COLS)
  const footer = ws.getCell(row, 1)
  footer.value     = `Dicetak pada: ${footerDate} ${footerTime} WIB`
  footer.alignment = { horizontal: 'right' }
  footer.font      = { italic: true, size: 9, color: { argb: 'FF6B7280' } }

  // ─── Response ─────────────────────────────────────────────────────────────
  const buffer   = await wb.xlsx.writeBuffer()
  const filename = `Laporan-NCash-${fmtDMYFile(dateFromStr)}-${fmtDMYFile(dateToStr)}.xlsx`

  return new Response(buffer as ArrayBuffer, {
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
