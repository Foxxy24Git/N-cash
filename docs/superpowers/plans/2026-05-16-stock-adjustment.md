# Stock Adjustment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up the disabled "✏️ Stok" button in the stock table to a full adjustment dialog that updates stock and writes an audit trail.

**Architecture:** Single `StockAdjustmentDialog` client component mirrors the pattern of `ProductFormDialog`. A new `adjustStock` server action runs a Prisma transaction that atomically updates `Product.stock`, inserts `StockAdjustment`, and inserts `StockMovement`. `StockCrudButtons` is updated to use the new dialog.

**Tech Stack:** Next.js 14 App Router, TypeScript, Prisma (SQLite), shadcn/ui (Dialog, Select, Button, Input), sonner (toast), `useTransition` for pending state.

---

## File Map

| Action | File |
|--------|------|
| Modify | `src/app/(dashboard)/stock/_actions/productActions.ts` |
| Create | `src/app/(dashboard)/stock/_components/StockAdjustmentDialog.tsx` |
| Modify | `src/app/(dashboard)/stock/_components/StockCrudButtons.tsx` |

---

### Task 1: Add `adjustStock` server action

**File:** `src/app/(dashboard)/stock/_actions/productActions.ts`

- [ ] **Step 1: Add `adjustStock` to the existing server actions file**

Open `src/app/(dashboard)/stock/_actions/productActions.ts` and append this function at the bottom (after `deleteProduct`):

```ts
export async function adjustStock(
  productId: string,
  newStock: number,
  reason: string,
  notes?: string,
): Promise<ActionResult> {
  if (newStock < 0) return { error: 'Stok tidak boleh negatif' }

  const validReasons = ['STOCK_OPNAME', 'RECEIVE', 'DAMAGE', 'LOST', 'OTHER']
  if (!validReasons.includes(reason)) return { error: 'Alasan tidak valid' }

  let stockBefore: number

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId, isActive: true },
      select: { stock: true },
    })
    if (!product) return { error: 'Barang tidak ditemukan' }
    stockBefore = product.stock

    await prisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id: productId }, data: { stock: newStock } })
      const adjustment = await tx.stockAdjustment.create({
        data: {
          productId,
          oldStock: stockBefore,
          newStock,
          reason,
          notes: notes ?? null,
        },
      })
      await tx.stockMovement.create({
        data: {
          productId,
          type: 'ADJUST',
          quantity: newStock - stockBefore,
          stockBefore,
          stockAfter: newStock,
          referenceId: adjustment.id,
          notes: notes ?? null,
        },
      })
    })
  } catch {
    return { error: 'Gagal menyimpan penyesuaian stok. Coba lagi.' }
  }

  revalidatePath('/stock')
  return { success: true }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/user/N-Cash && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors related to `productActions.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/stock/_actions/productActions.ts
git commit -m "feat(stock): add adjustStock server action with audit trail"
```

---

### Task 2: Create `StockAdjustmentDialog` component

**File:** `src/app/(dashboard)/stock/_components/StockAdjustmentDialog.tsx` (new)

- [ ] **Step 1: Create the component file**

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { adjustStock } from '../_actions/productActions'

const REASONS = [
  { value: 'STOCK_OPNAME', label: 'Stok Opname' },
  { value: 'RECEIVE',      label: 'Terima Barang' },
  { value: 'DAMAGE',       label: 'Barang Rusak' },
  { value: 'LOST',         label: 'Barang Hilang' },
  { value: 'OTHER',        label: 'Koreksi Lain' },
]

interface Props {
  productId: string
  productName: string
  currentStock: number
  unit: string
}

export function StockAdjustmentDialog({ productId, productName, currentStock, unit }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [newStock, setNewStock] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setNewStock(String(currentStock))
    setReason('')
    setNotes('')
    setError(null)
  }, [open, currentStock])

  const newStockNum = parseInt(newStock, 10)
  const delta = !isNaN(newStockNum) ? newStockNum - currentStock : null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isNaN(newStockNum) || newStockNum < 0) {
      setError('Stok baru tidak valid')
      return
    }
    if (!reason) {
      setError('Pilih alasan penyesuaian')
      return
    }
    setError(null)

    startTransition(async () => {
      const result = await adjustStock(productId, newStockNum, reason, notes || undefined)
      if ('error' in result) {
        setError(result.error)
      } else {
        toast.success('Stok berhasil disesuaikan')
        setOpen(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
          ✏️ Stok
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Sesuaikan Stok — {productName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Current stock — readonly */}
          <div className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
            <span className="text-sm text-gray-600">Stok Saat Ini</span>
            <span className="font-semibold font-mono text-gray-900">
              {currentStock} {unit}
            </span>
          </div>

          {/* New stock + delta */}
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Stok Baru <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={0}
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
                className="w-32"
                inputMode="numeric"
              />
              {delta !== null && (
                <span
                  className={`text-sm font-semibold ${
                    delta > 0
                      ? 'text-green-600'
                      : delta < 0
                        ? 'text-red-600'
                        : 'text-gray-400'
                  }`}
                >
                  {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '—'}
                </span>
              )}
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Alasan <span className="text-red-500">*</span>
            </label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih alasan..." />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Catatan</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
              {isPending ? 'Menyimpan...' : 'Simpan Penyesuaian'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/user/N-Cash && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors in `StockAdjustmentDialog.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/stock/_components/StockAdjustmentDialog.tsx
git commit -m "feat(stock): add StockAdjustmentDialog component"
```

---

### Task 3: Wire dialog into `StockCrudButtons`

**File:** `src/app/(dashboard)/stock/_components/StockCrudButtons.tsx`

- [ ] **Step 1: Replace the disabled button with `StockAdjustmentDialog`**

Replace the entire file content with:

```tsx
'use client'

import { ProductFormDialog } from './ProductFormDialog'
import { DeleteProductDialog } from './DeleteProductDialog'
import { StockAdjustmentDialog } from './StockAdjustmentDialog'
import type { ProductRow } from './StockTable'

interface Props {
  row: ProductRow
}

export function StockCrudButtons({ row }: Props) {
  return (
    <div className="flex items-center justify-center gap-1">
      <StockAdjustmentDialog
        productId={row.id}
        productName={row.name}
        currentStock={row.stock}
        unit={row.unit}
      />
      <ProductFormDialog mode="edit" product={row} />
      <DeleteProductDialog id={row.id} name={row.name} />
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/user/N-Cash && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Start dev server and manually verify**

```bash
cd /Users/user/N-Cash && npm run dev
```

Open `http://localhost:3000/stock` and verify:

1. ✏️ Stok button is clickable (no longer greyed out)
2. Dialog opens with correct product name in title
3. "Stok Saat Ini" shows correct value
4. Typing a new stock value shows realtime delta (+X green / -X red / — gray)
5. Submitting without selecting alasan shows inline error
6. Submitting valid data: dialog closes, toast "Stok berhasil disesuaikan" appears, table refreshes with new stock
7. Verify in database: `StockAdjustment` and `StockMovement` records created (use `npx prisma studio`)

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/stock/_components/StockCrudButtons.tsx
git commit -m "feat(stock): wire StockAdjustmentDialog to Stok button"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Tombol ✏️ Stok → dialog (Task 3)
- ✅ Stok saat ini readonly (Task 2, `currentStock` prop display)
- ✅ Stok baru number input min 0 (Task 2)
- ✅ Selisih realtime +X/-X/— (Task 2, `delta` computed value)
- ✅ Alasan dropdown 5 opsi (Task 2, `REASONS` array)
- ✅ Catatan textarea opsional (Task 2)
- ✅ UPDATE Product.stock (Task 1, `adjustStock`)
- ✅ INSERT StockAdjustment (Task 1)
- ✅ INSERT StockMovement type=ADJUST (Task 1)
- ✅ Toast sukses + dialog close (Task 2)
- ✅ revalidatePath('/stock') (Task 1)
- ✅ Stok tidak boleh negatif — server-side guard + client min=0 (Task 1 + Task 2)
- ✅ Atomic transaction (Task 1, `prisma.$transaction`)
