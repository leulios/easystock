import { z } from "zod";
import { PaymentMethod } from "@prisma/client";

export const saleItemInputSchema = z.object({
  variantId: z.string().uuid("Invalid variant ID"),
  quantity: z
    .number({ invalid_type_error: "Quantity must be an integer" })
    .int()
    .min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Price cannot be negative").optional(),
  discount: z.number().min(0, "Discount cannot be negative").optional(),
});

export const paymentInputSchema = z.object({
  paymentMethod: z.nativeEnum(PaymentMethod),
  amount: z.number().positive("Payment amount must be greater than zero"),
  referenceCode: z.string().max(100).optional().nullable(),
  tenderedAmount: z.number().min(0).optional().nullable(),
  changeGiven: z.number().min(0).optional().nullable(),
});

export const createSaleSchema = z.object({
  idempotencyKey: z.string().uuid("Valid UUID idempotency key is required"),
  customerId: z.string().uuid().optional().nullable(),
  items: z.array(saleItemInputSchema).min(1, "At least one item is required in the sale"),
  payments: z.array(paymentInputSchema).min(1, "At least one payment transaction is required"),
  notes: z.string().max(500).optional().nullable(),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;

export const returnItemInputSchema = z.object({
  variantId: z.string().uuid("Invalid variant ID"),
  quantity: z.number().int().positive("Return quantity must be positive"),
  restock: z.boolean().default(true),
});

export const returnSaleSchema = z.object({
  saleId: z.string().uuid("Invalid sale ID"),
  items: z.array(returnItemInputSchema).min(1, "At least one item must be returned"),
  reason: z.string().min(3, "Return reason must be at least 3 characters"),
  refundMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
});

export type ReturnSaleInput = z.infer<typeof returnSaleSchema>;
