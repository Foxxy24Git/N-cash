# Auth Setup Design — N-Cash (Phase 3)

**Date:** 2026-04-20
**Scope:** NextAuth v5 (Auth.js beta) Credentials Provider with JWT strategy

---

## Architecture

Four new files, zero new DB tables:

| File | Purpose |
|------|---------|
| `src/auth.ts` | NextAuth config: credentials provider, JWT strategy, bcrypt verify |
| `src/middleware.ts` | Protect all routes except `/login` |
| `src/app/login/page.tsx` | Login form UI (Server + Client components) |
| `src/app/dashboard/page.tsx` | Dashboard placeholder (replaces default home) |

Prisma client instantiation lives in `src/lib/prisma.ts` (singleton pattern using `prisma.config.ts` + `better-sqlite3` adapter).

---

## Auth Flow

1. User visits any route → middleware checks for session JWT cookie
2. No session → redirect to `/login`
3. User submits username + password
4. `authorize()` in `auth.ts` fetches `User` from DB by username, runs `bcryptjs.compare()`
5. Match → NextAuth sets JWT session cookie, redirects to `/dashboard`
6. No match → returns `null` → NextAuth surfaces error → page shows "Username atau password salah"
7. Logout → `signOut()` clears cookie → redirect to `/login`

---

## Files & Responsibilities

### `src/auth.ts`
- `NextAuth({ providers: [Credentials({ authorize })] })`
- JWT strategy (`session: { strategy: "jwt" }`)
- `authorize`: query `User` by username, `bcryptjs.compare`, return `{ id, name: username }` or `null`
- Export `{ handlers, auth, signIn, signOut }`

### `src/middleware.ts`
- Import `auth` from `./auth` and re-export as `default`
- `config.matcher`: protect everything except `/login`, `/_next`, `/favicon.ico`

### `src/app/api/auth/[...nextauth]/route.ts`
- Re-export `handlers` from `auth.ts` (standard NextAuth v5 pattern)

### `src/app/login/page.tsx`
- Server component wrapper (metadata, redirect if already logged in)
- Client component `<LoginForm>` with `useActionState` or `useState`
- Calls `signIn("credentials", { username, password, redirectTo: "/dashboard" })`
- Shows error string below the button if credentials wrong
- UI: centered `div`, title "N-Cash", subtitle "Sistem Rekap Keuangan", shadcn `Input` (needs install) + `Button`

### `src/app/dashboard/page.tsx`
- Server component
- Calls `auth()` to get session
- Renders: heading "Dashboard", "Logged in as: [username]", logout `<form>` with `signOut` server action

---

## Dependencies to Install

```
next-auth@beta
```

Shadcn components to add:
```
npx shadcn@latest add input
```

---

## ENV

`.env.local`:
```
AUTH_SECRET=<openssl rand -base64 32 output>
```

---

## Constraints & Edge Cases

- `AUTH_SECRET` must be in `.env.local`, not committed to git (already in `.gitignore`)
- Prisma client must be a singleton — instantiate once via `prisma.config.ts` adapter, export from `src/lib/prisma.ts`
- NextAuth v5 `authorize` must return `null` (not throw) on bad credentials — NextAuth maps this to the error message
- Middleware matcher must exclude `/_next/static`, `/_next/image`, `/favicon.ico` to avoid redirect loops on assets
- No `Transaction` model referenced in schema — skip that table (already absent from current schema.prisma)

---

## Out of Scope

- Rate limiting on login (Phase 3 skip — PRD AUTH-6 deferred)
- Force password change on first login (Phase 9)
- Multi-user / role support (Phase 3 future)
