import { Suspense } from 'react'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import SettingsTabs from './_components/SettingsTabs'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Setting — N-Cash' }

export default async function SettingsPage() {
  const [session, banks, profile] = await Promise.all([
    auth(),
    prisma.bank.findMany({ orderBy: { name: 'asc' } }),
    prisma.companyProfile.findFirst(),
  ])

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <h1 className="text-xl font-semibold text-gray-900">Pengaturan</h1>
      <Suspense fallback={<div className="h-32 bg-white rounded-xl border border-gray-200 animate-pulse" />}>
        <SettingsTabs banks={banks} profile={profile} currentUserId={session!.user.id} />
      </Suspense>
    </div>
  )
}
