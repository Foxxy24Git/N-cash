import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import LoginForm from './_components/LoginForm'

export const metadata = { title: 'Login — N-Cash' }

export default async function LoginPage() {
  const session = await auth()
  if (session) redirect('/dashboard')

  return <LoginForm />
}
