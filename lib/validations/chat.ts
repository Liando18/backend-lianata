import { z } from "zod";

export const sendChatMessageSchema = z
  .object({
    sessionId: z.string().uuid("ID sesi tidak valid").optional().nullable(),
    message: z
      .string()
      .trim()
      .min(1, "Pesan tidak boleh kosong")
      .max(1000, "Pesan maksimal 1000 karakter"),
  })
  .strict();

export const createSessionSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Judul sesi tidak boleh kosong")
      .max(255)
      .optional(),
  })
  .strict();

export type SendChatMessageInput = z.infer<typeof sendChatMessageSchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
