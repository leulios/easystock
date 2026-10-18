import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters").max(150),
  sku: z
    .string()
    .min(2, "SKU must be at least 2 characters")
    .max(50)
    .regex(/^[A-Za-z0-9_-]+$/, "SKU can only contain letters, numbers, hyphens, and underscores"),
  barcode: z.string().max(100).optional().nullable(),
  categoryId: z.string().uuid("Invalid category ID").optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  unitOfMeasure: z.string().min(1, "Unit of measure is required").default("pcs"),
  costPrice: z
    .number({ invalid_type_error: "Cost price must be a number" })
    .min(0, "Cost price cannot be negative"),
  sellingPrice: z
    .number({ invalid_type_error: "Selling price must be a number" })
    .min(0, "Selling price cannot be negative"),
  reorderLevel: z
    .number({ invalid_type_error: "Reorder level must be an integer" })
    .int("Reorder level must be an integer")
    .min(0, "Reorder level cannot be negative")
    .default(5),
  initialStock: z
    .number({ invalid_type_error: "Initial stock must be an integer" })
    .int("Initial stock must be an integer")
    .min(0, "Initial stock cannot be negative")
    .default(0),
});

export type ProductInput = z.infer<typeof productSchema>;

export const categorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters").max(100),
  description: z.string().max(500).optional().nullable(),
});

export type CategoryInput = z.infer<typeof categorySchema>;

export const stockAdjustmentSchema = z.object({
  variantId: z.string().uuid("Invalid variant ID"),
  adjustmentType: z.enum(["SET_QUANTITY", "ADD_QUANTITY", "DEDUCT_QUANTITY"]),
  quantity: z
    .number({ invalid_type_error: "Quantity must be a positive integer" })
    .int()
    .min(1, "Quantity must be at least 1"),
  reason: z.string().min(3, "A valid reason (at least 3 characters) is mandatory for stock adjustments"),
  notes: z.string().max(500).optional().nullable(),
});

export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
