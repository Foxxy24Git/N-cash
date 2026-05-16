import { auth } from '@/auth'
import ExcelJS from 'exceljs'

export async function GET() {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Stok')

  // Baris 1-3: judul & petunjuk
  ws.getCell('A1').value = 'Template Import Stok — N-Cash'
  ws.getCell('A2').value = 'Isi data mulai dari baris ke-5. Jangan ubah urutan kolom.'
  ws.getCell('A3').value = 'Harga Beli dan Harga Jual diisi dalam angka tanpa titik/koma (contoh: 74000)'

  // Baris 4: header (kolom A–G = index 1–7)
  const headers = ['Nama Barang', 'Satuan', 'Harga Beli', 'Harga Jual', 'Stok Awal', 'Stok Minimum', 'Keterangan']
  const headerRow = ws.getRow(4)
  headers.forEach((h, i) => { headerRow.getCell(i + 1).value = h })
  headerRow.font = { bold: true }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE2E8F0' },
  }

  // Baris 5: contoh data
  const exampleRow = ws.getRow(5)
  const example = ['Semen BCC', 'SAK', 68000, 74000, 100, 10, 'Contoh data']
  example.forEach((v, i) => { exampleRow.getCell(i + 1).value = v })

  // Lebar kolom
  ws.columns = [
    { width: 30 }, // Nama Barang
    { width: 12 }, // Satuan
    { width: 14 }, // Harga Beli
    { width: 14 }, // Harga Jual
    { width: 12 }, // Stok Awal
    { width: 14 }, // Stok Minimum
    { width: 24 }, // Keterangan
  ]

  const buf = await wb.xlsx.writeBuffer()

  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="Template-Import-Stok-NCash.xlsx"',
    },
  })
}
