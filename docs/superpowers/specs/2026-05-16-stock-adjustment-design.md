# Stock Adjustment Feature — Design Spec

**Date:** 2026-05-16
**Feature:** Edit Stok Cepat & Penyesuaian Stok (PRD §3.5.2 & §3.5.6)
**Approach:** Single dialog (Pendekatan A)

---

## Overview

Replace the disabled "✏️ Stok" button in the stock table's action column with a working
`StockAdjustmentDialog` component. One dialog covers both quick stock edits and detailed
adjustments, keeping the action column at 3 buttons (Stok, Edit, Hapus).

---

## Components & Files

### New file
`src/app/(dashboard)/stock/_components/StockAdjustmentDialog.tsx`
- Client component
- Props: `productId: string`, `productName: string`, `currentStock: number`, `unit: string`
- Owns open/close state, form state, transition

### Modified files
`src/app/(dashboard)/stock/_actions/productActions.ts`
- Add `adjustStock()` server action

`src/app/(dashboard)/stock/_components/StockCrudButtons.tsx`
- Replace disabled button with `<StockAdjustmentDialog />`

---

## Server Action

```ts
adjustStock(productId: string, newStock: number, reason: string, notes?: string)
  : Promise<{ success: true } | { error: string }>
```

Steps (inside `prisma.$transaction`):
1. Read `Product.stock` as `stockBefore`
2. `UPDATE Product SET stock = newStock`
3. `INSERT StockAdjustment { productId, oldStock: stockBefore, newStock, reason, notes }`
4. `INSERT StockMovement { productId, type: 'ADJUST', quantity: newStock - stockBefore, stockBefore, stockAfter: newStock, referenceId: adjustment.id }`
5. `revalidatePath('/stock')`

Validation:
- `newStock >= 0` (enforced server-side, not just client)
- `reason` must be one of: `STOCK_OPNAME`, `RECEIVE`, `DAMAGE`, `LOST`, `OTHER`
- `productId` must exist and `isActive = true`

---

## Dialog UI

**Trigger:** `✏️ Stok` button in the Aksi column (same style as ✏️ Edit button)

**Dialog content:**

| Element | Detail |
|---------|--------|
| Title | "Sesuaikan Stok — {productName}" |
| Stok Saat Ini | Readonly display: `{currentStock} {unit}` |
| Stok Baru | `<input type="number" min="0">`, required |
| Selisih | Realtime: `+5` (green) / `-3` (red) / `—` (gray if equal/empty) |
| Alasan | `<Select>` required — Stok Opname / Terima Barang / Barang Rusak / Barang Hilang / Koreksi Lain |
| Catatan | `<textarea>` optional, 2 rows |
| Footer | [Batal] [Simpan Penyesuaian] |

**Behavior:**
- Delta preview updates on every keystroke
- Submit disabled while `isPending`
- Inline error message on failure
- Toast success + dialog close on success

---

## Reason Values (string stored in DB)

| Label (UI) | Value (DB) |
|------------|-----------|
| Stok Opname | `STOCK_OPNAME` |
| Terima Barang | `RECEIVE` |
| Barang Rusak | `DAMAGE` |
| Barang Hilang | `LOST` |
| Koreksi Lain | `OTHER` |

---

## Edge Cases

- `newStock` same as `currentStock`: allowed (still inserts audit record), delta shows `—`
- `newStock = 0`: valid (habis)
- Stock cannot go negative: server clamps to `Math.max(0, newStock)`, but UI min=0 prevents it
- Product not found on server: returns `{ error: '...' }`

---

## Out of Scope

- History log UI (StockMovement/StockAdjustment list) — Phase 4
- Bulk stock adjustment — Phase 4
