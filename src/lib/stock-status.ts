export type StockStatus = 'normal' | 'low' | 'out'

export function getStockStatus(stock: number, minStock: number): StockStatus {
  if (stock === 0) return 'out'
  if (minStock > 0 && stock <= minStock) return 'low'
  return 'normal'
}

export const STOCK_BADGE_CLASS: Record<StockStatus, string> = {
  normal: 'bg-green-100 text-green-800 border-green-200',
  low:    'bg-orange-100 text-orange-800 border-orange-200',
  out:    'bg-red-100 text-red-800 border-red-200',
}

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
