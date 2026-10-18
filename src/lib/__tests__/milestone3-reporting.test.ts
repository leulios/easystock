import { describe, it, expect, beforeEach, vi } from "vitest";
import { Decimal } from "../decimal";
import { ShopRole, PlatformRole, SaleStatus, MovementType, POStatus } from "@prisma/client";
import { TenantContext } from "../tenant/context";

// -----------------------------------------------------------------------------
// In-Memory Database for Reporting & Metrics Verification
// -----------------------------------------------------------------------------
class ReportingMockDB {
  organizations: any[] = [];
  shops: any[] = [];
  users: any[] = [];
  products: any[] = [];
  variants: any[] = [];
  inventoryItems: any[] = [];
  stockMovements: any[] = [];
  sales: any[] = [];
  saleItems: any[] = [];
  expenses: any[] = [];
  purchaseOrders: any[] = [];
  auditLogs: any[] = [];
}

const mockDb = new ReportingMockDB();

vi.mock("../db", () => {
  return {
    prisma: {
      organization: {
        count: async (args?: any) => {
          if (args?.where?.planStatus) {
            return mockDb.organizations.filter((o) => o.planStatus === args.where.planStatus).length;
          }
          return mockDb.organizations.length;
        },
        groupBy: async () => {
          const map = new Map<string, number>();
          mockDb.organizations.forEach((o) => {
            map.set(o.plan, (map.get(o.plan) || 0) + 1);
          });
          return Array.from(map.entries()).map(([plan, count]) => ({ plan, _count: { id: count } }));
        },
        findMany: async () => {
          return mockDb.organizations.map((o) => ({
            ...o,
            _count: {
              shops: mockDb.shops.filter((s) => s.organizationId === o.id).length,
              memberships: 1,
            },
          }));
        },
      },
      shop: {
        count: async () => mockDb.shops.length,
        findUnique: async ({ where }: any) => mockDb.shops.find((s) => s.id === where.id) || null,
      },
      user: {
        count: async () => mockDb.users.length,
      },
      product: {
        findMany: async () => mockDb.products,
      },
      inventoryItem: {
        findMany: async ({ where }: any) => {
          return mockDb.inventoryItems
            .filter((i) => {
              if (where.shopId && i.shopId !== where.shopId) return false;
              if (where.quantity?.lte !== undefined && i.quantity > where.quantity.lte) return false;
              return true;
            })
            .map((i) => ({
              ...i,
              variant: {
                ...mockDb.variants.find((v) => v.id === i.variantId),
                product: mockDb.products.find((p) => p.id === mockDb.variants.find((v) => v.id === i.variantId)?.productId),
              },
            }));
        },
      },
      sale: {
        findMany: async ({ where }: any) => {
          return mockDb.sales
            .filter((s) => {
              if (where.shopId && s.shopId !== where.shopId) return false;
              if (where.status && s.status !== where.status) return false;
              if (where.cashierId && s.cashierId !== where.cashierId) return false;
              return true;
            })
            .map((s) => ({
              ...s,
              items: mockDb.saleItems
                .filter((item) => item.saleId === s.id)
                .map((item) => ({
                  ...item,
                  variant: {
                    ...mockDb.variants.find((v) => v.id === item.variantId),
                    product: mockDb.products.find((p) => p.id === mockDb.variants.find((v) => v.id === item.variantId)?.productId),
                  },
                })),
              payments: [],
            }));
        },
      },
      expense: {
        findMany: async ({ where }: any) => {
          return mockDb.expenses.filter((e) => {
            if (where.shopId && e.shopId !== where.shopId) return false;
            return true;
          });
        },
        count: async ({ where }: any) => {
          return mockDb.expenses.filter((e) => !where?.shopId || e.shopId === where.shopId).length;
        },
        aggregate: async ({ where }: any) => {
          const matching = mockDb.expenses.filter((e) => !where?.shopId || e.shopId === where.shopId);
          const sum = matching.reduce((acc, e) => acc + Number(e.amount), 0);
          return { _sum: { amount: sum } };
        },
      },
      stockMovement: {
        findMany: async ({ where }: any) => {
          return mockDb.stockMovements
            .filter((m) => {
              if (where.shopId && m.shopId !== where.shopId) return false;
              if (where.performedBy && m.performedBy !== where.performedBy) return false;
              return true;
            })
            .map((m) => ({
              ...m,
              variant: {
                ...mockDb.variants.find((v) => v.id === m.variantId),
                product: mockDb.products.find((p) => p.id === mockDb.variants.find((v) => v.id === m.variantId)?.productId),
              },
            }));
        },
      },
      purchaseOrder: {
        findMany: async ({ where }: any) => {
          return mockDb.purchaseOrders
            .filter((po) => !where.shopId || po.shopId === where.shopId)
            .map((po) => ({ ...po, supplier: { name: "Sample Supplier" } }));
        },
      },
      auditLog: {
        findMany: async () => mockDb.auditLogs,
      },
    },
  };
});

import {
  getShopOwnerDashboardMetrics,
  getShopkeeperDashboardMetrics,
  getPlatformAdminMetrics,
  getProfitLossReportData,
  getInventoryValuationReportData,
} from "../services/reporting-service";

describe("Milestone 3 Acceptance Tests: Role Dashboards & Financial Analytics", () => {
  const ownerContextA: TenantContext = {
    organizationId: "org-1",
    shopId: "shop-1",
    user: { id: "user-owner-1", email: "owner@shop1.com", fullName: "Owner One", platformRole: PlatformRole.NONE, isActive: true },
    role: ShopRole.SHOP_OWNER,
    isPlatformAdmin: false,
    permissions: { canViewReports: true, canApplyDiscount: true, canAdjustStock: true },
  };

  const shopkeeperContextA: TenantContext = {
    organizationId: "org-1",
    shopId: "shop-1",
    user: { id: "user-cashier-1", email: "cashier@shop1.com", fullName: "Cashier One", platformRole: PlatformRole.NONE, isActive: true },
    role: ShopRole.SHOPKEEPER,
    isPlatformAdmin: false,
    permissions: { canViewReports: false, canApplyDiscount: false, canAdjustStock: false },
  };

  const adminContext: TenantContext = {
    organizationId: "",
    shopId: "",
    user: { id: "user-superadmin", email: "admin@platform.com", fullName: "System Admin", platformRole: PlatformRole.SUPER_ADMIN, isActive: true },
    role: ShopRole.SHOP_OWNER,
    isPlatformAdmin: true,
    permissions: { canViewReports: true, canApplyDiscount: true, canAdjustStock: true },
  };

  beforeEach(() => {
    mockDb.organizations = [
      { id: "org-1", name: "Apex Retail", plan: "professional", planStatus: "active" },
      { id: "org-2", name: "Beta Stores", plan: "standard", planStatus: "active" },
    ];
    mockDb.shops = [
      { id: "shop-1", organizationId: "org-1", name: "Apex Main Store", currency: "USD", taxRate: 10 },
      { id: "shop-2", organizationId: "org-2", name: "Beta West Branch", currency: "EUR", taxRate: 20 },
    ];
    mockDb.users = [
      { id: "user-owner-1", email: "owner@shop1.com" },
      { id: "user-cashier-1", email: "cashier@shop1.com" },
      { id: "user-superadmin", email: "admin@platform.com" },
    ];

    // Seed products in shop-1
    mockDb.products = [
      { id: "p1", name: "Gaming Headset", organizationId: "org-1" },
      { id: "p2", name: "Mousepad XL", organizationId: "org-1" },
    ];
    mockDb.variants = [
      { id: "v1", productId: "p1", sku: "HEADSET-01", costPrice: 30.0, sellingPrice: 70.0, reorderLevel: 5 },
      { id: "v2", productId: "p2", sku: "PAD-01", costPrice: 5.0, sellingPrice: 15.0, reorderLevel: 10 },
    ];

    // Inventory in shop-1: 10 Headsets, 2 Mousepads (Low stock)
    mockDb.inventoryItems = [
      { id: "inv1", shopId: "shop-1", variantId: "v1", quantity: 10 },
      { id: "inv2", shopId: "shop-1", variantId: "v2", quantity: 2 },
    ];

    // Known Sales Transactions in shop-1:
    // Sale 1: 2x Headset ($140), Tax $14. Total $154. COGS: 2 * $30 = $60. Cashier 1.
    // Sale 2: 4x Mousepad ($60), Discount $10, Tax $5. Total $55. COGS: 4 * $5 = $20. Cashier 1.
    mockDb.sales = [
      {
        id: "s1",
        shopId: "shop-1",
        receiptNumber: "RCP-001",
        status: SaleStatus.COMPLETED,
        subtotal: 140,
        discountAmount: 0,
        taxAmount: 14,
        totalAmount: 154,
        totalCost: 60,
        cashierId: "user-cashier-1",
        createdAt: new Date(),
      },
      {
        id: "s2",
        shopId: "shop-1",
        receiptNumber: "RCP-002",
        status: SaleStatus.COMPLETED,
        subtotal: 60,
        discountAmount: 10,
        taxAmount: 5,
        totalAmount: 55,
        totalCost: 20,
        cashierId: "user-cashier-1",
        createdAt: new Date(),
      },
    ];

    mockDb.saleItems = [
      { id: "si1", saleId: "s1", variantId: "v1", quantity: 2, unitPrice: 70, unitCost: 30, totalPrice: 140 },
      { id: "si2", saleId: "s2", variantId: "v2", quantity: 4, unitPrice: 15, unitCost: 5, totalPrice: 50 },
    ];

    // Operating expenses in shop-1: Rent $40, Electricity $15 = Total $55
    mockDb.expenses = [
      { id: "e1", shopId: "shop-1", category: "Rent", amount: 40, expenseDate: new Date() },
      { id: "e2", shopId: "shop-1", category: "Utilities", amount: 15, expenseDate: new Date() },
    ];

    mockDb.stockMovements = [];
    mockDb.purchaseOrders = [];
    mockDb.auditLogs = [
      { id: "a1", action: "TENANT_REGISTERED", entityType: "Organization", user: { fullName: "Owner One" }, createdAt: new Date() },
    ];
  });

  // ---------------------------------------------------------------------------
  // 1. SHOP OWNER DASHBOARD: REVENUE, COGS, EXPENSES & NET PROFIT
  // ---------------------------------------------------------------------------
  it("calculates exact Gross Revenue, COGS, Gross Profit, Operating Expenses, and Net Profit", async () => {
    const metrics = await getShopOwnerDashboardMetrics(ownerContextA, "30d");

    // Gross Revenue = $154 + $55 = $209.00
    expect(metrics.financials.grossRevenue).toBe(209);

    // Total Tax = $14 + $5 = $19.00
    expect(metrics.financials.taxCollected).toBe(19);

    // Net Sales = Gross Revenue - Tax = $209 - $19 = $190.00
    expect(metrics.financials.netSales).toBe(190);

    // Total COGS = $60 + $20 = $80.00
    expect(metrics.financials.cogs).toBe(80);

    // Gross Profit = Net Sales - COGS = $190 - $80 = $110.00
    expect(metrics.financials.grossProfit).toBe(110);
    // Gross Margin % = (110 / 190) * 100 = 57.9%
    expect(metrics.financials.grossMarginPct).toBe(57.9);

    // Total Operating Expenses = $40 + $15 = $55.00
    expect(metrics.financials.operatingExpenses).toBe(55);

    // Net Profit = Gross Profit - Operating Expenses = $110 - $55 = $55.00
    expect(metrics.financials.netProfit).toBe(55);
    // Net Margin % = (55 / 190) * 100 = 28.9%
    expect(metrics.financials.netMarginPct).toBe(28.9);

    expect(metrics.financials.ordersCount).toBe(2);
  });

  // ---------------------------------------------------------------------------
  // 2. INVENTORY ASSET VALUATION (COST VS RETAIL)
  // ---------------------------------------------------------------------------
  it("accurately evaluates inventory assets at cost vs retail and identifies low-stock items", async () => {
    const metrics = await getShopOwnerDashboardMetrics(ownerContextA, "30d");

    // Headsets: 10 * $30 cost = $300; 10 * $70 retail = $700
    // Mousepads: 2 * $5 cost = $10; 2 * $15 retail = $30
    // Total Units = 12
    expect(metrics.inventory.totalUnits).toBe(12);

    // Asset Valuation at Cost = $300 + $10 = $310.00
    expect(metrics.inventory.assetValuationAtCost).toBe(310);

    // Retail Valuation = $700 + $30 = $730.00
    expect(metrics.inventory.retailValuation).toBe(730);

    // Potential Gross Profit = $730 - $310 = $420.00
    expect(metrics.inventory.potentialGrossProfit).toBe(420);

    // Mousepads: quantity 2 <= reorderLevel 10 -> Low stock!
    expect(metrics.inventory.lowStockCount).toBe(1);
    expect(metrics.inventory.lowStockItems[0].name).toBe("Mousepad XL");
  });

  // ---------------------------------------------------------------------------
  // 3. SHOPKEEPER DASHBOARD PERMISSION ENFORCEMENT & ZERO CONFIDENTIAL LEAKS
  // ---------------------------------------------------------------------------
  it("confines the Shopkeeper Dashboard to shift volume and strictly hides profit, COGS, and expenses", async () => {
    const metrics = await getShopkeeperDashboardMetrics(shopkeeperContextA);

    // Shows cashier's shift sales
    expect(metrics.shift.todaySalesCount).toBe(2);
    expect(metrics.shift.todayVolume).toBe(209);
    expect(metrics.shift.recentTransactions).toHaveLength(2);

    // Verifies stock alerts are provided for operational replenishing
    expect(metrics.inventoryAlerts.length).toBeGreaterThan(0);

    // CRUCIAL: Confidential financial keys MUST NOT exist in shopkeeper payload
    expect((metrics as any).financials).toBeUndefined();
    expect((metrics as any).grossProfit).toBeUndefined();
    expect((metrics as any).netProfit).toBeUndefined();
    expect((metrics as any).cogs).toBeUndefined();
    expect((metrics as any).operatingExpenses).toBeUndefined();
    expect((metrics as any).assetValuationAtCost).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // 4. PLATFORM ADMINISTRATOR METRICS & ACCESS RESTRICTION
  // ---------------------------------------------------------------------------
  it("provides platform-wide governance metrics for platform super admins", async () => {
    const adminMetrics = await getPlatformAdminMetrics(adminContext);

    expect(adminMetrics.overview.totalOrganizations).toBe(2);
    expect(adminMetrics.overview.totalShops).toBe(2);
    expect(adminMetrics.overview.totalUsers).toBe(3);
    expect(adminMetrics.overview.activeOrganizations).toBe(2);
    expect(adminMetrics.plans).toBeDefined();
    expect(adminMetrics.systemHealth.databaseStatus).toBe("CONNECTED");
    expect(adminMetrics.recentAudits).toHaveLength(1);
  });

  it("blocks non-admin users from accessing platform administration metrics", async () => {
    await expect(getPlatformAdminMetrics(ownerContextA)).rejects.toThrow("Platform Administrator privileges required");
  });

  // ---------------------------------------------------------------------------
  // 5. EMPTY DATASET HANDLING (GRACEFUL ZEROES & NO DIVISION BY ZERO)
  // ---------------------------------------------------------------------------
  it("handles new shops with empty datasets gracefully without NaN or Infinity", async () => {
    // Clear sales and expenses
    mockDb.sales = [];
    mockDb.saleItems = [];
    mockDb.expenses = [];
    mockDb.inventoryItems = [];

    const metrics = await getShopOwnerDashboardMetrics(ownerContextA, "30d");

    expect(metrics.financials.grossRevenue).toBe(0);
    expect(metrics.financials.netSales).toBe(0);
    expect(metrics.financials.cogs).toBe(0);
    expect(metrics.financials.grossProfit).toBe(0);
    expect(metrics.financials.grossMarginPct).toBe(0);
    expect(metrics.financials.operatingExpenses).toBe(0);
    expect(metrics.financials.netProfit).toBe(0);
    expect(metrics.financials.netMarginPct).toBe(0);
    expect(metrics.financials.ordersCount).toBe(0);
    expect(metrics.financials.averageOrderValue).toBe(0);
    expect(metrics.bestSellers).toEqual([]);
    expect(metrics.salesTrends).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // 6. FORMAL P&L STATEMENT GENERATOR
  // ---------------------------------------------------------------------------
  it("generates a formal multi-step P&L Statement with expense categories", async () => {
    // Re-seed sales & expenses
    mockDb.sales = [
      { id: "s1", shopId: "shop-1", status: SaleStatus.COMPLETED, subtotal: 100, discountAmount: 5, taxAmount: 10, totalAmount: 105, totalCost: 40 },
    ];
    mockDb.expenses = [
      { id: "e1", shopId: "shop-1", category: "Rent", amount: 25 },
      { id: "e2", shopId: "shop-1", category: "Salaries", amount: 15 },
    ];

    const pl = await getProfitLossReportData(ownerContextA, "month");

    expect(pl.grossRevenue).toBe(105);
    expect(pl.taxCollected).toBe(10);
    expect(pl.netRevenue).toBe(95); // 105 - 10
    expect(pl.cogs).toBe(40);
    expect(pl.grossProfit).toBe(55); // 95 - 40
    expect(pl.grossMarginPercent).toBe(57.9);
    expect(pl.expensesByCategory).toEqual({ Rent: 25, Salaries: 15 });
    expect(pl.totalExpenses).toBe(40);
    expect(pl.netProfit).toBe(15); // 55 - 40
    expect(pl.netMarginPercent).toBe(15.8);
  });
});
