import { z } from 'zod'

export const createUserSchema = z.object({
  username: z
    .string()
    .min(3, 'Username minimal 3 karakter')
    .max(20, 'Username maksimal 20 karakter')
    .regex(/^[a-z0-9_]+$/, 'Username hanya boleh huruf kecil, angka, dan underscore'),
  fullName: z
    .string()
    .min(3, 'Nama lengkap minimal 3 karakter')
    .max(100, 'Nama lengkap maksimal 100 karakter'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
})

export const updateUserSchema = z.object({
  fullName: z
    .string()
    .min(3, 'Nama lengkap minimal 3 karakter')
    .max(100, 'Nama lengkap maksimal 100 karakter')
    .optional(),
  isActive: z.boolean().optional(),
  newPassword: z.string().min(8, 'Password minimal 8 karakter').optional(),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
