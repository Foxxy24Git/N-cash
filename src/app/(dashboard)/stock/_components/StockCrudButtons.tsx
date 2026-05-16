'use client'

import { ProductFormDialog } from './ProductFormDialog'
import { DeleteProductDialog } from './DeleteProductDialog'
import { StockAdjustmentDialog } from './StockAdjustmentDialog'
import type { ProductRow } from './StockTable'

interface Props {
  row: ProductRow
}

export function StockCrudButtons({ row }: Props) {
  return (
    <div className="flex items-center justify-center gap-1">
      <StockAdjustmentDialog
        productId={row.id}
        productName={row.name}
        currentStock={row.stock}
        unit={row.unit}
      />
      <ProductFormDialog mode="edit" product={row} />
      <DeleteProductDialog id={row.id} name={row.name} />
    </div>
  )
}
