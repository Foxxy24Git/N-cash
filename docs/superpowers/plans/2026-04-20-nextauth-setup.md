# NextAuth v5 Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add login/logout to N-Cash using NextAuth v5 (Auth.js beta) with Credentials Provider and JWT session strategy.

**Architecture:** NextAuth v5 is configured in `src/auth.ts`, which exports `handlers`, `auth`, `signIn`, `signOut`. Middleware in `src/middleware.ts` wraps `auth` to protect all routes except `/login`. The login page uses a client-side form calling `signIn('credentials', { redirect: false })` from `next-auth/react`, then manually redirects on success. Dashboard is a server component that reads the session with `auth()`.

**Tech Stack:** next-auth@beta, bcryptjs (already installed), @prisma/client + @prisma/adapter-better-sqlite3 (already installed), shadcn Input component

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/lib/prisma.ts` | Prisma client singleton using better-sqlite3 adapter |
| Create | `src/auth.ts` | NextAuth config: Credentials provider + JWT strategy |
| Create | `src/app/api/auth/[...nextauth]/route.ts` | NextAuth HTTP handlers (GET + POST) |
| Create | `src/middleware.ts` | Protect all routes except `/login` and static assets |
| Create | `src/app/login/page.tsx` | Server component: redirect to /dashboard if already logged in |
| Create | `src/app/login/_components/LoginForm.tsx` | Client component: form, error state, calls signIn |
| Create | `src/app/dashboard/page.tsx` | Server component: shows username + logout button |
| Modify | `src/app/page.tsx` | Redirect root `/` to `/dashboard` |
| Create | `.env.local` | AUTH_SECRET env var |

---

## Task 1: Install next-auth + add shadcn Input

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install next-auth beta**

```bash
cd /Users/user/N-Cash && npm install next-auth@beta
```

Expected: `next-auth@5.x.x` appears in `package.json` dependencies. No errors.

- [ ] **Step 2: Add shadcn Input component**

```bash
npx shadcn@latest add input
```

When prompted, press Enter to accept defaults. Expected: `src/components/ui/input.tsx` created.

- [ ] **Step 3: Generate AUTH_SECRET and write .env.local**

```bash
openssl rand -base64 32
```

Copy the output, then create `.env.local` in the project root:

```
AUTH_SECRET=<paste the generated string here>
```

- [ ] **Step 4: Verify input component exists**

```bash
ls /Users/user/N-Cash/src/components/ui/
```

Expected output includes `input.tsx` and `button.tsx`.

- [ ] **Step 5: Commit**

```bash
cd /Users/user/N-Cash
git add package.json package-lock.json src/components/ui/input.tsx .env.local
git commit -m "chore: install next-auth beta and add shadcn input"
```

---

## Task 2: Prisma client singleton

**Files:**
- Create: `src/lib/prisma.ts`

- [ ] **Step 1: Create `src/lib/prisma.ts`**

```typescript
import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'node:path'

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db')
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` })

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/user/N-Cash && npx tsc --noEmit
```

Expected: no errors relating to `src/lib/prisma.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/prisma.ts
git commit -m "feat: add Prisma client singleton"
```

---

## Task 3: NextAuth config (`src/auth.ts`)

**Files:**
- Create: `src/auth.ts`

- [ ] **Step 1: Create `src/auth.ts`**

```typescript
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { username: credentials.username as string },
        })
        if (!user) return null

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        )
        if (!passwordMatch) return null

        return { id: user.id, name: user.username }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
})
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/user/N-Cash && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/auth.ts
git commit -m "feat: configure NextAuth credentials provider with JWT strategy"
```

---

## Task 4: NextAuth route handler

**Files:**
- Create: `src/app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: Create directory and route file**

```bash
mkdir -p /Users/user/N-Cash/src/app/api/auth/\[...nextauth\]
```

Create `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from '@/auth'

export const { GET, POST } = handlers
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/api/auth/[...nextauth]/route.ts"
git commit -m "feat: add NextAuth route handler"
```

---

## Task 5: Middleware — protect all routes

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Create `src/middleware.ts`**

```typescript
export { auth as default } from '@/auth'

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|login).*)',
  ],
}
```

- [ ] **Step 2: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: add middleware to protect all routes except /login"
```

---

## Task 6: Login page

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/app/login/_components/LoginForm.tsx`

- [ ] **Step 1: Create `src/app/login/_components/LoginForm.tsx`**

```bash
mkdir -p /Users/user/N-Cash/src/app/login/_components
```

```typescript
'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function LoginForm() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const result = await signIn('credentials', {
      username: formData.get('username') as string,
      password: formData.get('password') as string,
      redirect: false,
    })

    if (result?.error) {
      setError('Username atau password salah')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-blue-600">N-Cash</h1>
          <p className="text-sm text-gray-500 mt-1">Sistem Rekap Keuangan</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <Input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              placeholder="admin"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Memproses...' : 'Masuk'}
          </Button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/app/login/page.tsx`**

```typescript
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import LoginForm from './_components/LoginForm'

export const metadata = { title: 'Login — N-Cash' }

export default async function LoginPage() {
  const session = await auth()
  if (session) redirect('/dashboard')

  return <LoginForm />
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/login/
git commit -m "feat: add login page with credentials form"
```

---

## Task 7: Dashboard placeholder + root redirect

**Files:**
- Create: `src/app/dashboard/page.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create `src/app/dashboard/page.tsx`**

```bash
mkdir -p /Users/user/N-Cash/src/app/dashboard
```

```typescript
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
```

- [ ] **Step 2: Replace `src/app/page.tsx` with a redirect**

Replace the entire file content with:

```typescript
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/dashboard')
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/page.tsx src/app/page.tsx
git commit -m "feat: add dashboard placeholder and redirect root to /dashboard"
```

---

## Task 8: Manual verification

- [ ] **Step 1: Start dev server**

```bash
cd /Users/user/N-Cash && npm run dev
```

- [ ] **Step 2: Test redirect to login**

Open `http://localhost:3000` in browser.

Expected: automatically redirected to `http://localhost:3000/login`. Login card visible with title "N-Cash".

- [ ] **Step 3: Test wrong password**

Enter username `admin`, password `wrongpassword`, click Masuk.

Expected: red error "Username atau password salah" appears, not redirected.

- [ ] **Step 4: Test successful login**

Enter username `admin`, password `admin123`, click Masuk.

Expected: redirected to `http://localhost:3000/dashboard`. Text shows "Logged in as: admin".

- [ ] **Step 5: Test logout**

Click the Logout button.

Expected: redirected back to `/login`.

- [ ] **Step 6: Test direct access to protected route while logged out**

While logged out, visit `http://localhost:3000/dashboard` directly.

Expected: redirected to `/login`.
