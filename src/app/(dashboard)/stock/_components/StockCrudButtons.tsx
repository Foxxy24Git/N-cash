'use client'

import { useState } from 'react'
import { MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ProductFormDialog } from './ProductFormDialog'
import { DeleteProductDialog } from './DeleteProductDialog'
import { StockAdjustmentDialog } from './StockAdjustmentDialog'
import type { ProductRow } from './StockTable'

interface Props {
  row: ProductRow
}

export function StockCrudButtons({ row }: Props) {
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [editOpen, setEditOpen]     = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      {/* Desktop: inline trigger buttons (dialogs manage their own open state) */}
      <div className="hidden md:flex items-center justify-center gap-1">
        <StockAdjustmentDialog
          productId={row.id}
          productName={row.name}
          currentStock={row.stock}
          unit={row.unit}
        />
        <ProductFormDialog mode="edit" product={row} />
        <DeleteProductDialog id={row.id} name={row.name} />
      </div>

      {/* Mobile: three-dot dropdown + controlled dialogs */}
      <div className="flex md:hidden items-center justify-center">
        <StockAdjustmentDialog
          productId={row.id}
          productName={row.name}
          currentStock={row.stock}
          unit={row.unit}
          open={adjustOpen}
          onOpenChange={setAdjustOpen}
        />
        <ProductFormDialog
          mode="edit"
          product={row}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
        <DeleteProductDialog
          id={row.id}
          name={row.name}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
              aria-label="Aksi"
            >
              <MoreVertical size={16} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setAdjustOpen(true)}>
              ✏️ Sesuaikan Stok
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setEditOpen(true)}>
              ✏️ Edit Barang
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => setDeleteOpen(true)}
              className="text-red-600 focus:text-red-600"
            >
              🗑️ Hapus Barang
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  )
}
