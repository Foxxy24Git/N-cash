# Lunasi BON UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambah UI untuk melunasi invoice BON — tombol di DetailModal, form dialog pelunasan, dan update badge di tabel report.

**Architecture:** Extend `DetailModal` dengan tampilan status + tombol Lunasi. Buat `LunasiDialog` baru sebagai nested dialog. Update `InvoiceRow` type dan tabel untuk show badge "BON (Lunas)".

**Tech Stack:** Next.js 14 App Router, React, shadcn/ui (Dialog, Select, Popover/Calendar), Tailwind CSS, sonner (toast)

---

### Task 1: Extend `InvoiceRow` type dan report page untuk include `paidAt`

**Files:**
- Modify: `src/lib/report-query.ts`
- Modify: `src/app/(dashboard)/reports/page.tsx`

- [ ] **Step 1: Tambah `paidAt` ke `InvoiceRow` di `src/lib/report-query.ts`**

Ganti interface `InvoiceRow`:

```ts
export interface InvoiceRow {
  id: string
  invoiceNumber: string
  time: string
  date: string
  totalAmount: number
  paymentMethod: string
  bankName: string | null
  paidAt: string | null   // tambah ini — ISO string atau null
}
```

- [ ] **Step 2: Include `paidAt` di mapping rows di `src/app/(dashboard)/reports/page.tsx`**

Di fungsi mapping `rows` (sekitar baris 65–73), tambah field `paidAt`:

```ts
const rows: InvoiceRow[] = paginatedRaw.map((inv) => ({
  id:            inv.id,
  invoiceNumber: inv.invoiceNumber,
  time:          formatTimeWIB(inv.createdAt.toISOString()),
  date:          formatDateWIB(inv.date.toISOString()),
  totalAmount:   Number(inv.totalAmount),
  paymentMethod: inv.paymentMethod,
  bankName:      inv.bank?.name ?? null,
  paidAt:        inv.paidAt?.toISOString() ?? null,   // tambah ini
}))
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/report-query.ts src/app/(dashboard)/reports/page.tsx
git commit -m "feat(bon): add paidAt to InvoiceRow type and report mapping"
```

---

### Task 2: Update badge BON di `InvoiceTable`

**Files:**
- Modify: `src/app/(dashboard)/reports/_components/InvoiceTable.tsx`

- [ ] **Step 1: Ubah render badge di kolom Status**

Di `InvoiceTable.tsx`, baris 60–63, ganti bagian render `<span>` badge dengan logika BON lunas:

```tsx
<TableCell>
  {(() => {
    const isBon = row.paymentMethod === 'BON' || row.paymentMethod === 'UNPAID'
    const isLunas = isBon && row.paidAt !== null
    if (isLunas) {
      const tgl = new Date(row.paidAt!).toLocaleDateString('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit', month: '2-digit', year: 'numeric',
      })
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-gray-100 text-gray-600 border-gray-300">
          🔴 BON (Lunas {tgl})
        </span>
      )
    }
    if (isBon) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-red-100 text-red-800 border-red-200">
          🔴 BON
        </span>
      )
    }
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${METHOD_BADGE[row.paymentMethod] ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}>
        {row.paymentMethod}{row.bankName ? ` — ${row.bankName}` : ''}
      </span>
    )
  })()}
</TableCell>
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/reports/_components/InvoiceTable.tsx
git commit -m "feat(bon): update table badge for BON lunas status"
```

---

### Task 3: Buat komponen `LunasiDialog`

**Files:**
- Create: `src/app/(dashboard)/reports/_components/LunasiDialog.tsx`

- [ ] **Step 1: Buat file `LunasiDialog.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Bank {
  id: string
  name: string
}

interface Props {
  invoiceId: string
  invoiceDate: string   // ISO string — untuk validasi tanggal minimum
  open: boolean
  onClose: () => void
}

const METHODS = [
  { value: 'CASH',          label: 'Cash' },
  { value: 'CASH_COD',      label: 'Cash COD' },
  { value: 'QRIS',          label: 'QRIS' },
  { value: 'BANK_TRANSFER', label: 'Transfer Bank' },
] as const

type MethodValue = typeof METHODS[number]['value']

function todayJakarta(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
}

function minDate(invoiceDate: string): string {
  return new Date(invoiceDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
}

export default function LunasiDialog({ invoiceId, invoiceDate, open, onClose }: Props) {
  const router = useRouter()
  const [paidAt, setPaidAt]       = useState(todayJakarta())
  const [method, setMethod]       = useState<MethodValue>('CASH')
  const [banks, setBanks]         = useState<Bank[]>([])
  const [bankId, setBankId]       = useState('')
  const [notes, setNotes]         = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Reset form ketika dialog dibuka
  useEffect(() => {
    if (!open) return
    setPaidAt(todayJakarta())
    setMethod('CASH')
    setBankId('')
    setNotes('')
  }, [open])

  // Fetch banks ketika method = BANK_TRANSFER
  useEffect(() => {
    if (method !== 'BANK_TRANSFER') return
    fetch('/api/banks')
      .then((r) => r.json())
      .then((data: Bank[]) => setBanks(data))
      .catch(() => setBanks([]))
  }, [method])

  const minDateStr = minDate(invoiceDate)

  function validate(): string | null {
    if (paidAt < minDateStr) return 'Tanggal pelunasan tidak boleh sebelum tanggal transaksi'
    if (method === 'BANK_TRANSFER' && !bankId) return 'Pilih bank untuk metode Transfer Bank'
    return null
  }

  async function handleSubmit() {
    const err = validate()
    if (err) { toast.error(err); return }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paidMethod: method,
          paidBankId: method === 'BANK_TRANSFER' ? bankId : undefined,
          paidAt,
          notes: notes.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        toast.error(json.error ?? 'Gagal melunasi BON')
        return
      }
      toast.success('✅ BON berhasil dilunasi')
      onClose()
      router.refresh()
    } catch {
      toast.error('Terjadi kesalahan. Coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Lunasi BON</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Tanggal Pelunasan */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Tanggal Pelunasan</label>
            <input
              type="date"
              value={paidAt}
              min={minDateStr}
              onChange={(e) => setPaidAt(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Metode Pembayaran */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Metode Pembayaran</label>
            <div className="grid grid-cols-2 gap-2">
              {METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => { setMethod(m.value); setBankId('') }}
                  className={[
                    'px-3 py-2 text-sm rounded-lg border font-medium transition-colors',
                    method === m.value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
                  ].join(' ')}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pilih Bank (conditional) */}
          {method === 'BANK_TRANSFER' && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Pilih Bank</label>
              <select
                value={bankId}
                onChange={(e) => setBankId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Pilih Bank --</option>
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Catatan */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Catatan (opsional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Catatan tambahan..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Memproses...' : 'Konfirmasi Pelunasan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Tambah `/api/banks` GET route** (jika belum ada)

Cek apakah `src/app/api/banks/route.ts` sudah ada. Kalau belum, buat:

```ts
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json([], { status: 401 })
  const banks = await prisma.bank.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(banks)
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/reports/_components/LunasiDialog.tsx
git add src/app/api/banks/route.ts  # jika dibuat
git commit -m "feat(bon): add LunasiDialog component"
```

---

### Task 4: Update `DetailModal` — tampilkan status BON + tombol Lunasi

**Files:**
- Modify: `src/app/(dashboard)/reports/_components/DetailModal.tsx`

- [ ] **Step 1: Extend `InvoiceDetail` interface dan import komponen**

Di `DetailModal.tsx`, ganti bagian atas file (interface + imports):

```tsx
'use client'

import { useEffect, useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { formatRupiah } from '@/lib/format'
import LunasiDialog from './LunasiDialog'

interface Item {
  id: string
  itemName: string
  quantity: string
  unitPrice: string
  subtotal: string
}

interface InvoiceDetail {
  invoiceNumber: string
  date: string
  totalAmount: string
  paymentMethod: string
  bank: { name: string } | null
  items: Item[]
  paidAt: string | null
  paidMethod: string | null
  paidBank: { name: string } | null
}

interface Props {
  invoiceId: string
  open: boolean
  onClose: () => void
}
```

- [ ] **Step 2: Tambah state `lunasiOpen` dan helper label di body komponen**

Di dalam fungsi `DetailModal`, setelah deklarasi state yang sudah ada, tambah:

```tsx
const [lunasiOpen, setLunasiOpen] = useState(false)
```

Juga tambah helper untuk label tanggal lunas (di bawah `dateLabel`):

```tsx
const paidAtLabel = data?.paidAt
  ? new Date(data.paidAt).toLocaleDateString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
  : null
```

- [ ] **Step 3: Tambah section status BON di header modal**

Di dalam blok `{!loading && data && (...)}`, setelah tag pembuka `<div className="space-y-4">`, tambah section status sebelum "Header info":

```tsx
{/* Status BON */}
{(data.paymentMethod === 'UNPAID' || data.paymentMethod === 'BON') && (
  <div className="flex items-center justify-between rounded-lg px-3 py-2.5 border">
    {data.paidAt ? (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border bg-green-100 text-green-800 border-green-200">
          ✅ LUNAS
        </span>
        <span className="text-xs text-gray-500">
          dibayar {paidAtLabel} via{' '}
          {data.paidMethod === 'CASH' ? 'Cash'
            : data.paidMethod === 'CASH_COD' ? 'Cash COD'
            : data.paidMethod === 'QRIS' ? 'QRIS'
            : data.paidBank ? `Transfer — ${data.paidBank.name}`
            : 'Transfer Bank'}
        </span>
      </div>
    ) : (
      <>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border bg-red-100 text-red-800 border-red-200">
          ⚠️ BELUM LUNAS
        </span>
        <button
          onClick={() => setLunasiOpen(true)}
          className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          💰 Lunasi
        </button>
      </>
    )}
  </div>
)}
```

- [ ] **Step 4: Tambah `LunasiDialog` di akhir return, sebelum penutup `</Dialog>`**

Di baris paling bawah sebelum `</Dialog>`, tambah:

```tsx
{data && (
  <LunasiDialog
    invoiceId={invoiceId}
    invoiceDate={data.date}
    open={lunasiOpen}
    onClose={() => {
      setLunasiOpen(false)
      onClose()
    }}
  />
)}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/reports/_components/DetailModal.tsx
git commit -m "feat(bon): show BON status and Lunasi button in DetailModal"
```

---

### Task 5: Verifikasi manual

- [ ] Jalankan dev server: `npm run dev`
- [ ] Buka `/reports`, cari transaksi BON
- [ ] Klik Detail → pastikan badge "⚠️ BELUM LUNAS" dan tombol "💰 Lunasi" muncul
- [ ] Klik Lunasi → dialog form muncul dengan tanggal default hari ini
- [ ] Pilih metode Cash → konfirmasi → toast sukses, modal tutup, tabel refresh
- [ ] Klik Detail lagi → pastikan badge "✅ LUNAS" dengan tanggal dan metode
- [ ] Badge di tabel: BON belum lunas = "🔴 BON" merah, sudah lunas = "🔴 BON (Lunas xx/xx/xxxx)" abu-abu
- [ ] Pilih Transfer Bank → field "Pilih Bank" muncul, wajib dipilih
- [ ] Klik Detail di invoice non-BON → tombol Lunasi tidak muncul
