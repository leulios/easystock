import { z } from "zod";

export const expenseCategoryEnum = z.enum([
  "Rent",
  "Utilities",
  "Salaries",
  "Supplies",
  "Marketing",
  "Maintenance",
  "Insurance",
  "Other",
]);

export const expenseSchema = z.object({
  category: expenseCategoryEnum,
  amount: z
    .number({ invalid_type_error: "Amount must be a number" })
    .positive("Expense amount must be greater than zero"),
  expenseDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  description: z.string().max(500).optional().nullable(),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;
