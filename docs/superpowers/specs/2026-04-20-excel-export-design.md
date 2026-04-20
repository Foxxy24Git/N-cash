# Excel Export — Design Spec
**Date:** 2026-04-20  
**Feature:** Download Laporan Excel dari Menu Report  
**Approach:** API Route GET + Server-rendered `<a>` link (Approach A)

---

## 1. Overview

Tambahkan tombol **[📥 Download Laporan Excel]** di halaman Report yang men-generate file `.xlsx` berdasarkan filter aktif (dateFrom, dateTo, method, search). File dibuat server-side menggunakan `exceljs` dan direturn sebagai binary response.

---

## 2. Dependencies

- Install: `exceljs` (Node.js library, support full styling)
- No new schema changes needed

---

## 3. Architecture & Data Flow

```
reports/page.tsx (Server Component)
  └─ <a href="/api/reports/export?dateFrom=...&dateTo=...&method=...&search=...">
       (params diambil dari parseReportParams yang sudah berjalan di page)

GET /api/reports/export
  1. auth() → 401 jika tidak ada session
  2. parseReportParams(url.searchParams) — reuse existing util, tanpa pagination
  3. prisma.invoice.findMany({ where, include: { items: true, bank: true } }) — semua baris
  4. prisma.companyProfile.findFirst()
  5. Hitung per-bank breakdown: Map<bankName, total>
  6. Build workbook dengan exceljs → buffer
  7. Return Response:
       Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
       Content-Disposition: attachment; filename="Laporan-NCash-DDMMYYYY-DDMMYYYY.xlsx"
```

**File:** `src/app/api/reports/export/route.ts`

---

## 4. Button Placement

Di `reports/page.tsx`, antara `<FilterBar>` dan `<SummaryCards>`:

```tsx
<FilterBar ... />

<div className="flex justify-end">
  <a
    href={`/api/reports/export?${exportParams}`}
    className={cn("btn-primary", totalCount === 0 && "opacity-50 pointer-events-none")}
  >
    📥 Download Laporan Excel
  </a>
</div>

<SummaryCards ... />
<InvoiceTable ... />
```

`exportParams` dibangun dari `baseParams` (sudah tersedia di page.tsx, tanpa `page`).  
Disabled (opacity-50, pointer-events-none) ketika `totalCount === 0`.

---

## 5. Excel Structure

### Worksheet: "Laporan N-Cash"

| Baris | Konten | Style |
|-------|--------|-------|
| 1 | Nama Perusahaan | Merged A–H, bold, 14pt, center |
| 2 | Alamat | Merged, center |
| 3 | No Telepon (jika ada) | Merged, center |
| 4 | Logo (jika ada) | Ditempatkan sebagai image di atas, atau skip row jika tidak ada |
| 5 | *(kosong)* | |
| 6 | "LAPORAN KEUANGAN" | Merged A–H, navy bg `#1e3a5f`, white, bold, 16pt, center |
| 7 | "Periode: DD-MM-YYYY s/d DD-MM-YYYY" | Merged A–H, center, italic |
| 8 | *(kosong)* | |
| 9 | Header ringkasan: "RINGKASAN" | Merged A–B, bold, bg `#dbeafe` |
| 10–N | Baris summary (lihat 5.1) | 2 kolom, border, zebra |
| N+1 | *(kosong)* | |
| N+2 | "DETAIL TRANSAKSI" | Merged A–H, navy bg, white, bold |
| N+3 | Header kolom detail | Navy bg, white, bold |
| N+4+ | Data per InvoiceItem (lihat 5.2) | |
| Last | "Dicetak pada: DD-MM-YYYY HH:mm WIB" | Right-aligned |

### 5.1 Summary Rows

Order dan label:
1. Total Keuntungan
2. Total Cash (Cash + Cash COD)
3. Total QRIS
4. Total Transfer Bank
5. `  - [Bank Name]` (satu baris per bank, indented, jika ada transfer bank)
6. Total BON

Zebra stripe: baris genap bg `#eff6ff`.  
Kolom nilai: format `"Rp"#,##0`, rata kanan.  
Border: thin, semua sisi.

### 5.2 Detail Rows

Kolom (A–H):
- A: No Faktur
- B: Tanggal (DD-MM-YYYY)
- C: Jam (HH:mm)
- D: Nama Barang
- E: QTY (number)
- F: Harga Satuan (currency)
- G: Subtotal (currency)
- H: Metode Pembayaran

Per invoice dengan >1 item: kolom A, B, C, H di-**merge vertikal** untuk seluruh item dalam faktur tersebut.

Setelah semua item faktur: **baris subtotal per faktur** — bg abu `#f3f4f6`, kolom A–F = `"Total Faktur [invoiceNumber]"` (merged), kolom G = total faktur.

**Fill color kolom H** (Metode Pembayaran):
- Cash / Cash COD → `#dcfce7`
- QRIS → `#dbeafe`
- Transfer Bank → `#fef9c3`
- BON → `#fee2e2`

### 5.3 Column Widths

| Col | Field | Width |
|-----|-------|-------|
| A | No Faktur | 18 |
| B | Tanggal | 14 |
| C | Jam | 8 |
| D | Nama Barang | 30 |
| E | QTY | 8 |
| F | Harga Satuan | 16 |
| G | Subtotal | 16 |
| H | Metode Pembayaran | 20 |

---

## 6. Filename Format

```
Laporan-NCash-{DDMMYYYY}-{DDMMYYYY}.xlsx
```
Contoh: `Laporan-NCash-01042026-20042026.xlsx`

Tanggal diambil dari `dateFromStr` dan `dateToStr` (format YYYY-MM-DD) → di-reformat ke DDMMYYYY.

---

## 7. Error Handling

- No session → `401 Unauthorized` JSON
- Query error → `500` JSON
- CompanyProfile tidak ada → gunakan fallback: name = "N-Cash", address = "", phone = ""
- totalCount === 0 (filtered) → tetap generate file dengan baris kosong di section detail + footer note "Tidak ada data"

---

## 8. Timezone

Semua format tanggal/jam pakai `Asia/Jakarta` (WIB), konsisten dengan `formatDateWIB` dan `formatTimeWIB` di `src/lib/format.ts`.

---

## 9. Files Changed / Created

| File | Action |
|------|--------|
| `package.json` | Add `exceljs` dependency |
| `src/app/api/reports/export/route.ts` | Create — API route GET |
| `src/app/(dashboard)/reports/page.tsx` | Update — tambah download button |

---

## 10. Out of Scope

- Logo upload/embed ke Excel (logoUrl di CompanyProfile belum tentu ada; skip row logo jika null)
- Print preview di browser
- CSV export alternatif
