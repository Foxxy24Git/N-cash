import type { DefaultSession } from 'next-auth'
import type { JWT } from 'next-auth/jwt' // eslint-disable-line @typescript-eslint/no-unused-vars

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
  }
}
