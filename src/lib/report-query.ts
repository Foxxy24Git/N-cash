export const PAGE_SIZE = 20

export type PaymentMethodFilter = 'Cash' | 'QRIS' | 'Transfer Bank' | 'BON' | ''

export interface ReportParams {
  dateFrom: Date   // inclusive lower bound (Jakarta midnight as UTC)
  dateTo: Date     // exclusive upper bound (Jakarta midnight+1day as UTC)
  method: PaymentMethodFilter
  search: string
  page: number
  // raw strings for handing back to FilterBar
  dateFromStr: string  // YYYY-MM-DD
  dateToStr: string    // YYYY-MM-DD
}

/** Resolve searchParams → typed ReportParams.
 *  Handles both ?date=today (dashboard deep-links) and ?dateFrom=X&dateTo=Y (FilterBar). */
export function parseReportParams(
  searchParams: Record<string, string | string[] | undefined>
): ReportParams {
  const get = (key: string): string => {
    const v = searchParams[key]
    return typeof v === 'string' ? v : ''
  }

  const todayJakarta = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })

  const dateShortcut = get('date')
  let fromStr = get('dateFrom') || todayJakarta
  let toStr   = get('dateTo')   || todayJakarta

  if (dateShortcut === 'today') { fromStr = todayJakarta; toStr = todayJakarta }

  const dateFrom = new Date(`${fromStr}T00:00:00+07:00`)
  const dateTo   = new Date(`${toStr}T00:00:00+07:00`)
  dateTo.setDate(dateTo.getDate() + 1)  // exclusive upper bound

  const method = get('method') as PaymentMethodFilter
  const search = get('search').trim()
  const page   = Math.max(1, parseInt(get('page') || '1', 10))

  return { dateFrom, dateTo, method, search, page, dateFromStr: fromStr, dateToStr: toStr }
}

/** Plain-object row passed from server to InvoiceTable (no Date objects). */
export interface InvoiceRow {
  id: string
  invoiceNumber: string
  time: string        // pre-formatted "HH:mm"
  date: string        // pre-formatted "DD/MM/YYYY"
  totalAmount: number
  paymentMethod: string
  bankName: string | null
}

export interface ReportTotals {
  total: number
  cash: number
  qris: number
  bank: number
  bon: number
}
