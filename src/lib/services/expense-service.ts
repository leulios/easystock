import { prisma } from "../db";
import { TenantContext } from "../tenant/context";
import {
  ExpenseInput,
  STANDARD_TRANSPORTATION_CATEGORY_EN,
  STANDARD_TRANSPORTATION_CATEGORY_AM,
} from "../validations/expense";
import { Decimal } from "../decimal";
import { Prisma } from "@prisma/client";

export { STANDARD_TRANSPORTATION_CATEGORY_EN, STANDARD_TRANSPORTATION_CATEGORY_AM };

export interface CustomExpenseCategory {
  id: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ExpenseCategoriesResult {
  standard: {
    id: string;
    nameEn: string;
    nameAm: string;
    isStandard: true;
  };
  custom: CustomExpenseCategory[];
}

/**
 * Checks if a given category name corresponds to the standard Transportation Cost category.
 */
export function isTransportationCategory(category?: string | null): boolean {
  if (!category) return false;
  const clean = category.trim().toLowerCase();
  return (
    clean === STANDARD_TRANSPORTATION_CATEGORY_EN.toLowerCase() ||
    clean === STANDARD_TRANSPORTATION_CATEGORY_AM.toLowerCase() ||
    clean.includes("transport") ||
    clean.includes("ትራንስፖርት")
  );
}

/**
 * Parses description and optional notes from a stored expense description.
 */
export function parseDescriptionAndNotes(raw?: string | null): {
  description: string | null;
  notes: string | null;
} {
  if (!raw) return { description: null, notes: null };
  const noteMatch = raw.match(/\[Note:\s*([\s\S]*?)\]$/);
  if (noteMatch) {
    const notes = noteMatch[1].trim();
    const description = raw.slice(0, noteMatch.index).trim() || null;
    return { description, notes };
  }
  return { description: raw, notes: null };
}

/**
 * Retrieves the standard mandatory category and all custom categories for this shop.
 */
export async function getShopExpenseCategories(
  context: TenantContext
): Promise<ExpenseCategoriesResult> {
  const { shopId } = context;
  const key = `expense_categories:${shopId}`;

  let customCategories: CustomExpenseCategory[] = [];

  try {
    const setting = await prisma.platformSetting.findUnique({ where: { key } });
    if (setting && setting.value) {
      const parsed = JSON.parse(setting.value);
      if (Array.isArray(parsed)) {
        customCategories = parsed;
      }
    }
  } catch (err) {
    console.warn("Could not load custom expense categories from setting:", err);
  }

  // If no custom categories are stored yet, inspect distinct past expenses for backward compatibility
  if (customCategories.length === 0) {
    try {
      const distinct = await prisma.expense.findMany({
        where: { shopId },
        select: { category: true },
        distinct: ["category"],
      });

      const existingNames = distinct
        .map((d) => d.category.trim())
        .filter((c) => c && !isTransportationCategory(c));

      if (existingNames.length > 0) {
        customCategories = Array.from(new Set(existingNames)).map((name) => ({
          id: `seed-${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
          name,
          createdAt: new Date().toISOString(),
        }));

        // Persist seed so they can be edited or deleted
        try {
          await prisma.platformSetting.upsert({
            where: { key },
            update: { value: JSON.stringify(customCategories) },
            create: { key, value: JSON.stringify(customCategories) },
          });
        } catch {
          // ignore error if upsert fails
        }
      }
    } catch {
      // ignore
    }
  }

  return {
    standard: {
      id: "standard-transportation",
      nameEn: STANDARD_TRANSPORTATION_CATEGORY_EN,
      nameAm: STANDARD_TRANSPORTATION_CATEGORY_AM,
      isStandard: true,
    },
    custom: customCategories,
  };
}

/**
 * Adds a new custom expense category for this business.
 */
export async function addCustomExpenseCategory(
  context: TenantContext,
  name: string
): Promise<CustomExpenseCategory[]> {
  const { organizationId, shopId, user } = context;
  const cleanName = name.trim();

  if (!cleanName) {
    throw new Error("Category name cannot be empty");
  }

  if (isTransportationCategory(cleanName)) {
    throw new Error("Transportation Cost is already available as a standard category.");
  }

  const { custom } = await getShopExpenseCategories(context);

  // Check if name already exists in this shop (case-insensitive)
  const existing = custom.find((c) => c.name.toLowerCase() === cleanName.toLowerCase());
  if (existing) {
    return custom;
  }

  const newCat: CustomExpenseCategory = {
    id: `cat-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    name: cleanName,
    createdAt: new Date().toISOString(),
  };

  const updatedList = [...custom, newCat];
  const key = `expense_categories:${shopId}`;

  await prisma.platformSetting.upsert({
    where: { key },
    update: { value: JSON.stringify(updatedList) },
    create: { key, value: JSON.stringify(updatedList) },
  });

  await prisma.auditLog.create({
    data: {
      organizationId,
      shopId,
      userId: user.id,
      action: "EXPENSE_CATEGORY_CREATED",
      entityType: "ExpenseCategory",
      entityId: newCat.id,
      newData: { name: cleanName },
    },
  });

  return updatedList;
}

/**
 * Updates/edits the name of an existing custom expense category and updates any existing expense records in that shop.
 */
export async function updateCustomExpenseCategory(
  context: TenantContext,
  id: string,
  newName: string
): Promise<CustomExpenseCategory[]> {
  const { organizationId, shopId, user } = context;
  const cleanName = newName.trim();

  if (!cleanName) {
    throw new Error("Category name cannot be empty");
  }

  if (isTransportationCategory(cleanName)) {
    throw new Error("Category cannot be renamed to standard Transportation Cost.");
  }

  const { custom } = await getShopExpenseCategories(context);
  const target = custom.find((c) => c.id === id);

  if (!target) {
    throw new Error("Category not found");
  }

  const oldName = target.name;
  if (oldName === cleanName) {
    return custom;
  }

  const updatedList = custom.map((c) =>
    c.id === id ? { ...c, name: cleanName, updatedAt: new Date().toISOString() } : c
  );

  const key = `expense_categories:${shopId}`;

  await prisma.platformSetting.upsert({
    where: { key },
    update: { value: JSON.stringify(updatedList) },
    create: { key, value: JSON.stringify(updatedList) },
  });

  // Update existing expenses using the old category name in this shop
  try {
    await prisma.expense.updateMany({
      where: { shopId, category: oldName },
      data: { category: cleanName },
    });
  } catch (err) {
    console.warn("Could not update existing expenses with new category name:", err);
  }

  await prisma.auditLog.create({
    data: {
      organizationId,
      shopId,
      userId: user.id,
      action: "EXPENSE_CATEGORY_UPDATED",
      entityType: "ExpenseCategory",
      entityId: id,
      previousData: { name: oldName },
      newData: { name: cleanName },
    },
  });

  return updatedList;
}

/**
 * Deletes a custom expense category for this business.
 */
export async function deleteCustomExpenseCategory(
  context: TenantContext,
  id: string
): Promise<CustomExpenseCategory[]> {
  const { organizationId, shopId, user } = context;
  const { custom } = await getShopExpenseCategories(context);

  const target = custom.find((c) => c.id === id);
  if (!target) {
    return custom;
  }

  const updatedList = custom.filter((c) => c.id !== id);
  const key = `expense_categories:${shopId}`;

  await prisma.platformSetting.upsert({
    where: { key },
    update: { value: JSON.stringify(updatedList) },
    create: { key, value: JSON.stringify(updatedList) },
  });

  await prisma.auditLog.create({
    data: {
      organizationId,
      shopId,
      userId: user.id,
      action: "EXPENSE_CATEGORY_DELETED",
      entityType: "ExpenseCategory",
      entityId: id,
      previousData: { name: target.name },
    },
  });

  return updatedList;
}

/**
 * Creates a new business expense record with amount, category, date, optional description, and optional notes.
 */
export async function createExpense(context: TenantContext, input: ExpenseInput) {
  const { organizationId, shopId, user } = context;

  // Combine description and notes cleanly if notes is supplied
  let fullDescription = input.description?.trim() || null;
  const cleanNotes = input.notes?.trim() || null;
  if (cleanNotes) {
    if (fullDescription) {
      fullDescription = `${fullDescription}\n[Note: ${cleanNotes}]`;
    } else {
      fullDescription = `[Note: ${cleanNotes}]`;
    }
  }

  const cleanCategory = input.category.trim();

  const expense = await prisma.expense.create({
    data: {
      shopId,
      category: cleanCategory,
      amount: new Decimal(input.amount),
      expenseDate: new Date(input.expenseDate),
      description: fullDescription,
      recordedById: user.id,
    },
  });

  // If a custom category was used that isn't yet saved in this shop's custom categories list,
  // automatically add it so it remains available in dropdowns and management.
  if (!isTransportationCategory(cleanCategory)) {
    try {
      await addCustomExpenseCategory(context, cleanCategory);
    } catch {
      // Non-fatal if already exists
    }
  }

  await prisma.auditLog.create({
    data: {
      organizationId,
      shopId,
      userId: user.id,
      action: "EXPENSE_RECORDED",
      entityType: "Expense",
      entityId: expense.id,
      newData: {
        category: expense.category,
        amount: expense.amount.toString(),
        expenseDate: expense.expenseDate,
      },
    },
  });

  return expense;
}

/**
 * Lists expenses for this shop with optional category filtering and date range.
 */
export async function listExpenses(
  context: TenantContext,
  options: {
    startDate?: Date;
    endDate?: Date;
    category?: string;
    page?: number;
    pageSize?: number;
  } = {}
) {
  const { shopId } = context;
  const { startDate, endDate, category, page = 1, pageSize = 30 } = options;

  let categoryCondition: Prisma.ExpenseWhereInput["category"] | undefined = undefined;

  if (category) {
    if (isTransportationCategory(category)) {
      categoryCondition = {
        in: [
          STANDARD_TRANSPORTATION_CATEGORY_EN,
          STANDARD_TRANSPORTATION_CATEGORY_AM,
          "Transportation",
          "ትራንስፖርት",
        ],
      };
    } else {
      categoryCondition = category;
    }
  }

  const where: Prisma.ExpenseWhereInput = {
    shopId,
    ...(categoryCondition ? { category: categoryCondition } : {}),
    ...(startDate || endDate
      ? {
          expenseDate: {
            ...(startDate ? { gte: startDate } : {}),
            ...(endDate ? { lte: endDate } : {}),
          },
        }
      : {}),
  };

  const skip = (page - 1) * pageSize;

  const [totalCount, expenses, aggregate] = await Promise.all([
    prisma.expense.count({ where }),
    prisma.expense.findMany({
      where,
      orderBy: { expenseDate: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.expense.aggregate({
      where,
      _sum: { amount: true },
    }),
  ]);

  const items = expenses.map((e) => {
    const { description, notes } = parseDescriptionAndNotes(e.description);
    return {
      ...e,
      rawDescription: e.description,
      description,
      notes,
    };
  });

  return {
    items,
    totalExpenseAmount: aggregate._sum.amount ? Number(aggregate._sum.amount) : 0,
    pagination: {
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}
