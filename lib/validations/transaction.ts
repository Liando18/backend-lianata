import { z } from "zod";

export const createTransactionSchema = z
  .object({
    type: z.enum(["income", "expense"], {
      message: "Tipe transaksi harus 'income' atau 'expense'",
    }),
    amount: z
      .union([z.number(), z.string()])
      .transform((val) => {
        if (typeof val === "string") {
          const cleaned = val.replace(/\./g, "").replace(/,/g, ".");
          return parseFloat(cleaned);
        }
        return val;
      })
      .pipe(
        z
          .number({ message: "Jumlah harus berupa angka" })
          .positive("Jumlah harus lebih besar dari 0")
      ),
    description: z
      .string()
      .trim()
      .min(1, "Deskripsi transaksi tidak boleh kosong")
      .max(255, "Deskripsi maksimal 255 karakter"),
    categoryId: z.string().uuid("ID Kategori tidak valid").optional().nullable(),
    transactionDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "Format tanggal transaksi harus berupa tanggal valid",
      })
      .optional(),
    source: z.enum(["manual", "ai_chat"]).optional().default("manual"),
    rawPrompt: z.string().optional().nullable(),
  })
  .strict();

export const updateTransactionSchema = z
  .object({
    type: z
      .enum(["income", "expense"], {
        message: "Tipe transaksi harus 'income' atau 'expense'",
      })
      .optional(),
    amount: z
      .union([z.number(), z.string()])
      .transform((val) => {
        if (typeof val === "string") {
          const cleaned = val.replace(/\./g, "").replace(/,/g, ".");
          return parseFloat(cleaned);
        }
        return val;
      })
      .pipe(
        z
          .number({ message: "Jumlah harus berupa angka" })
          .positive("Jumlah harus lebih besar dari 0")
      )
      .optional(),
    description: z
      .string()
      .trim()
      .min(1, "Deskripsi transaksi tidak boleh kosong")
      .max(255, "Deskripsi maksimal 255 karakter")
      .optional(),
    categoryId: z.string().uuid("ID Kategori tidak valid").optional().nullable(),
    transactionDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "Format tanggal transaksi harus berupa tanggal valid",
      })
      .optional(),
  })
  .strict();

export const transactionQuerySchema = z.object({
  type: z.enum(["income", "expense"]).optional(),
  categoryId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Math.max(1, parseInt(val, 10) || 1) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10) || 20)) : 20)),
});

export const createCategorySchema = z
  .object({
    name: z.string().trim().min(1, "Nama kategori tidak boleh kosong").max(100),
    type: z.enum(["income", "expense"], {
      message: "Tipe kategori harus 'income' atau 'expense'",
    }),
    icon: z.string().max(50).optional(),
    color: z.string().max(20).optional(),
  })
  .strict();

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type TransactionQueryInput = z.infer<typeof transactionQuerySchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
