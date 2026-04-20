# Settings Menu Design — N-Cash

**Date:** 2026-04-20  
**Status:** Approved  
**Scope:** Menu D — Setting (`/settings`) with 3 tabs

---

## Architecture

**Pattern:** Server Components + Server Actions + URL-based tab routing  
**Tab routing:** `?tab=banks` (default), `?tab=company`, `?tab=password`  
**Tabs UI:** shadcn `Tabs` component (Client Component wrapper only; content stays server-rendered via props)

### File Structure

```
src/app/(dashboard)/settings/
  page.tsx                     ← Server Component; reads ?tab; fetches banks + profile
  _components/
    SettingsTabs.tsx            ← Client Component; shadcn Tabs shell
    BankTab.tsx                 ← receives banks[] as props
    CompanyTab.tsx              ← receives CompanyProfile as props
    PasswordTab.tsx             ← pure Client Component
    BankDialog.tsx              ← Client Component; shared for add + edit
    DeleteBankButton.tsx        ← Client Component; confirm before delete
  _actions/
    bankActions.ts              ← createBank, updateBank, deleteBank
    companyActions.ts           ← upsertCompany
    passwordActions.ts          ← changePassword
src/app/api/upload/route.ts    ← POST; accepts multipart/form-data; saves to public/uploads/
public/uploads/                ← logo files (needs Docker volume mount for persistence)
```

---

## Tab 1 — Manajemen Bank

**Display:** Table with columns: Nama Bank | No. Rekening | Atas Nama | Aksi  
**Add:** `[+ Tambah Bank]` opens `BankDialog` (Dialog from shadcn)  
**Edit:** Edit button per row opens same `BankDialog` pre-filled  
**Delete:** `DeleteBankButton` calls `window.confirm` then `deleteBank` action  
**Sync:** No extra work needed — `NewTransactionForm` calls `getBanks()` which queries DB directly

### Server Actions (`bankActions.ts`)
- `createBank(formData)` — insert Bank, revalidate `/settings`
- `updateBank(id, formData)` — update Bank by id, revalidate `/settings`
- `deleteBank(id)` — delete Bank by id (hard delete; no invoices reference check needed for MVP), revalidate `/settings`

---

## Tab 2 — Informasi Perusahaan

**Fields:** Nama Perusahaan (required), Alamat (textarea, required), No. Telepon (optional), Logo (file input, optional)  
**Logo upload:** Client POSTs file to `/api/upload` → returns `{ url: "/uploads/logo-<timestamp>.<ext>" }` → stored in `CompanyProfile.logoUrl`  
**Logo preview:** Show existing logo if `logoUrl` is set  
**Singleton:** `upsertCompany` uses `updateMany` + `create` pattern (upsert on first record)

### Server Action (`companyActions.ts`)
- `upsertCompany(formData)` — upsert CompanyProfile singleton, revalidate `/settings`

### Upload API (`/api/upload`)
- Accepts `multipart/form-data` with `file` field
- Validates: image only (jpeg/png/webp), max 2MB
- Saves to `public/uploads/logo-<Date.now()>.<ext>`
- Returns `{ url: string }`

---

## Tab 3 — Ganti Password

**Fields:** Password Lama, Password Baru (min 8 chars), Konfirmasi Password Baru  
**Validation order:**
1. Password lama cocok (bcrypt.compare)
2. Password baru min 8 karakter
3. Password baru === konfirmasi

**On success:** Update hashed password in DB → `signOut({ redirectTo: '/login' })`  
**On error:** Return error message, display as toast

### Server Action (`passwordActions.ts`)
- `changePassword(formData)` — validates, updates, signs out

---

## Data Fetching (page.tsx)

```ts
const [banks, profile] = await Promise.all([
  prisma.bank.findMany({ orderBy: { name: 'asc' } }),
  prisma.companyProfile.findFirst(),
])
```

Pass `banks` and `profile` as props to `SettingsTabs`.

---

## Error Handling

- Server Actions return `{ error: string } | { success: true }` 
- Client components display errors via sonner `toast.error()`
- Upload API returns 400 for invalid file type/size

---

## Constraints

- `public/uploads/` needs Docker volume mount for persistence in production
- No soft-delete for banks (MVP; no BON-payment references to banks in current schema)
- CompanyProfile is a singleton — always upsert, never create duplicates
