import { auth } from '@/auth'
import { signOut } from '@/auth'
import { redirect } from 'next/navigation'

export const metadata = { title: 'Dashboard — N-Cash' }

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  async function handleSignOut() {
    'use server'
    await signOut({ redirectTo: '/login' })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
      <p className="text-gray-600">
        Logged in as: <span className="font-semibold">{session.user?.name}</span>
      </p>
      <form action={handleSignOut}>
        <button
          type="submit"
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
        >
          Logout
        </button>
      </form>
    </div>
  )
}
