'use client'

import { ProductFormDialog } from './ProductFormDialog'
import { DeleteProductDialog } from './DeleteProductDialog'
import type { ProductRow } from './StockTable'

interface Props {
  row: ProductRow
}

export function StockCrudButtons({ row }: Props) {
  return (
    <div className="flex items-center justify-center gap-1">
      <button
        disabled
        className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-400 cursor-not-allowed"
      >
        ✏️ Stok
      </button>
      <ProductFormDialog mode="edit" product={row} />
      <DeleteProductDialog id={row.id} name={row.name} />
    </div>
  )
}
