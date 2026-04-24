# Fase 4: API CRUD User Management — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Buat 4 API endpoints (GET, POST, PATCH, DELETE) untuk manage user, plus update auth untuk cek isActive saat login.

**Architecture:** Flat route files mengikuti pola codebase existing (`src/app/api/`). Zod schemas diekstrak ke `src/lib/schemas/user.ts` agar bisa di-reuse di Fase 5 (UI). Session dari NextAuth JWT dipakai untuk auth check dan self-protection logic.

**Tech Stack:** Next.js 14 App Router, Prisma (SQLite), NextAuth v5, Zod, bcryptjs

---

## File Map

| Action | File | Tanggung Jawab |
|--------|------|----------------|
| Create | `src/lib/schemas/user.ts` | Zod schemas + TypeScript types untuk user input |
| Create | `src/app/api/users/route.ts` | GET (list users) + POST (create user) |
| Create | `src/app/api/users/[id]/route.ts` | PATCH (update user) + DELETE (hapus user) |
| Modify | `src/auth.ts` | Tambah cek `isActive` di authorize callback |

---

## Task 1: Install Zod

**Files:**
- Modify: `package.json` (otomatis oleh npm)

- [ ] **Step 1: Install zod**

```bash
npm install zod
```

Expected output mengandung: `added 1 package` atau `up to date` dengan `zod` muncul di `node_modules`.

- [ ] **Step 2: Verifikasi zod terinstall**

```bash
node -e "const { z } = require('zod'); console.log(z.string().parse('ok'))"
```

Expected output: `ok`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install zod for validation"
```

---

## Task 2: Buat Zod Schemas

**Files:**
- Create: `src/lib/schemas/user.ts`

- [ ] **Step 1: Buat file schema**

Buat file `src/lib/schemas/user.ts` dengan isi:

```ts
import { z } from 'zod'

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
  fullName: z
    .string()
    .min(3, 'Nama lengkap minimal 3 karakter')
    .max(100, 'Nama lengkap maksimal 100 karakter')
    .optional(),
  isActive: z.boolean().optional(),
  newPassword: z.string().min(8, 'Password minimal 8 karakter').optional(),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
```

- [ ] **Step 2: Verifikasi TypeScript compile**

```bash
npx tsc --noEmit
```

Expected: tidak ada error dari file baru.

- [ ] **Step 3: Commit**

```bash
git add src/lib/schemas/user.ts
git commit -m "feat: add zod schemas for user CRUD"
```

---

## Task 3: GET + POST /api/users

**Files:**
- Create: `src/app/api/users/route.ts`

- [ ] **Step 1: Buat file route**

Buat direktori `src/app/api/users/` dan file `route.ts`:

```ts
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createUserSchema } from '@/lib/schemas/user'

const USER_SELECT = {
  id: true,
  username: true,
  fullName: true,
  isActive: true,
  createdAt: true,
} as const

export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const users = await prisma.user.findMany({
    select: USER_SELECT,
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(users)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const result = createUserSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    )
  }

  const { username, fullName, password } = result.data

  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) {
    return NextResponse.json(
      { error: 'Username sudah digunakan' },
      { status: 400 }
    )
  }

  const hashedPassword = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { username, fullName, password: hashedPassword, isActive: true },
    select: USER_SELECT,
  })

  return NextResponse.json(user, { status: 201 })
}
```

- [ ] **Step 2: Verifikasi TypeScript compile**

```bash
npx tsc --noEmit
```

Expected: tidak ada error baru.

- [ ] **Step 3: Jalankan dev server**

```bash
npm run dev
```

- [ ] **Step 4: Test GET /api/users (harus 401 tanpa session)**

```bash
curl -s http://localhost:3000/api/users | jq
```

Expected:
```json
{"error":"Unauthorized"}
```

- [ ] **Step 5: Test POST /api/users — password terlalu pendek (harus 400)**

```bash
curl -s -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","fullName":"Test User","password":"123"}' | jq
```

Expected:
```json
{"error":"Password minimal 8 karakter"}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/users/route.ts
git commit -m "feat: add GET and POST /api/users"
```

---

## Task 4: PATCH + DELETE /api/users/[id]

**Files:**
- Create: `src/app/api/users/[id]/route.ts`

- [ ] **Step 1: Buat file route**

Buat direktori `src/app/api/users/[id]/` dan file `route.ts`:

```ts
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { updateUserSchema } from '@/lib/schemas/user'

const USER_SELECT = {
  id: true,
  username: true,
  fullName: true,
  isActive: true,
  createdAt: true,
} as const

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { id: params.id } })
  if (!user) {
    return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
  }

  const body = await req.json()
  const result = updateUserSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    )
  }

  const { fullName, isActive, newPassword } = result.data

  if (params.id === session.user.id && isActive === false) {
    return NextResponse.json(
      { error: 'Tidak bisa menonaktifkan akun sendiri' },
      { status: 400 }
    )
  }

  const data: { fullName?: string; isActive?: boolean; password?: string } = {}
  if (fullName !== undefined) data.fullName = fullName
  if (isActive !== undefined) data.isActive = isActive
  if (newPassword !== undefined) data.password = await bcrypt.hash(newPassword, 10)

  const updated = await prisma.user.update({
    where: { id: params.id },
    data,
    select: USER_SELECT,
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { id: params.id } })
  if (!user) {
    return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
  }

  if (params.id === session.user.id) {
    return NextResponse.json(
      { error: 'Tidak bisa menghapus akun sendiri' },
      { status: 400 }
    )
  }

  const invoiceCount = await prisma.invoice.count({
    where: { createdById: params.id },
  })
  if (invoiceCount > 0) {
    return NextResponse.json(
      {
        error:
          'User tidak bisa dihapus karena memiliki riwayat transaksi. Nonaktifkan saja (isActive = false).',
      },
      { status: 400 }
    )
  }

  await prisma.user.delete({ where: { id: params.id } })

  return NextResponse.json({ message: 'User berhasil dihapus' })
}
```

- [ ] **Step 2: Verifikasi TypeScript compile**

```bash
npx tsc --noEmit
```

Expected: tidak ada error baru.

- [ ] **Step 3: Test PATCH tanpa session (harus 401)**

```bash
curl -s -X PATCH http://localhost:3000/api/users/nonexistent-id \
  -H "Content-Type: application/json" \
  -d '{"fullName":"New Name"}' | jq
```

Expected:
```json
{"error":"Unauthorized"}
```

- [ ] **Step 4: Test DELETE tanpa session (harus 401)**

```bash
curl -s -X DELETE http://localhost:3000/api/users/nonexistent-id | jq
```

Expected:
```json
{"error":"Unauthorized"}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/users/[id]/route.ts
git commit -m "feat: add PATCH and DELETE /api/users/[id]"
```

---

## Task 5: Update Auth — Cek isActive Saat Login

**Files:**
- Modify: `src/auth.ts`

- [ ] **Step 1: Update authorize callback**

Buka `src/auth.ts`. File saat ini:

```ts
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { authConfig } from './auth.config'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { username: credentials.username as string },
        })
        if (!user) return null

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        )
        if (!passwordMatch) return null

        return { id: user.id, name: user.username }
      },
    }),
  ],
})
```

Ganti seluruh isi dengan:

```ts
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { authConfig } from './auth.config'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { username: credentials.username as string },
        })
        if (!user) return null

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        )
        if (!passwordMatch) return null

        if (!user.isActive) return null

        return { id: user.id, name: user.username }
      },
    }),
  ],
})
```

Perubahan: tambah `if (!user.isActive) return null` setelah password match.

- [ ] **Step 2: Verifikasi TypeScript compile**

```bash
npx tsc --noEmit
```

Expected: tidak ada error.

- [ ] **Step 3: Test — coba login dengan user yang dinonaktifkan**

Nonaktifkan salah satu user via PATCH dulu (gunakan session cookie dari browser):
```bash
# Dari browser yang sudah login, copy cookie `next-auth.session-token`
# lalu jalankan:
curl -s -X PATCH http://localhost:3000/api/users/<ID_USER_LAIN> \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<TOKEN>" \
  -d '{"isActive":false}' | jq
```

Kemudian coba login sebagai user yang sudah dinonaktifkan — harus ditolak.

- [ ] **Step 4: Commit**

```bash
git add src/auth.ts
git commit -m "feat: reject login for inactive users"
```

---

## Task 6: Verifikasi End-to-End dengan Session

**Catatan:** Task ini butuh session aktif. Login dulu via browser di `http://localhost:3000/login`, lalu copy cookie `next-auth.session-token` dari DevTools (Application → Cookies).

Ganti `<TOKEN>` di setiap command dengan nilai cookie tersebut.

- [ ] **Step 1: GET /api/users — list semua user**

```bash
curl -s http://localhost:3000/api/users \
  -H "Cookie: next-auth.session-token=<TOKEN>" | jq
```

Expected: array of users, masing-masing punya `id, username, fullName, isActive, createdAt`. Tidak ada field `password`.

- [ ] **Step 2: POST /api/users — buat user baru**

```bash
curl -s -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<TOKEN>" \
  -d '{"username":"user_test","fullName":"User Testing","password":"password123"}' | jq
```

Expected: object user baru dengan status 201, tidak ada field `password`.

- [ ] **Step 3: POST /api/users — username duplicate**

```bash
curl -s -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<TOKEN>" \
  -d '{"username":"user_test","fullName":"User Lain","password":"password123"}' | jq
```

Expected:
```json
{"error":"Username sudah digunakan"}
```

- [ ] **Step 4: PATCH /api/users/[id] — update fullName user yang baru dibuat**

Ambil `id` dari Step 2, ganti `<USER_ID>`:

```bash
curl -s -X PATCH http://localhost:3000/api/users/<USER_ID> \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<TOKEN>" \
  -d '{"fullName":"User Testing Updated"}' | jq
```

Expected: user dengan `fullName` terupdate.

- [ ] **Step 5: DELETE /api/users/[id] — hapus user yang baru dibuat (belum ada invoice)**

```bash
curl -s -X DELETE http://localhost:3000/api/users/<USER_ID> \
  -H "Cookie: next-auth.session-token=<TOKEN>" | jq
```

Expected:
```json
{"message":"User berhasil dihapus"}
```

- [ ] **Step 6: DELETE /api/users/[admin_id] — hapus admin yang punya invoice (harus gagal)**

Ambil `id` dari user admin (dari GET /api/users):

```bash
curl -s -X DELETE http://localhost:3000/api/users/<ADMIN_ID> \
  -H "Cookie: next-auth.session-token=<TOKEN>" | jq
```

Expected:
```json
{"error":"User tidak bisa dihapus karena memiliki riwayat transaksi. Nonaktifkan saja (isActive = false)."}
```

- [ ] **Step 7: Final TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.
