import { z } from "zod";

// Standard Mandatory Category definition
export const STANDARD_TRANSPORTATION_CATEGORY_EN = "Transportation Cost";
export const STANDARD_TRANSPORTATION_CATEGORY_AM = "የትራንስፖርት ወጪ";

export const expenseCategorySchema = z
  .string({ required_error: "Expense category is required" })
  .trim()
  .min(1, "Expense category cannot be empty")
  .max(100, "Category name cannot exceed 100 characters");

export const expenseSchema = z.object({
  category: expenseCategorySchema,
  amount: z
    .number({ invalid_type_error: "Amount must be a number" })
    .positive("Expense amount must be greater than zero"),
  expenseDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  description: z.string().max(500).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const customCategoryInputSchema = z.object({
  name: z
    .string({ required_error: "Category name is required" })
    .trim()
    .min(1, "Category name cannot be empty")
    .max(100, "Category name cannot exceed 100 characters"),
});

export const updateCustomCategoryInputSchema = z.object({
  id: z.string().min(1, "Category ID is required"),
  name: z
    .string({ required_error: "Category name is required" })
    .trim()
    .min(1, "Category name cannot be empty")
    .max(100, "Category name cannot exceed 100 characters"),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;
export type CustomCategoryInput = z.infer<typeof customCategoryInputSchema>;
export type UpdateCustomCategoryInput = z.infer<typeof updateCustomCategoryInputSchema>;

// Kept for backward compatibility
export const expenseCategoryEnum = z.string();
