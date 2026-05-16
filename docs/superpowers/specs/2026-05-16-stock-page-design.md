# Stock Page Design — N-Cash Phase 3

**Date:** 2026-05-16
**Scope:** Menu Stok — navigasi, halaman daftar barang, filter, pagination (PRD 3.5.1)
**Status:** Approved

---

## Overview

Tambah menu Stok ke navigasi dan buat halaman `/stock` yang menampilkan daftar barang (Product) dengan tabel, filter via URL params, dan pagination 50 item/halaman. Semua tombol aksi bersifat placeholder (disabled) — fungsionalitas tambah/edit/hapus/import diimplementasi di sprint berikutnya.

---

## Architecture

Mengikuti pola yang sama dengan `/reports`:

- **`page.tsx`** — server component, membaca `searchParams`, query Prisma, render tabel + filter bar
- **`StockFilterBar`** — `'use client'`, update URL params dengan debounce 300ms
- **`StockTable`** — server component, menerima data dari page, render tabel + pagination

Filter state sepenuhnya hidup di URL (bookmarkable, tidak ada client state terpisah).

---

## Files

### Modified
- `src/app/(dashboard)/_components/Sidebar.tsx` — tambah menu Stok (Package icon) antara Report dan Setting
- `src/app/(dashboard)/_components/BottomNav.tsx` — tambah menu Stok (Package icon) antara Report dan Setting

### Created
- `src/app/(dashboard)/stock/page.tsx`
- `src/app/(dashboard)/stock/_components/StockFilterBar.tsx`
- `src/app/(dashboard)/stock/_components/StockTable.tsx`

---

## URL Params

| Param | Tipe | Keterangan |
|-------|------|------------|
| `q` | string | Search nama barang (partial match, case-insensitive) |
| `status` | `all \| normal \| low \| out \| low_out` | Filter status stok |
| `page` | number | Halaman (default: 1) |
| `filter` | `low_stock` | Alias dari dashboard → diperlakukan sebagai `status=low_out` |

**`?filter=low_stock` behavior:** Saat param ini hadir, server memperlakukannya sebagai `status=low_out` (gabungan Menipis+Habis), mengabaikan param `status` jika ada. Dropdown StockFilterBar menampilkan "Menipis & Habis" sebagai nilai aktif. Saat user ganti dropdown, navigasi ke `?status=...` (tanpa `filter=low_stock`).

---

## Data Query

```
Product where:
  isActive = true
  name CONTAINS q (case-insensitive)   -- jika q ada
  [status filter — lihat tabel di bawah]

ORDER BY name ASC
SKIP (page - 1) * 50
TAKE 50
```

| Status filter | Prisma where |
|---------------|-------------|
| `normal` | `stock > minStock` |
| `low` | `stock > 0 AND stock <= minStock` |
| `out` | `stock = 0` |
| `low_out` | `stock <= minStock` (mencakup 0 dan menipis) |
| `all` / kosong | _(tidak ada filter tambahan)_ |

---

## Tabel Kolom

| Kolom | Sumber | Catatan |
|-------|--------|---------|
| Nama Barang | `product.name` | |
| Satuan | `product.unit` | |
| Harga Beli | `product.buyPrice` | Format `Rp X.XXX` |
| Harga Jual | `product.sellingPrice` | Format `Rp X.XXX` |
| Margin | Hitung server-side | `((sellingPrice - buyPrice) / buyPrice * 100).toFixed(1) + "%"` |
| Stok | `product.stock` | |
| Stok Min | `product.minStock` | |
| Status | Hitung server-side | Badge berwarna |
| Aksi | — | 3 tombol disabled |

### Status Badge Logic

| Kondisi | Label | Warna |
|---------|-------|-------|
| `stock > minStock` | Normal | Hijau (`bg-green-100 text-green-800`) |
| `stock > 0 && stock <= minStock` | Menipis | Oranye (`bg-orange-100 text-orange-800`) |
| `stock === 0` | Habis | Merah (`bg-red-100 text-red-800`) |

### Tombol Aksi (Disabled Placeholder)

- `[✏️ Stok]` — edit stok cepat (belum fungsional)
- `[✏️ Edit]` — edit data barang (belum fungsional)
- `[🗑️ Hapus]` — hapus barang (belum fungsional)

---

## StockFilterBar

- **Search input**: debounce 300ms, update `?q=`, reset `?page=1`
- **Dropdown status**:
  - Semua (value: `all`)
  - Normal (value: `normal`)
  - Menipis (value: `low`)
  - Habis (value: `out`)
  - Menipis & Habis (value: `low_out`) — muncul saat `filter=low_stock` dari dashboard
- Saat perubahan apapun: push URL baru, hapus `filter=low_stock` jika masih ada

---

## Tombol Header (Disabled Placeholder)

- `[+ Tambah Barang]` — disabled
- `[📥 Import Excel]` — disabled
- `[📤 Export]` — disabled

---

## Empty State

Gunakan existing `EmptyState` component:
- Icon: `Package` dari lucide-react
- Title: "Belum ada data barang"
- Subtitle: "Klik [+ Tambah Barang] atau [📥 Import Excel] untuk mulai."

Tampil ketika: tidak ada produk sama sekali, atau filter tidak menghasilkan hasil.

---

## Pagination

- 50 item per halaman
- Prev/Next URL links (server-rendered, bukan client navigation)
- Tampilkan: `1–50 dari 1.523 barang · halaman 1/31`
- Semua URL params yang aktif dipertahankan saat ganti halaman

---

## Edge Cases

| Kasus | Penanganan |
|-------|------------|
| `minStock = 0` dan `stock = 0` | Status: Habis (merah) — `stock = 0` selalu Habis |
| `minStock = 0` dan `stock > 0` | Status: Normal — `stock > minStock` (0) terpenuhi |
| Margin negatif (buyPrice > sellingPrice) | Tampil apa adanya, misal "-5.0%" |
| `buyPrice = 0` | Hindari division by zero — tampilkan "—" untuk margin |
| Query dengan `q` kosong | Tidak ada filter nama |
| `page` di luar range | Clamp ke 1 |

---

## Out of Scope (Sprint Ini)

- Tambah/Edit/Hapus barang (fungsional)
- Import Excel
- Export data stok
- Edit stok cepat inline
- Sorting per kolom
