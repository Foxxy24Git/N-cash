# Fase 4: API CRUD User Management

**Tanggal:** 2026-04-24
**Status:** Approved

## Scope

API endpoints untuk manage user (list, create, update, delete) tanpa UI. UI direncanakan di Fase 5.

## File Structure

```
src/lib/schemas/user.ts              ← Zod schemas (reusable di Fase 5)
src/app/api/users/route.ts           ← GET + POST
src/app/api/users/[id]/route.ts      ← PATCH + DELETE
src/auth.ts                          ← Update: cek isActive saat login
```

## Dependency Baru

- `zod` — validasi schema. Install via `npm install zod`.

## Zod Schemas (`src/lib/schemas/user.ts`)

```ts
export const createUserSchema = z.object({
  username: z
    .string()
    .min(3, 'Username minimal 3 karakter')
    .max(20, 'Username maksimal 20 karakter')
    .regex(/^[a-z0-9_]+$/, 'Username hanya boleh huruf kecil, angka, dan underscore'),
  fullName: z
    .string()
    .min(3, 'Nama lengkap minimal 3 karakter')
    .max(100, 'Nama lengkap maksimal 100 karakter'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
})

export const updateUserSchema = z.object({
  fullName: z.string().min(3, 'Nama lengkap minimal 3 karakter').max(100).optional(),
  isActive: z.boolean().optional(),
  newPassword: z.string().min(8, 'Password minimal 8 karakter').optional(),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
```

## Endpoints

### GET /api/users
- Cek session, return 401 jika tidak login
- `prisma.user.findMany({ select: { id, username, fullName, isActive, createdAt }, orderBy: { createdAt: 'desc' } })`
- Return: array of users

### POST /api/users
- Cek session → return 401
- Parse body → Zod validate `createUserSchema` → return 400 + error messages jika invalid
- Cek `prisma.user.findUnique({ where: { username } })` → return 400 `"Username sudah digunakan"` jika ada
- `bcrypt.hash(password, 10)`
- `prisma.user.create({ data: { username, fullName, password: hashedPassword, isActive: true } })`
- Return user tanpa password (select eksplisit), status 201

### PATCH /api/users/[id]
- Cek session → return 401
- Cek user exist → return 404 `"User tidak ditemukan"`
- Zod validate `updateUserSchema` → return 400 jika invalid
- Self-lock prevention: jika `id === session.user.id && isActive === false` → return 400 `"Tidak bisa menonaktifkan akun sendiri"`
- Build `data` object hanya dari field yang diisi (tidak update field yang undefined)
- Jika `newPassword` diisi: `bcrypt.hash(newPassword, 10)` → simpan ke field `password`
- `prisma.user.update({ where: { id }, data })`
- Return user terupdate tanpa password

### DELETE /api/users/[id]
- Cek session → return 401
- Cek user exist: `prisma.user.findUnique({ where: { id } })` → return 404 `"User tidak ditemukan"` jika tidak ada
- Cek self-delete: jika `id === session.user.id` → return 400 `"Tidak bisa menghapus akun sendiri"`
- Cek invoice count: `prisma.invoice.count({ where: { createdById: id } })`
- Jika count > 0 → return 400 `"User tidak bisa dihapus karena memiliki riwayat transaksi. Nonaktifkan saja (isActive = false)."`
- Hard delete: `prisma.user.delete({ where: { id } })`
- Return status 200 `{ message: "User berhasil dihapus" }`

## Auth Update (`src/auth.ts`)

Di `authorize` callback, setelah password match tambahkan:
```ts
if (!user.isActive) return null
```
Untuk sekarang return `null` (NextAuth akan reject login). Pesan error ditangani di Fase 5.

## Error Pattern

Konsisten dengan routes existing — semua pakai:
```ts
NextResponse.json({ error: '...' }, { status: 4xx })
```

## Security

- Semua endpoint cek `auth()` session sebelum query DB
- Tidak ada field `password` di response mana pun (pakai `select` eksplisit)
- Username tidak bisa diubah via PATCH (tidak ada di `updateUserSchema`)
