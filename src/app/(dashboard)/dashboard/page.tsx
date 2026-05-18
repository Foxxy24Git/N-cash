import { Wallet, Banknote, Smartphone, Landmark, AlertCircle, TrendingUp } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { formatRupiah } from '@/lib/format'
import StatCard from './StatCard'
import DashboardClient from './DashboardClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Dashboard — N-Cash' }

function getTodayBoundsJakarta(): { todayStart: Date; todayEnd: Date } {
  const todayJakarta = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
  const todayStart = new Date(`${todayJakarta}T00:00:00+07:00`)
  const todayEnd = new Date(todayStart)
  todayEnd.setDate(todayEnd.getDate() + 1)
  return { todayStart, todayEnd }
}

export default async function DashboardPage() {
  const { todayStart, todayEnd } = getTodayBoundsJakarta()

  // invoices stored with date=YYYY-MM-DDT00:00:00Z (UTC midnight); Jakarta bounds contain it
  const [invoices, paymentLogs, profitItems] = await Promise.all([
    prisma.invoice.findMany({
      where: { deletedAt: null, date: { gte: todayStart, lt: todayEnd } },
      select: { totalAmount: true, paymentMethod: true, paidAt: true },
    }).catch(() => []),
    // BON settlements recorded today (may be for invoices from any date)
    prisma.paymentLog.findMany({
      where: { paidAt: { gte: todayStart, lt: todayEnd } },
      select: { amount: true, paidMethod: true },
    }).catch(() => []),
    // Items linked to stock with buy price snapshot — used for net profit calculation
    prisma.invoiceItem.findMany({
      where: {
        productId: { not: null },
        buyPriceSnapshot: { not: null },
        invoice: { deletedAt: null, date: { gte: todayStart, lt: todayEnd } },
      },
      select: { unitPrice: true, buyPriceSnapshot: true, quantity: true },
    }).catch(() => []),
  ])

  let total = 0
  let labaBersih = 0
  let cash = 0
  let qris = 0
  let bank = 0
  let bon = 0

  for (const inv of invoices) {
    const amount = Number(inv.totalAmount)
    total += amount
    if (inv.paymentMethod === 'Cash' || inv.paymentMethod === 'Cash COD') cash += amount
    else if (inv.paymentMethod === 'QRIS') qris += amount
    else if (inv.paymentMethod === 'Transfer Bank') bank += amount
    else if (inv.paymentMethod === 'BON' && inv.paidAt === null) bon += amount
    // settled BON: total already counted above; cash/qris/bank comes from PaymentLog below
  }

  for (const item of profitItems) {
    labaBersih += (Number(item.unitPrice) - Number(item.buyPriceSnapshot)) * Number(item.quantity)
  }

  for (const log of paymentLogs) {
    const amount = Number(log.amount)
    if (log.paidMethod === 'Cash' || log.paidMethod === 'Cash COD') cash += amount
    else if (log.paidMethod === 'QRIS') qris += amount
    else if (log.paidMethod === 'Transfer Bank') bank += amount
  }

  const cards = [
    {
      label: 'Total Omzet (Hari Ini)',
      value: formatRupiah(total),
      icon: Wallet,
      href: '/reports?date=today',
      colorScheme: 'gray' as const,
    },
    {
      label: 'Keuntungan Bersih (Hari Ini)',
      value: formatRupiah(labaBersih),
      icon: TrendingUp,
      href: '/reports?date=today',
      colorScheme: 'dark-green' as const,
    },
    {
      label: 'Total Pembayaran Cash',
      value: formatRupiah(cash),
      icon: Banknote,
      href: '/reports?date=today&method=Cash',
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
      href: '/reports?date=today&method=Transfer Bank',
      colorScheme: 'yellow' as const,
    },
    {
      label: 'Total Belum Bayar (BON)',
      value: formatRupiah(bon),
      icon: AlertCircle,
      href: '/reports?date=today&method=BON',
      colorScheme: 'red' as const,
    },
  ]

  return (
    <DashboardClient>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-semibold text-gray-900 mb-6">Ringkasan Hari Ini</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </div>
      </div>
    </DashboardClient>
  )
}
