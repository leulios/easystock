"use server";

import { getCurrentContext } from "./auth";
import {
  expenseSchema,
  ExpenseInput,
  customCategoryInputSchema,
  updateCustomCategoryInputSchema,
} from "@/lib/validations/expense";
import {
  createExpense,
  listExpenses,
  getShopExpenseCategories,
  addCustomExpenseCategory,
  updateCustomExpenseCategory,
  deleteCustomExpenseCategory,
} from "@/lib/services/expense-service";
import { revalidatePath } from "next/cache";

export async function createExpenseAction(data: ExpenseInput) {
  const context = await getCurrentContext();
  if (!context) {
    return { success: false as const, error: "Not authenticated" };
  }

  const parsed = expenseSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false as const,
      error: "Validation error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const expense = await createExpense(context, parsed.data);
    revalidatePath(`/${context.shopId}/expenses`);
    revalidatePath(`/${context.shopId}/dashboard`);
    revalidatePath(`/${context.shopId}/reports`);
    revalidatePath(`/${context.shopId}/reports/profit-loss`);
    return { success: true as const, expense };
  } catch (err: any) {
    return { success: false as const, error: err.message || "Failed to record expense" };
  }
}

export async function getExpensesAction(options: any = {}) {
  const context = await getCurrentContext();
  if (!context) {
    return { success: false as const, error: "Not authenticated" };
  }

  try {
    const result = await listExpenses(context, options);
    return { success: true as const, ...result };
  } catch (err: any) {
    return { success: false as const, error: err.message || "Failed to load expenses" };
  }
}

export async function getExpenseCategoriesAction() {
  const context = await getCurrentContext();
  if (!context) {
    return { success: false as const, error: "Not authenticated" };
  }

  try {
    const categories = await getShopExpenseCategories(context);
    return { success: true as const, categories };
  } catch (err: any) {
    return { success: false as const, error: err.message || "Failed to load categories" };
  }
}

export async function addExpenseCategoryAction(name: string) {
  const context = await getCurrentContext();
  if (!context) {
    return { success: false as const, error: "Not authenticated" };
  }

  const parsed = customCategoryInputSchema.safeParse({ name });
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.flatten().fieldErrors.name?.[0] || "Invalid category name",
    };
  }

  try {
    const updatedCustom = await addCustomExpenseCategory(context, parsed.data.name);
    revalidatePath(`/${context.shopId}/expenses`);
    revalidatePath(`/${context.shopId}/reports/profit-loss`);
    return { success: true as const, categories: updatedCustom };
  } catch (err: any) {
    return { success: false as const, error: err.message || "Failed to add category" };
  }
}

export async function updateExpenseCategoryAction(id: string, newName: string) {
  const context = await getCurrentContext();
  if (!context) {
    return { success: false as const, error: "Not authenticated" };
  }

  const parsed = updateCustomCategoryInputSchema.safeParse({ id, name: newName });
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.flatten().fieldErrors.name?.[0] || "Invalid category update",
    };
  }

  try {
    const updatedCustom = await updateCustomExpenseCategory(context, parsed.data.id, parsed.data.name);
    revalidatePath(`/${context.shopId}/expenses`);
    revalidatePath(`/${context.shopId}/reports/profit-loss`);
    return { success: true as const, categories: updatedCustom };
  } catch (err: any) {
    return { success: false as const, error: err.message || "Failed to update category" };
  }
}

export async function deleteExpenseCategoryAction(id: string) {
  const context = await getCurrentContext();
  if (!context) {
    return { success: false as const, error: "Not authenticated" };
  }

  try {
    const updatedCustom = await deleteCustomExpenseCategory(context, id);
    revalidatePath(`/${context.shopId}/expenses`);
    revalidatePath(`/${context.shopId}/reports/profit-loss`);
    return { success: true as const, categories: updatedCustom };
  } catch (err: any) {
    return { success: false as const, error: err.message || "Failed to delete category" };
  }
}
