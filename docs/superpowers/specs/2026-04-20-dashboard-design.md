# Dashboard Design — N-Cash

**Date:** 2026-04-20  
**Feature:** Menu Dashboard (`/dashboard`) — PRD Section 3.1

---

## Overview

Server-rendered dashboard showing 5 summary cards for today's invoices (Asia/Jakarta timezone). Cards are clickable and link to the reports page with pre-applied filters. Page auto-refreshes every 30 seconds client-side.

---

## File Structure

```
src/app/(dashboard)/dashboard/
  page.tsx              ← server component, exports dynamic='force-dynamic', fetches aggregates
  DashboardClient.tsx   ← 'use client', wraps children, calls router.refresh() every 30s
  StatCard.tsx          ← reusable presentational card component
```

---

## Data Query

- Source model: `Invoice`
- Date filter: `date >= todayStart AND date < todayEnd` where boundaries are computed from Asia/Jakarta midnight in UTC
  - `todayStart`: today 00:00:00 WIB → UTC equivalent
  - `todayEnd`: tomorrow 00:00:00 WIB → UTC equivalent
- Exclude soft-deleted: `deletedAt: null`
- Single `findMany` fetch, aggregate totals via `.reduce()` in JS (simpler than groupBy for 5 categories on SQLite)
- `export const dynamic = 'force-dynamic'` on `page.tsx` to disable caching

---

## Cards Spec

| # | Label | paymentMethod filter | Tailwind color scheme | Lucide icon |
|---|---|---|---|---|
| 1 | Total Keuntungan (Hari Ini) | all (no filter) | gray-100 / gray-700 | `Wallet` |
| 2 | Total Pembayaran Cash | `CASH`, `CASH_COD` | green-100 / green-700 | `Banknote` |
| 3 | Total Pembayaran QRIS | `QRIS` | blue-100 / blue-700 | `Smartphone` |
| 4 | Total Transfer via Bank | `BANK_TRANSFER` | yellow-100 / yellow-700 | `Landmark` |
| 5 | Total Belum Bayar (BON) | `UNPAID` | red-100 / red-700 | `AlertCircle` |

Each card renders as `<Link>` to:
- Card 1: `/reports?date=today`
- Card 2: `/reports?date=today&method=CASH`
- Card 3: `/reports?date=today&method=QRIS`
- Card 4: `/reports?date=today&method=BANK_TRANSFER`
- Card 5: `/reports?date=today&method=UNPAID`

---

## Currency Format

```ts
function formatRupiah(amount: number): string {
  return 'Rp ' + new Intl.NumberFormat('id-ID').format(amount)
}
```

Rendered inside a `<span className="font-mono">` for column alignment.

---

## Auto-Refresh

`DashboardClient.tsx` is a client wrapper:
```tsx
'use client'
useEffect(() => {
  const id = setInterval(() => router.refresh(), 30_000)
  return () => clearInterval(id)
}, [])
```

`page.tsx` passes children through — the server component re-runs on each refresh.

---

## Constraints

- No new shadcn components needed — cards are plain Tailwind divs
- Existing layout (Sidebar, Header, BottomNav) remains unchanged
- `prisma` client imported from `@/lib/prisma`
- Auth guard already handled by `(dashboard)/layout.tsx`
