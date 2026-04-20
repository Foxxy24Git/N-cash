import { Wallet, Banknote, Smartphone, Landmark, AlertCircle } from 'lucide-react'
import { formatRupiah } from '@/lib/format'
import type { ReportTotals } from '@/lib/report-query'

const CARDS = [
  { key: 'total' as const, label: 'Total Keuntungan', Icon: Wallet,        bg: 'bg-gray-50',   iconCls: 'text-gray-500',   labelCls: 'text-gray-600' },
  { key: 'cash'  as const, label: 'Total Cash',       Icon: Banknote,      bg: 'bg-green-50',  iconCls: 'text-green-600',  labelCls: 'text-green-700' },
  { key: 'qris'  as const, label: 'Total QRIS',       Icon: Smartphone,    bg: 'bg-blue-50',   iconCls: 'text-blue-600',   labelCls: 'text-blue-700' },
  { key: 'bank'  as const, label: 'Total Bank',       Icon: Landmark,      bg: 'bg-yellow-50', iconCls: 'text-yellow-600', labelCls: 'text-yellow-700' },
  { key: 'bon'   as const, label: 'Total BON',        Icon: AlertCircle,   bg: 'bg-red-50',    iconCls: 'text-red-600',    labelCls: 'text-red-700' },
]

export default function SummaryCards({ totals }: { totals: ReportTotals }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {CARDS.map(({ key, label, Icon, bg, iconCls, labelCls }) => (
        <div key={key} className={`${bg} rounded-xl p-4 flex items-center gap-3`}>
          <Icon size={24} className={`${iconCls} shrink-0`} strokeWidth={1.5} />
          <div className="min-w-0">
            <p className={`text-xs font-medium ${labelCls} truncate`}>{label}</p>
            <p className="text-sm font-bold text-gray-900 font-mono mt-0.5">
              {formatRupiah(totals[key])}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
