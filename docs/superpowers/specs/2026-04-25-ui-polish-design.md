# UI/UX Polish Design — N-Cash

**Date:** 2026-04-25
**Scope:** Polish saja — tidak ada perubahan fitur atau database schema.

---

## Constraint

Tidak mengubah logika bisnis, data flow, atau API. Hanya penambahan/perbaikan UI layer.

---

## Section 1 — Shared Components

### `src/components/ui/empty-state.tsx`

```tsx
interface EmptyStateProps {
  icon: LucideIcon
  title: string
  subtitle?: string
  action?: ReactNode
}
```

- Layout: flex column, center, padding vertikal 12–16
- Icon: ukuran 48, warna `text-gray-300`
- Title: `text-gray-500`, `text-sm font-medium`
- Subtitle: `text-gray-400`, `text-xs`
- Action: slot bebas (biasanya `<Button>`)

### Skeleton pattern

Gunakan inline `animate-pulse bg-gray-100 rounded-md` div secara langsung di tiap `loading.tsx`. Tidak perlu shared Skeleton component — usage terbatas hanya di dua file loading.

---

## Section 2 — Loading States

### `src/app/(dashboard)/dashboard/loading.tsx`

- Heading skeleton: `h-7 w-48`
- Grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`
- 5x `SkeletonCard`: `rounded-xl p-5 h-24 animate-pulse bg-gray-100`

### `src/app/(dashboard)/reports/loading.tsx`

- Heading skeleton: `h-7 w-40`
- Filter bar skeleton: `h-12 rounded-xl bg-gray-100`
- 5x summary card skeleton: `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`
- Table skeleton: header row + 8 row skeletons (alternating columns widths)

---

## Section 3 — Error States

Kedua file adalah `'use client'` (wajib untuk Next.js error boundary).

### `src/app/(dashboard)/dashboard/error.tsx`

```tsx
'use client'
export default function DashboardError({ reset }: { error: Error; reset: () => void })
```

- Icon: `AlertTriangle` dari lucide, warna `text-red-400`, ukuran 40
- Title: "Gagal memuat dashboard"
- Subtitle: "Terjadi kesalahan saat mengambil data."
- Tombol: "Coba Lagi" → memanggil `reset()`
- Layout: center di area konten, mirip EmptyState tapi warna merah muted

### `src/app/(dashboard)/reports/error.tsx`

Sama, title: "Gagal memuat laporan".

---

## Section 4 — Empty States

Semua menggunakan komponen `EmptyState` dari Section 1.

| Lokasi | Icon | Title | Subtitle |
|--------|------|-------|----------|
| `InvoiceTable` (rows.length === 0) | `FileSearch` | "Tidak ada transaksi" | "Coba ubah filter atau rentang tanggal." |
| `BankTab` (banks.length === 0) | `Landmark` | "Belum ada bank" | "Tambah bank untuk digunakan pada transaksi Transfer Bank." |
| `UsersTab` (users.length === 0) | `Users` | "Belum ada pengguna lain" | "Tambah pengguna untuk akses multi-user." |

Dashboard tidak perlu empty state — Rp 0 sudah semantik benar.

---

## Section 5 — Polish Final

### 5a. DeleteBankButton → AlertDialog

**File:** `src/app/(dashboard)/settings/_components/DeleteBankButton.tsx`

Ganti `window.confirm(...)` dengan AlertDialog shadcn/ui. Pola identik dengan `DeleteDialog` di reports. State `open` dikelola lokal dengan `useState`.

### 5b. Toast sukses ganti password

**Masalah:** `changePassword` memanggil `signOut({ redirectTo: '/login' })` di akhir server action. Ini menyebabkan redirect langsung — tidak ada kesempatan tampil toast di client.

**Solusi:** Pindahkan `signOut` ke client side.

**`src/app/(dashboard)/settings/_actions/passwordActions.ts`:**
- Hapus `signOut` call
- Ubah return type: `{ success: true } | { error: string }`
- Return `{ success: true }` setelah update password berhasil

**`src/app/(dashboard)/settings/_components/PasswordTab.tsx`:**
- Import `signOut` dari `next-auth/react`
- Jika result `{ success: true }`: tampilkan `toast.success('Password berhasil diubah')`, lalu `setTimeout(() => signOut({ callbackUrl: '/login' }), 1500)`

### 5c. Favicon N-Cash

**File baru:** `src/app/icon.svg`

SVG sederhana: lingkaran biru `#2563eb`, huruf "N" putih bold di tengah. Next.js App Router otomatis menjadikannya favicon. `favicon.ico` lama tetap ada sebagai fallback browser lama.

### 5d. Title halaman

Cek dan tambahkan `metadata` di:
- `src/app/(dashboard)/transactions/new/page.tsx` → `title: 'Tambah Transaksi — N-Cash'`
- `src/app/(dashboard)/settings/page.tsx` → `title: 'Setting — N-Cash'`

Dashboard dan Reports sudah punya metadata title.

### 5e. Konsistensi warna

Audit hasil: warna status sudah konsisten di semua halaman (hijau/biru/kuning/merah). Tidak ada perubahan diperlukan.

---

## File yang Diubah / Dibuat

**Baru:**
- `src/components/ui/empty-state.tsx`
- `src/app/(dashboard)/dashboard/loading.tsx`
- `src/app/(dashboard)/dashboard/error.tsx`
- `src/app/(dashboard)/reports/loading.tsx`
- `src/app/(dashboard)/reports/error.tsx`
- `src/app/icon.svg`

**Diubah:**
- `src/app/(dashboard)/reports/_components/InvoiceTable.tsx` — empty state
- `src/app/(dashboard)/settings/_components/BankTab.tsx` — empty state
- `src/app/(dashboard)/settings/_components/UsersTab.tsx` — empty state
- `src/app/(dashboard)/settings/_components/DeleteBankButton.tsx` — AlertDialog
- `src/app/(dashboard)/settings/_components/PasswordTab.tsx` — success toast
- `src/app/(dashboard)/settings/_actions/passwordActions.ts` — return success
- `src/app/(dashboard)/transactions/new/page.tsx` — metadata title
- `src/app/(dashboard)/settings/page.tsx` — metadata title

**Total:** 6 file baru, 8 file diubah.

---

## Out of Scope

- Mobile responsive 375px audit — setelah review, semua komponen sudah menggunakan `overflow-x-auto` dan responsive grid. Tidak ada perubahan diperlukan kecuali ditemukan issue konkret saat testing.
- Perubahan fitur, logika bisnis, atau schema database.
