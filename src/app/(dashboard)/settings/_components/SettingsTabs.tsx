'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Users } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import BankTab from './BankTab'
import CompanyTab from './CompanyTab'
import PasswordTab from './PasswordTab'
import UsersTab from './UsersTab'

interface Bank {
  id: string
  name: string
  accountNumber: string | null
  accountHolder: string | null
}

interface CompanyProfile {
  name: string
  address: string
  phone: string | null
  logoUrl: string | null
}

interface SettingsTabsProps {
  banks: Bank[]
  profile: CompanyProfile | null
  currentUserId: string
}

export default function SettingsTabs({ banks, profile, currentUserId }: SettingsTabsProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tab = searchParams.get('tab') ?? 'banks'

  function handleTabChange(value: string) {
    router.push(`/settings?tab=${value}`)
  }

  return (
    <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="banks">🏦 Manajemen Bank</TabsTrigger>
        <TabsTrigger value="company">🏢 Info Perusahaan</TabsTrigger>
        <TabsTrigger value="password">🔐 Ganti Password</TabsTrigger>
        <TabsTrigger value="users" className="gap-1.5">
          <Users className="h-4 w-4" />
          Users
        </TabsTrigger>
      </TabsList>

      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
        <TabsContent value="banks">
          <BankTab banks={banks} />
        </TabsContent>
        <TabsContent value="company">
          <CompanyTab profile={profile} />
        </TabsContent>
        <TabsContent value="password">
          <PasswordTab />
        </TabsContent>
        <TabsContent value="users">
          <UsersTab currentUserId={currentUserId} />
        </TabsContent>
      </div>
    </Tabs>
  )
}
