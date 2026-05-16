# Import Excel Stok Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambahkan fitur import stok massal dari file `.xlsx` — API template download, API import dengan validasi & batch processing, dan dialog UI di halaman /stock.

**Architecture:** Dua API Route baru (`/api/stock/template` dan `/api/stock/import`) plus satu Client Component `ImportDialog`. StockPage mengganti tombol disabled dengan `<ImportDialog />`. Template di-generate programatik oleh `exceljs`.

**Tech Stack:** Next.js 14 App Router, `exceljs` (sudah ada), `xlsx`/SheetJS (baru diinstall), Prisma, shadcn/ui Dialog, TypeScript.

---

## File Map

| Action | File |
|--------|------|
| Create | `src/app/api/stock/template/route.ts` |
| Create | `src/app/api/stock/import/route.ts` |
| Create | `src/app/(dashboard)/stock/_components/ImportDialog.tsx` |
| Modify | `src/app/(dashboard)/stock/page.tsx` |

---

## Task 1: Install `xlsx` package

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Install xlsx**

```bash
npm install xlsx
```

Expected output contains: `added N packages` tanpa error.

- [ ] **Step 2: Verify types tersedia**

```bash
npx tsc --noEmit 2>&1 | head -5
```

Expected: tidak ada error baru terkait `xlsx`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install xlsx (SheetJS) for excel import parsing"
```

---

## Task 2: GET /api/stock/template — Download Template Excel

**Files:**
- Create: `src/app/api/stock/template/route.ts`

Endpoint ini men-generate file `.xlsx` template menggunakan `exceljs`. Tidak ada parameter. Return file sebagai download attachment.

- [ ] **Step 1: Buat file route**

Buat file `src/app/api/stock/template/route.ts`:

```typescript
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

  // Baris 4: header
  const headers = ['Nama Barang', 'Satuan', 'Harga Beli', 'Harga Jual', 'Stok Awal', 'Stok Minimum', 'Keterangan']
  ws.getRow(4).values = ['', ...headers] // exceljs mulai dari kolom A = index 1
  ws.getRow(4).values = headers          // langsung assign tanpa offset

  // Set header row values (kolom A–G = index 1–7)
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
```

- [ ] **Step 2: Verifikasi TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "stock/template"
```

Expected: tidak ada output (tidak ada error).

- [ ] **Step 3: Test manual dengan curl**

Jalankan dev server dulu (`npm run dev`), lalu di terminal lain:

```bash
curl -I http://localhost:3000/api/stock/template
```

Expected: `HTTP/1.1 401 Unauthorized` (karena tidak ada session). Itu benar — auth check bekerja.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/stock/template/route.ts
git commit -m "feat(stock): add GET /api/stock/template endpoint"
```

---

## Task 3: POST /api/stock/import — Import Excel

**Files:**
- Create: `src/app/api/stock/import/route.ts`

Endpoint ini menerima `multipart/form-data` dengan field `file` (xlsx) dan `mode` (`add_new` | `upsert`). Parse Excel, validasi per baris, proses batch 100 dengan `prisma.$transaction()`.

- [ ] **Step 1: Buat file route**

Buat file `src/app/api/stock/import/route.ts`:

```typescript
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

function toInt(val: unknown, defaultVal = 0): number | null {
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
```

- [ ] **Step 2: Verifikasi TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "stock/import"
```

Expected: tidak ada output.

- [ ] **Step 3: Test auth check**

```bash
curl -X POST http://localhost:3000/api/stock/import
```

Expected: `{"error":"Unauthorized"}` dengan status 401.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/stock/import/route.ts
git commit -m "feat(stock): add POST /api/stock/import endpoint with batch processing"
```

---

## Task 4: ImportDialog — Client Component

**Files:**
- Create: `src/app/(dashboard)/stock/_components/ImportDialog.tsx`

Dialog tiga-state: `idle` → `loading` → `done`. Terima file xlsx, pilih mode, upload ke API, tampilkan hasil.

- [ ] **Step 1: Buat komponen**

Buat file `src/app/(dashboard)/stock/_components/ImportDialog.tsx`:

```tsx
'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ImportError {
  row: number
  name: string
  reason: string
}

interface ImportResult {
  imported: number
  updated: number
  skipped: number
  errors: ImportError[]
}

type Phase = 'idle' | 'loading' | 'done'

export function ImportDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [mode, setMode] = useState<'add_new' | 'upsert'>('add_new')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function resetState() {
    setPhase('idle')
    setMode('add_new')
    setFile(null)
    setFileError(null)
    setResult(null)
    setApiError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetState()
    setOpen(next)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFileError(null)
    if (!f) { setFile(null); return }
    if (f.size > 5 * 1024 * 1024) {
      setFileError('Ukuran file maksimal 5MB')
      setFile(null)
      e.target.value = ''
      return
    }
    setFile(f)
  }

  async function handleDownloadTemplate() {
    const res = await fetch('/api/stock/template')
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'Template-Import-Stok-NCash.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport() {
    if (!file) return
    setPhase('loading')
    setApiError(null)

    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('mode', mode)

      const res = await fetch('/api/stock/import', { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setApiError(data.error ?? 'Terjadi kesalahan, coba lagi')
        setPhase('idle')
        return
      }

      setResult(data)
      setPhase('done')
    } catch {
      setApiError('Terjadi kesalahan jaringan, coba lagi')
      setPhase('idle')
    }
  }

  function handleClose() {
    setOpen(false)
    resetState()
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
          📥 Import Excel
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Stok dari Excel</DialogTitle>
        </DialogHeader>

        {phase === 'idle' && (
          <div className="space-y-5 mt-2">
            {/* Download template */}
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 flex items-center justify-between gap-3">
              <p className="text-sm text-blue-800">
                Belum punya template? Download dulu.
              </p>
              <button
                onClick={handleDownloadTemplate}
                className="shrink-0 text-sm font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900"
              >
                📤 Download Template
              </button>
            </div>

            {/* File input */}
            <div className="space-y-1">
              <label className="text-sm font-medium">
                File Excel <span className="text-red-500">*</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-gray-200 file:text-sm file:font-medium file:bg-white file:text-gray-700 hover:file:bg-gray-50 cursor-pointer"
              />
              {fileError && (
                <p className="text-xs text-red-600">{fileError}</p>
              )}
              {file && (
                <p className="text-xs text-gray-500">{file.name} ({(file.size / 1024).toFixed(0)} KB)</p>
              )}
            </div>

            {/* Mode */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Mode Import</label>
              <div className="space-y-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="import-mode"
                    value="add_new"
                    checked={mode === 'add_new'}
                    onChange={() => setMode('add_new')}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-medium">Tambah Baru</span>
                    <p className="text-xs text-gray-500">Lewati barang yang namanya sudah ada. Aman untuk penambahan data baru.</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="import-mode"
                    value="upsert"
                    checked={mode === 'upsert'}
                    onChange={() => setMode('upsert')}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-medium">Update & Tambah</span>
                    <p className="text-xs text-gray-500">Perbarui barang yang sudah ada, tambahkan yang baru.</p>
                  </div>
                </label>
              </div>
            </div>

            {apiError && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
                {apiError}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Batal
              </Button>
              <Button onClick={handleImport} disabled={!file}>
                Mulai Import
              </Button>
            </div>
          </div>
        )}

        {phase === 'loading' && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-600">Memproses...</p>
          </div>
        )}

        {phase === 'done' && result && (
          <div className="space-y-5 mt-2">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-3 text-center">
                <p className="text-2xl font-bold text-green-700">{result.imported}</p>
                <p className="text-xs text-green-600 mt-0.5">Diimpor</p>
              </div>
              <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-3 text-center">
                <p className="text-2xl font-bold text-blue-700">{result.updated}</p>
                <p className="text-xs text-blue-600 mt-0.5">Diperbarui</p>
              </div>
              <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-3 text-center">
                <p className="text-2xl font-bold text-gray-700">{result.skipped}</p>
                <p className="text-xs text-gray-600 mt-0.5">Dilewati</p>
              </div>
            </div>

            {/* Error table */}
            {result.errors.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-red-700">
                  {result.errors.length} baris gagal diimpor:
                </p>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-red-200">
                  <table className="w-full text-xs">
                    <thead className="bg-red-50 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-red-700 w-16">Baris</th>
                        <th className="text-left px-3 py-2 font-medium text-red-700">Nama</th>
                        <th className="text-left px-3 py-2 font-medium text-red-700">Alasan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-100">
                      {result.errors.map((err, i) => (
                        <tr key={i} className="bg-white">
                          <td className="px-3 py-2 text-gray-500">{err.row}</td>
                          <td className="px-3 py-2 text-gray-800">{err.name || '—'}</td>
                          <td className="px-3 py-2 text-red-600">{err.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleClose}>Tutup</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Verifikasi TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "ImportDialog"
```

Expected: tidak ada output.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/stock/_components/ImportDialog.tsx"
git commit -m "feat(stock): add ImportDialog client component"
```

---

## Task 5: Wire ImportDialog ke StockPage

**Files:**
- Modify: `src/app/(dashboard)/stock/page.tsx`

Ganti tombol `📥 Import Excel` yang disabled dengan `<ImportDialog />`.

- [ ] **Step 1: Update page.tsx**

Di `src/app/(dashboard)/stock/page.tsx`, tambahkan import dan ganti tombol disabled:

Tambah import di bagian atas (setelah import yang sudah ada):

```typescript
import { ImportDialog } from './_components/ImportDialog'
```

Cari blok tombol ini:

```tsx
<button
  disabled
  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-400 cursor-not-allowed"
>
  📥 Import Excel
</button>
```

Ganti seluruh blok tersebut dengan:

```tsx
<ImportDialog />
```

- [ ] **Step 2: Verifikasi TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "stock/page"
```

Expected: tidak ada output.

- [ ] **Step 3: Test end-to-end di browser**

Jalankan dev server:
```bash
npm run dev
```

1. Buka `http://localhost:3000/stock`
2. Klik tombol `📥 Import Excel` — dialog harus terbuka
3. Klik `📤 Download Template` — file `Template-Import-Stok-NCash.xlsx` harus terdownload
4. Buka file, pastikan baris 4 adalah header, baris 5 adalah contoh data
5. Isi beberapa baris data di baris 6+, save
6. Upload file ke dialog, pilih mode `Tambah Baru`, klik `Mulai Import`
7. Spinner muncul, lalu summary hasil
8. Klik `Tutup` — halaman stok refresh, data baru muncul di tabel

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/stock/page.tsx"
git commit -m "feat(stock): wire ImportDialog to stock page, replace disabled button"
```
