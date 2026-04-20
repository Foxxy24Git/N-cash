# Settings Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `/settings` page with 3 tabs — Manajemen Bank, Informasi Perusahaan, Ganti Password — using Server Actions and URL-based tab routing.

**Architecture:** Server Component `page.tsx` fetches data and passes as props to a Client Component `SettingsTabs` (shadcn Tabs shell). Each tab's content is a component that uses Server Actions for mutations. Tab state lives in URL `?tab=` param.

**Tech Stack:** Next.js App Router, Server Actions, Prisma/SQLite, shadcn/ui (Tabs, Dialog, Table, Input, Button), bcryptjs, sonner toasts, Next.js file system API for logo uploads.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/app/(dashboard)/settings/page.tsx` | Modify | Server Component — fetch data, render SettingsTabs |
| `src/app/(dashboard)/settings/_components/SettingsTabs.tsx` | Create | Client Component — shadcn Tabs shell |
| `src/app/(dashboard)/settings/_components/BankTab.tsx` | Create | Bank list table with add/edit/delete |
| `src/app/(dashboard)/settings/_components/BankDialog.tsx` | Create | Client Component — add/edit dialog |
| `src/app/(dashboard)/settings/_components/DeleteBankButton.tsx` | Create | Client Component — confirm + delete |
| `src/app/(dashboard)/settings/_components/CompanyTab.tsx` | Create | Client Component — company profile form with logo upload |
| `src/app/(dashboard)/settings/_components/PasswordTab.tsx` | Create | Client Component — change password form |
| `src/app/(dashboard)/settings/_actions/bankActions.ts` | Create | createBank, updateBank, deleteBank |
| `src/app/(dashboard)/settings/_actions/companyActions.ts` | Create | upsertCompany |
| `src/app/(dashboard)/settings/_actions/passwordActions.ts` | Create | changePassword |
| `src/app/api/upload/route.ts` | Create | POST handler — save logo to public/uploads/ |
| `public/uploads/.gitkeep` | Create | Ensure directory exists in git |

---

## Task 1: Setup — Install shadcn Tabs + Create uploads directory

**Files:**
- Create: `public/uploads/.gitkeep`
- Install: `src/components/ui/tabs.tsx` (via shadcn CLI)

- [ ] **Step 1: Install shadcn tabs component**

```bash
cd /Users/user/N-Cash && npx shadcn@latest add tabs --yes
```

Expected output: `✔ Done! The tabs component has been added.`  
Verify: `src/components/ui/tabs.tsx` now exists.

- [ ] **Step 2: Create public/uploads directory**

```bash
mkdir -p /Users/user/N-Cash/public/uploads && touch /Users/user/N-Cash/public/uploads/.gitkeep
```

- [ ] **Step 3: Add uploads contents to .gitignore but keep the directory**

Add to `.gitignore` (append at bottom):
```
# logo uploads — directory tracked via .gitkeep, contents ignored
/public/uploads/*
!/public/uploads/.gitkeep
```

- [ ] **Step 4: Verify tabs component exists**

```bash
ls /Users/user/N-Cash/src/components/ui/tabs.tsx
```

Expected: file exists.

- [ ] **Step 5: Commit**

```bash
cd /Users/user/N-Cash && git add src/components/ui/tabs.tsx public/uploads/.gitkeep .gitignore && git commit -m "chore: add shadcn tabs + public/uploads directory"
```

---

## Task 2: Bank Server Actions

**Files:**
- Create: `src/app/(dashboard)/settings/_actions/bankActions.ts`

- [ ] **Step 1: Create bankActions.ts**

```typescript
'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

type ActionResult = { success: true } | { error: string }

export async function createBank(formData: FormData): Promise<ActionResult> {
  const name = (formData.get('name') as string | null)?.trim()
  if (!name) return { error: 'Nama bank wajib diisi' }

  await prisma.bank.create({
    data: {
      name,
      accountNumber: (formData.get('accountNumber') as string)?.trim() || null,
      accountHolder: (formData.get('accountHolder') as string)?.trim() || null,
    },
  })
  revalidatePath('/settings')
  return { success: true }
}

export async function updateBank(id: string, formData: FormData): Promise<ActionResult> {
  const name = (formData.get('name') as string | null)?.trim()
  if (!name) return { error: 'Nama bank wajib diisi' }

  await prisma.bank.update({
    where: { id },
    data: {
      name,
      accountNumber: (formData.get('accountNumber') as string)?.trim() || null,
      accountHolder: (formData.get('accountHolder') as string)?.trim() || null,
    },
  })
  revalidatePath('/settings')
  return { success: true }
}

export async function deleteBank(id: string): Promise<ActionResult> {
  await prisma.bank.delete({ where: { id } })
  revalidatePath('/settings')
  return { success: true }
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/user/N-Cash && git add src/app/\(dashboard\)/settings/_actions/bankActions.ts && git commit -m "feat(settings): add bank server actions"
```

---

## Task 3: BankDialog Component

**Files:**
- Create: `src/app/(dashboard)/settings/_components/BankDialog.tsx`

- [ ] **Step 1: Create BankDialog.tsx**

```tsx
'use client'

import { useState, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { createBank, updateBank } from '../_actions/bankActions'

interface Bank {
  id: string
  name: string
  accountNumber: string | null
  accountHolder: string | null
}

interface BankDialogProps {
  bank?: Bank
  trigger: React.ReactNode
}

export default function BankDialog({ bank, trigger }: BankDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = bank
        ? await updateBank(bank.id, formData)
        : await createBank(formData)

      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success(bank ? 'Bank berhasil diupdate' : 'Bank berhasil ditambahkan')
        setOpen(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{bank ? 'Edit Bank' : 'Tambah Bank'}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium text-gray-700">
              Nama Bank <span className="text-red-500">*</span>
            </label>
            <Input id="name" name="name" defaultValue={bank?.name ?? ''} required />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="accountNumber" className="text-sm font-medium text-gray-700">
              Nomor Rekening
            </label>
            <Input
              id="accountNumber"
              name="accountNumber"
              defaultValue={bank?.accountNumber ?? ''}
              placeholder="Opsional"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="accountHolder" className="text-sm font-medium text-gray-700">
              Atas Nama
            </label>
            <Input
              id="accountHolder"
              name="accountHolder"
              defaultValue={bank?.accountHolder ?? ''}
              placeholder="Opsional"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/user/N-Cash && git add src/app/\(dashboard\)/settings/_components/BankDialog.tsx && git commit -m "feat(settings): add BankDialog component"
```

---

## Task 4: DeleteBankButton + BankTab

**Files:**
- Create: `src/app/(dashboard)/settings/_components/DeleteBankButton.tsx`
- Create: `src/app/(dashboard)/settings/_components/BankTab.tsx`

- [ ] **Step 1: Create DeleteBankButton.tsx**

```tsx
'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { deleteBank } from '../_actions/bankActions'

export default function DeleteBankButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!window.confirm('Hapus bank ini? Tindakan ini tidak bisa dibatalkan.')) return
    startTransition(async () => {
      const result = await deleteBank(id)
      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success('Bank berhasil dihapus')
      }
    })
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      disabled={isPending}
      className="text-red-600 hover:text-red-700 hover:bg-red-50"
    >
      {isPending ? 'Menghapus...' : 'Hapus'}
    </Button>
  )
}
```

- [ ] **Step 2: Create BankTab.tsx**

```tsx
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import BankDialog from './BankDialog'
import DeleteBankButton from './DeleteBankButton'

interface Bank {
  id: string
  name: string
  accountNumber: string | null
  accountHolder: string | null
}

export default function BankTab({ banks }: { banks: Bank[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium text-gray-900">Daftar Bank Transfer</h2>
        <BankDialog
          trigger={
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Tambah Bank
            </Button>
          }
        />
      </div>

      {banks.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          Belum ada bank terdaftar. Tambah bank untuk digunakan pada transaksi Transfer Bank.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Bank</TableHead>
              <TableHead>No. Rekening</TableHead>
              <TableHead>Atas Nama</TableHead>
              <TableHead className="w-28 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {banks.map((bank) => (
              <TableRow key={bank.id}>
                <TableCell className="font-medium">{bank.name}</TableCell>
                <TableCell className="text-gray-600">{bank.accountNumber ?? '—'}</TableCell>
                <TableCell className="text-gray-600">{bank.accountHolder ?? '—'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <BankDialog
                      bank={bank}
                      trigger={
                        <Button variant="ghost" size="sm">
                          Edit
                        </Button>
                      }
                    />
                    <DeleteBankButton id={bank.id} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/user/N-Cash && git add src/app/\(dashboard\)/settings/_components/DeleteBankButton.tsx src/app/\(dashboard\)/settings/_components/BankTab.tsx && git commit -m "feat(settings): add DeleteBankButton and BankTab"
```

---

## Task 5: Logo Upload API Route

**Files:**
- Create: `src/app/api/upload/route.ts`

- [ ] **Step 1: Create upload route**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2 MB

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'Tidak ada file yang dikirim' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Format tidak didukung. Gunakan JPEG, PNG, atau WebP.' },
      { status: 400 }
    )
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'Ukuran file maksimal 2MB.' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const filename = `logo-${Date.now()}.${ext}`
  const uploadDir = path.join(process.cwd(), 'public', 'uploads')

  await mkdir(uploadDir, { recursive: true })
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(path.join(uploadDir, filename), buffer)

  return NextResponse.json({ url: `/uploads/${filename}` })
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/user/N-Cash && git add src/app/api/upload/route.ts && git commit -m "feat(settings): add logo upload API route"
```

---

## Task 6: Company Server Action + CompanyTab

**Files:**
- Create: `src/app/(dashboard)/settings/_actions/companyActions.ts`
- Create: `src/app/(dashboard)/settings/_components/CompanyTab.tsx`

- [ ] **Step 1: Create companyActions.ts**

```typescript
'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

interface CompanyData {
  name: string
  address: string
  phone: string
  logoUrl: string | null
}

type ActionResult = { success: true } | { error: string }

export async function upsertCompany(data: CompanyData): Promise<ActionResult> {
  const name = data.name.trim()
  const address = data.address.trim()
  if (!name) return { error: 'Nama perusahaan wajib diisi' }
  if (!address) return { error: 'Alamat wajib diisi' }

  const existing = await prisma.companyProfile.findFirst()
  if (existing) {
    await prisma.companyProfile.update({
      where: { id: existing.id },
      data: { name, address, phone: data.phone.trim() || null, logoUrl: data.logoUrl },
    })
  } else {
    await prisma.companyProfile.create({
      data: { name, address, phone: data.phone.trim() || null, logoUrl: data.logoUrl },
    })
  }

  revalidatePath('/settings')
  return { success: true }
}
```

- [ ] **Step 2: Create CompanyTab.tsx**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import Image from 'next/image'
import { upsertCompany } from '../_actions/companyActions'

interface CompanyProfile {
  name: string
  address: string
  phone: string | null
  logoUrl: string | null
}

export default function CompanyTab({ profile }: { profile: CompanyProfile | null }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(profile?.logoUrl ?? null)
  const [uploading, setUploading] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal upload')
      setLogoUrl(data.url)
      toast.success('Logo berhasil diupload')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal upload logo')
    } finally {
      setUploading(false)
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await upsertCompany({
        name: fd.get('name') as string,
        address: fd.get('address') as string,
        phone: fd.get('phone') as string,
        logoUrl,
      })
      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success('Informasi perusahaan berhasil disimpan')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      <div className="space-y-1.5">
        <label htmlFor="name" className="text-sm font-medium text-gray-700">
          Nama Perusahaan <span className="text-red-500">*</span>
        </label>
        <Input id="name" name="name" defaultValue={profile?.name ?? ''} required />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="address" className="text-sm font-medium text-gray-700">
          Alamat <span className="text-red-500">*</span>
        </label>
        <textarea
          id="address"
          name="address"
          rows={3}
          defaultValue={profile?.address ?? ''}
          required
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="phone" className="text-sm font-medium text-gray-700">
          No. Telepon
        </label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={profile?.phone ?? ''}
          placeholder="Opsional"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700">Logo Perusahaan</label>
        {logoUrl && (
          <div className="mb-2 p-2 border border-gray-200 rounded-lg inline-block">
            <Image
              src={logoUrl}
              alt="Logo perusahaan"
              width={120}
              height={60}
              className="object-contain"
            />
          </div>
        )}
        <Input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleLogoChange}
          disabled={uploading}
          className="cursor-pointer"
        />
        <p className="text-xs text-gray-400">
          {uploading ? 'Mengupload...' : 'JPEG, PNG, atau WebP. Maks 2MB.'}
        </p>
      </div>

      <Button type="submit" disabled={isPending || uploading}>
        {isPending ? 'Menyimpan...' : 'Simpan'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/user/N-Cash && git add src/app/\(dashboard\)/settings/_actions/companyActions.ts src/app/\(dashboard\)/settings/_components/CompanyTab.tsx && git commit -m "feat(settings): add company actions and CompanyTab"
```

---

## Task 7: Password Server Action + PasswordTab

**Files:**
- Create: `src/app/(dashboard)/settings/_actions/passwordActions.ts`
- Create: `src/app/(dashboard)/settings/_components/PasswordTab.tsx`

- [ ] **Step 1: Create passwordActions.ts**

Note: `session.user.name` holds the username (set in `authorize()` as `{ id: user.id, name: user.username }`). `signOut({ redirectTo: '/login' })` throws a redirect — this is normal Next.js behavior and should not be caught.

```typescript
'use server'

import { prisma } from '@/lib/prisma'
import { auth, signOut } from '@/auth'
import bcrypt from 'bcryptjs'

type ActionResult = { error: string }

export async function changePassword(formData: FormData): Promise<ActionResult | never> {
  const session = await auth()
  if (!session?.user?.name) return { error: 'Tidak terautentikasi' }

  const oldPassword = formData.get('oldPassword') as string
  const newPassword = formData.get('newPassword') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!oldPassword || !newPassword || !confirmPassword) {
    return { error: 'Semua field wajib diisi' }
  }
  if (newPassword.length < 8) {
    return { error: 'Password baru minimal 8 karakter' }
  }
  if (newPassword !== confirmPassword) {
    return { error: 'Konfirmasi password tidak cocok' }
  }

  const user = await prisma.user.findUnique({ where: { username: session.user.name } })
  if (!user) return { error: 'User tidak ditemukan' }

  const match = await bcrypt.compare(oldPassword, user.password)
  if (!match) return { error: 'Password lama tidak cocok' }

  const hashed = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } })

  await signOut({ redirectTo: '/login' })
}
```

- [ ] **Step 2: Create PasswordTab.tsx**

```tsx
'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { changePassword } from '../_actions/passwordActions'

export default function PasswordTab() {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await changePassword(formData)
      // signOut redirects automatically on success — result only returned on error
      if (result && 'error' in result) {
        toast.error(result.error)
      }
    })
  }

  return (
    <form action={handleSubmit} className="space-y-5 max-w-sm">
      <div className="space-y-1.5">
        <label htmlFor="oldPassword" className="text-sm font-medium text-gray-700">
          Password Lama
        </label>
        <Input id="oldPassword" name="oldPassword" type="password" required />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
          Password Baru <span className="text-xs text-gray-400">(min. 8 karakter)</span>
        </label>
        <Input id="newPassword" name="newPassword" type="password" required minLength={8} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
          Konfirmasi Password Baru
        </label>
        <Input id="confirmPassword" name="confirmPassword" type="password" required />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Menyimpan...' : 'Simpan Password'}
      </Button>

      <p className="text-xs text-gray-400">
        Setelah berhasil, Anda akan otomatis logout dan perlu login ulang.
      </p>
    </form>
  )
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/user/N-Cash && git add src/app/\(dashboard\)/settings/_actions/passwordActions.ts src/app/\(dashboard\)/settings/_components/PasswordTab.tsx && git commit -m "feat(settings): add password actions and PasswordTab"
```

---

## Task 8: SettingsTabs + Wire Up Settings Page

**Files:**
- Create: `src/app/(dashboard)/settings/_components/SettingsTabs.tsx`
- Modify: `src/app/(dashboard)/settings/page.tsx`

- [ ] **Step 1: Create SettingsTabs.tsx**

```tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import BankTab from './BankTab'
import CompanyTab from './CompanyTab'
import PasswordTab from './PasswordTab'

interface Bank {
  id: string
  name: string
  accountNumber: string | null
  accountHolder: string | null
}

interface CompanyProfile {
  name: string
  address: string
  phone: string | null
  logoUrl: string | null
}

interface SettingsTabsProps {
  banks: Bank[]
  profile: CompanyProfile | null
}

export default function SettingsTabs({ banks, profile }: SettingsTabsProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tab = searchParams.get('tab') ?? 'banks'

  function handleTabChange(value: string) {
    router.push(`/settings?tab=${value}`)
  }

  return (
    <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="banks">🏦 Manajemen Bank</TabsTrigger>
        <TabsTrigger value="company">🏢 Info Perusahaan</TabsTrigger>
        <TabsTrigger value="password">🔐 Ganti Password</TabsTrigger>
      </TabsList>

      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
        <TabsContent value="banks">
          <BankTab banks={banks} />
        </TabsContent>
        <TabsContent value="company">
          <CompanyTab profile={profile} />
        </TabsContent>
        <TabsContent value="password">
          <PasswordTab />
        </TabsContent>
      </div>
    </Tabs>
  )
}
```

- [ ] **Step 2: Replace settings/page.tsx**

```tsx
import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import SettingsTabs from './_components/SettingsTabs'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Setting — N-Cash' }

export default async function SettingsPage() {
  const [banks, profile] = await Promise.all([
    prisma.bank.findMany({ orderBy: { name: 'asc' } }),
    prisma.companyProfile.findFirst(),
  ])

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <h1 className="text-xl font-semibold text-gray-900">Pengaturan</h1>
      <Suspense fallback={<div className="h-32 bg-white rounded-xl border border-gray-200 animate-pulse" />}>
        <SettingsTabs banks={banks} profile={profile} />
      </Suspense>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/user/N-Cash && git add src/app/\(dashboard\)/settings/_components/SettingsTabs.tsx src/app/\(dashboard\)/settings/page.tsx && git commit -m "feat(settings): wire up SettingsTabs and settings page"
```

---

## Task 9: Manual Verification

- [ ] **Step 1: Start dev server**

```bash
cd /Users/user/N-Cash && npm run dev
```

Open: `http://localhost:3000/settings`

- [ ] **Step 2: Test Tab 1 — Manajemen Bank**

1. Default tab is "Manajemen Bank" — should show empty state message
2. Click `+ Tambah Bank` → dialog opens
3. Submit without Nama Bank → toast error "Nama bank wajib diisi"
4. Fill in Nama Bank = "BRI", No. Rekening = "1234567", Atas Nama = "Toko ABC" → click Simpan
5. Bank appears in table ✓
6. Go to `/transactions/new` → dropdown "Pilihan Bank" should now show "BRI" ✓ (sync test)
7. Back to `/settings` → Edit BRI → change name to "Bank BRI" → Simpan ✓
8. Delete Bank BRI → confirm dialog → row disappears ✓

- [ ] **Step 3: Test Tab 2 — Informasi Perusahaan**

1. Click tab "Info Perusahaan"
2. Fill: Nama = "Toko Bangunan ABC", Alamat = "Jl. Merdeka No. 1", Telepon = "08123456789"
3. Click Simpan → toast "Informasi perusahaan berhasil disimpan" ✓
4. Refresh page → data still populated ✓
5. Upload logo: choose a JPG/PNG file < 2MB → "Logo berhasil diupload" → preview appears ✓
6. Verify file exists: `ls /Users/user/N-Cash/public/uploads/` ✓
7. Test export Excel in Reports → header should show company name/address ✓

- [ ] **Step 4: Test Tab 3 — Ganti Password**

1. Click tab "Ganti Password"
2. Enter wrong old password → toast "Password lama tidak cocok" ✓
3. Enter new password < 8 chars → toast "Password baru minimal 8 karakter" ✓
4. Enter mismatched confirm → toast "Konfirmasi password tidak cocok" ✓
5. Enter correct old password `admin123`, new password `newpass99`, confirm `newpass99` → redirected to `/login` ✓
6. Login with `newpass99` → success ✓

- [ ] **Step 5: Final commit (if any fixes needed)**

```bash
cd /Users/user/N-Cash && git add -p && git commit -m "fix(settings): address issues found during verification"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Tab 1 Bank: list, add, edit, delete, sync to NewTransactionForm
- ✅ Tab 2 Company: name, address, phone, logo upload → appears in Excel header
- ✅ Tab 3 Password: old/new/confirm validation, force logout on success
- ✅ RULE-D1: Bank sync via shared `prisma.bank.findMany` query
- ✅ RULE-D2: Company data used in Excel export (already implemented in `/api/reports/export`)
- ✅ RULE-D3: All data saved to DB (no localStorage)
- ✅ RULE-D4: Protected route (handled by NextAuth middleware in `auth.config.ts`)

**Note on Excel integration (RULE-D2):** The existing `/api/reports/export/route.ts` must already fetch `CompanyProfile` for the header. If it doesn't, add `prisma.companyProfile.findFirst()` to that route and use `profile.name`/`profile.address`/`profile.logoUrl` in the Excel header. Verify this during Task 9 Step 3.
