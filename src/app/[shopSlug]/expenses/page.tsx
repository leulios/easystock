import { getCurrentContext } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { listExpenses } from "@/lib/services/expense-service";
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

  const [expensesResult, shop] = await Promise.all([
    listExpenses(context, { pageSize: 100 }),
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
    createdAt: e.createdAt,
  }));

  return (
    <ExpensesClient
      initialExpenses={items}
      totalAmount={expensesResult.totalExpenseAmount}
      shopSlug={shopSlug}
      currency={shop?.currency || "USD"}
    />
  );
}
