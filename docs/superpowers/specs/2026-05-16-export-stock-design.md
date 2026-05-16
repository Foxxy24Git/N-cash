# Export Data Stok — Design Spec

**Date:** 2026-05-16
**Status:** Approved

---

## Overview

Add a working `📤 Export` button on the `/stock` page that downloads all active products as a formatted Excel file.

---

## API: `GET /api/stock/export`

**File:** `src/app/api/stock/export/route.ts`

### Auth
`auth()` guard — returns 401 JSON if no session.

### Data fetch (parallel)
```ts
const [products, company] = await Promise.all([
  prisma.product.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
  prisma.companyProfile.findFirst(),
])
```

### Excel structure

| Row | Content |
|-----|---------|
| 1 | Company name (from `CompanyProfile.name`, fallback `"N-Cash"`) |
| 2 | `"DATA STOK BARANG — N-Cash"` (bold, title) |
| 3 | `"Dicetak: [tanggal WIB]"` |
| 4 | *(empty)* |
| 5 | Column headers |
| 6+ | One row per product |

### Columns (8 total)

| # | Header | Content | Format |
|---|--------|---------|--------|
| A | Nama Barang | `product.name` | left |
| B | Satuan | `product.unit` | center |
| C | Harga Beli | `product.buyPrice` | `#,##0`, right |
| D | Harga Jual | `product.sellingPrice` | `#,##0`, right |
| E | Margin % | `(sellingPrice - buyPrice) / buyPrice` | `0.00%`, right; `"—"` if buyPrice = 0 |
| F | Stok | `product.stock` | center |
| G | Stok Min | `product.minStock` | center |
| H | Keterangan | `product.notes ?? ""` | left |

### Row color coding

| Condition | Background ARGB |
|-----------|----------------|
| `stock === 0` | `FFFEE2E2` (merah muda) |
| `0 < stock <= minStock` | `FFFED7AA` (oranye muda) |
| normal | `FFFFFFFF` (white) |

### Column widths

| Col | Width |
|-----|-------|
| A (Nama Barang) | 35 |
| B (Satuan) | 12 |
| C (Harga Beli) | 16 |
| D (Harga Jual) | 16 |
| E (Margin %) | 12 |
| F (Stok) | 10 |
| G (Stok Min) | 10 |
| H (Keterangan) | 28 |

### Response headers
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="Stok-NCash-DDMMYYYY.xlsx"
```

Filename date = current date in WIB (`Asia/Jakarta`), formatted `DDMMYYYY`.

---

## Client: `ExportStockButton`

**File:** `src/app/(dashboard)/stock/_components/ExportStockButton.tsx`

Small `'use client'` component. On click: `window.location.href = '/api/stock/export'`. No loading state — the browser handles the file download natively.

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

---

## Stock page change

**File:** `src/app/(dashboard)/stock/page.tsx`

Replace the disabled `<button>` at lines 103–108 with `<ExportStockButton />` import.

---

## Edge cases

| Case | Handling |
|------|----------|
| No products | Excel renders header + empty body (no rows) |
| `buyPrice = 0` | Margin column shows `"—"` (string, not formula) |
| `CompanyProfile` absent | Company name row shows `"N-Cash"` |
| `stock = 0` AND `minStock = 0` | stock=0 rule wins → red background |
