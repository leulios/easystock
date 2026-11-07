import { describe, it, expect, beforeEach, vi } from "vitest";
import { Decimal } from "../decimal";
import { ShopRole, PlatformRole, SaleStatus } from "@prisma/client";
import { TenantContext } from "../tenant/context";
import {
  isTransportationCategory,
  parseDescriptionAndNotes,
  getShopExpenseCategories,
  addCustomExpenseCategory,
  updateCustomExpenseCategory,
  deleteCustomExpenseCategory,
  createExpense,
  listExpenses,
  STANDARD_TRANSPORTATION_CATEGORY_EN,
  STANDARD_TRANSPORTATION_CATEGORY_AM,
} from "../services/expense-service";
import { getProfitLossReportData, getShopOwnerDashboardMetrics } from "../services/reporting-service";

// -----------------------------------------------------------------------------
// In-Memory Database for Expense & Profit Analysis Tests
// -----------------------------------------------------------------------------
class ExpenseMockDB {
  platformSettings: any[] = [];
  expenses: any[] = [];
  auditLogs: any[] = [];
  sales: any[] = [];
  saleItems: any[] = [];
  inventoryItems: any[] = [];
  stockMovements: any[] = [];
  purchaseOrders: any[] = [];
  shops: any[] = [
    { id: "shop-1", organizationId: "org-1", name: "Addis Main Store", currency: "ETB", taxRate: new Decimal(15) },
    { id: "shop-2", organizationId: "org-2", name: "Hawassa Branch", currency: "ETB", taxRate: new Decimal(15) },
  ];
}

const mockDb = new ExpenseMockDB();

vi.mock("../db", () => {
  return {
    prisma: {
      platformSetting: {
        findUnique: async ({ where }: any) => {
          return mockDb.platformSettings.find((s) => s.key === where.key) || null;
        },
        upsert: async ({ where, update, create }: any) => {
          const idx = mockDb.platformSettings.findIndex((s) => s.key === where.key);
          if (idx >= 0) {
            mockDb.platformSettings[idx] = { ...mockDb.platformSettings[idx], ...update };
            return mockDb.platformSettings[idx];
          }
          const item = { key: where.key, ...create };
          mockDb.platformSettings.push(item);
          return item;
        },
      },
      expense: {
        create: async ({ data }: any) => {
          const item = {
            id: `exp-${Date.now()}-${Math.random()}`,
            shopId: data.shopId,
            category: data.category,
            amount: new Decimal(data.amount),
            expenseDate: data.expenseDate,
            description: data.description,
            recordedById: data.recordedById,
            createdAt: new Date(),
          };
          mockDb.expenses.push(item);
          return item;
        },
        findMany: async ({ where, orderBy, skip = 0, take = 50, distinct }: any) => {
          let list = mockDb.expenses.filter((e) => {
            if (where?.shopId && e.shopId !== where.shopId) return false;
            if (where?.category) {
              if (where.category.in) {
                if (!where.category.in.includes(e.category)) return false;
              } else if (e.category !== where.category) {
                return false;
              }
            }
            return true;
          });

          if (distinct?.includes("category")) {
            const seen = new Set<string>();
            list = list.filter((e) => {
              if (seen.has(e.category)) return false;
              seen.add(e.category);
              return true;
            });
          }

          return list.slice(skip, skip + take);
        },
        count: async ({ where }: any) => {
          return mockDb.expenses.filter((e) => {
            if (where?.shopId && e.shopId !== where.shopId) return false;
            return true;
          }).length;
        },
        aggregate: async ({ where }: any) => {
          const list = mockDb.expenses.filter((e) => {
            if (where?.shopId && e.shopId !== where.shopId) return false;
            return true;
          });
          const sum = list.reduce((acc, e) => acc.plus(new Decimal(e.amount)), new Decimal(0));
          return { _sum: { amount: sum } };
        },
        updateMany: async ({ where, data }: any) => {
          let count = 0;
          mockDb.expenses.forEach((e) => {
            if (e.shopId === where.shopId && e.category === where.category) {
              e.category = data.category;
              count++;
            }
          });
          return { count };
        },
      },
      auditLog: {
        create: async ({ data }: any) => {
          const item = { id: `audit-${Date.now()}`, ...data, createdAt: new Date() };
          mockDb.auditLogs.push(item);
          return item;
        },
      },
      sale: {
        findMany: async ({ where }: any) => {
          return mockDb.sales.filter((s) => {
            if (where?.shopId && s.shopId !== where.shopId) return false;
            return true;
          }).map((s) => ({
            ...s,
            items: mockDb.saleItems.filter((i) => i.saleId === s.id),
          }));
        },
      },
      inventoryItem: {
        findMany: async () => mockDb.inventoryItems,
      },
      stockMovement: {
        findMany: async () => mockDb.stockMovements,
      },
      purchaseOrder: {
        findMany: async () => mockDb.purchaseOrders,
      },
      shop: {
        findUnique: async ({ where }: any) => mockDb.shops.find((s) => s.id === where.id) || null,
      },
    },
  };
});

describe("Simplified and Customizable Business Expense Categories", () => {
  const shop1Context: TenantContext = {
    organizationId: "org-1",
    shopId: "shop-1",
    user: {
      id: "owner-1",
      email: "owner@shop1.et",
      fullName: "Almaz Tadesse",
      platformRole: PlatformRole.NONE,
      isActive: true,
    },
    role: ShopRole.SHOP_OWNER,
    permissions: {
      canViewReports: true,
      canApplyDiscount: true,
      canAdjustStock: true,
    },
    isPlatformAdmin: false,
  };

  const shop2Context: TenantContext = {
    organizationId: "org-2",
    shopId: "shop-2",
    user: {
      id: "owner-2",
      email: "owner@shop2.et",
      fullName: "Dawit Haile",
      platformRole: PlatformRole.NONE,
      isActive: true,
    },
    role: ShopRole.SHOP_OWNER,
    permissions: {
      canViewReports: true,
      canApplyDiscount: true,
      canAdjustStock: true,
    },
    isPlatformAdmin: false,
  };

  beforeEach(() => {
    mockDb.platformSettings = [];
    mockDb.expenses = [];
    mockDb.auditLogs = [];
    mockDb.sales = [];
    mockDb.saleItems = [];
    mockDb.inventoryItems = [];
    mockDb.stockMovements = [];
    mockDb.purchaseOrders = [];
  });

  // ---------------------------------------------------------------------------
  // 1. Mandatory Standard Transportation Category
  // ---------------------------------------------------------------------------
  it("provides Transportation Cost as a mandatory standard category in English and Amharic", async () => {
    expect(STANDARD_TRANSPORTATION_CATEGORY_EN).toBe("Transportation Cost");
    expect(STANDARD_TRANSPORTATION_CATEGORY_AM).toBe("የትራንስፖርት ወጪ");

    expect(isTransportationCategory("Transportation Cost")).toBe(true);
    expect(isTransportationCategory("የትራንስፖርት ወጪ")).toBe(true);
    expect(isTransportationCategory("transportation cost")).toBe(true);
    expect(isTransportationCategory("የትራንስፖርት")).toBe(true);
    expect(isTransportationCategory("Rent")).toBe(false);

    const categories = await getShopExpenseCategories(shop1Context);
    expect(categories.standard.isStandard).toBe(true);
    expect(categories.standard.nameEn).toBe("Transportation Cost");
    expect(categories.standard.nameAm).toBe("የትራንስፖርት ወጪ");
  });

  // ---------------------------------------------------------------------------
  // 2. Customizable Categories per Business
  // ---------------------------------------------------------------------------
  it("allows a business to create, edit, and delete custom expense categories independently", async () => {
    // Add custom category "Store Rent" to Shop 1
    const list1 = await addCustomExpenseCategory(shop1Context, "Store Rent");
    expect(list1.some((c) => c.name === "Store Rent")).toBe(true);

    // Add another custom category in Amharic "የኤሌክትሪክ ክፍያ" (Electricity)
    const list2 = await addCustomExpenseCategory(shop1Context, "የኤሌክትሪክ ክፍያ");
    expect(list2.some((c) => c.name === "የኤሌክትሪክ ክፍያ")).toBe(true);

    // Tenant Isolation check: Shop 2 must NOT see Shop 1's custom categories
    const shop2Cats = await getShopExpenseCategories(shop2Context);
    expect(shop2Cats.custom.length).toBe(0);

    // Edit Category Name in Shop 1
    const rentCat = list2.find((c) => c.name === "Store Rent")!;
    const updatedList = await updateCustomExpenseCategory(shop1Context, rentCat.id, "Main Shop Rent (Bole)");
    expect(updatedList.some((c) => c.name === "Main Shop Rent (Bole)")).toBe(true);
    expect(updatedList.some((c) => c.name === "Store Rent")).toBe(false);

    // Delete Category
    const afterDelete = await deleteCustomExpenseCategory(shop1Context, rentCat.id);
    expect(afterDelete.some((c) => c.name === "Main Shop Rent (Bole)")).toBe(false);
    expect(afterDelete.some((c) => c.name === "የኤሌክትሪክ ክፍያ")).toBe(true);
  });

  it("updates existing expense records when a custom category is renamed", async () => {
    const cats = await addCustomExpenseCategory(shop1Context, "Office Supplies");
    const suppCat = cats.find((c) => c.name === "Office Supplies")!;

    // Record an expense with "Office Supplies"
    await createExpense(shop1Context, {
      category: "Office Supplies",
      amount: 450,
      expenseDate: "2026-11-01",
      description: "Receipt paper & pens",
    });

    expect(mockDb.expenses[0].category).toBe("Office Supplies");

    // Rename the category
    await updateCustomExpenseCategory(shop1Context, suppCat.id, "Stationery & Packaging");

    // The existing expense record must now reflect the new category name
    expect(mockDb.expenses[0].category).toBe("Stationery & Packaging");
  });

  // ---------------------------------------------------------------------------
  // 3. Simple Expense Entry with Description and Optional Notes
  // ---------------------------------------------------------------------------
  it("records an expense with amount, category, date, description, and optional notes in Ethiopian Birr", async () => {
    const exp = await createExpense(shop1Context, {
      category: "Transportation Cost",
      amount: 850.5,
      expenseDate: "2026-11-04",
      description: "Freight for wholesale order from Merkato",
      notes: "Paid via Telebirr tx #TB882193",
    });

    expect(exp.amount.toNumber()).toBe(850.5);
    expect(exp.category).toBe("Transportation Cost");

    // Test parsing of description and notes
    const parsed = parseDescriptionAndNotes(exp.description);
    expect(parsed.description).toBe("Freight for wholesale order from Merkato");
    expect(parsed.notes).toBe("Paid via Telebirr tx #TB882193");
  });

  // ---------------------------------------------------------------------------
  // 4. Profit Analysis Integration & No Double-Counting
  // ---------------------------------------------------------------------------
  it("integrates transportation costs as acquisition costs and avoids double-counting in profit reports", async () => {
    // 1. Simulate Completed Sale: Gross 10,000 ETB, COGS 6,000 ETB, Tax 1,000 ETB -> Net Sales 9,000 ETB
    mockDb.sales.push({
      id: "sale-1",
      shopId: "shop-1",
      status: SaleStatus.COMPLETED,
      totalAmount: new Decimal(10000),
      taxAmount: new Decimal(1000),
      discountAmount: new Decimal(0),
      totalCost: new Decimal(6000),
      createdAt: new Date("2026-11-02"),
    });

    // 2. Record Transportation Cost related to acquiring inventory: 500 ETB
    await createExpense(shop1Context, {
      category: "Transportation Cost",
      amount: 500,
      expenseDate: "2026-11-02",
      description: "Truck freight for incoming inventory shipment",
    });

    // 3. Record Operating Overhead (Rent: 1,500 ETB)
    await createExpense(shop1Context, {
      category: "Shop Rent",
      amount: 1500,
      expenseDate: "2026-11-03",
      description: "Monthly store lease",
    });

    // 4. Generate Profit & Loss Report
    const pl = await getProfitLossReportData(shop1Context, "all");

    // Net Sales = 10,000 - 1,000 = 9,000 ETB
    expect(pl.netRevenue).toBe(9000);
    // Wholesale COGS = 6,000 ETB
    expect(pl.cogs).toBe(6000);
    // Transportation Cost = 500 ETB
    expect(pl.transportationCost).toBe(500);
    // Total Acquisition Cost = 6,000 + 500 = 6,500 ETB
    expect(pl.totalAcquisitionCost).toBe(6500);
    // Operating Overhead Expenses = 1,500 ETB (Rent only)
    expect(pl.operatingExpenses).toBe(1500);
    // Total recorded expenses = 500 + 1,500 = 2,000 ETB
    expect(pl.totalExpenses).toBe(2000);

    // Net Profit calculation:
    // Net Sales (9,000) - Total Acquisition (6,500) - Operating Overhead (1,500) = 1,000 ETB
    // Mathematically: 9,000 - 6,000 - 2,000 = 1,000 ETB.
    // VERIFY: Transportation cost is NEVER double counted!
    expect(pl.netProfit).toBe(1000);
    expect(pl.expensesByCategory["Transportation Cost"]).toBe(500);
    expect(pl.expensesByCategory["Shop Rent"]).toBe(1500);
  });

  it("synchronizes dashboard financial metrics consistently with acquisition transportation", async () => {
    mockDb.sales.push({
      id: "sale-2",
      shopId: "shop-1",
      status: SaleStatus.COMPLETED,
      totalAmount: new Decimal(5000),
      taxAmount: new Decimal(0),
      discountAmount: new Decimal(0),
      totalCost: new Decimal(3000),
      createdAt: new Date(),
    });

    await createExpense(shop1Context, {
      category: "Transportation Cost",
      amount: 300,
      expenseDate: new Date().toISOString(),
    });

    await createExpense(shop1Context, {
      category: "Electricity",
      amount: 700,
      expenseDate: new Date().toISOString(),
    });

    const metrics = await getShopOwnerDashboardMetrics(shop1Context, "all");
    expect(metrics.financials.cogs).toBe(3000);
    expect(metrics.financials.transportationCost).toBe(300);
    expect(metrics.financials.totalAcquisitionCost).toBe(3300);
    expect(metrics.financials.operatingExpenses).toBe(700);
    expect(metrics.financials.totalExpenses).toBe(1000);
    // Net profit = 5000 - 3000 - 1000 = 1000 ETB (no double counting)
    expect(metrics.financials.netProfit).toBe(1000);
  });
});
