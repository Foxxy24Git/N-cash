import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Sidebar from './_components/Sidebar'
import Header from './_components/Header'
import BottomNav from './_components/BottomNav'
import { Toaster } from '@/components/ui/sonner'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const company = await prisma.companyProfile.findFirst().catch(() => null)
  const companyName = company?.name ?? 'N-Cash'

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col min-h-screen md:ml-60">
        <Header companyName={companyName} />
        <main className="flex-1 p-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>
      <BottomNav />
      <Toaster position="top-center" richColors />
    </div>
  )
}
