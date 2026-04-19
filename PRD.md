# 📊 PRD - N-Cash (Aplikasi Laporan Keuangan Toko Bangunan)

**Product Requirements Document**
**Version:** 1.0
**Tanggal:** 19 April 2026
**Owner:** [Nama Pemilik Toko]

---

## 1. 🎯 Overview Produk

### 1.1 Nama Aplikasi
**N-Cash** — Aplikasi Rekap Keuangan Toko Bangunan

### 1.2 Tujuan
N-Cash adalah aplikasi internal untuk merekap seluruh alur keuangan toko bangunan. Aplikasi ini membantu pemilik toko untuk:
- Mencatat setiap transaksi penjualan (per nota/faktur)
- Melacak metode pembayaran (Cash, QRIS, Transfer Bank, Belum Bayar/BON)
- Melihat ringkasan keuangan harian di dashboard
- Mengunduh laporan profesional dalam format Excel

### 1.3 Target Pengguna
- Pemilik toko bangunan (single user, internal use)
- Kasir/admin toko (opsional — future development)

### 1.4 Platform
- **Tipe:** Web Application (bisa dibuka di browser desktop & mobile)
- **Deployment:** Self-hosted di Proxmox lab pribadi
- **Akses:** Via LAN/local network atau domain internal

---

## 2. 🛠️ Rekomendasi Tech Stack

Karena Anda masih di level beginner dan ingin vibe code dengan Claude Code, saya rekomendasikan stack yang **modern, simple, dan mudah dideploy di Proxmox**:

| Layer | Teknologi | Alasan |
|-------|-----------|--------|
| **Frontend** | Next.js 14 (App Router) + TypeScript | All-in-one, mudah, banyak contoh |
| **UI Library** | Tailwind CSS + shadcn/ui | Clean, profesional, cepat |
| **Backend** | Next.js API Routes | Tidak perlu server terpisah |
| **Database** | SQLite (via Prisma ORM) | Ringan, 1 file, cocok untuk single-user. Bisa upgrade ke PostgreSQL nanti |
| **Excel Export** | `exceljs` library | Support styling profesional (logo, header, border) |
| **Auth** | NextAuth.js (Credentials Provider) | Untuk login & ganti password |
| **State Management** | Zustand atau React Context | Simple |
| **Deployment** | Docker Container di Proxmox | Portable, mudah backup |

> **Catatan:** Jika Anda lebih nyaman dengan stack lain (contoh: Laravel, Python Flask), bisa di-adjust. Tapi stack di atas adalah yang paling "Claude Code friendly".

---

## 3. 📱 Fitur Utama & Rule Detail

### 3.1 MENU A — DASHBOARD

**Fungsi:** Menampilkan ringkasan keuangan **HARI INI** (reset setiap hari otomatis pada jam 00:00 WIB).

#### 3.1.1 Kartu Informasi (Cards)
Dashboard menampilkan 5 kartu utama:

| No | Kartu | Deskripsi | Warna Card |
|----|-------|-----------|------------|
| 1 | 💰 **Total Keuntungan (Hari Ini)** | Jumlah total omzet semua transaksi hari ini | Abu-abu/Netral |
| 2 | 💵 **Total Pembayaran Cash** | Jumlah transaksi hari ini dengan metode Cash (termasuk COD) | Hijau |
| 3 | 📱 **Total Pembayaran QRIS** | Jumlah transaksi hari ini dengan metode QRIS | Biru |
| 4 | 🏦 **Total Transfer via Bank** | Jumlah transaksi hari ini dengan metode Transfer Bank | Kuning |
| 5 | ⚠️ **Total Belum Bayar (BON)** | Jumlah transaksi hari ini yang statusnya belum dibayar | Merah |

#### 3.1.2 Rule Dashboard
- **RULE-A1:** Setiap kartu bersifat **clickable**. Saat diklik, redirect ke **Menu Report (History Transaksi)** dengan filter otomatis sesuai kartu:
  - Klik "Total Keuntungan" → tampilkan SEMUA transaksi hari ini
  - Klik "Cash" → tampilkan transaksi hari ini dengan status Cash
  - Klik "QRIS" → tampilkan transaksi hari ini dengan status QRIS
  - Klik "Transfer Bank" → tampilkan transaksi hari ini dengan status Transfer Bank
  - Klik "Belum Bayar" → tampilkan transaksi hari ini dengan status BON
- **RULE-A2:** Dashboard otomatis **reset setiap hari jam 00:00** (data historis tetap ada di Menu Report, hanya angka di dashboard yang reset)
- **RULE-A3:** Semua nilai uang ditampilkan dengan format **"Rp 1.000.000"** (pakai titik sebagai pemisah ribuan)
- **RULE-A4:** Tampilkan jam & tanggal real-time di header dashboard

---

### 3.2 MENU B — TAMBAH TRANSAKSI

**Fungsi:** Input transaksi baru per nota/faktur. Ini adalah **fitur pilar utama**.

#### 3.2.1 Struktur Form

Form dibagi 3 section:

**📋 SECTION 1 — Header Faktur (sekali isi per nota)**
| Field | Tipe | Validasi | Keterangan |
|-------|------|----------|------------|
| Nomor Faktur | Text | Required, unique | Contoh: `0-ABC-001` |
| Tanggal | Date | Required, default: hari ini | Format: DD-MM-YYYY |

**🛒 SECTION 2 — Detail Barang (bisa ditambah berkali-kali)**

User bisa menambahkan item barang secara dinamis (add more rows):

| Field | Tipe | Validasi | Keterangan |
|-------|------|----------|------------|
| Nama Barang | Text | Required | Contoh: "Semen BCC" |
| Quantity (QTY) | Number | Required, min 1 | Contoh: 25 |
| Harga Satuan | Currency (Rp) | Required, input bebas ketik | Contoh: Rp 74.000 |
| Subtotal | Currency (Rp) | Auto-calculate (QTY × Harga Satuan), **bisa dikoreksi manual** | Contoh: Rp 1.850.000 |

**Tombol:** `[+ Tambah Barang]` untuk menambah row baru

**💳 SECTION 3 — Pembayaran & Total**
| Field | Tipe | Validasi | Keterangan |
|-------|------|----------|------------|
| Metode Pembayaran | Dropdown/Radio | Required | Pilihan: Cash, Cash COD, QRIS, Transfer Bank, Belum Bayar (BON) |
| Pilihan Bank | Dropdown | Muncul jika pilih Transfer Bank | Data dari Menu Setting (sync) |
| **Total Belanja** | Currency (Rp) | Auto-sum semua subtotal | **Read-only, bold, ukuran besar** |

#### 3.2.2 Rule Tambah Transaksi
- **RULE-B1:** Format uang **Rp** dengan pemisah ribuan titik (contoh: `Rp 74.000`). **WAJIB bisa diketik langsung**, TIDAK ADA tombol panah atas-bawah (no spinner/stepper).
- **RULE-B2:** Dalam 1 nomor faktur, bisa ada **banyak baris barang** (unlimited). Contoh: 1 faktur bisa punya 8+ barang.
- **RULE-B3:** **Subtotal per barang** = `QTY × Harga Satuan` (auto-calculate). Tapi field subtotal **bisa dikoreksi manual** jika ada diskon/pembulatan. Sediakan tombol/icon 🔄 untuk reset ke nilai otomatis.
- **RULE-B4:** **Total Belanja** = jumlah semua subtotal. Tidak bisa diedit manual. Real-time update setiap kali user ubah QTY/harga.
- **RULE-B5:** **Status pembayaran diberi warna** sebagai pembeda:
  - 🟢 **Hijau** → Cash / Cash COD
  - 🔵 **Biru** → QRIS
  - 🟡 **Kuning** → Transfer Bank
  - 🔴 **Merah** → Belum Bayar (BON)
- **RULE-B6:** Pilihan bank untuk Transfer Bank **harus sync otomatis** dari data bank di Menu Setting. Jika user belum tambah bank di Setting, tampilkan alert: "Silakan tambah bank terlebih dahulu di Menu Setting."
- **RULE-B7:** Tanggal **default = hari ini** (tidak perlu pilih-pilih), tapi tetap bisa diubah jika perlu input backdate.
- **RULE-B8:** Tombol `[Simpan Transaksi]` di bawah. Setelah simpan, tampilkan toast "✅ Transaksi berhasil disimpan" dan form di-reset.
- **RULE-B9:** Validasi: minimal 1 barang harus diisi. Tidak boleh save faktur kosong.

#### 3.2.3 Contoh Penerapan (Test Case)
```
Nomor Faktur : 0-ABC-001
Tanggal      : 19-04-2026

Barang:
┌─────────────────┬─────┬──────────────┬──────────────┐
│ Nama Barang     │ QTY │ Harga Satuan │ Subtotal     │
├─────────────────┼─────┼──────────────┼──────────────┤
│ Semen BCC       │ 25  │ Rp 74.000    │ Rp 1.850.000 │
│ Kayu 4x6 Pas    │ 20  │ Rp 24.000    │ Rp 480.000   │
└─────────────────┴─────┴──────────────┴──────────────┘

Total Belanja : Rp 2.330.000
Pembayaran    : Cash COD 🟢
```

---

### 3.3 MENU C — REPORT (LAPORAN)

**Fungsi:** Menampilkan riwayat transaksi secara detail dan download laporan Excel profesional.

#### 3.3.1 Fitur Filter & Tampilan
- **Filter Tanggal:** Date range picker (Dari Tanggal — Sampai Tanggal)
- **Filter Cepat:** Tombol shortcut [Hari Ini] [Kemarin] [7 Hari Terakhir] [Bulan Ini] [Custom]
- **Filter Metode Pembayaran:** Dropdown (Semua, Cash, QRIS, Transfer Bank, BON)
- **Search:** Berdasarkan Nomor Faktur

#### 3.3.2 Tabel Transaksi (Parent Table)

| No Faktur | Jam | Tanggal | Total Belanja | Status | Aksi |
|-----------|-----|---------|---------------|--------|------|
| 0-ABC-001 | 14:30 | 19-04-2026 | Rp 2.330.000 | 🟢 Cash COD | [👁️ Detail] |
| 0-ABC-002 | 15:15 | 19-04-2026 | Rp 500.000 | 🔵 QRIS | [👁️ Detail] |

- **RULE-C1:** Klik row atau tombol `[Detail]` → expand/modal yang menampilkan **detail per barang** di faktur tersebut (semua item dalam faktur).
- **RULE-C2:** Support pagination (default 20 row per halaman).

#### 3.3.3 Summary Card di Atas Tabel
Di atas tabel, tampilkan ringkasan sesuai filter aktif:
- 💰 Total Keuntungan: Rp X.XXX.XXX
- 💵 Total Cash: Rp X.XXX.XXX
- 📱 Total QRIS: Rp X.XXX.XXX
- 🏦 Total Transfer Bank: Rp X.XXX.XXX (breakdown per bank)
- ⚠️ Total BON: Rp X.XXX.XXX

#### 3.3.4 Download Laporan Excel (PENTING!)

Tombol: `[📥 Download Laporan Excel]`

**RULE-C3:** File Excel yang di-generate **harus terlihat profesional**, dengan format:

**📄 Struktur Excel:**
```
┌──────────────────────────────────────────────────────┐
│  [LOGO]   NAMA PERUSAHAAN (dari Setting)            │
│           Alamat Perusahaan (dari Setting)          │
│                                                      │
│           LAPORAN KEUANGAN                           │
│           Periode: 01-04-2026 s/d 19-04-2026        │
├──────────────────────────────────────────────────────┤
│                                                      │
│  📊 RINGKASAN                                        │
│  ┌─────────────────────────┬───────────────────┐   │
│  │ Total Keuntungan        │ Rp 50.000.000     │   │
│  │ Total Pembayaran Cash   │ Rp 20.000.000     │   │
│  │ Total Pembayaran QRIS   │ Rp 15.000.000     │   │
│  │ Total Transfer Bank     │ Rp 10.000.000     │   │
│  │ - Bank Nagari           │ Rp 5.000.000      │   │
│  │ - BRI                   │ Rp 3.000.000      │   │
│  │ - BSI                   │ Rp 2.000.000      │   │
│  │ Total Belum Bayar (BON) │ Rp 5.000.000      │   │
│  └─────────────────────────┴───────────────────┘   │
│                                                      │
│  📋 DETAIL TRANSAKSI                                 │
│  ┌────────┬────────┬─────────┬──────────┬────────┐ │
│  │No Fakt │ Tgl    │Item     │Subtotal  │Status  │ │
│  └────────┴────────┴─────────┴──────────┴────────┘ │
│                                                      │
│  Dicetak pada: 19-04-2026 16:00 WIB                 │
└──────────────────────────────────────────────────────┘
```

**Styling Excel yang wajib:**
- Header perusahaan **merged cell** + bold + center
- Title "LAPORAN KEUANGAN" huruf besar, bold, background warna
- Tabel ringkasan dengan border, background alternating (zebra stripes)
- Tabel detail dengan header berwarna (misal biru navy + font putih)
- Kolom uang rata kanan dengan format currency `Rp #.##0`
- Footer dengan tanggal cetak
- Kolom status diberi **conditional formatting** (warna sesuai metode pembayaran)

**Library rekomendasi:** `exceljs` (Node.js) — support styling lengkap.

**Format filename:** `Laporan-NCash-[dari]-sampai-[sampai].xlsx`
Contoh: `Laporan-NCash-01042026-19042026.xlsx`

---

### 3.4 MENU D — SETTING

**Fungsi:** Konfigurasi aplikasi.

#### 3.4.1 Sub-menu Setting

**🏦 A. Manajemen Bank Transfer**
- Tampilkan list bank yang sudah terdaftar
- Tombol `[+ Tambah Bank]` → input: Nama Bank, Nomor Rekening (opsional), Atas Nama (opsional)
- Bisa Edit & Hapus bank
- **RULE-D1:** Data bank di sini **sync otomatis** ke dropdown "Pilihan Bank" di Menu Tambah Transaksi.

**🏢 B. Informasi Perusahaan**
- Nama Perusahaan (text)
- Alamat Perusahaan (textarea)
- No Telepon (opsional)
- Logo Perusahaan (upload gambar, opsional — akan muncul di Excel)
- **RULE-D2:** Data ini **otomatis muncul** di header Laporan Excel.

**🔐 C. Ganti Password**
- Password Lama
- Password Baru
- Konfirmasi Password Baru
- Tombol `[Simpan]`

#### 3.4.2 Rule Setting
- **RULE-D3:** Semua perubahan setting **simpan ke database**, bukan di localStorage.
- **RULE-D4:** Hanya user terlogin yang bisa akses menu ini (protected route).

---

## 4. 🗄️ Database Schema (Contoh dengan Prisma)

```prisma
// schema.prisma

model User {
  id        String   @id @default(cuid())
  username  String   @unique
  password  String   // hashed dengan bcrypt
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
  id            String        @id @default(cuid())
  name          String        // contoh: "Bank Nagari"
  accountNumber String?
  accountHolder String?
  createdAt     DateTime      @default(now())
  transactions  Transaction[]
}

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
  id         String   @id @default(cuid())
  invoiceId  String
  invoice    Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  itemName   String
  quantity   Int
  unitPrice  Decimal  @db.Decimal(15, 2)
  subtotal   Decimal  @db.Decimal(15, 2) // bisa dikoreksi manual
}

model Transaction {
  // Optional: untuk kebutuhan tracking detail pembayaran (jika BON lunas)
  id        String   @id @default(cuid())
  invoiceId String
  amount    Decimal  @db.Decimal(15, 2)
  bankId    String?
  bank      Bank?    @relation(fields: [bankId], references: [id])
  createdAt DateTime @default(now())
}
```

---

## 5. 🎨 UI/UX Guidelines

### 5.1 Layout
- **Desktop:** Sidebar kiri (navigation) + Main content area
- **Mobile:** Bottom navigation bar (Dashboard, Tambah, Report, Setting)

### 5.2 Warna Tema
- **Primary:** Biru (#2563eb) — profesional, kepercayaan
- **Success (Cash):** Hijau (#16a34a)
- **Info (QRIS):** Biru muda (#0ea5e9)
- **Warning (Bank):** Kuning (#eab308)
- **Danger (BON):** Merah (#dc2626)
- **Background:** Putih/Abu-abu muda (#f9fafb)

### 5.3 Typography
- Font: Inter / Poppins (Google Fonts)
- Angka uang: font monospace agar rata (contoh: `JetBrains Mono`)

### 5.4 Komponen UI Penting
- Toast notification untuk feedback (success/error)
- Loading skeleton saat fetch data
- Modal untuk detail faktur
- Date range picker
- Currency input (format otomatis saat ketik)

### 5.5 Mobile Responsive
- Wajib responsive. Toko bangunan sering input pakai HP/tablet.

---

## 6. 🔒 Keamanan

- **AUTH-1:** Login dengan username + password
- **AUTH-2:** Password di-hash pakai `bcrypt` (min 10 rounds)
- **AUTH-3:** Session pakai JWT atau NextAuth session
- **AUTH-4:** Semua route (kecuali `/login`) harus protected
- **AUTH-5:** Default credential saat fresh install: `admin / admin123` — **paksa ganti password saat first login**
- **AUTH-6:** Rate limiting di endpoint login (anti brute-force)

---

## 7. 🚀 Deployment di Proxmox

### 7.1 Opsi Deployment
**Opsi A (Recommended):** Docker Container
```bash
# Struktur
- Dockerfile (Next.js)
- docker-compose.yml
- volume untuk database SQLite (agar data persist)
```

**Opsi B:** LXC Container di Proxmox (install Node.js langsung)

### 7.2 Backup Strategy
- **RULE-DEPLOY-1:** Database SQLite (`.db` file) di-backup otomatis tiap hari via cron
- **RULE-DEPLOY-2:** Snapshot VM/LXC Proxmox mingguan

---

## 8. 📋 Milestones & Roadmap

### Phase 1 — MVP (Target: 1-2 minggu vibe coding)
- [x] Setup project Next.js + Prisma + SQLite
- [x] Auth sederhana (login/logout)
- [x] Menu Tambah Transaksi (fitur pilar)
- [x] Menu Dashboard (5 kartu ringkasan)
- [x] Menu Report (tabel + filter tanggal)
- [x] Menu Setting (bank, company profile, password)

### Phase 2 — Enhancement (Target: 1 minggu)
- [x] Export Excel profesional
- [x] Detail faktur (modal)
- [x] Mobile responsive polish

### Phase 3 — Future (Optional)
- [ ] Fitur "Lunasi BON" (ubah status BON jadi sudah bayar)
- [ ] Multi-user (kasir & admin)
- [ ] Grafik trend keuntungan bulanan (Chart.js)
- [ ] Notifikasi BON jatuh tempo
- [ ] Backup/restore database via UI
- [ ] Print struk langsung ke thermal printer

---

## 9. ⚠️ Edge Cases & Catatan Penting

1. **Duplicate Nomor Faktur:** Validasi unique, tolak jika sudah ada.
2. **Koreksi Manual Subtotal:** Simpan di database apa adanya (tidak re-calculate saat load).
3. **Timezone:** Pakai `Asia/Jakarta` (WIB) untuk semua operasi tanggal.
4. **Format Currency Input:** Saat user ketik `74000`, tampilkan real-time jadi `Rp 74.000`.
5. **Hapus Transaksi:** Jangan hard-delete. Pakai soft-delete (field `deletedAt`) agar audit trail tetap ada.
6. **Dashboard Reset Harian:** Bukan reset DATA, tapi query dashboard selalu filter `WHERE date = TODAY()`.
7. **Handling QTY Desimal:** Untuk toko bangunan, QTY biasanya integer (pcs, sak, batang). Tapi jika ada meter/kg, siapkan field QTY bertipe decimal.
8. **Transfer Bank Tanpa Bank Terdaftar:** Jika user pilih "Transfer Bank" tapi belum ada bank di Setting, redirect ke Setting dengan pesan yang jelas.

---

## 10. 🎬 Instruksi Vibe Coding untuk Claude Code

Saat Anda mulai vibe code dengan Claude Code, gunakan urutan prompt berikut:

### Prompt 1 — Setup
```
Baca file PRD.md ini. Buatkan saya struktur project Next.js 14 (App Router) + 
TypeScript + Tailwind + shadcn/ui + Prisma + SQLite untuk aplikasi N-Cash.
Setup juga authentication dengan NextAuth (Credentials Provider).
```

### Prompt 2 — Database
```
Buatkan Prisma schema sesuai PRD section 4. Jalankan migration dan seed
dengan user default admin/admin123.
```

### Prompt 3 — Menu Tambah Transaksi (PILAR UTAMA)
```
Buatkan Menu B (Tambah Transaksi) sesuai PRD section 3.2.
Prioritas utama, pastikan semua rule B1-B9 terpenuhi.
Fokus ke UX: input currency bebas ketik tanpa spinner, bisa tambah barang dinamis.
```

### Prompt 4 — Dashboard & Report
```
Buatkan Menu Dashboard (section 3.1) dan Menu Report (section 3.3).
Pastikan kartu dashboard clickable dan redirect dengan filter.
```

### Prompt 5 — Export Excel
```
Implementasikan fitur download Excel sesuai PRD section 3.3.4.
Gunakan library exceljs. Styling harus profesional dengan header perusahaan,
tabel ringkasan, dan tabel detail.
```

### Prompt 6 — Setting & Polish
```
Buatkan Menu Setting (section 3.4) dan polish UI mobile responsive.
```

---

## 11. ✅ Acceptance Criteria (Definition of Done)

Aplikasi dianggap **selesai Phase 1** jika:
- [ ] Bisa login/logout
- [ ] Bisa tambah transaksi multi-item dengan semua metode pembayaran
- [ ] Dashboard menampilkan 5 kartu ringkasan hari ini dan bisa diklik
- [ ] Report bisa filter tanggal & export Excel profesional
- [ ] Setting: bisa tambah bank, edit info perusahaan, ganti password
- [ ] Data bank di Setting sync ke Menu Tambah Transaksi
- [ ] Laporan Excel berisi nama & alamat perusahaan dari Setting
- [ ] Dashboard reset otomatis tiap hari jam 00:00
- [ ] Mobile responsive (bisa dipakai di HP)
- [ ] Deploy-able di Docker/Proxmox

---

## 📞 Kontak & Revisi

**Prepared for:** Vibe coding session dengan Claude Code
**Next Step:** Simpan file ini sebagai `PRD.md` di root folder project, lalu mulai dengan Prompt 1.

> 💡 **Tips:** Saat vibe coding, jangan lupa commit ke Git setiap selesai 1 fitur biar gampang rollback kalau ada yang salah!

---

**— End of PRD —**
