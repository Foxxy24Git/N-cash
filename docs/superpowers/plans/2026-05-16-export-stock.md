# Export Data Stok Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a working `📤 Export` button on `/stock` that downloads all active products as a styled `.xlsx` file.

**Architecture:** A new `GET /api/stock/export` route generates the Excel file server-side using ExcelJS (same pattern as `/api/reports/export`). A tiny `'use client'` button component triggers the download via `window.location.href`. The existing disabled button in `stock/page.tsx` is replaced with this component.

**Tech Stack:** Next.js 14 App Router, ExcelJS 4, Prisma, TypeScript, Tailwind CSS.

---

### Task 1: Create `ExportStockButton` client component

**Files:**
- Create: `src/app/(dashboard)/stock/_components/ExportStockButton.tsx`

- [ ] **Step 1: Create the file**

```tsx
'use client'

export function ExportStockButton() {
  return (
    <button
      onClick={() => { window.location.href = '/api/stock/export' }}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
    >
      📤 Export
    </button>
  )
}
```

- [ ] **Step 2: Wire it into `stock/page.tsx`**

Open `src/app/(dashboard)/stock/page.tsx`.

Add import at the top with the other component imports:
```tsx
import { ExportStockButton } from './_components/ExportStockButton'
```

Replace the disabled button (lines ~103–108):
```tsx
// REMOVE:
<button
  disabled
  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-400 cursor-not-allowed"
>
  📤 Export
</button>

// REPLACE WITH:
<ExportStockButton />
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/stock/_components/ExportStockButton.tsx \
        src/app/(dashboard)/stock/page.tsx
git commit -m "feat(stock): add ExportStockButton client component"
```

---

### Task 2: Create `GET /api/stock/export` route

**Files:**
- Create: `src/app/api/stock/export/route.ts`

- [ ] **Step 1: Create the route file**

```ts
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

    const setCell = (col: number, value: ExcelJS.CellValue, extra?: Partial<ExcelJS.Cell>) => {
      const c = ws.getCell(row, col)
      c.value  = value
      c.fill   = rowFill
      c.border = border
      if (extra?.numFmt)    c.numFmt    = extra.numFmt as string
      if (extra?.alignment) c.alignment = extra.alignment as Partial<ExcelJS.Alignment>
    }

    setCell(1, p.name,     { alignment: { horizontal: 'left',   vertical: 'middle' } })
    setCell(2, p.unit,     { alignment: { horizontal: 'center', vertical: 'middle' } })
    setCell(3, buyPrice,   { numFmt: '#,##0', alignment: { horizontal: 'right', vertical: 'middle' } })
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
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors. Common issue: `ExcelJS.Cell` doesn't expose `numFmt` directly as a writable property in some versions — if you see a type error there, change the `setCell` helper to use explicit property assignment instead of spreading:

```ts
// Alternative if type error on numFmt/alignment spread:
const c = ws.getCell(row, col)
c.value  = value
c.fill   = rowFill
c.border = border
if (numFmt)    c.numFmt    = numFmt
if (alignment) c.alignment = alignment
```

(The plan already uses explicit property assignment — this note is just for context.)

- [ ] **Step 3: Commit**

```bash
git add src/app/api/stock/export/route.ts
git commit -m "feat(stock): add GET /api/stock/export Excel download route"
```

---

### Task 3: Smoke test in browser

No automated test framework exists in this project. Verify manually.

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Open the stock page**

Navigate to `http://localhost:3000/stock` (log in if needed).

Verify the `📤 Export` button is enabled and styled (white background, border, not gray/disabled).

- [ ] **Step 3: Click Export and inspect the downloaded file**

Click `📤 Export`. A file named `Stok-NCash-DDMMYYYY.xlsx` should download.

Open in Excel / LibreOffice Calc and verify:
- Row 1: company name (or "N-Cash" if no profile set)
- Row 2: "DATA STOK BARANG — N-Cash"
- Row 3: "Dicetak: [today's date in Indonesian]"
- Row 4: empty
- Row 5: column headers with navy background + white text
- Row 6+: one row per active product, sorted A–Z
- Rows where `stock = 0` → red background
- Rows where `0 < stock ≤ minStock` → orange background
- Harga Beli / Harga Jual columns: numbers formatted with thousand separators, right-aligned
- Margin column: percentage like `8.82%`, or `—` if buy price = 0

- [ ] **Step 4: Verify 401 for unauthenticated access**

Open an incognito window and navigate directly to `http://localhost:3000/api/stock/export`.

Expected: JSON `{ "error": "Unauthorized" }` with status 401.

- [ ] **Step 5: Final commit (if any fixups made during testing)**

```bash
git add -p
git commit -m "fix(stock): export smoke test fixups"
```

Only run this step if you made any changes during testing.
