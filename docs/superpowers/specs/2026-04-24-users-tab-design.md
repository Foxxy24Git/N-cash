# Desain: Tab Users di Halaman Settings

**Tanggal:** 2026-04-24
**Fase:** 5 (Terakhir) — UI Management User
**Status:** Disetujui

---

## Konteks

API user sudah lengkap (GET, POST, PATCH, DELETE). Fase ini menambahkan tab "Users" di halaman Settings agar admin bisa mengelola user langsung dari UI.

---

## Arsitektur & Struktur File

### File yang Dimodifikasi

| File | Perubahan |
|------|-----------|
| `src/app/(dashboard)/settings/page.tsx` | Tambah `auth()` call, ambil `currentUserId`, pass ke `SettingsTabs` |
| `src/app/(dashboard)/settings/_components/SettingsTabs.tsx` | `grid-cols-3` → `grid-cols-4`, tambah tab Users, import `UsersTab` |

### File Baru

| File | Tanggung Jawab |
|------|----------------|
| `src/app/(dashboard)/settings/_components/UsersTab.tsx` | Table users + state orchestration + AlertDialog konfirmasi |
| `src/app/(dashboard)/settings/_components/AddUserDialog.tsx` | Form tambah user baru |
| `src/app/(dashboard)/settings/_components/EditUserDialog.tsx` | Form edit fullName + toggle isActive |
| `src/app/(dashboard)/settings/_components/ResetPasswordDialog.tsx` | Form reset password user |

---

## Data Flow

```
page.tsx (server)
  ├── auth() → currentUserId
  └── SettingsTabs (client)
        └── UsersTab (client)
              ├── GET /api/users (fetch on mount + after each mutation)
              ├── POST /api/users (AddUserDialog)
              ├── PATCH /api/users/[id] (EditUserDialog, ResetPasswordDialog, toggle active)
              └── DELETE /api/users/[id] (konfirmasi hapus)
```

---

## Detail Komponen

### `page.tsx`
- Tambah `auth()` call untuk mendapatkan `session.user.id`
- Pass `currentUserId` ke `SettingsTabs`

### `SettingsTabs.tsx`
- Props tambah `currentUserId: string`
- `TabsList` grid dari `grid-cols-3` → `grid-cols-4`
- Tab baru: `value="users"` dengan icon `Users` dari lucide-react
- Render `<UsersTab currentUserId={currentUserId} />` di TabsContent

### `UsersTab.tsx`

**State:**
```ts
users: User[]
loading: boolean
dialogOpen: 'add' | 'edit' | 'reset' | null
selectedUser: User | null       // untuk edit/reset dialog
pendingToggle: User | null      // untuk AlertDialog konfirmasi toggle aktif/nonaktif
pendingDelete: User | null      // untuk AlertDialog konfirmasi hapus
loadingIds: Set<string>         // disable tombol per-row saat request in-flight
```

**Tabel kolom:**
1. Nama Lengkap — tambah badge "(Anda)" jika `user.id === currentUserId`
2. Username
3. Status — badge hijau (`bg-green-100 text-green-700`) untuk Aktif, abu (`bg-gray-100 text-gray-500`) untuk Nonaktif
4. Dibuat — format `dd MMM yyyy` via `date-fns/format` dengan locale `id`
5. Aksi — [Edit] [Reset Password] [Nonaktifkan/Aktifkan] [Hapus]

**Aturan tombol:**
- Tombol "Nonaktifkan" disabled jika `user.id === currentUserId`
- Tombol "Hapus" selalu tampil; jika user punya invoice, API return 400 → toast error

**Empty state:** Ditampilkan ketika `users.length === 0` — teks "Belum ada user terdaftar. Klik Tambah User." (Dalam praktik tabel selalu ada minimal 1 baris karena current user selalu ada, namun state ini ditangani secara defensif.)

**AlertDialog konfirmasi toggle:**
- Nonaktifkan: "Nonaktifkan [nama]? User tidak bisa login sampai diaktifkan kembali."
- Aktifkan: "Aktifkan [nama]? User bisa login kembali."

**AlertDialog konfirmasi hapus:**
- "Hapus [nama]? Aksi ini tidak bisa dibatalkan."

### `AddUserDialog.tsx`

**Props:** `open: boolean`, `onOpenChange: (v: boolean) => void`, `onSuccess: () => void`

**Fields:**
- Username — `onChange` force lowercase, hint "3-20 karakter, huruf/angka/_"
- Nama Lengkap
- Password — hint "min 8 karakter"
- Konfirmasi Password

**Validasi client:**
- Username format: `/^[a-z0-9_]+$/`, min 3, max 20
- Password min 8 karakter
- Password === Konfirmasi Password

**Submit:** `POST /api/users` → toast sukses → `onSuccess()` → tutup dialog

**Error:** toast.error dari `data.error` (termasuk "Username sudah digunakan")

### `EditUserDialog.tsx`

**Props:** `open: boolean`, `onOpenChange: (v: boolean) => void`, `user: User`, `currentUserId: string`, `onSuccess: () => void`

**Fields:**
- Username — disabled/read-only
- Nama Lengkap — editable
- Status aktif — toggle button (karena tidak ada Switch component); disabled jika `user.id === currentUserId`

**Submit:** `PATCH /api/users/[id]` dengan `{ fullName, isActive }` → toast sukses → `onSuccess()`

### `ResetPasswordDialog.tsx`

**Props:** `open: boolean`, `onOpenChange: (v: boolean) => void`, `user: User`, `onSuccess: () => void`

**Fields:**
- Password baru — min 8 karakter
- Konfirmasi password baru

**Validasi client:** password match, min 8

**Submit:** `PATCH /api/users/[id]` dengan `{ newPassword }` → toast sukses dengan pesan "Password berhasil direset. User harus login ulang dengan password baru."

---

## Error Handling

| Skenario | Penanganan |
|----------|-----------|
| Fetch list gagal | `loading: false`, tabel kosong (tidak crash) |
| Username duplikat (POST) | toast.error "Username sudah digunakan", dialog tetap buka |
| Hapus user yang punya invoice | toast.error dari API, AlertDialog tutup |
| Nonaktifkan diri sendiri | Tombol disabled di UI; API juga guard (defense in depth) |
| Network error | toast.error "Terjadi kesalahan server" |

---

## Keputusan Desain

- **Tombol Hapus selalu tampil** — handle error dari API secara graceful (Approach A dipilih user), tidak perlu modifikasi API GET
- **currentUserId dari server** — pass dari `page.tsx` via `auth()`, bukan `useSession` (konsisten dengan pola existing, tidak perlu SessionProvider)
- **Re-fetch setelah mutasi** — simple `fetchUsers()` call, bukan optimistic update (data kecil, correctness lebih penting)
- **File terpisah per dialog** — Approach B, konsisten dengan pola `BankTab` + `BankDialog`
- **Tidak ada Switch component** — gunakan styled Button toggle untuk isActive di EditDialog
