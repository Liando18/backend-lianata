import { z } from "zod";

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
    email: z.string().trim().email("Format email tidak valid").toLowerCase(),
    password: z
      .string()
      .min(8, "Password minimal 8 karakter")
      .regex(/[A-Za-z]/, "Password harus mengandung huruf")
      .regex(/[0-9]/, "Password harus mengandung angka"),
    phone: z.string().trim().optional(),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().trim().min(1, "Email atau nomor handphone tidak boleh kosong"),
    password: z.string().min(1, "Password tidak boleh kosong"),
  })
  .strict();

export const refreshTokenSchema = z
  .object({
    refreshToken: z.string().min(1, "Refresh token tidak boleh kosong"),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
