import { prisma } from "../db";
import { TenantContext } from "../tenant/context";
import { ExpenseInput } from "../validations/expense";
import { Decimal } from "../decimal";
import { Prisma } from "@prisma/client";

export async function createExpense(context: TenantContext, input: ExpenseInput) {
  const { organizationId, shopId, user } = context;

  const expense = await prisma.expense.create({
    data: {
      shopId,
      category: input.category,
      amount: new Decimal(input.amount),
      expenseDate: new Date(input.expenseDate),
      description: input.description || null,
      recordedById: user.id,
    },
  });

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

export async function listExpenses(
  context: TenantContext,
  options: { startDate?: Date; endDate?: Date; category?: string; page?: number; pageSize?: number } = {}
) {
  const { shopId } = context;
  const { startDate, endDate, category, page = 1, pageSize = 30 } = options;

  const where: Prisma.ExpenseWhereInput = {
    shopId,
    ...(category ? { category } : {}),
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

  return {
    items: expenses,
    totalExpenseAmount: aggregate._sum.amount ? Number(aggregate._sum.amount) : 0,
    pagination: {
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}
