'use client'

import { useState, useEffect } from 'react'
import { Building2 } from 'lucide-react'

export default function Header({ companyName }: { companyName: string }) {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formattedDate = now
    ? now.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Jakarta',
      })
    : ''

  const formattedTime = now
    ? now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
      })
    : ''

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-2">
        <Building2 size={18} className="text-blue-600" />
        <span className="font-semibold text-gray-900">{companyName}</span>
      </div>
      {now && (
        <div className="text-right">
          <div className="text-sm font-medium text-gray-700">{formattedDate}</div>
          <div className="text-xs text-gray-500">{formattedTime} WIB</div>
        </div>
      )}
    </header>
  )
}
