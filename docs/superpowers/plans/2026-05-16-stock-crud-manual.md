# Stock CRUD Manual (Add/Edit/Delete Product) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Add, Edit, and Delete (soft-delete) product dialogs on the /stock page with server actions, a custom Combobox for free-text unit entry, currency inputs, sell-price warning, and Sonner toast notifications.

**Architecture:** Client components (Dialog/AlertDialog) call Next.js server actions that mutate Prisma and revalidate `/stock`. A single `ProductFormDialog` handles both Add (mode="add") and Edit (mode="edit") — it manages its own open state and renders its own trigger button. `DeleteProductDialog` wraps `AlertDialog` with soft-delete. `StockCrudButtons` composes both dialogs into a per-row action cell. The Combobox is a lightweight custom component (div + absolute dropdown) using no new Radix primitive.

**Tech Stack:** Next.js 14 App Router, TypeScript, Prisma (SQLite), shadcn/ui (Dialog, AlertDialog, Button, Input), Sonner (toast), Tailwind CSS.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/app/(dashboard)/stock/_actions/productActions.ts` | `createProduct`, `updateProduct`, `deleteProduct` server actions |
| Create | `src/components/ui/combobox.tsx` | Reusable Combobox with suggestions + free-text input |
| Create | `src/app/(dashboard)/stock/_components/ProductFormDialog.tsx` | Add/Edit product form inside a Dialog |
| Create | `src/app/(dashboard)/stock/_components/DeleteProductDialog.tsx` | Soft-delete AlertDialog confirmation |
| Create | `src/app/(dashboard)/stock/_components/StockCrudButtons.tsx` | Per-row wrapper: Edit + Delete buttons |
| Modify | `src/app/(dashboard)/stock/page.tsx` | Replace disabled "+ Tambah Barang" button; add `notes` to Prisma select + ProductRow |
| Modify | `src/app/(dashboard)/stock/_components/StockTable.tsx` | Add `notes` to `ProductRow` interface; replace disabled row actions with `<StockCrudButtons>` |

---

### Task 1: Server Actions

**Files:**
- Create: `src/app/(dashboard)/stock/_actions/productActions.ts`

- [ ] **Step 1: Create the file**

```ts
'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

type ActionResult = { success: true } | { error: string }

function parseCurrency(val: FormDataEntryValue | null): number {
  return parseInt(String(val ?? '').replace(/\D/g, ''), 10) || 0
}

export async function createProduct(formData: FormData): Promise<ActionResult> {
  const name = (formData.get('name') as string | null)?.trim()
  const unit = (formData.get('unit') as string | null)?.trim()
  if (!name) return { error: 'Nama barang wajib diisi' }
  if (!unit) return { error: 'Satuan wajib diisi' }

  const buyPrice     = parseCurrency(formData.get('buyPrice'))
  const sellingPrice = parseCurrency(formData.get('sellingPrice'))
  const stock        = Math.max(0, parseInt(String(formData.get('stock') ?? '0'), 10) || 0)
  const minStock     = Math.max(0, parseInt(String(formData.get('minStock') ?? '0'), 10) || 0)
  const notes        = (formData.get('notes') as string | null)?.trim() || null

  if (buyPrice <= 0)     return { error: 'Harga beli wajib diisi' }
  if (sellingPrice <= 0) return { error: 'Harga jual wajib diisi' }

  try {
    await prisma.product.create({
      data: { name, unit, buyPrice, sellingPrice, stock, minStock, notes, isActive: true },
    })
  } catch {
    return { error: 'Gagal menyimpan barang. Coba lagi.' }
  }

  revalidatePath('/stock')
  return { success: true }
}

export async function updateProduct(id: string, formData: FormData): Promise<ActionResult> {
  const name = (formData.get('name') as string | null)?.trim()
  const unit = (formData.get('unit') as string | null)?.trim()
  if (!name) return { error: 'Nama barang wajib diisi' }
  if (!unit) return { error: 'Satuan wajib diisi' }

  const buyPrice     = parseCurrency(formData.get('buyPrice'))
  const sellingPrice = parseCurrency(formData.get('sellingPrice'))
  const stock        = Math.max(0, parseInt(String(formData.get('stock') ?? '0'), 10) || 0)
  const minStock     = Math.max(0, parseInt(String(formData.get('minStock') ?? '0'), 10) || 0)
  const notes        = (formData.get('notes') as string | null)?.trim() || null

  if (buyPrice <= 0)     return { error: 'Harga beli wajib diisi' }
  if (sellingPrice <= 0) return { error: 'Harga jual wajib diisi' }

  try {
    await prisma.product.update({
      where: { id },
      data: { name, unit, buyPrice, sellingPrice, stock, minStock, notes },
    })
  } catch {
    return { error: 'Gagal mengupdate barang. Coba lagi.' }
  }

  revalidatePath('/stock')
  return { success: true }
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  try {
    await prisma.product.update({ where: { id }, data: { isActive: false } })
  } catch {
    return { error: 'Gagal menghapus barang. Coba lagi.' }
  }

  revalidatePath('/stock')
  return { success: true }
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/(dashboard)/stock/_actions/productActions.ts"
git commit -m "feat(stock): add createProduct, updateProduct, deleteProduct server actions"
```

---

### Task 2: Combobox Component

**Files:**
- Create: `src/components/ui/combobox.tsx`

Approach: plain `div` with absolute-positioned dropdown — no Radix PopoverAnchor needed (it's not exported from the existing `popover.tsx`).

- [ ] **Step 1: Create the file**

```tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface ComboboxProps {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
  className?: string
}

export function Combobox({ value, onChange, options, placeholder, className }: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered =
    value.trim() === ''
      ? options
      : options.filter((o) => o.toLowerCase().includes(value.toLowerCase()))

  useEffect(() => {
    if (!open) return
    function handleMouseDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [open])

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute top-full left-0 right-0 mt-1 z-50 max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md p-1">
          {filtered.map((opt) => (
            <li key={opt}>
              <button
                type="button"
                className={cn(
                  'w-full text-left px-3 py-1.5 text-sm rounded hover:bg-accent hover:text-accent-foreground',
                  value === opt && 'bg-accent text-accent-foreground font-medium',
                )}
                onMouseDown={(e) => {
                  e.preventDefault()
                  onChange(opt)
                  setOpen(false)
                }}
              >
                {opt}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/combobox.tsx
git commit -m "feat(ui): add Combobox component with free-text and suggestions"
```

---

### Task 3: ProductFormDialog

**Files:**
- Create: `src/app/(dashboard)/stock/_components/ProductFormDialog.tsx`

Notes:
- Uses `onSubmit` (not `form action`) because it's a client component with controlled state.
- Currency inputs: user types raw digits, `onSubmit` strips non-digits via FormData injection.
- Sell-price warning is a non-blocking yellow banner when `sellingPrice < buyPrice`.
- `useEffect` resets controlled fields when `open` changes (so re-opening Edit re-populates fresh values).

- [ ] **Step 1: Create the file**

```tsx
'use client'

import { useState, useTransition, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/ui/combobox'
import { createProduct, updateProduct } from '../_actions/productActions'
import type { ProductRow } from './StockTable'

const UNIT_OPTIONS = [
  'SAK', 'PCS', 'BATANG', 'LEMBAR', 'METER',
  'KG', 'LITER', 'ROLL', 'SET', 'KARDUS', 'PASANG', 'UNIT', 'BOX',
]

type Props =
  | { mode: 'add'; product?: undefined }
  | { mode: 'edit'; product: ProductRow }

export function ProductFormDialog({ mode, product }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [unit, setUnit]               = useState('')
  const [buyPrice, setBuyPrice]       = useState('')
  const [sellingPrice, setSellingPrice] = useState('')
  const [error, setError]             = useState<string | null>(null)

  const buyNum  = parseInt(buyPrice, 10)   || 0
  const sellNum = parseInt(sellingPrice, 10) || 0
  const priceWarning = buyNum > 0 && sellNum > 0 && sellNum < buyNum

  useEffect(() => {
    if (!open) return
    setUnit(product?.unit ?? '')
    setBuyPrice(product ? String(product.buyPrice) : '')
    setSellingPrice(product ? String(product.sellingPrice) : '')
    setError(null)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('unit', unit)
    formData.set('buyPrice', buyPrice)
    formData.set('sellingPrice', sellingPrice)
    setError(null)

    startTransition(async () => {
      const result =
        mode === 'edit' && product
          ? await updateProduct(product.id, formData)
          : await createProduct(formData)

      if ('error' in result) {
        setError(result.error)
      } else {
        toast.success(
          mode === 'edit' ? 'Barang berhasil diupdate' : 'Barang berhasil ditambahkan',
        )
        setOpen(false)
      }
    })
  }

  const trigger =
    mode === 'add' ? (
      <Button className="h-9 px-3 text-sm font-medium">+ Tambah Barang</Button>
    ) : (
      <button className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
        ✏️ Edit
      </button>
    )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Tambah Barang' : 'Edit Barang'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Nama Barang */}
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Nama Barang <span className="text-red-500">*</span>
            </label>
            <Input
              name="name"
              defaultValue={product?.name}
              placeholder="Contoh: Semen Gresik 40kg"
              required
            />
          </div>

          {/* Satuan */}
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Satuan <span className="text-red-500">*</span>
            </label>
            <Combobox
              value={unit}
              onChange={setUnit}
              options={UNIT_OPTIONS}
              placeholder="Pilih atau ketik satuan..."
            />
          </div>

          {/* Harga Beli & Jual */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Harga Beli <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
                  Rp
                </span>
                <Input
                  className="pl-8"
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value.replace(/\D/g, ''))}
                  placeholder="0"
                  inputMode="numeric"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Harga Jual <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
                  Rp
                </span>
                <Input
                  className="pl-8"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value.replace(/\D/g, ''))}
                  placeholder="0"
                  inputMode="numeric"
                />
              </div>
            </div>
          </div>

          {priceWarning && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              ⚠️ Harga jual lebih kecil dari harga beli — barang akan dijual rugi.
            </p>
          )}

          {/* Stok Awal & Stok Min */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Stok Awal <span className="text-red-500">*</span>
              </label>
              <Input
                name="stock"
                type="number"
                min={0}
                defaultValue={product?.stock ?? 0}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Stok Minimum</label>
              <Input
                name="minStock"
                type="number"
                min={0}
                defaultValue={product?.minStock ?? 0}
              />
            </div>
          </div>

          {/* Keterangan */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Keterangan</label>
            <textarea
              name="notes"
              defaultValue={product?.notes ?? ''}
              rows={2}
              placeholder="Opsional"
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
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
git add "src/app/(dashboard)/stock/_components/ProductFormDialog.tsx"
git commit -m "feat(stock): add ProductFormDialog for add/edit product"
```

---

### Task 4: DeleteProductDialog

**Files:**
- Create: `src/app/(dashboard)/stock/_components/DeleteProductDialog.tsx`

- [ ] **Step 1: Create the file**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { deleteProduct } from '../_actions/productActions'

interface Props {
  id: string
  name: string
}

export function DeleteProductDialog({ id, name }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteProduct(id)
      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success('Barang berhasil disembunyikan dari daftar')
        setOpen(false)
      }
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <button className="px-2 py-1 text-xs rounded border border-gray-200 text-red-500 hover:bg-red-50 transition-colors">
          🗑️ Hapus
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sembunyikan Barang?</AlertDialogTitle>
          <AlertDialogDescription>
            Barang <strong className="text-foreground">{name}</strong> akan
            disembunyikan dari daftar. Data transaksi historis tetap tersimpan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-600"
          >
            {isPending ? 'Menghapus...' : 'Ya, Sembunyikan'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/(dashboard)/stock/_components/DeleteProductDialog.tsx"
git commit -m "feat(stock): add DeleteProductDialog with soft-delete confirmation"
```

---

### Task 5: StockCrudButtons

**Files:**
- Create: `src/app/(dashboard)/stock/_components/StockCrudButtons.tsx`

Note: `✏️ Stok` button stays disabled (Edit Stok Cepat is a separate future task per PRD 3.5.2).

- [ ] **Step 1: Create the file**

```tsx
'use client'

import { ProductFormDialog } from './ProductFormDialog'
import { DeleteProductDialog } from './DeleteProductDialog'
import type { ProductRow } from './StockTable'

interface Props {
  row: ProductRow
}

export function StockCrudButtons({ row }: Props) {
  return (
    <div className="flex items-center justify-center gap-1">
      <button
        disabled
        className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-400 cursor-not-allowed"
      >
        ✏️ Stok
      </button>
      <ProductFormDialog mode="edit" product={row} />
      <DeleteProductDialog id={row.id} name={row.name} />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/(dashboard)/stock/_components/StockCrudButtons.tsx"
git commit -m "feat(stock): add StockCrudButtons per-row action wrapper"
```

---

### Task 6: Wire Up StockTable and page.tsx

**Files:**
- Modify: `src/app/(dashboard)/stock/_components/StockTable.tsx`
- Modify: `src/app/(dashboard)/stock/page.tsx`

#### 6a — Update StockTable.tsx

- [ ] **Step 1: Add `notes` to `ProductRow` and replace disabled row actions**

Change the `ProductRow` interface to add `notes`:

```ts
export interface ProductRow {
  id: string
  name: string
  unit: string
  buyPrice: number
  sellingPrice: number
  margin: string
  stock: number
  minStock: number
  stockStatus: 'normal' | 'low' | 'out'
  notes: string | null
}
```

Add import at top of file:

```tsx
import { StockCrudButtons } from './StockCrudButtons'
```

Replace the disabled action cell:

```tsx
// BEFORE:
<TableCell className="text-center">
  <div className="flex items-center justify-center gap-1">
    <button disabled className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-400 cursor-not-allowed">
      ✏️ Stok
    </button>
    <button disabled className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-400 cursor-not-allowed">
      ✏️ Edit
    </button>
    <button disabled className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-400 cursor-not-allowed">
      🗑️ Hapus
    </button>
  </div>
</TableCell>

// AFTER:
<TableCell className="text-center">
  <StockCrudButtons row={row} />
</TableCell>
```

#### 6b — Update page.tsx

- [ ] **Step 2: Add `notes` to Prisma select and ProductRow mapping**

In `prisma.product.findMany` select block, add:

```ts
notes: true,
```

In the `withComputed` `.map()` return, add:

```ts
notes: p.notes,
```

- [ ] **Step 3: Replace disabled "+ Tambah Barang" button with `<ProductFormDialog mode="add" />`**

Add import:

```tsx
import { ProductFormDialog } from './_components/ProductFormDialog'
```

Replace:

```tsx
// BEFORE:
<button
  disabled
  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-400 cursor-not-allowed"
>
  + Tambah Barang
</button>

// AFTER:
<ProductFormDialog mode="add" />
```

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/stock/_components/StockTable.tsx" "src/app/(dashboard)/stock/page.tsx"
git commit -m "feat(stock): wire up CRUD dialogs to /stock table and header"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** All PRD 3.5.3 fields covered (Nama, Satuan combobox, Harga Beli, Harga Jual, Stok Awal, Stok Min, Keterangan). PRD 3.5.4 Edit pre-filled. PRD 3.5.5 soft-delete with AlertDialog confirmation message matching spec.
- [x] **No placeholders:** All code blocks are complete.
- [x] **Type consistency:** `ProductRow` with `notes: string | null` is defined in StockTable.tsx and used consistently in ProductFormDialog and StockCrudButtons.
- [x] **Sell-price warning:** Non-blocking (submit still works), shown as amber banner.
- [x] **Soft-delete:** `deleteProduct` sets `isActive: false`, does not delete DB record.
- [x] **Toast:** `sonner` toast on success in both FormDialog and DeleteDialog.
- [x] **revalidatePath('/stock'):** All three server actions call it.
