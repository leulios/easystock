import { z } from "zod";
import { ShopRole } from "@prisma/client";

export const inviteStaffSchema = z.object({
  email: z.string().email("A valid email address is required").toLowerCase(),
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(100),
  role: z.nativeEnum(ShopRole),
  pin: z
    .string()
    .regex(/^\d{4,6}$/, "POS PIN must be 4 to 6 numeric digits")
    .optional()
    .nullable()
    .or(z.literal("")),
  canViewReports: z.boolean().default(false),
  canApplyDiscount: z.boolean().default(false),
  canAdjustStock: z.boolean().default(false),
});

export type InviteStaffInput = z.infer<typeof inviteStaffSchema>;

export const updateStaffSchema = z.object({
  membershipId: z.string().uuid("Invalid membership ID"),
  role: z.nativeEnum(ShopRole),
  pin: z
    .string()
    .regex(/^\d{4,6}$/, "POS PIN must be 4 to 6 numeric digits")
    .optional()
    .nullable()
    .or(z.literal("")),
  canViewReports: z.boolean(),
  canApplyDiscount: z.boolean(),
  canAdjustStock: z.boolean(),
});

export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
