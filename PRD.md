# 📊 PRD - N-Cash (Aplikasi Laporan Keuangan & Stok Toko Bangunan)

**Product Requirements Document**
**Version:** 3.0 (Revisi — Stok Disederhanakan + Keuntungan Bersih)
**Tanggal:** Mei 2026
**Owner:** [Nama Pemilik Toko]

---

## 1. 🎯 Overview Produk

### 1.1 Nama Aplikasi
**N-Cash** — Aplikasi Rekap Keuangan & Stok Toko Bangunan

### 1.2 Tujuan
N-Cash adalah aplikasi internal untuk merekap keuangan dan stok toko bangunan:
- Mencatat transaksi penjualan per nota/faktur
- Melacak metode pembayaran (Cash, QRIS, Transfer Bank, BON)
- Mengelola stok barang (1.500+ item) — **input manual langsung di aplikasi** atau import massal via Excel
- Stok otomatis berkurang saat transaksi disimpan
- **Menampilkan keuntungan bersih (harga jual − harga beli) di dashboard & laporan**
- Notifikasi stok menipis / habis
- Download laporan keuangan profesional format Excel

### 1.3 Target Pengguna
Pemilik toko bangunan (single user, internal use)

### 1.4 Platform
Web Application — Self-hosted di Proxmox, akses via LAN / domain internal

---

## 2. 🛠️ Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Backend | Next.js Server Actions / API Routes |
| Database | SQLite via Prisma ORM |
| Excel Export | `exceljs` |
| Excel Import | `xlsx` (SheetJS) |
| Auth | NextAuth.js Credentials Provider |
| State | Zustand atau useState |
| Deploy | Docker di Proxmox |

---

## 3. 📱 Fitur Utama & Rule Detail

---

### 3.1 MENU A — DASHBOARD

**Fungsi:** Ringkasan keuangan **HARI INI** — reset otomatis setiap jam 00:00 WIB.

#### 3.1.1 Kartu Dashboard

| No | Kartu | Isi | Warna |
|----|-------|-----|-------|
| 1 | 💰 **Total Omzet** | Total seluruh transaksi hari ini (semua metode) | Abu/Netral |
| 2 | 🟢 **Keuntungan Bersih** | Selisih harga jual − harga beli untuk item yang terhubung ke stok | Hijau Tua |
| 3 | 💵 **Total Cash** | Transaksi hari ini Cash + Cash COD | Hijau |
| 4 | 📱 **Total QRIS** | Transaksi hari ini QRIS | Biru |
| 5 | 🏦 **Total Transfer Bank** | Transaksi hari ini Transfer Bank | Kuning |
| 6 | ⚠️ **Total BON** | Transaksi hari ini belum dibayar | Merah |
| 7 | 📦 **Stok Menipis** | Jumlah item stok ≤ minStock atau = 0 | Oranye |

#### 3.1.2 Cara Hitung Keuntungan Bersih

```
Keuntungan Bersih Hari Ini =
  SUM untuk setiap InvoiceItem dari transaksi hari ini dimana productId NOT NULL:
    (InvoiceItem.unitPrice − InvoiceItem.buyPriceSnapshot) × InvoiceItem.quantity

Penjelasan:
- unitPrice         = harga jual aktual saat transaksi (bisa beda dari harga default)
- buyPriceSnapshot  = harga beli yang di-snapshot saat transaksi disimpan (tidak berubah)
- Item tanpa productId (ketik manual) = tidak masuk kalkulasi, tidak ada data harga beli
```

**Contoh kalkulasi:**
```
Faktur 0-ABC-001 — 19-04-2026:

  Semen BCC 25 sak
    Harga jual: Rp 74.000 | Harga beli snapshot: Rp 68.000
    Laba: (74.000 − 68.000) × 25 = Rp 150.000

  Kayu 4x6 20 batang
    Harga jual: Rp 24.000 | Harga beli snapshot: Rp 20.000
    Laba: (24.000 − 20.000) × 20 = Rp 80.000

Keuntungan Bersih Hari Ini = Rp 230.000
Total Omzet Hari Ini       = Rp 2.330.000
```

#### 3.1.3 Rule Dashboard
- **RULE-A1:** Kartu 1–6 **clickable** → redirect ke Report dengan filter otomatis.
- **RULE-A2:** Kartu 7 (Stok Menipis) clickable → redirect ke `/stock?filter=low_stock`.
- **RULE-A3:** Query selalu filter `WHERE tanggal = HARI INI (WIB)`.
- **RULE-A4:** Format uang `Rp 1.000.000` (titik pemisah ribuan).
- **RULE-A5:** Header menampilkan jam & tanggal real-time.
- **RULE-A6:** Keuntungan Bersih dihitung dari `buyPriceSnapshot` di `InvoiceItem` (bukan harga beli produk saat ini). Mengubah harga beli produk di kemudian hari tidak mempengaruhi laba historis.
- **RULE-A7:** Jika belum ada transaksi atau semua item manual → Keuntungan Bersih tampil `Rp 0` (bukan error/kosong).

---

### 3.2 MENU B — TAMBAH TRANSAKSI

**Fungsi:** Input transaksi per nota/faktur, terintegrasi dengan stok.

#### 3.2.1 Struktur Form

**📋 SECTION 1 — Header Faktur**

| Field | Tipe | Validasi |
|-------|------|----------|
| Nomor Faktur | Text | Required, unique |
| Tanggal | Date | Required, default: hari ini |

**🛒 SECTION 2 — Detail Barang**

| Field | Tipe | Keterangan |
|-------|------|------------|
| Nama Barang | Autocomplete + ketik bebas | Search dari stok atau ketik manual |
| QTY | Number (min 1) | Warning jika QTY > stok tersedia |
| Harga Satuan | Currency | Auto-fill dari stok, bisa diubah |
| Subtotal | Currency | Auto = QTY × Harga, bisa koreksi manual (ada tombol reset 🔄) |

**💳 SECTION 3 — Pembayaran & Total** *(sama dengan v1 — tidak berubah)*

#### 3.2.2 Rule Tambah Transaksi
- **RULE-B1–B9** *(sama dengan PRD v1, tidak berubah)*
- **RULE-B10:** Field Nama Barang punya **autocomplete** yang search dari `Product` (isActive=true), berdasarkan nama saja (tidak ada kode SKU).
- **RULE-B11:** Pilih barang dari autocomplete → **Harga Satuan auto-fill** dari `Product.sellingPrice`. Tetap bisa diubah manual.
- **RULE-B12:** Badge stok tampil di sebelah nama: `📦 45 SAK`
  - 🟢 Hijau: stok > minStock
  - 🟡 Kuning: 0 < stok ≤ minStock (menipis)
  - 🔴 Merah: stok = 0 (habis)
- **RULE-B13:** QTY > stok → warning kuning, **tidak memblokir** transaksi.
- **RULE-B14:** Simpan transaksi → stok berkurang secara atomic di server.
- **RULE-B15:** Nama ketik manual (tanpa pilih dari autocomplete) → `productId = NULL` → stok tidak berkurang, transaksi tetap tercatat.
- **RULE-B16 *(BARU)*:** Saat simpan dan `productId NOT NULL`, server menyimpan `buyPriceSnapshot = Product.buyPrice` ke `InvoiceItem.buyPriceSnapshot`. Field ini adalah fondasi kalkulasi keuntungan bersih.

---

### 3.3 MENU C — REPORT

*(Semua fitur v1 tetap. Tambahan:)*

- **RULE-C4:** Tabel Report tambah kolom **Laba** per faktur.
  Kalkulasi: `SUM (unitPrice − buyPriceSnapshot) × qty` untuk item ber-`productId`.
  Jika seluruh item manual → tampil tanda "-".
- **RULE-C5:** Summary card di atas tabel tambah **Total Laba Bersih** sesuai filter aktif.
- **RULE-C6:** Excel export tambahkan kolom Laba per faktur dan Total Laba Bersih di section Ringkasan.

---

### 3.4 MENU D — SETTING

*(Tidak berubah dari v1 — bank, profil perusahaan, ganti password)*

---

### 3.5 MENU E — MANAJEMEN STOK ⭐

**Fungsi:** Kelola database barang. Stok bisa dikelola **sepenuhnya tanpa template Excel** — tambah, edit, hapus, sesuaikan stok langsung dari aplikasi kapan saja. Template Excel hanya alat bantu untuk input massal pertama kali.

#### 3.5.1 Tabel Daftar Barang

| Kolom | Keterangan |
|-------|------------|
| Nama Barang | Nama lengkap |
| Satuan | SAK / BATANG / dll (bebas) |
| Harga Beli | Format Rp |
| Harga Jual | Format Rp |
| Margin | `((Jual−Beli)/Beli)×100%` — auto-hitung, read-only |
| Stok | Jumlah saat ini |
| Stok Min | Batas notifikasi |
| Status | Badge: Normal / Menipis / Habis |
| Aksi | Edit Stok, Edit Data, Hapus |

**Filter:** Search nama (debounce 300ms) + dropdown status (Semua / Normal / Menipis / Habis).
*(Tidak ada filter kategori — kategori tidak ada di v3)*

**Sorting:** Nama A-Z default, bisa sort kolom lain.

**Pagination:** 50 item per halaman.

#### 3.5.2 Edit Stok Cepat (Inline)

Tombol **[✏️ Stok]** di kolom Aksi → popover kecil langsung di baris tersebut:
- Stok baru: number input
- Alasan: dropdown singkat
- Tombol [Simpan]

Ini cara tercepat ubah stok tanpa buka form lengkap.

#### 3.5.3 Tambah Barang Manual

Tombol `[+ Tambah Barang]` → dialog form:

| Field | Tipe | Validasi |
|-------|------|----------|
| Nama Barang | Text | Required |
| Satuan | **Combobox** (saran + ketik bebas) | Required |
| Harga Beli | Currency | Required |
| Harga Jual | Currency | Required |
| Stok Awal | Number | Required, min 0 |
| Stok Minimum | Number | Opsional, default 0 |
| Keterangan | Text | Opsional |

**RULE-E1 — Satuan Combobox:** Tampilkan saran: `SAK, PCS, BATANG, LEMBAR, METER, KG, LITER, ROLL, SET, KARDUS, PASANG, UNIT, BOX`. User **bebas mengetik satuan lain** yang tidak ada di saran — nilai apapun diterima dan disimpan. Gunakan komponen shadcn Combobox.

#### 3.5.4 Edit Data Barang

Tombol `[✏️ Edit]` → dialog form pre-filled. Semua field bisa diubah.

> Mengubah `Harga Beli` tidak mengubah `buyPriceSnapshot` di transaksi lama. Laba historis tetap akurat.

#### 3.5.5 Hapus Barang

Tombol `[🗑️ Hapus]` → AlertDialog konfirmasi → soft-delete (`isActive = false`).
Barang hilang dari tabel dan autocomplete, tapi data invoice historis tetap utuh.

#### 3.5.6 Penyesuaian Stok (Stock Adjustment)

Tombol `[🔧 Sesuaikan]` → dialog:
- Stok saat ini: readonly
- Stok baru: number input (min 0)
- Selisih: tampil realtime (+X / -X)
- Alasan: Stok Opname / Terima Barang / Barang Rusak / Barang Hilang / Koreksi Lain
- Catatan: textarea opsional

Setiap penyesuaian → insert ke `StockAdjustment` + `StockMovement` (audit trail).

#### 3.5.7 Import Excel Massal

Tombol `[📥 Import Excel]` → dialog:
- File input (`.xlsx`, max 5MB)
- Mode: **Tambah Baru** / **Update & Tambah** / **Ganti Semua** *(konfirmasi wajib!)*
- Progress bar selama proses (batch 100 baris)
- Hasil: ringkasan sukses + tabel error per baris (nomor baris + alasan)

#### 3.5.8 Export Data Stok

- `[📤 Export Template]` → download template Excel kosong
- `[📤 Export Data Stok]` → download seluruh data stok saat ini dalam format Excel

---

## 4. 🗄️ Database Schema — v3.0

```prisma
// schema.prisma — N-Cash v3.0
// PERUBAHAN dari v2:
//   Product: hapus field code, category, subCategory
//   InvoiceItem: tambah field buyPriceSnapshot (Decimal, nullable)

model User {
  id        String   @id @default(cuid())
  username  String   @unique
  password  String
  createdAt DateTime @default(now())
}

model CompanyProfile {
  id       String  @id @default(cuid())
  name     String
  address  String
  phone    String?
  logoUrl  String?
}

model Bank {
  id            String    @id @default(cuid())
  name          String
  accountNumber String?
  accountHolder String?
  createdAt     DateTime  @default(now())
  invoices      Invoice[]
}

// ─── STOK ───────────────────────────────────────────────────────────────────

model Product {
  id           String   @id @default(cuid())
  name         String                       // Nama barang
  unit         String                       // Satuan bebas: SAK, PCS, BATANG, dll
  buyPrice     Decimal  @db.Decimal(15, 2)  // Harga beli (modal)
  sellingPrice Decimal  @db.Decimal(15, 2)  // Harga jual default
  stock        Int      @default(0)         // Stok saat ini (tidak boleh < 0)
  minStock     Int      @default(0)         // Batas notifikasi
  notes        String?
  isActive     Boolean  @default(true)      // Soft-delete flag
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  invoiceItems   InvoiceItem[]
  stockMovements StockMovement[]
  adjustments    StockAdjustment[]

  @@index([name])  // Untuk performa autocomplete search
}

model StockMovement {
  id           String   @id @default(cuid())
  productId    String
  product      Product  @relation(fields: [productId], references: [id])
  type         String   // OUT (transaksi), IN (terima barang), ADJUST
  quantity     Int      // Positif = masuk, Negatif = keluar
  stockBefore  Int
  stockAfter   Int
  referenceId  String?  // invoiceId atau adjustmentId
  notes        String?
  createdAt    DateTime @default(now())
}

model StockAdjustment {
  id        String   @id @default(cuid())
  productId String
  product   Product  @relation(fields: [productId], references: [id])
  oldStock  Int
  newStock  Int
  reason    String   // STOCK_OPNAME, RECEIVE, DAMAGE, LOST, OTHER
  notes     String?
  createdAt DateTime @default(now())
}

// ─── INVOICE ────────────────────────────────────────────────────────────────

model Invoice {
  id            String        @id @default(cuid())
  invoiceNumber String        @unique
  date          DateTime
  totalAmount   Decimal       @db.Decimal(15, 2)
  paymentMethod String        // CASH, CASH_COD, QRIS, BANK_TRANSFER, UNPAID
  bankId        String?
  bank          Bank?         @relation(fields: [bankId], references: [id])
  items         InvoiceItem[]
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}

model InvoiceItem {
  id               String   @id @default(cuid())
  invoiceId        String
  invoice          Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  productId        String?                       // NULL = barang ketik manual
  product          Product? @relation(fields: [productId], references: [id])
  itemName         String                        // Nama (selalu disimpan)
  quantity         Int
  unitPrice        Decimal  @db.Decimal(15, 2)   // Harga jual aktual saat transaksi
  buyPriceSnapshot Decimal? @db.Decimal(15, 2)   // Snapshot harga beli saat transaksi
                                                  // NULL jika item manual (productId null)
  subtotal         Decimal  @db.Decimal(15, 2)
}
```

---

## 5. 🎨 UI/UX Guidelines

### 5.1 Navigasi
| | Menu |
|-|------|
| 1 | 🏠 Dashboard |
| 2 | ➕ Tambah Transaksi |
| 3 | 📋 Report |
| 4 | 📦 Stok |
| 5 | ⚙️ Setting |

### 5.2 Warna Tema
| Elemen | Warna |
|--------|-------|
| Primary / Biru | #2563eb |
| Keuntungan Bersih | #15803d (Hijau tua) |
| Cash / Normal | #16a34a (Hijau) |
| QRIS | #0ea5e9 (Biru muda) |
| Transfer Bank / Menipis | #eab308 (Kuning) |
| BON / Habis | #dc2626 (Merah) |
| Stok Menipis | #f97316 (Oranye) |
| Background | #f9fafb |

### 5.3 Combobox Satuan
Gunakan shadcn Combobox — user bisa pilih dari saran ATAU ketik bebas. Nilai apapun diterima.

### 5.4 Autocomplete Nama Barang
- Debounce 300ms, min 2 karakter
- Item dropdown: `Nama Barang — Stok: X [Satuan]`
- Warna info stok: hijau / kuning / merah
- Keyboard navigable (arrow, enter, escape)
- Tidak ada hasil → "Tidak ditemukan — ketik nama manual"

---

## 6. 🔒 Keamanan

- AUTH-1 s/d AUTH-6 *(sama dengan v1)*
- **AUTH-7:** Upload Excel divalidasi MIME type, max 5MB, cek header kolom sebelum proses.

---

## 7. ⚠️ Edge Cases

| # | Kasus | Penanganan |
|---|-------|------------|
| 1 | Nomor faktur duplikat | Tolak, error |
| 2 | Stok negatif | Stok ditulis 0, tidak ke negatif |
| 3 | Item manual (tanpa stok) | productId=NULL, buyPriceSnapshot=NULL, tidak masuk kalkulasi laba |
| 4 | Harga beli produk berubah setelah transaksi | buyPriceSnapshot tidak berubah, laba historis tetap akurat |
| 5 | Import 1500+ barang | Batch 100 baris + progress bar + error report per baris |
| 6 | Header Excel tidak sesuai template | Tolak file, tampilkan error jelas |
| 7 | Satuan tidak ada di saran | Combobox menerima input bebas |
| 8 | Hapus barang yang ada di invoice historis | Soft-delete, invoice tetap utuh |
| 9 | Laba negatif | Tampilkan apa adanya (mungkin ada diskon besar) |
| 10 | Timezone | Semua operasi tanggal pakai Asia/Jakarta (WIB) |

---

## 8. 📋 Milestones

### Phase 1 & 2 ✅ Selesai
Setup, Auth, Tambah Transaksi, Dashboard (v1), Report, Setting, Export Excel.

### Phase 3 — Stok + Keuntungan Bersih ⭐ Sekarang
- [ ] Schema v3 (Product tanpa kode/kategori, InvoiceItem + buyPriceSnapshot)
- [ ] Menu Stok: tabel, filter, pagination
- [ ] Edit stok cepat inline
- [ ] Tambah / Edit / Hapus barang manual (termasuk combobox satuan)
- [ ] Penyesuaian stok + audit trail
- [ ] Import Excel massal (1500+ barang)
- [ ] Export template & data stok
- [ ] Autocomplete nama barang di form transaksi
- [ ] Pengurangan stok otomatis + simpan buyPriceSnapshot
- [ ] Badge stok di form transaksi
- [ ] Card Keuntungan Bersih di dashboard
- [ ] Kolom Laba + Total Laba Bersih di Report
- [ ] Card Stok Menipis di dashboard

### Phase 4 — Future
- [ ] Fitur "Lunasi BON"
- [ ] Fitur "Terima Barang" dari supplier
- [ ] Laporan histori stok masuk/keluar per periode
- [ ] Grafik trend laba & stok
- [ ] Multi-user
- [ ] Print struk thermal

---

## 9. ✅ Acceptance Criteria Phase 3

- [ ] Import 1.500+ barang dari Excel tanpa timeout
- [ ] Bisa tambah/edit/hapus barang langsung tanpa template Excel
- [ ] Edit stok cepat inline dari tabel berfungsi
- [ ] Combobox satuan bisa pilih dari saran DAN ketik bebas
- [ ] Autocomplete nama barang di form transaksi berfungsi
- [ ] Harga Satuan auto-fill saat pilih barang dari autocomplete
- [ ] `buyPriceSnapshot` tersimpan di setiap InvoiceItem yang terhubung ke stok
- [ ] Stok berkurang atomic saat transaksi disimpan
- [ ] Stok tidak pernah negatif
- [ ] Card Keuntungan Bersih di dashboard menampilkan angka akurat
- [ ] Kolom Laba di Report berfungsi
- [ ] Card Stok Menipis di dashboard linkable ke /stock

---

**— End of PRD v3.0 —**
