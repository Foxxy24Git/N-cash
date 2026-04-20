# Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/dashboard` page with 5 clickable summary cards showing today's invoice totals in Asia/Jakarta timezone with 30-second auto-refresh.

**Architecture:** Server component (`page.tsx`) fetches today's Invoice aggregates via Prisma, renders through a client wrapper (`DashboardClient.tsx`) that calls `router.refresh()` every 30 seconds. A reusable `StatCard.tsx` handles each card's visual and link behavior.

**Tech Stack:** Next.js 14 App Router, Prisma (SQLite/better-sqlite3), Tailwind CSS, Lucide React, TypeScript

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/app/(dashboard)/dashboard/page.tsx` | Modify | Server component — date bounds, Prisma query, aggregate, render |
| `src/app/(dashboard)/dashboard/StatCard.tsx` | Create | Presentational card with icon, label, value, link |
| `src/app/(dashboard)/dashboard/DashboardClient.tsx` | Create | Client wrapper — `router.refresh()` every 30s |

---

### Task 1: Create `StatCard.tsx`

**Files:**
- Create: `src/app/(dashboard)/dashboard/StatCard.tsx`

- [ ] **Step 1: Write the component**

```tsx
import Link from 'next/link'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string
  icon: LucideIcon
  href: string
  colorScheme: 'gray' | 'green' | 'blue' | 'yellow' | 'red'
}

const colors: Record<StatCardProps['colorScheme'], { bg: string; icon: string; label: string }> = {
  gray:   { bg: 'bg-gray-50 hover:bg-gray-100',     icon: 'text-gray-500',   label: 'text-gray-600' },
  green:  { bg: 'bg-green-50 hover:bg-green-100',   icon: 'text-green-600',  label: 'text-green-700' },
  blue:   { bg: 'bg-blue-50 hover:bg-blue-100',     icon: 'text-blue-600',   label: 'text-blue-700' },
  yellow: { bg: 'bg-yellow-50 hover:bg-yellow-100', icon: 'text-yellow-600', label: 'text-yellow-700' },
  red:    { bg: 'bg-red-50 hover:bg-red-100',       icon: 'text-red-600',    label: 'text-red-700' },
}

export default function StatCard({ label, value, icon: Icon, href, colorScheme }: StatCardProps) {
  const c = colors[colorScheme]
  return (
    <Link
      href={href}
      className={`${c.bg} rounded-xl p-5 flex items-center gap-4 transition-colors cursor-pointer border border-transparent hover:border-current/10 group`}
    >
      <div className={`${c.icon} shrink-0`}>
        <Icon size={32} strokeWidth={1.5} />
      </div>
      <div className="min-w-0">
        <p className={`text-sm font-medium ${c.label} truncate`}>{label}</p>
        <p className="text-2xl font-bold text-gray-900 font-mono tracking-tight mt-0.5">{value}</p>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/user/N-Cash && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors for the new file (there may be pre-existing errors in other files — only care about `StatCard.tsx`).

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/StatCard.tsx
git commit -m "feat(dashboard): add StatCard component"
```

---

### Task 2: Create `DashboardClient.tsx`

**Files:**
- Create: `src/app/(dashboard)/dashboard/DashboardClient.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardClient({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    const id = setInterval(() => router.refresh(), 30_000)
    return () => clearInterval(id)
  }, [router])

  return <>{children}</>
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/user/N-Cash && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/DashboardClient.tsx
git commit -m "feat(dashboard): add DashboardClient auto-refresh wrapper"
```

---

### Task 3: Implement `page.tsx` — data fetch + render

**Files:**
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Replace page.tsx with full implementation**

```tsx
import { Wallet, Banknote, Smartphone, Landmark, AlertCircle } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import StatCard from './StatCard'
import DashboardClient from './DashboardClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Dashboard — N-Cash' }

function getTodayBoundsJakarta(): { todayStart: Date; todayEnd: Date } {
  const todayJakarta = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
  const todayStart = new Date(`${todayJakarta}T00:00:00+07:00`)
  const todayEnd = new Date(`${todayJakarta}T23:59:59.999+07:00`)
  return { todayStart, todayEnd }
}

function formatRupiah(amount: number): string {
  return 'Rp ' + new Intl.NumberFormat('id-ID').format(amount)
}

export default async function DashboardPage() {
  const { todayStart, todayEnd } = getTodayBoundsJakarta()

  const invoices = await prisma.invoice.findMany({
    where: {
      deletedAt: null,
      date: { gte: todayStart, lte: todayEnd },
    },
    select: { totalAmount: true, paymentMethod: true },
  })

  let total = 0
  let cash = 0
  let qris = 0
  let bank = 0
  let bon = 0

  for (const inv of invoices) {
    const amount = Number(inv.totalAmount)
    total += amount
    if (inv.paymentMethod === 'CASH' || inv.paymentMethod === 'CASH_COD') cash += amount
    else if (inv.paymentMethod === 'QRIS') qris += amount
    else if (inv.paymentMethod === 'BANK_TRANSFER') bank += amount
    else if (inv.paymentMethod === 'UNPAID') bon += amount
  }

  const cards = [
    {
      label: 'Total Keuntungan (Hari Ini)',
      value: formatRupiah(total),
      icon: Wallet,
      href: '/reports?date=today',
      colorScheme: 'gray' as const,
    },
    {
      label: 'Total Pembayaran Cash',
      value: formatRupiah(cash),
      icon: Banknote,
      href: '/reports?date=today&method=CASH',
      colorScheme: 'green' as const,
    },
    {
      label: 'Total Pembayaran QRIS',
      value: formatRupiah(qris),
      icon: Smartphone,
      href: '/reports?date=today&method=QRIS',
      colorScheme: 'blue' as const,
    },
    {
      label: 'Total Transfer via Bank',
      value: formatRupiah(bank),
      icon: Landmark,
      href: '/reports?date=today&method=BANK_TRANSFER',
      colorScheme: 'yellow' as const,
    },
    {
      label: 'Total Belum Bayar (BON)',
      value: formatRupiah(bon),
      icon: AlertCircle,
      href: '/reports?date=today&method=UNPAID',
      colorScheme: 'red' as const,
    },
  ]

  return (
    <DashboardClient>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-semibold text-gray-900 mb-6">Ringkasan Hari Ini</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => (
            <StatCard key={card.href} {...card} />
          ))}
        </div>
      </div>
    </DashboardClient>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/user/N-Cash && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new type errors.

- [ ] **Step 3: Start dev server and verify visually**

```bash
cd /Users/user/N-Cash && npm run dev
```

Open `http://localhost:3000/dashboard` in a browser. Verify:
- 5 cards visible with correct labels and icons
- Values show `Rp 0` if no invoices today (correct — database is empty)
- Gray / green / blue / yellow / red color schemes match PRD
- Monospace font on amounts
- Clicking a card navigates to `/reports?date=today&method=...` (404 is fine — reports page not built yet)
- No console errors

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/page.tsx
git commit -m "feat(dashboard): implement 5-card summary with today's invoice aggregates"
```
