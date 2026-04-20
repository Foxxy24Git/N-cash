'use client'

import { useRouter } from 'next/navigation'
import { useEffect, type ReactNode } from 'react'

export default function DashboardClient({ children }: { children: ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    const id = setInterval(() => router.refresh(), 30_000)
    return () => clearInterval(id)
  }, [router])

  return <>{children}</>
}
