import { getCurrentContext } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { listExpenses, getShopExpenseCategories } from "@/lib/services/expense-service";
import { prisma } from "@/lib/db";
import { ExpensesClient } from "./expenses-client";

interface ExpensesPageProps {
  params: Promise<{ shopSlug: string }>;
}

export default async function ExpensesPage({ params }: ExpensesPageProps) {
  const { shopSlug } = await params;
  const context = await getCurrentContext();

  if (!context) {
    redirect("/login");
  }

  const [expensesResult, categoriesResult, shop] = await Promise.all([
    listExpenses(context, { pageSize: 150 }),
    getShopExpenseCategories(context),
    prisma.shop.findUnique({
      where: { id: context.shopId },
      select: { currency: true },
    }),
  ]);

  const items = expensesResult.items.map((e) => ({
    id: e.id,
    category: e.category,
    amount: Number(e.amount),
    expenseDate: e.expenseDate,
    description: e.description,
    notes: e.notes,
    createdAt: e.createdAt,
  }));

  return (
    <ExpensesClient
      initialExpenses={items}
      initialCategories={categoriesResult}
      totalAmount={expensesResult.totalExpenseAmount}
      shopSlug={shopSlug}
      currency={shop?.currency || "ETB"}
    />
  );
}
