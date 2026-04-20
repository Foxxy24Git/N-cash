# Save Transaction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simpan data dari form Tambah Transaksi ke database SQLite via server action, dengan validasi Zod, toast Sonner, dan reset form setelah sukses.

**Architecture:** Server action `createTransaction` memvalidasi payload dengan Zod (termasuk cek duplikat invoice number case-insensitive), lalu simpan `Invoice` + `InvoiceItem` dalam satu `prisma.invoice.create`. Client form memanggil action, handle loading state, tampilkan toast sukses/error, dan reset semua state field.

**Tech Stack:** Next.js 14 Server Actions, Zod, Prisma (SQLite), Sonner (via shadcn/ui)

---

## File Map

| File | Action | Tanggung jawab |
|---|---|---|
| `src/components/ui/sonner.tsx` | Create (via shadcn CLI) | Sonner Toaster component |
| `src/app/(dashboard)/layout.tsx` | Modify | Tambah `<Toaster />` |
| `src/app/(dashboard)/transactions/new/_actions/createTransaction.ts` | Create | Server action + Zod validation + Prisma write |
| `src/app/(dashboard)/transactions/new/_components/NewTransactionForm.tsx` | Modify | Wire submit, loading state, toast, form reset |

---

## Task 1: Install Sonner dan tambah Toaster ke layout

**Files:**
- Create: `src/components/ui/sonner.tsx` (auto-generated oleh shadcn CLI)
- Modify: `src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Install Sonner via shadcn CLI**

```bash
cd /Users/user/N-Cash
npx shadcn@latest add sonner --yes
```

Expected output: `✔ Done. You can now use the sonner component.` dan file `src/components/ui/sonner.tsx` terbuat.

- [ ] **Step 2: Tambah `<Toaster />` ke dashboard layout**

Buka `src/app/(dashboard)/layout.tsx`. Tambah import dan komponen:

```tsx
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Sidebar from './_components/Sidebar'
import Header from './_components/Header'
import BottomNav from './_components/BottomNav'
import { Toaster } from '@/components/ui/sonner'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const company = await prisma.companyProfile.findFirst()
  const companyName = company?.name ?? 'N-Cash'

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col min-h-screen md:ml-60">
        <Header companyName={companyName} />
        <main className="flex-1 p-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>
      <BottomNav />
      <Toaster position="top-center" richColors />
    </div>
  )
}
```

- [ ] **Step 3: Verifikasi dev server tidak error**

```bash
cd /Users/user/N-Cash
npm run dev
```

Buka `http://localhost:3000/dashboard` — tidak ada error di console.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/sonner.tsx src/app/(dashboard)/layout.tsx
git commit -m "feat: install sonner and add Toaster to dashboard layout"
```

---

## Task 2: Buat server action `createTransaction`

**Files:**
- Create: `src/app/(dashboard)/transactions/new/_actions/createTransaction.ts`

- [ ] **Step 1: Buat file server action**

Buat file `src/app/(dashboard)/transactions/new/_actions/createTransaction.ts` dengan isi:

```ts
'use server'

import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const PAYMENT_METHODS = ['Cash', 'Cash COD', 'QRIS', 'Transfer Bank', 'BON'] as const

const itemSchema = z.object({
  itemName: z.string().min(1, 'Nama barang wajib diisi'),
  qty: z.number().positive('Qty harus lebih dari 0'),
  unitPrice: z.number().min(0),
  subtotal: z.number().min(0),
})

const schema = z
  .object({
    invoiceNumber: z.string().min(1, 'Nomor faktur wajib diisi'),
    date: z.string().min(1, 'Tanggal wajib diisi'),
    paymentMethod: z.enum(PAYMENT_METHODS),
    bankId: z.string().optional(),
    items: z.array(itemSchema).min(1, 'Minimal 1 barang harus diisi'),
  })
  .refine(
    (data) => data.paymentMethod !== 'Transfer Bank' || !!data.bankId,
    { message: 'Pilih bank untuk metode Transfer Bank', path: ['bankId'] }
  )

type Result = { success: true } | { success: false; error: string }

export async function createTransaction(payload: unknown): Promise<Result> {
  const parsed = schema.safeParse(payload)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const { invoiceNumber, date, paymentMethod, bankId, items } = parsed.data

  const existing = await prisma.invoice.findFirst({
    where: { invoiceNumber: { equals: invoiceNumber, mode: 'insensitive' }, deletedAt: null },
  })
  if (existing) {
    return { success: false, error: 'Nomor faktur sudah digunakan' }
  }

  const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0)

  try {
    await prisma.invoice.create({
      data: {
        invoiceNumber,
        date: new Date(date),
        totalAmount,
        paymentMethod,
        bankId: paymentMethod === 'Transfer Bank' ? bankId : null,
        items: {
          create: items.map((item) => ({
            itemName: item.itemName,
            quantity: item.qty,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
          })),
        },
      },
    })

    return { success: true }
  } catch {
    return { success: false, error: 'Terjadi kesalahan, coba lagi' }
  }
}
```

- [ ] **Step 2: Pastikan Zod tersedia**

Cek apakah Zod sudah terinstall:

```bash
ls /Users/user/N-Cash/node_modules/zod 2>/dev/null && echo "OK" || echo "MISSING"
```

Jika output `MISSING`, install dulu:

```bash
cd /Users/user/N-Cash
npm install zod
```

- [ ] **Step 3: Verifikasi TypeScript tidak error**

```bash
cd /Users/user/N-Cash
npx tsc --noEmit
```

Expected: tidak ada error. Jika ada error terkait `mode: 'insensitive'` — ini karena SQLite tidak support `mode` di Prisma. Lihat catatan di bawah.

> **Catatan SQLite:** Prisma SQLite tidak mendukung `mode: 'insensitive'` secara native. Ganti query unique check dengan:
> ```ts
> const existing = await prisma.invoice.findFirst({
>   where: {
>     invoiceNumber: { equals: invoiceNumber },
>     deletedAt: null,
>   },
> })
> // Then check manually:
> // if (existing && existing.invoiceNumber.toLowerCase() === invoiceNumber.toLowerCase())
> ```
> 
> Atau lebih simpel — normalisasi dengan `toLowerCase()` sebelum query:
> ```ts
> const all = await prisma.invoice.findMany({
>   where: { deletedAt: null },
>   select: { invoiceNumber: true },
> })
> const duplicate = all.some(
>   (inv) => inv.invoiceNumber.toLowerCase() === invoiceNumber.toLowerCase()
> )
> if (duplicate) return { success: false, error: 'Nomor faktur sudah digunakan' }
> ```
>
> Gunakan pendekatan ini jika `mode: 'insensitive'` menyebabkan error.

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/transactions/new/_actions/createTransaction.ts
git commit -m "feat(transactions): add createTransaction server action with Zod validation"
```

---

## Task 3: Wire form ke server action

**Files:**
- Modify: `src/app/(dashboard)/transactions/new/_components/NewTransactionForm.tsx`

- [ ] **Step 1: Update `handleSubmit` dan tambah loading state**

Ganti seluruh isi `NewTransactionForm.tsx` dengan versi berikut (semua perubahan ada di bagian `// ─── Main Form` ke bawah, komponen kecil di atas tidak berubah):

```tsx
'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { getBanks } from '../_actions/getBanks'
import { createTransaction } from '../_actions/createTransaction'

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatThousands(value: number): string {
  return value.toLocaleString('id-ID')
}

function parseDigits(raw: string): number {
  const cleaned = raw.replace(/[^0-9]/g, '')
  return cleaned ? parseInt(cleaned, 10) : 0
}

function parseQty(raw: string): number {
  const cleaned = raw.replace(/[^0-9.]/g, '')
  return cleaned ? parseFloat(cleaned) : 0
}

// ─── Payment Method Config ────────────────────────────────────────────────────

type PaymentMethod = 'Cash' | 'Cash COD' | 'QRIS' | 'Transfer Bank' | 'BON'

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'Cash', label: 'Cash' },
  { value: 'Cash COD', label: 'Cash COD' },
  { value: 'QRIS', label: 'QRIS' },
  { value: 'Transfer Bank', label: 'Transfer Bank' },
  { value: 'BON', label: 'BON' },
]

const METHOD_COLORS: Record<PaymentMethod, { base: string; active: string }> = {
  Cash:           { base: 'border-green-200 text-green-700 hover:bg-green-50',  active: 'bg-green-100 border-green-400 text-green-800 font-semibold' },
  'Cash COD':     { base: 'border-green-200 text-green-700 hover:bg-green-50',  active: 'bg-green-100 border-green-400 text-green-800 font-semibold' },
  QRIS:           { base: 'border-blue-200 text-blue-700 hover:bg-blue-50',     active: 'bg-blue-100 border-blue-400 text-blue-800 font-semibold' },
  'Transfer Bank':{ base: 'border-yellow-200 text-yellow-700 hover:bg-yellow-50', active: 'bg-yellow-100 border-yellow-400 text-yellow-800 font-semibold' },
  BON:            { base: 'border-red-200 text-red-700 hover:bg-red-50',        active: 'bg-red-100 border-red-400 text-red-800 font-semibold' },
}

// ─── Currency Input ───────────────────────────────────────────────────────────

function CurrencyInput({
  value,
  onChange,
  className,
}: {
  value: number
  onChange: (value: number) => void
  className?: string
}) {
  const display = value > 0 ? formatThousands(value) : ''

  return (
    <div className={cn('relative flex items-center', className)}>
      <span className="absolute left-2.5 text-xs text-gray-400 pointer-events-none select-none">
        Rp
      </span>
      <input
        type="text"
        inputMode="numeric"
        value={display}
        onChange={(e) => onChange(parseDigits(e.target.value))}
        placeholder="0"
        className="w-full pl-7 pr-2 py-2 text-right text-sm border border-gray-300 rounded-lg
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  )
}

// ─── Item types & helpers ─────────────────────────────────────────────────────

interface Item {
  id: string
  itemName: string
  qty: string
  unitPrice: number
  subtotal: number
  isOverridden: boolean
}

function createItem(): Item {
  return {
    id: crypto.randomUUID(),
    itemName: '',
    qty: '',
    unitPrice: 0,
    subtotal: 0,
    isOverridden: false,
  }
}

function autoSubtotal(qty: string, unitPrice: number): number {
  const q = parseQty(qty)
  return q > 0 && unitPrice > 0 ? Math.round(q * unitPrice) : 0
}

// ─── Item Row ─────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  canDelete,
  onUpdate,
  onDelete,
}: {
  item: Item
  canDelete: boolean
  onUpdate: (id: string, changes: Partial<Item>) => void
  onDelete: (id: string) => void
}) {
  const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const qty = e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')
    const changes: Partial<Item> = { qty }
    if (!item.isOverridden) changes.subtotal = autoSubtotal(qty, item.unitPrice)
    onUpdate(item.id, changes)
  }

  const handleUnitPriceChange = (unitPrice: number) => {
    const changes: Partial<Item> = { unitPrice }
    if (!item.isOverridden) changes.subtotal = autoSubtotal(item.qty, unitPrice)
    onUpdate(item.id, changes)
  }

  const handleSubtotalChange = (subtotal: number) => {
    onUpdate(item.id, { subtotal, isOverridden: true })
  }

  const resetSubtotal = () => {
    onUpdate(item.id, {
      subtotal: autoSubtotal(item.qty, item.unitPrice),
      isOverridden: false,
    })
  }

  return (
    <tr className="border-t border-gray-100 hover:bg-gray-50/50">
      <td className="px-2 py-2">
        <input
          type="text"
          value={item.itemName}
          onChange={(e) => onUpdate(item.id, { itemName: e.target.value })}
          placeholder="Nama barang..."
          className="w-full px-2.5 py-2 text-sm border border-gray-300 rounded-lg
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </td>

      <td className="px-2 py-2">
        <input
          type="text"
          inputMode="decimal"
          value={item.qty}
          onChange={handleQtyChange}
          placeholder="0"
          className="w-full px-2 py-2 text-sm text-center border border-gray-300 rounded-lg
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </td>

      <td className="px-2 py-2">
        <CurrencyInput value={item.unitPrice} onChange={handleUnitPriceChange} />
      </td>

      <td className="px-2 py-2">
        <div className="flex items-center gap-1">
          <CurrencyInput
            value={item.subtotal}
            onChange={handleSubtotalChange}
            className="flex-1"
          />
          {item.isOverridden && (
            <button
              type="button"
              onClick={resetSubtotal}
              title="Reset ke auto-calculate"
              className="shrink-0 p-1.5 rounded-md text-amber-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
            >
              <RotateCcw size={13} />
            </button>
          )}
        </div>
      </td>

      <td className="px-2 py-2 text-center">
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          disabled={!canDelete}
          title="Hapus baris"
          className={cn(
            'p-1.5 rounded-md transition-colors',
            canDelete
              ? 'text-gray-400 hover:text-red-500 hover:bg-red-50'
              : 'text-gray-200 cursor-not-allowed'
          )}
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  )
}

// ─── Main Form ────────────────────────────────────────────────────────────────

type Bank = { id: string; name: string }

export default function NewTransactionForm() {
  const today = new Date().toISOString().slice(0, 10)

  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [date, setDate] = useState(today)
  const [items, setItems] = useState<Item[]>([createItem()])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash')
  const [selectedBankId, setSelectedBankId] = useState('')
  const [banks, setBanks] = useState<Bank[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    getBanks().then(setBanks)
  }, [])

  const updateItem = (id: string, changes: Partial<Item>) =>
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...changes } : item))
    )

  const addItem = () => setItems((prev) => [...prev, createItem()])

  const removeItem = (id: string) =>
    setItems((prev) =>
      prev.length > 1 ? prev.filter((item) => item.id !== id) : prev
    )

  const totalBelanja = items.reduce((sum, item) => sum + item.subtotal, 0)

  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setPaymentMethod(method)
    if (method !== 'Transfer Bank') setSelectedBankId('')
  }

  const resetForm = () => {
    setInvoiceNumber('')
    setDate(today)
    setItems([createItem()])
    setPaymentMethod('Cash')
    setSelectedBankId('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const result = await createTransaction({
      invoiceNumber,
      date,
      paymentMethod,
      bankId: selectedBankId || undefined,
      items: items.map((item) => ({
        itemName: item.itemName,
        qty: parseQty(item.qty),
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
      })),
    })

    setIsSubmitting(false)

    if (result.success) {
      toast.success('Transaksi berhasil disimpan')
      resetForm()
    } else {
      toast.error(result.error)
    }
  }

  const inputBase =
    'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* ── Section 1: Header Faktur ────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">📋 Header Faktur</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nomor Faktur <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Contoh: 0-ABC-001"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className={inputBase}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tanggal <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputBase}
            />
          </div>
        </div>
      </div>

      {/* ── Section 2: Detail Barang ────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">🛒 Detail Barang</h2>

        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full min-w-[580px] text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-2 py-2.5 font-medium text-gray-600 text-xs uppercase tracking-wide rounded-l-lg w-[34%]">
                  Nama Barang
                </th>
                <th className="text-center px-2 py-2.5 font-medium text-gray-600 text-xs uppercase tracking-wide w-[10%]">
                  QTY
                </th>
                <th className="text-right px-2 py-2.5 font-medium text-gray-600 text-xs uppercase tracking-wide w-[24%]">
                  Harga Satuan
                </th>
                <th className="text-right px-2 py-2.5 font-medium text-gray-600 text-xs uppercase tracking-wide w-[24%]">
                  Subtotal
                </th>
                <th className="text-center px-2 py-2.5 font-medium text-gray-600 text-xs uppercase tracking-wide rounded-r-lg w-[8%]">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  canDelete={items.length > 1}
                  onUpdate={updateItem}
                  onDelete={removeItem}
                />
              ))}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={addItem}
          className="mt-4 flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          <Plus size={15} />
          Tambah Barang
        </button>
      </div>

      {/* ── Section 3: Pembayaran ───────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">💳 Pembayaran</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Metode Pembayaran <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_METHODS.map(({ value, label }) => {
              const isActive = paymentMethod === value
              const colors = METHOD_COLORS[value]
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => handlePaymentMethodChange(value)}
                  className={cn(
                    'px-4 py-1.5 rounded-full border text-sm transition-all',
                    isActive ? colors.active : `border-gray-200 text-gray-500 hover:bg-gray-50 ${colors.base}`
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {paymentMethod === 'Transfer Bank' && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pilih Bank <span className="text-red-500">*</span>
            </label>
            {banks.length > 0 ? (
              <select
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className={cn(inputBase, 'bg-white')}
              >
                <option value="">-- Pilih bank --</option>
                {banks.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.name}
                  </option>
                ))}
              </select>
            ) : (
              <select
                disabled
                className={cn(inputBase, 'bg-gray-50 text-gray-400 cursor-not-allowed')}
              >
                <option>Tambahkan bank di Setting</option>
              </select>
            )}
          </div>
        )}

        <div className="mt-6 pt-5 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">TOTAL BELANJA</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {items.length} barang · auto-sum semua subtotal
              </p>
            </div>
            <span className="text-3xl font-bold text-gray-900 font-mono tracking-tight">
              Rp {formatThousands(totalBelanja)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Submit ──────────────────────────────────────────────────────── */}
      <div className="pb-6">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 bg-blue-600 text-white font-semibold rounded-xl
            hover:bg-blue-700 active:bg-blue-800 transition-colors text-base
            disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi'}
        </button>
      </div>

    </form>
  )
}
```

- [ ] **Step 2: Verifikasi TypeScript tidak error**

```bash
cd /Users/user/N-Cash
npx tsc --noEmit
```

Expected: tidak ada error.

- [ ] **Step 3: Test manual di browser**

1. Buka `http://localhost:3000/transactions/new`
2. Isi nomor faktur, tanggal, 2 barang dengan nama/qty/harga
3. Pilih metode pembayaran
4. Klik "Simpan Transaksi"
5. Expected: button berubah jadi "Menyimpan...", lalu toast "✅ Transaksi berhasil disimpan" muncul, form reset

- [ ] **Step 4: Test error cases**

1. Submit form kosong → toast "Nomor faktur wajib diisi"
2. Submit dengan nomor faktur yang sama lagi → toast "Nomor faktur sudah digunakan"
3. Pilih "Transfer Bank" tanpa pilih bank → toast "Pilih bank untuk metode Transfer Bank"

- [ ] **Step 5: Verifikasi data di Prisma Studio**

```bash
cd /Users/user/N-Cash
npx prisma studio
```

Buka `http://localhost:5555`. Periksa tabel `Invoice` dan `InvoiceItem` — data harus masuk dengan benar (invoiceNumber, date, totalAmount, items dengan quantity/unitPrice/subtotal).

- [ ] **Step 6: Commit**

```bash
git add src/app/(dashboard)/transactions/new/_components/NewTransactionForm.tsx
git commit -m "feat(transactions): wire form to createTransaction action with toast and reset"
```
