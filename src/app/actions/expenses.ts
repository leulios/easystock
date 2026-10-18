"use server";

import { getCurrentContext } from "./auth";
import { expenseSchema, ExpenseInput } from "@/lib/validations/expense";
import { createExpense, listExpenses } from "@/lib/services/expense-service";
import { revalidatePath } from "next/cache";

export async function createExpenseAction(data: ExpenseInput) {
  const context = await getCurrentContext();
  if (!context) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = expenseSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const expense = await createExpense(context, parsed.data);
    revalidatePath(`/${context.shopId}/expenses`);
    revalidatePath(`/${context.shopId}/dashboard`);
    revalidatePath(`/${context.shopId}/reports`);
    return { success: true, expense };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to record expense" };
  }
}

export async function getExpensesAction(options: any = {}) {
  const context = await getCurrentContext();
  if (!context) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const result = await listExpenses(context, options);
    return { success: true, ...result };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load expenses" };
  }
}
