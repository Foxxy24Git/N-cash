# Save Transaction — Design Spec

**Date:** 2026-04-20  
**Feature:** Simpan data transaksi dari form "Tambah Transaksi" ke database

---

## Overview

Form `NewTransactionForm` saat ini hanya `console.log` data saat submit. Spec ini menambahkan:
- Server action untuk menyimpan ke DB
- Validasi Zod server-side
- Toast feedback via Sonner
- Reset form setelah sukses

---

## Architecture

### Server Action: `createTransaction`

**File:** `src/app/(dashboard)/transactions/new/_actions/createTransaction.ts`

Input payload (divalidasi Zod):

```ts
{
  invoiceNumber: string       // non-empty
  date: string                // format YYYY-MM-DD
  paymentMethod: PaymentMethod // 'Cash' | 'Cash COD' | 'QRIS' | 'Transfer Bank' | 'BON'
  bankId?: string             // wajib jika paymentMethod === 'Transfer Bank'
  items: Array<{
    itemName: string          // non-empty
    qty: number               // > 0
    unitPrice: number         // >= 0
    subtotal: number          // >= 0
  }>                          // min 1 item
}
```

Return type:

```ts
{ success: true } | { success: false; error: string }
```

**Validation flow:**
1. Zod parse — gagal → return error zod message pertama
2. Cek duplikat invoice number (case-insensitive): `mode: 'insensitive'` di Prisma query
3. `prisma.invoice.create()` dengan nested `items: { create: [...] }` dalam satu operasi

**Uniqueness check:**
```ts
prisma.invoice.findFirst({
  where: { invoiceNumber: { equals: invoiceNumber, mode: 'insensitive' }, deletedAt: null }
})
```

---

## UI Changes

### Sonner Toast
- Install: `npx shadcn@latest add sonner`
- `<Toaster />` ditambah ke `src/app/(dashboard)/layout.tsx`
- Sukses: `toast.success("✅ Transaksi berhasil disimpan")`
- Gagal: `toast.error(result.error)`

### Loading State
- State `isSubmitting: boolean` di form
- Button disabled + teks "Menyimpan..." saat `isSubmitting === true`

### Form Reset (setelah sukses)
```ts
setInvoiceNumber('')
setDate(today)
setItems([createItem()])
setPaymentMethod('Cash')
setSelectedBankId('')
```

---

## Data Flow

```
handleSubmit (client)
  → set isSubmitting = true
  → call createTransaction(payload)
    → Zod validate
    → check duplicate invoiceNumber (case-insensitive)
    → prisma.invoice.create with nested items
    → return { success } | { error }
  → if success: toast.success + reset form
  → if error: toast.error
  → set isSubmitting = false
```

---

## Error Cases

| Kondisi | Pesan error |
|---|---|
| Nomor faktur kosong | "Nomor faktur wajib diisi" |
| Nomor faktur sudah ada | "Nomor faktur sudah digunakan" |
| Tidak ada item | "Minimal 1 barang harus diisi" |
| Item tanpa nama | "Nama barang wajib diisi" |
| Qty = 0 | "Qty harus lebih dari 0" |
| Transfer Bank tanpa bankId | "Pilih bank untuk metode Transfer Bank" |
| DB error | "Terjadi kesalahan, coba lagi" |

---

## Files Changed

| File | Action |
|---|---|
| `_actions/createTransaction.ts` | Create — server action + Zod schema |
| `_components/NewTransactionForm.tsx` | Modify — wire submit, loading, reset, toast |
| `(dashboard)/layout.tsx` | Modify — add `<Toaster />` |
| `package.json` + `components/ui/sonner.tsx` | Via `npx shadcn add sonner` |
