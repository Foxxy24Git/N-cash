# Design Spec: Stock Pages Mobile Polish

**Date:** 2026-05-19  
**Scope:** UI polish only — no logic or feature changes  
**Pages affected:** `/stock`, `/transactions/new`

---

## 1. Mobile Responsive `/stock` (375px)

### 1a. Sticky "Nama Barang" column

The table already has `overflow-x-auto`. Add sticky positioning to the first column header and cells so the name stays visible while scrolling horizontally.

- `<TableHead>` for Nama Barang: add `sticky left-0 z-10 bg-gray-50`
- `<TableCell>` for name in each row: add `sticky left-0 z-10 bg-white`
- On hover rows (`.hover:bg-gray-50/50`): override sticky cell bg to match: `group-hover:bg-gray-50/50`
  - Implement by adding `group` on `<TableRow>` and `group-hover:bg-gray-50/50` on sticky cell

### 1b. Filter collapse → Sheet on mobile

Two parallel render paths by breakpoint:

**Mobile (`md:hidden`):** A single `[🔍 Filter]` button (shows active filter count badge if any filter is active). Clicking it opens a shadcn `Sheet` sliding from the bottom, containing the full search input and status Select.

**Desktop (`hidden md:block`):** Current `StockFilterBar` inline layout, unchanged.

Implementation:
- Add `src/components/ui/sheet.tsx` (shadcn Sheet)
- Modify `StockFilterBar.tsx` to conditionally render mobile trigger + Sheet vs desktop inline layout
- Active filter indicator: show a small `(1)` or `(2)` badge on the button if `q !== ''` or `status !== 'all'`

### 1c. Action buttons → DropdownMenu on mobile

`StockCrudButtons` currently renders 3 inline icon buttons.

- On `sm:hidden`: render a single `<DropdownMenu>` triggered by `⋮` (`MoreVertical` icon)
  - Items: "Sesuaikan Stok", "Edit Barang", "Hapus Barang"
  - Each item triggers the existing dialog (same dialogs, just different trigger)
- On `hidden sm:flex`: keep existing 3-button layout

Implementation:
- Add `src/components/ui/dropdown-menu.tsx` (shadcn DropdownMenu)
- Modify `StockCrudButtons.tsx` — dialogs become controlled (`open`/`onOpenChange` props), triggered from both the inline buttons and the dropdown menu items

---

## 2. Autocomplete Mobile Fixes (`/transactions/new`)

### 2a. Touch-friendly item height

Change each result item from `py-2` (≈36px) to `min-h-[44px] flex items-center` to meet the 44px touch target minimum.

### 2b. Viewport overflow prevention

When the autocomplete dropdown opens, measure available space:

```ts
const inputRect = wrapperRef.current.getBoundingClientRect()
const spaceBelow = window.innerHeight - inputRect.bottom
const dropdownHeight = 240 // max-h-60 = 15rem ≈ 240px
const openUpward = spaceBelow < dropdownHeight && inputRect.top > dropdownHeight
```

- If `openUpward`: render dropdown with `bottom-full mb-1` instead of `top-full mt-1`
- Store this as a `dropDirection: 'up' | 'down'` state, recalculate each time `open` becomes `true`

### 2c. Touch event support

Replace `onMouseDown` on dropdown items with `onPointerDown` — this handles both mouse and touch without needing separate touch handlers. No behavior change for desktop.

---

## 3. Loading State — Skeleton

Add `/src/app/(dashboard)/stock/loading.tsx` (Next.js App Router loading file).

Skeleton layout mirrors the real page:
- Header row: title placeholder + 3 button placeholders
- Filter bar placeholder (same height as `StockFilterBar`)
- Table: 8 skeleton rows, each with columns matching the real table widths

Use a new `src/components/ui/skeleton.tsx` (shadcn Skeleton — a simple `animate-pulse bg-gray-200 rounded` div).

For within-page filter navigation (when `useTransition` is pending in `StockFilterBar`): show a small spinning loader icon inside the search input's right side when `isPending === true`. This is a minor indicator; no overlay on the table.

---

## 4. Error State

Add `/src/app/(dashboard)/stock/error.tsx` (Next.js App Router error boundary).

Requirements:
- `'use client'` directive
- Props: `{ error: Error, reset: () => void }`
- Display: centered layout with an alert icon, message "Gagal memuat data stok", `error.message` in a muted code block, and a primary button "Coba Lagi" that calls `reset()`

---

## 5. Empty State Consistency

Current `StockTable` empty state:
```tsx
<EmptyState
  icon={Package}
  title="Belum ada data barang"
  subtitle="Klik [+ Tambah Barang] atau [📥 Import Excel] untuk mulai."
/>
```

The `ProductFormDialog` button label is `+ Tambah Barang` and `ImportDialog` trigger is `📥 Import Excel` — these match. No change needed.

Verify: when filter is active but returns no results, the same empty state appears. This is already the case (server filters then passes empty `rows` to `StockTable`). No change needed.

---

## 6. Badge Color Unification

Create `src/lib/stock-status.ts` as single source of truth:

```ts
export type StockStatus = 'normal' | 'low' | 'out'

export function getStockStatus(stock: number, minStock: number): StockStatus {
  if (stock === 0) return 'out'
  if (minStock > 0 && stock <= minStock) return 'low'
  return 'normal'
}

// For badge components (pill with background)
export const STOCK_BADGE_CLASS: Record<StockStatus, string> = {
  normal: 'bg-green-100 text-green-800 border-green-200',
  low:    'bg-orange-100 text-orange-800 border-orange-200',
  out:    'bg-red-100 text-red-800 border-red-200',
}

// For inline text color (autocomplete dropdown)
export const STOCK_TEXT_CLASS: Record<StockStatus, string> = {
  normal: 'text-green-700',
  low:    'text-orange-600',
  out:    'text-red-600',
}

export const STOCK_BADGE_LABEL: Record<StockStatus, string> = {
  normal: 'Normal',
  low:    'Menipis',
  out:    'Habis',
}
```

**Files to update:**
- `StockTable.tsx`: replace inline `STATUS_BADGE` with `STOCK_BADGE_CLASS` + `STOCK_BADGE_LABEL`
- `NewTransactionForm.tsx` (`stockColor` function): replace with `STOCK_TEXT_CLASS`
- `NewTransactionForm.tsx` (`stockBadgeColor` string): replace with `STOCK_BADGE_CLASS`

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/ui/sheet.tsx` | shadcn Sheet |
| `src/components/ui/dropdown-menu.tsx` | shadcn DropdownMenu |
| `src/components/ui/skeleton.tsx` | shadcn Skeleton |
| `src/app/(dashboard)/stock/loading.tsx` | Next.js loading skeleton |
| `src/app/(dashboard)/stock/error.tsx` | Next.js error boundary |
| `src/lib/stock-status.ts` | Badge color constants |

## Files to Modify

| File | Change |
|------|--------|
| `StockTable.tsx` | Sticky first column + use shared badge constants |
| `StockFilterBar.tsx` | Mobile Sheet trigger + isPending spinner |
| `StockCrudButtons.tsx` | DropdownMenu on mobile |
| `NewTransactionForm.tsx` | Autocomplete: touch, viewport flip, shared badge colors |

---

## Constraints

- No logic changes: stock deduction, calculations, form submission, API routes — untouched
- No new features: nothing beyond the 6 items above
- shadcn components added as-needed (Sheet, DropdownMenu, Skeleton)
