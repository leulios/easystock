import { z } from "zod";

export const customerInputSchema = z.object({
  name: z.string().min(2, "Customer name must be at least 2 characters").max(100),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email("Invalid email address").optional().nullable().or(z.literal("")),
  address: z.string().max(255).optional().nullable(),
});

export type CustomerInput = z.infer<typeof customerInputSchema>;

export const adjustCreditSchema = z.object({
  customerId: z.string().uuid("Invalid customer ID"),
  amountDelta: z.number().refine((val) => val !== 0, "Amount delta must not be zero"),
  reason: z.string().min(3, "Reason must be at least 3 characters").max(255),
});

export type AdjustCreditInput = z.infer<typeof adjustCreditSchema>;
