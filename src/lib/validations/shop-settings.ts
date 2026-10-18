import { z } from "zod";

export const updateShopSettingsSchema = z.object({
  name: z.string().min(2, "Shop name must be at least 2 characters").max(100),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email("Invalid email address").optional().nullable().or(z.literal("")),
  address: z.string().max(255).optional().nullable(),
  currency: z.string().min(2, "Currency code is required").max(10),
  taxRate: z
    .number({ invalid_type_error: "Tax rate must be a number" })
    .min(0, "Tax rate cannot be negative")
    .max(100, "Tax rate cannot exceed 100%"),
  taxNumber: z.string().max(50).optional().nullable(),
  receiptHeader: z.string().max(255).optional().nullable(),
  receiptFooter: z.string().max(255).optional().nullable(),
  allowNegativeStock: z.boolean(),
});

export type UpdateShopSettingsInput = z.infer<typeof updateShopSettingsSchema>;
