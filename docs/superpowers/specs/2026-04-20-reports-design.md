---
title: Menu Report — Tabel + Filter (Tahap 1)
date: 2026-04-20
status: approved
---

## Architecture

`/reports` is a hybrid page: a Server Component (`page.tsx`) reads `searchParams` (dateFrom, dateTo, method, search, page) and fetches filtered data from Prisma server-side. A thin Client Component (`ReportsClient.tsx`) owns the interactive filter bar — it manipulates URL params via `router.push` so filters are bookmarkable and the Dashboard deep-links work without extra wiring. Pagination is also URL-driven (param `page`, default 1, 20 rows/page).

## Data Fetching

One Prisma query on the server, filtered by `date >= dateFrom`, `date < dateTo+1day`, `paymentMethod` (if set), `invoiceNumber CONTAINS search` (if set), `deletedAt IS NULL`. Returns paginated invoice rows plus a separate aggregate query for summary totals (totalKeuntungan, totalCash, totalQRIS, totalBank, totalBON). Date boundaries use the same `Asia/Jakarta` UTC-offset logic as the Dashboard.

## Filter Bar

Rendered in `FilterBar.tsx` (client). Contains: (1) Date range — two shadcn `<Popover>` + `<Calendar>` pickers showing `date-fns` formatted labels; (2) Quick shortcuts — 4 buttons (Hari Ini, Kemarin, 7 Hari Terakhir, Bulan Ini) that set dateFrom/dateTo and push URL; (3) Payment method `<Select>`; (4) Invoice number `<Input>` with debounce (~300ms). All changes call a shared `applyFilters(params)` helper that merges into the current URL and resets `page=1`.

## Summary Cards

Five cards rendered server-side above the table, identical layout to Dashboard cards but not clickable — they just display totals scoped to the active filter. Values from the aggregate query.

## Table & Pagination

shadcn `<Table>` with columns: No Faktur, Jam (from `createdAt`), Tanggal (from `date`), Total Belanja, Status (colored `<Badge>`), Aksi (`[Detail]` button). Rows are the 20-item paginated slice. Pagination controls at bottom: prev/next buttons + page indicator, URL-driven. Empty state shown when no rows match.

## Detail Modal

shadcn `<Dialog>` opened by the `[Detail]` button. Triggered client-side; modal receives the invoice id, fetches `/api/invoices/[id]` (a new API route) to load invoice items, then renders a list: header (No Faktur, Tanggal, Metode, Bank if applicable), item table (Nama Barang, QTY, Harga Satuan, Subtotal), and Total Belanja footer.

## Dependencies to Install

shadcn components via CLI: `calendar`, `popover`, `dialog`, `badge`, `table`, `select`. NPM package: `date-fns` (date formatting and arithmetic).

## File Plan

```
src/app/(dashboard)/reports/
  page.tsx                   # Server Component — reads searchParams, fetches data
  _components/
    FilterBar.tsx            # Client — all filter controls
    SummaryCards.tsx         # Server-renderable — receives totals as props
    InvoiceTable.tsx         # Server-renderable — receives rows + pagination as props
    DetailModal.tsx          # Client — dialog with item fetch
src/app/api/invoices/[id]/
  route.ts                   # GET handler returning invoice + items
```
