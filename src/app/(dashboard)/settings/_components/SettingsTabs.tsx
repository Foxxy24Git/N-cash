'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import BankTab from './BankTab'
import CompanyTab from './CompanyTab'
import PasswordTab from './PasswordTab'

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
}

export default function SettingsTabs({ banks, profile }: SettingsTabsProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tab = searchParams.get('tab') ?? 'banks'

  function handleTabChange(value: string) {
    router.push(`/settings?tab=${value}`)
  }

  return (
    <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="banks">🏦 Manajemen Bank</TabsTrigger>
        <TabsTrigger value="company">🏢 Info Perusahaan</TabsTrigger>
        <TabsTrigger value="password">🔐 Ganti Password</TabsTrigger>
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
      </div>
    </Tabs>
  )
}
