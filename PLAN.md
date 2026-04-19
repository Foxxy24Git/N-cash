# 🎯 PLAN.md — Roadmap Vibe Coding N-Cash

**Target:** Build aplikasi N-Cash dengan Claude Code (CLI) di Mac M1
**Prinsip:** Pecah kecil-kecil, test di setiap step, commit ke Git, baru lanjut.

---

## 🧠 PRINSIP VIBE CODING YANG BENAR

Sebelum mulai, pegang 5 prinsip ini:

1. **Jangan rakus** — 1 prompt = 1 fitur kecil. Bukan "buatkan semua menu sekaligus."
2. **Test dulu, lanjut kemudian** — setiap fase harus bisa dijalankan & dilihat hasilnya sebelum pindah ke fase berikutnya.
3. **Git adalah sahabat** — commit setiap fitur selesai. Kalau rusak, tinggal `git reset`.
4. **Context matters** — kalau sesi Claude Code udah panjang & ngelantur, pakai `/clear` buat reset context. Fresh context = Claude lebih fokus.
5. **Jangan 100% percaya** — baca sekilas code yang di-generate. Tanya kalau ada yang aneh: "kenapa pakai cara X, bukan Y?"

---

## 🖥️ FASE 0 — Prerequisites (Mac M1 Setup)

Cek dulu apakah tools ini sudah terinstall. Kalau belum, install dulu.

### 0.1 Cek Homebrew
```bash
brew --version
```
Kalau belum ada:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 0.2 Install Node.js (via nvm — recommended)
```bash
# Install nvm
brew install nvm

# Setup nvm (tambahkan ke ~/.zshrc)
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.zshrc
echo '[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"' >> ~/.zshrc
source ~/.zshrc

# Install Node LTS
nvm install --lts
nvm use --lts
node --version  # harusnya v20.x atau lebih
```

### 0.3 Install Git (biasanya sudah ada di Mac)
```bash
git --version
# Setup identitas Git
git config --global user.name "Nama Anda"
git config --global user.email "email@anda.com"
```

### 0.4 Install Claude Code
```bash
npm install -g @anthropic-ai/claude-code
claude --version
```

### 0.5 Install VS Code (opsional tapi berguna untuk baca code)
```bash
brew install --cask visual-studio-code
```

### ✅ Checkpoint Fase 0
- [ ] `brew`, `node`, `npm`, `git`, `claude` semua jalan di terminal
- [ ] Node version minimal v20

---

## 📁 FASE 1 — Inisialisasi Project

### 1.1 Buat folder project
```bash
cd ~/Documents   # atau folder favorit Anda
mkdir n-cash
cd n-cash
```

### 1.2 Pindahkan PRD.md ke folder ini
```bash
# Asumsi PRD.md ada di ~/Downloads
mv ~/Downloads/PRD.md .
mv ~/Downloads/PLAN.md .   # file ini juga

# Cek
ls -la
# Harusnya ada: PRD.md, PLAN.md
```

### 1.3 Init Git
```bash
git init
echo "node_modules/" > .gitignore
echo ".env" >> .gitignore
echo ".next/" >> .gitignore
echo "*.db" >> .gitignore
echo ".DS_Store" >> .gitignore
git add .
git commit -m "chore: initial setup with PRD and PLAN"
```

### 1.4 Jalankan Claude Code di folder ini
```bash
claude
```
> Sekarang Anda sudah di dalam Claude Code CLI. Prompt pertama bisa langsung diketik.

### 📝 PROMPT 1 — Setup Project Foundation

Copy paste ini ke Claude Code:

```
Baca file @PRD.md dulu biar kamu paham konteksnya.

Tugas pertama: setup project Next.js 14 (App Router) + TypeScript + Tailwind
CSS untuk aplikasi N-Cash.

Requirements:
1. Pakai create-next-app dengan config: TypeScript yes, ESLint yes, Tailwind yes,
   App Router yes, src directory yes, import alias default (@/*)
2. Install tambahan: shadcn/ui, prisma, @prisma/client, better-sqlite3
3. Init shadcn/ui dengan tema neutral, CSS variables, dan warna primary biru
4. Jangan tambahkan komponen shadcn dulu, cukup setup saja

JANGAN buat schema Prisma atau fitur apapun dulu. Fokus setup environment saja.
Setelah selesai, jelaskan struktur folder yang dibuat dan perintah untuk run dev server.
```

### ✅ Checkpoint Fase 1
Setelah Claude Code selesai, jalankan:
```bash
npm run dev
```
Buka browser ke `http://localhost:3000` — harusnya lihat welcome page Next.js.

Kalau OK, commit:
```bash
# Keluar dulu dari Claude Code dengan Ctrl+C atau /exit
git add .
git commit -m "feat: initial Next.js setup with Tailwind and shadcn/ui"
```

---

## 🗄️ FASE 2 — Database Schema & Auth

### 📝 PROMPT 2 — Prisma Schema

Masuk lagi ke Claude Code (`claude`), lalu:

```
Baca @PRD.md section 4 (Database Schema).

Buatkan:
1. Prisma schema di prisma/schema.prisma sesuai PRD section 4
2. Provider: sqlite, database file di prisma/dev.db
3. Jalankan prisma generate dan prisma migrate dev dengan nama "init"
4. Buat seed script prisma/seed.ts yang membuat:
   - 1 user admin dengan username "admin" dan password "admin123" (hash bcrypt)
   - 1 CompanyProfile default: name "Toko Bangunan Saya", address "Padang, Sumatera Barat"
   - 3 bank default: "Bank Nagari", "BRI", "BSI"
5. Update package.json untuk menjalankan seed
6. Jalankan seed dan pastikan data masuk

Gunakan bcryptjs untuk hash password (lebih gampang di Mac M1 daripada bcrypt native).
```

### ✅ Checkpoint Fase 2
```bash
# Install Prisma Studio buat lihat DB (opsional tapi mantap)
npx prisma studio
```
Browser buka otomatis → cek table `User` ada admin, table `Bank` ada 3 bank.

Kalau OK:
```bash
git add .
git commit -m "feat: database schema with Prisma + SQLite, seed admin user"
```

---

## 🔐 FASE 3 — Authentication (Login/Logout)

### 📝 PROMPT 3 — NextAuth Setup

```
Setup authentication pakai NextAuth v5 (Auth.js) dengan Credentials Provider.

Requirements:
1. User login pakai username + password (cek dengan bcrypt ke database)
2. Session pakai JWT strategy
3. Buat halaman /login dengan form username & password (pakai shadcn Input & Button)
4. Buat middleware.ts yang protect semua route kecuali /login
5. Kalau login berhasil, redirect ke /dashboard
6. Kalau gagal, tampilkan error "Username atau password salah"
7. Tambah tombol logout di somewhere (nanti diperbaiki di layout)
8. Buat file .env.local dengan AUTH_SECRET (generate random string)

Desain login page: sederhana, center, card putih, ada logo/judul "N-Cash" di atas.
```

### ✅ Checkpoint Fase 3
1. `npm run dev`
2. Buka `http://localhost:3000` → harusnya redirect ke `/login`
3. Login dengan `admin` / `admin123` → harusnya masuk ke `/dashboard` (walaupun masih kosong)
4. Coba login dengan password salah → harusnya muncul error
5. Logout berfungsi

Kalau OK:
```bash
git add .
git commit -m "feat: authentication with NextAuth credentials provider"
```

> **Catatan:** Kalau di langkah ini error, kasih tahu Claude Code error message lengkapnya. Jangan panik, vibe coding = iterasi.

---

## 🎨 FASE 4 — Layout & Navigation

### 📝 PROMPT 4 — Dashboard Layout Shell

```
Buatkan layout utama aplikasi setelah login.

Requirements:
1. Desktop: Sidebar kiri fixed dengan menu: Dashboard, Tambah Transaksi, Report, Setting
   dan tombol Logout di bawah sidebar
2. Mobile (< 768px): sidebar hidden, muncul bottom navigation bar dengan 4 icon menu
3. Header top dengan: nama perusahaan (ambil dari CompanyProfile) + tanggal hari ini real-time
4. Buat 4 halaman placeholder:
   - /dashboard - tulisan "Dashboard (coming soon)"
   - /transactions/new - tulisan "Tambah Transaksi (coming soon)"
   - /reports - tulisan "Report (coming soon)"
   - /settings - tulisan "Setting (coming soon)"
5. Pakai lucide-react untuk icon
6. Active menu highlighted (warna primary biru)
7. Layout pakai @/app/(dashboard)/layout.tsx (route group)

Desain: clean, profesional, warna primary biru (#2563eb), background abu muda.
```

### ✅ Checkpoint Fase 4
1. Klik-klik 4 menu, navigasi berfungsi, URL berubah, active state benar
2. Resize browser ke mobile size → sidebar hilang, bottom nav muncul
3. Tombol logout berfungsi

```bash
git add .
git commit -m "feat: app shell with sidebar, bottom nav, and route structure"
```

---

## 💰 FASE 5 — Menu Tambah Transaksi (PILAR UTAMA!)

> ⚠️ **INI FITUR PALING PENTING.** Kita pecah jadi 3 sub-fase supaya lebih teliti.

### 📝 PROMPT 5A — Form Structure + Dynamic Items

```
Baca ulang @PRD.md section 3.2 (Menu Tambah Transaksi).

Implementasi TAHAP 1 — form structure saja (belum save ke DB):

Requirements:
1. Di /transactions/new, buat form dengan 3 section:

   SECTION 1 - Header Faktur:
   - Nomor Faktur (input text)
   - Tanggal (date picker, default hari ini)

   SECTION 2 - Detail Barang (DINAMIS, bisa tambah banyak):
   - Tabel dengan kolom: Nama Barang, QTY, Harga Satuan, Subtotal, Aksi (hapus)
   - Tombol [+ Tambah Barang] di bawah tabel
   - Minimal 1 baris barang muncul default
   - Tiap baris bisa dihapus (kecuali kalau cuma tersisa 1 baris)

   SECTION 3 - Total & Pembayaran (kita isi nanti di tahap berikutnya):
   - Cukup kotak kosong dulu dengan placeholder

2. Input currency (Harga Satuan & Subtotal) HARUS:
   - Bebas diketik, TIDAK ADA tombol panah atas/bawah
   - Auto-format saat ngetik: "74000" → tampil "Rp 74.000"
   - Pakai library seperti react-number-format atau custom hook

3. Subtotal auto-calculate = QTY × Harga Satuan setiap kali user ubah input
4. Subtotal BISA dikoreksi manual (override), ada icon reset 🔄 untuk kembali ke auto

5. State management pakai useState atau Zustand (terserah, yang simple)

JANGAN simpan ke database dulu. Ini tahap form structure aja.
Tampilkan console.log data form saat user klik tombol submit (untuk debugging).
```

### ✅ Checkpoint Fase 5A
1. Bisa tambah baris barang, bisa hapus baris
2. Ketik angka di Harga Satuan, langsung format `Rp 74.000`
3. Subtotal auto = QTY × Harga
4. Koreksi manual subtotal bisa, tombol reset mengembalikan ke auto
5. Klik submit → lihat data di console browser (F12)

```bash
git add .
git commit -m "feat(transactions): dynamic form with currency input and subtotal calculation"
```

### 📝 PROMPT 5B — Payment Method + Total Belanja

```
Lanjut TAHAP 2 Menu Tambah Transaksi.

Requirements:
1. Di Section 3, tambahkan:
   - Dropdown/Radio Metode Pembayaran: Cash, Cash COD, QRIS, Transfer Bank, Belum Bayar (BON)
   - Kalau pilih "Transfer Bank", muncul dropdown tambahan "Pilih Bank" yang fetch
     data dari tabel Bank di database (pakai server action atau API route)
   - Kalau belum ada bank di DB, dropdown kosong dengan pesan "Tambahkan bank di Setting"

2. Status pembayaran diberi warna badge:
   - Cash/Cash COD: hijau
   - QRIS: biru
   - Transfer Bank: kuning
   - BON: merah

3. TOTAL BELANJA muncul besar & bold di bawah:
   - Auto-sum semua subtotal real-time
   - Read-only (user tidak bisa edit)
   - Format "Rp #.###.###"

4. Tombol [Simpan Transaksi] di paling bawah

Belum save ke DB. Console.log dulu saat submit.
```

### ✅ Checkpoint Fase 5B
1. Pilih "Transfer Bank" → muncul dropdown bank (isi: Bank Nagari, BRI, BSI)
2. Badge warna muncul sesuai pilihan
3. Total Belanja real-time update

```bash
git add .
git commit -m "feat(transactions): payment method selection with bank sync"
```

### 📝 PROMPT 5C — Save to Database

```
Tahap terakhir Menu Tambah Transaksi: save ke database.

Requirements:
1. Buat server action atau API route POST /api/transactions untuk simpan data
2. Validasi server-side pakai Zod:
   - Nomor faktur unique (tolak kalau duplicate)
   - Minimal 1 item barang
   - Kalau payment method = "BANK_TRANSFER", bankId wajib
3. Simpan ke tabel Invoice + InvoiceItem (relasi cascade)
4. Kalau sukses: tampilkan toast "✅ Transaksi berhasil disimpan", reset form
5. Kalau error: tampilkan toast error dengan pesan yang jelas
6. Pakai library toast dari shadcn/ui (sonner)

Test: simpan 1 transaksi dengan 2 barang. Buka Prisma Studio (npx prisma studio)
untuk verifikasi data masuk ke DB dengan benar.
```

### ✅ Checkpoint Fase 5C
1. Save transaksi sukses → toast muncul → form reset
2. `npx prisma studio` → cek tabel Invoice & InvoiceItem ada datanya
3. Coba save dengan nomor faktur yang sama → harusnya error
4. Coba save tanpa barang → harusnya error

```bash
git add .
git commit -m "feat(transactions): save invoice to database with validation"
```

🎉 **SELAMAT!** Fitur pilar sudah jadi. Sekarang fitur lain lebih gampang karena ada data untuk ditampilkan.

---

## 📊 FASE 6 — Dashboard

### 📝 PROMPT 6 — Dashboard 5 Cards

```
Baca @PRD.md section 3.1 (Menu Dashboard).

Implementasi Menu Dashboard di /dashboard:
1. 5 card dengan data HARI INI:
   - Total Keuntungan (sum semua invoice hari ini)
   - Total Cash (sum invoice today dengan payment_method CASH atau CASH_COD)
   - Total QRIS
   - Total Transfer Bank
   - Total BON
2. Warna card sesuai PRD (abu netral, hijau, biru, kuning, merah)
3. Format angka: Rp 1.000.000 dengan monospace font biar rata
4. Icon lucide di tiap card (Wallet, Banknote, Smartphone, Landmark, AlertCircle)
5. Card CLICKABLE: klik redirect ke /reports?date=today&method=<sesuai card>
6. Query pakai Prisma dengan filter createdAt where date = today (timezone Asia/Jakarta)
7. Server component untuk fetch data, pastikan tidak cached (revalidate: 0 atau 'no-store')

Tambahkan auto-refresh tiap 30 detik pakai React useEffect + setInterval (opsional).
```

### ✅ Checkpoint Fase 6
1. Dashboard tampil 5 card dengan angka
2. Tambah beberapa transaksi → refresh dashboard → angka update
3. Klik card Cash → redirect ke report dengan filter

```bash
git add .
git commit -m "feat(dashboard): 5 summary cards with today's totals"
```

---

## 📋 FASE 7 — Menu Report

### 📝 PROMPT 7A — Report Table + Filter

```
Baca @PRD.md section 3.3.

Implementasi Menu Report di /reports — TAHAP 1 (tabel + filter, belum export):
1. Filter di atas tabel:
   - Date range picker (pakai shadcn Calendar + Popover)
   - Shortcut button: [Hari Ini] [Kemarin] [7 Hari Terakhir] [Bulan Ini]
   - Dropdown metode pembayaran: Semua, Cash, QRIS, Transfer Bank, BON
   - Search by nomor faktur
2. Summary cards di atas tabel (dinamis sesuai filter):
   - Total keuntungan, Total per metode pembayaran
3. Tabel utama:
   - Kolom: No Faktur, Jam, Tanggal, Total Belanja, Status (badge warna), Aksi
   - Pagination 20 per page
4. Tombol [Detail] di kolom Aksi → buka modal/dialog tampilkan semua item dalam faktur
5. URL query params sync dengan filter (biar bisa di-bookmark & link dari dashboard)

Pakai TanStack Table atau tabel custom (terserah yang simple).
```

### ✅ Checkpoint Fase 7A
1. Filter tanggal berfungsi
2. Klik dari dashboard → report otomatis ter-filter
3. Modal detail tampilkan barang-barang dalam faktur

```bash
git add .
git commit -m "feat(reports): transaction list with filters and detail modal"
```

---

## 📥 FASE 8 — Excel Export (PENTING!)

### 📝 PROMPT 8 — Export Laporan Excel Profesional

```
Baca @PRD.md section 3.3.4.

Implementasi fitur Download Laporan Excel di Menu Report.

Requirements:
1. Install exceljs
2. Tombol [📥 Download Laporan Excel] di halaman Report
3. Tombol generate file sesuai filter aktif
4. Format Excel:
   - Row 1-4: Header perusahaan (ambil dari CompanyProfile), merged cell center bold
   - Row 5: Kosong
   - Row 6: "LAPORAN KEUANGAN" — font besar, bold, center, background biru navy, font putih
   - Row 7: "Periode: DD-MM-YYYY s/d DD-MM-YYYY"
   - Row 9-15: Tabel RINGKASAN (Total keuntungan, Cash, QRIS, Transfer Bank (breakdown per bank), BON) dengan border & alternate row color
   - Row 17: "DETAIL TRANSAKSI" — header section
   - Row 18: Header kolom (No Faktur, Tanggal, Jam, Nama Barang, QTY, Harga, Subtotal, Metode Pembayaran) — background biru, font putih
   - Row 19+: Data detail per item (kalau 1 faktur ada 5 barang = 5 baris)
   - Baris total per faktur dengan background abu
5. Format kolom uang: "Rp #,##0" rata kanan
6. Kolom Status kasih conditional formatting (fill color sesuai metode pembayaran)
7. Column widths adjusted supaya rapi
8. Footer paling bawah: "Dicetak pada: DD-MM-YYYY HH:mm WIB"
9. Filename: "Laporan-NCash-DDMMYYYY-DDMMYYYY.xlsx"
10. Download trigger pakai blob + link download di client

Server action atau API route /api/reports/export.
```

### ✅ Checkpoint Fase 8
1. Klik tombol download → file Excel ke-download
2. Buka di Excel/Numbers → lihat header perusahaan, ringkasan, tabel detail
3. Format uang & warna status benar

```bash
git add .
git commit -m "feat(reports): professional Excel export with branded header"
```

---

## ⚙️ FASE 9 — Menu Setting

### 📝 PROMPT 9 — Setting Page

```
Baca @PRD.md section 3.4.

Implementasi Menu Setting di /settings dengan 3 tab:

TAB 1 - Manajemen Bank:
- List bank dari DB (tabel)
- Tombol [+ Tambah Bank] → dialog form (nama bank, nomor rekening optional, atas nama optional)
- Edit & Delete per baris (dengan konfirmasi sebelum delete)
- Pastikan perubahan langsung sync ke dropdown di Menu Tambah Transaksi

TAB 2 - Informasi Perusahaan:
- Form edit: Nama Perusahaan, Alamat, No Telepon, Upload Logo (simpan di public/uploads/)
- Tombol [Simpan]
- Data ini muncul di header Excel export

TAB 3 - Ganti Password:
- Password Lama, Password Baru, Konfirmasi Password
- Validasi: password lama harus match, password baru minimal 8 karakter
- Setelah berhasil, force logout biar user login ulang

Pakai shadcn Tabs component.
```

### ✅ Checkpoint Fase 9
1. Tambah bank baru → cek di Menu Tambah Transaksi, bank muncul di dropdown
2. Edit nama perusahaan → export Excel → header berubah
3. Ganti password → logout → login dengan password baru

```bash
git add .
git commit -m "feat(settings): bank management, company profile, password change"
```

---

## 🎨 FASE 10 — Polish & Bug Fix

### 📝 PROMPT 10 — Review & Polish

```
Baca @PRD.md section 5 (UI/UX Guidelines).

Review semua halaman dan lakukan polish:
1. Mobile responsive: test di viewport 375px (iPhone SE) — semua harus berfungsi
2. Loading state: kasih skeleton loader di dashboard & report saat fetch data
3. Empty state: kalau belum ada transaksi, tampilkan ilustrasi + pesan "Belum ada data"
4. Error state: kalau fetch error, tampilkan pesan error + tombol retry
5. Konsistensi warna: pastikan semua status pembayaran pakai warna yang sama di semua halaman
6. Toast sukses di setiap aksi CRUD
7. Konfirmasi delete pakai AlertDialog shadcn
8. Favicon dan title page sesuai "N-Cash"

Jangan ubah fitur. Cuma polish UI/UX.
```

### ✅ Checkpoint Fase 10
Klik-klik semua halaman, test di mobile (inspect browser → mobile mode), pastikan tidak ada yang jelek.

```bash
git add .
git commit -m "feat: UI/UX polish and mobile responsive improvements"
```

---

## 🚀 FASE 11 — Deploy ke Proxmox (Optional, nanti aja)

Fase ini tidak urgent. Kerjakan setelah semua fitur stable. Kita akan bikin:
1. Dockerfile untuk Next.js production build
2. docker-compose.yml dengan volume untuk database SQLite
3. Deploy di LXC/VM Proxmox

Simpan prompt-nya untuk nanti:

```
Buatkan saya Dockerfile production untuk Next.js app ini + docker-compose.yml.
Pastikan database SQLite di-mount sebagai volume supaya data persist saat container restart.
Sertakan instruksi deploy di Proxmox (bisa LXC atau VM).
```

---

## 🆘 TROUBLESHOOTING — Kalau Vibe Coding Macet

### ❌ "Claude Code-nya error / output aneh"
- Pakai `/clear` untuk reset context
- Mulai sesi baru dengan konteks lebih fokus: `baca @PRD.md section X dan @/path/file.tsx`

### ❌ "npm install gagal di Mac M1"
- Library native kadang bermasalah. Saran:
  - Pakai `bcryptjs` (pure JS), bukan `bcrypt`
  - Kalau ada library pakai node-gyp, install xcode tools: `xcode-select --install`

### ❌ "Error: Port 3000 already in use"
```bash
lsof -ti:3000 | xargs kill -9
```

### ❌ "Prisma migrate error"
```bash
# Reset DB dan migrate ulang (AWAS data hilang, pakai di dev aja!)
rm prisma/dev.db
npx prisma migrate dev --name reset
npx prisma db seed
```

### ❌ "Code di-generate tapi saya ga ngerti"
Jangan skip. Tanya ke Claude Code:
```
Jelaskan file @path/to/file.tsx yang kamu buat tadi, baris per baris, dalam bahasa
Indonesia yang mudah dipahami untuk beginner.
```

### ❌ "Error yang sama berulang"
Copy error message lengkap, paste ke Claude Code:
```
Saya dapat error ini: [paste error]
Context: saya sedang menjalankan [perintah apa]
Analisis dulu SEBELUM coba fix. Jelaskan akar masalahnya.
```

### ❌ "Aplikasi jalan tapi perilaku aneh"
```
Tolong jangan langsung fix. Review code @path/to/file.tsx dan identifikasi
potensi bug. List 3 kemungkinan penyebab, baru kita pilih solusi terbaik.
```

---

## 📝 CHECKLIST PROGRESS

Centang sambil jalan biar keliatan progress:

- [ ] Fase 0: Prerequisites terpasang
- [ ] Fase 1: Project foundation jalan, welcome page muncul
- [ ] Fase 2: Database + seed admin
- [ ] Fase 3: Login/logout works
- [ ] Fase 4: Layout + navigation
- [ ] Fase 5A: Form tambah transaksi (dynamic items)
- [ ] Fase 5B: Payment method & total
- [ ] Fase 5C: Save to DB
- [ ] Fase 6: Dashboard 5 cards
- [ ] Fase 7A: Report table + filter
- [ ] Fase 8: Excel export
- [ ] Fase 9: Setting menu
- [ ] Fase 10: UI/UX polish
- [ ] Fase 11: Deploy Proxmox (optional)

---

## 💡 TIPS TAMBAHAN

1. **Kerjakan 1-2 fase per sesi coding.** Jangan marathon 8 jam — otak lelah = bug banyak.
2. **Commit message yang bagus.** Pakai format `feat:`, `fix:`, `chore:`, `docs:`. Nanti `git log` jadi rapi.
3. **Push ke GitHub/GitLab** setelah Fase 2 selesai. Backup otomatis, bisa akses dari mana aja.
4. **Test dengan data nyata.** Coba input 10-20 transaksi dengan variasi metode pembayaran biar keliatan edge case-nya.
5. **Jangan takut `/clear`.** Context yang bersih = Claude Code lebih fokus & tidak nyasar.
6. **Baca code-nya.** Minimal sekilas. Lama-lama Anda ngerti pattern, dan level programming naik beneran — bukan cuma prompt engineer.

---

**Selamat vibe coding! 🚀 Satu langkah kecil setiap kali, N-Cash bakal jadi aplikasi keren.**
