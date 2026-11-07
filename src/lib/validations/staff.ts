import { z } from "zod";
import { ShopRole } from "@prisma/client";

export const inviteStaffSchema = z
  .object({
    usernameOrEmail: z
      .string()
      .min(2, "Username or email must be at least 2 characters")
      .max(100)
      .toLowerCase()
      .trim()
      .optional(),
    email: z.string().toLowerCase().trim().optional(),
    fullName: z.string().min(2, "Full name must be at least 2 characters").max(100).trim(),
    password: z.string().min(6, "Password must be at least 6 characters long").optional(),
    phone: z.string().optional().nullable().or(z.literal("")),
    role: z.nativeEnum(ShopRole),
    pin: z
      .string()
      .regex(/^\d{4,6}$/, "POS PIN must be 4 to 6 numeric digits")
      .optional()
      .nullable()
      .or(z.literal("")),
    canViewReports: z.boolean().optional().default(false),
    canApplyDiscount: z.boolean().optional().default(false),
    canAdjustStock: z.boolean().optional().default(false),
  })
  .refine((data) => Boolean(data.usernameOrEmail || data.email), {
    message: "A username or email address is required",
    path: ["usernameOrEmail"],
  });

export type InviteStaffInput = z.input<typeof inviteStaffSchema>;

export const updateStaffSchema = z.object({
  membershipId: z.string().uuid("Invalid membership ID"),
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(100).trim().optional(),
  phone: z.string().optional().nullable().or(z.literal("")),
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

export const resetStaffPasswordSchema = z.object({
  membershipId: z.string().uuid("Invalid membership ID"),
  newPassword: z.string().min(6, "Password must be at least 6 characters long"),
});

export type ResetStaffPasswordInput = z.infer<typeof resetStaffPasswordSchema>;

export const toggleStaffStatusSchema = z.object({
  membershipId: z.string().uuid("Invalid membership ID"),
  isActive: z.boolean(),
});

export type ToggleStaffStatusInput = z.infer<typeof toggleStaffStatusSchema>;
