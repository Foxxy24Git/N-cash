# Design: Import Excel Stok

**Date:** 2026-05-16
**Feature:** PRD §3.5.7 — Import Excel Massal (Stok)

---

## Overview

Two new API routes + one new Client Component to enable bulk stock import from `.xlsx` files.

---

## API Routes

### GET /api/stock/template

Generates and serves an `.xlsx` template file using `exceljs` (already installed).

**File structure:**
- Row 1: Title — "Template Import Stok — N-Cash"
- Row 2: Instruction line 1 — "Isi data mulai dari baris ke-5. Jangan ubah urutan kolom."
- Row 3: Instruction line 2 — "Harga Beli dan Harga Jual diisi dalam angka tanpa titik/koma (contoh: 74000)"
- Row 4: Headers — `Nama Barang | Satuan | Harga Beli | Harga Jual | Stok Awal | Stok Minimum | Keterangan`
- Row 5: Example data row (Semen BCC | SAK | 68000 | 74000 | 100 | 10 | Contoh)

Response headers: `Content-Disposition: attachment; filename="Template-Import-Stok-NCash.xlsx"`, `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

Auth: check session via `auth()`, return 401 if missing.

---

### POST /api/stock/import

Accepts `multipart/form-data` with fields:
- `file`: `.xlsx` file (validated: non-empty, correct MIME)
- `mode`: `"add_new"` (default) | `"upsert"`

**Parsing:**
- Use `xlsx` (SheetJS) to read file buffer
- Skip rows 1–3 (title/instructions)
- Row 4 = header row (validate presence of required columns)
- Data rows start at row 5; skip fully empty rows

**Column mapping (by position):**
| Col | Field |
|-----|-------|
| A | name |
| B | unit |
| C | buyPrice |
| D | sellingPrice |
| E | stock |
| F | minStock |
| G | notes |

**Validation per row:**
- `name`: required, non-empty string
- `unit`: required, non-empty string
- `buyPrice`: numeric ≥ 0 (parse as number, reject non-numeric)
- `sellingPrice`: numeric ≥ 0
- `stock`: integer ≥ 0
- `minStock`: integer ≥ 0 (optional, default 0)
- `notes`: optional string

Invalid rows → pushed to `errors[]` with `{ row, name, reason }`. Not inserted.

**Processing:**
- Collect all valid rows, then split into batches of 100
- Each batch runs inside `prisma.$transaction()`
- `add_new` mode: for each row, check if `Product` with same name exists (case-insensitive, `isActive: true`). If yes → skip (increment `skipped`). If no → insert (increment `imported`).
- `upsert` mode: same lookup. If exists → update all fields (increment `updated`). If no → insert (increment `imported`).

**Response JSON:**
```json
{
  "success": true,
  "imported": 42,
  "updated": 8,
  "skipped": 3,
  "errors": [
    { "row": 12, "name": "Semen XYZ", "reason": "Harga beli bukan angka valid" }
  ]
}
```

Auth: check session via `auth()`, return 401 if missing.

---

## Frontend — `ImportDialog` Component

**Location:** `src/app/(dashboard)/stock/_components/ImportDialog.tsx` (Client Component)

**Trigger:** Button `📥 Import Excel` in `StockPage` header (currently disabled — enable it).

### States

**idle:**
- Tombol `📤 Download Template` → GET `/api/stock/template`
- File input: `accept=".xlsx"`, max 5MB (validated client-side before submit)
- Radio: `Tambah Baru` (add_new) | `Update & Tambah` (upsert) — default: Tambah Baru
- Tombol `Mulai Import` (disabled until file selected)

**loading:**
- Spinner + text "Memproses..."
- Disable all controls

**done:**
- Summary card: "Berhasil diimpor: N | Diperbarui: N | Dilewati: N"
- If `errors.length > 0`: table with columns Baris | Nama | Alasan
- Tombol `Tutup` → calls `router.refresh()` to revalidate stock page, then closes dialog

### Error handling
- File > 5MB: show inline error before submit, do not call API
- API returns non-2xx: show generic error "Terjadi kesalahan, coba lagi"
- Network failure: same generic error

---

## Wiring

- `StockPage` (`page.tsx`): replace the disabled `📥 Import Excel` button with `<ImportDialog />`
- `xlsx` package must be installed: `npm install xlsx`

---

## Out of Scope

- "Ganti Semua" mode (replace_all) — excluded per user spec
- Server-side file size validation (handled client-side; 5MB is small enough)
- Progress bar per-batch on the frontend (spinner only; backend is fast enough for 1500 rows)
