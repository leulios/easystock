import { z } from "zod";

export const registerSchema = z.object({
  organizationName: z
    .string()
    .min(2, "Organization name must be at least 2 characters")
    .max(100, "Organization name cannot exceed 100 characters"),
  shopName: z
    .string()
    .min(2, "Shop name must be at least 2 characters")
    .max(100, "Shop name cannot exceed 100 characters"),
  shopCode: z
    .string()
    .min(2, "Shop code must be at least 2 characters")
    .max(20, "Shop code cannot exceed 20 characters")
    .regex(/^[A-Za-z0-9_-]+$/, "Shop code can only contain letters, numbers, hyphens, and underscores"),
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name cannot exceed 100 characters"),
  email: z
    .string()
    .email("Please provide a valid email address")
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  currency: z
    .string()
    .default("USD"),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z
    .string()
    .email("Please provide a valid email address")
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const switchShopSchema = z.object({
  shopId: z.string().uuid("Invalid shop ID format"),
});

export type SwitchShopInput = z.infer<typeof switchShopSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Recovery token is required"),
    email: z.string().email("Valid email address is required").toLowerCase().trim(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

