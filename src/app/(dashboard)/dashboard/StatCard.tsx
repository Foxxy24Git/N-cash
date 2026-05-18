import Link from 'next/link'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string
  icon: LucideIcon
  href: string
  colorScheme: 'gray' | 'green' | 'dark-green' | 'blue' | 'yellow' | 'red' | 'orange'
}

const colors: Record<StatCardProps['colorScheme'], { bg: string; icon: string; label: string }> = {
  gray:       { bg: 'bg-gray-50 hover:bg-gray-100',     icon: 'text-gray-500',   label: 'text-gray-600' },
  green:      { bg: 'bg-green-50 hover:bg-green-100',   icon: 'text-green-600',  label: 'text-green-700' },
  'dark-green': { bg: 'bg-green-100 hover:bg-green-200', icon: 'text-green-700', label: 'text-green-800' },
  blue:       { bg: 'bg-blue-50 hover:bg-blue-100',     icon: 'text-blue-600',   label: 'text-blue-700' },
  yellow:     { bg: 'bg-yellow-50 hover:bg-yellow-100', icon: 'text-yellow-600', label: 'text-yellow-700' },
  red:        { bg: 'bg-red-50 hover:bg-red-100',       icon: 'text-red-600',    label: 'text-red-700' },
  orange:     { bg: 'bg-orange-50 hover:bg-orange-100', icon: 'text-orange-500', label: 'text-orange-600' },
}

export default function StatCard({ label, value, icon: Icon, href, colorScheme }: StatCardProps) {
  const c = colors[colorScheme]
  return (
    <Link
      href={href}
      className={`${c.bg} rounded-xl p-5 flex items-center gap-4 transition-colors`}
    >
      <div className={`${c.icon} shrink-0`}>
        <Icon size={32} strokeWidth={1.5} />
      </div>
      <div className="min-w-0">
        <p className={`text-sm font-medium ${c.label} truncate`}>{label}</p>
        <p className="text-2xl font-bold text-gray-900 font-mono tracking-tight mt-0.5">{value}</p>
      </div>
    </Link>
  )
}
