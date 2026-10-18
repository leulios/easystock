import { z } from "zod";

export const supplierSchema = z.object({
  name: z.string().min(2, "Supplier name must be at least 2 characters").max(100),
  contactName: z.string().max(100).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email("Invalid email").optional().nullable().or(z.literal("")),
  address: z.string().max(250).optional().nullable(),
  paymentTerms: z.string().max(100).optional().nullable(),
});

export type SupplierInput = z.infer<typeof supplierSchema>;

export const purchaseOrderItemSchema = z.object({
  variantId: z.string().uuid("Invalid variant ID"),
  orderedQuantity: z.number().int().positive("Ordered quantity must be greater than zero"),
  unitCost: z.number().min(0, "Unit cost cannot be negative"),
});

export const purchaseOrderSchema = z.object({
  supplierId: z.string().uuid("Invalid supplier ID"),
  poNumber: z
    .string()
    .min(2, "PO Number must be at least 2 characters")
    .max(50)
    .regex(/^[A-Za-z0-9_-]+$/, "PO Number can only contain letters, numbers, hyphens, and underscores"),
  expectedDate: z.string().datetime().optional().nullable().or(z.literal("")),
  notes: z.string().max(500).optional().nullable(),
  items: z.array(purchaseOrderItemSchema).min(1, "At least one item is required in the purchase order"),
});

export type PurchaseOrderInput = z.infer<typeof purchaseOrderSchema>;

export const receiveItemSchema = z.object({
  variantId: z.string().uuid("Invalid variant ID"),
  receivedQuantity: z.number().int().positive("Received quantity must be greater than zero"),
  unitCost: z.number().min(0).optional(),
});

export const receivePurchaseSchema = z.object({
  purchaseOrderId: z.string().uuid("Invalid purchase order ID"),
  items: z.array(receiveItemSchema).min(1, "At least one item must be received"),
  notes: z.string().max(500).optional().nullable(),
});

export type ReceivePurchaseInput = z.infer<typeof receivePurchaseSchema>;
