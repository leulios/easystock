import { prisma } from "../db";
import { TenantContext } from "../tenant/context";
import { Decimal, toDecimal } from "../decimal";
import { SaleStatus, MovementType, POStatus, PlatformRole } from "@prisma/client";

export type DateRangePreset = "today" | "7d" | "30d" | "month" | "all";

export function resolveDateRange(preset: DateRangePreset): { startDate?: Date; endDate: Date } {
  const now = new Date();
  const endDate = new Date(now);

  if (preset === "today") {
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { startDate, endDate };
  } else if (preset === "7d") {
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 7);
    return { startDate, endDate };
  } else if (preset === "30d") {
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 30);
    return { startDate, endDate };
  } else if (preset === "month") {
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    return { startDate, endDate };
  }

  return { endDate };
}

// -----------------------------------------------------------------------------
// 1. SHOP OWNER DASHBOARD METRICS
// -----------------------------------------------------------------------------
export async function getShopOwnerDashboardMetrics(context: TenantContext, range: DateRangePreset = "30d") {
  const { organizationId, shopId } = context;
  const { startDate, endDate } = resolveDateRange(range);

  const dateFilter = startDate ? { gte: startDate, lte: endDate } : undefined;

  // Run queries in parallel
  const [sales, expenses, inventoryItems, recentMovements, recentPOs, shop] = await Promise.all([
    prisma.sale.findMany({
      where: {
        shopId,
        status: SaleStatus.COMPLETED,
        createdAt: dateFilter,
      },
      include: {
        items: {
          include: {
            variant: { include: { product: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.expense.findMany({
      where: {
        shopId,
        expenseDate: dateFilter,
      },
    }),
    prisma.inventoryItem.findMany({
      where: { shopId },
      include: {
        variant: { include: { product: true } },
      },
    }),
    prisma.stockMovement.findMany({
      where: { shopId },
      include: {
        variant: { include: { product: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.purchaseOrder.findMany({
      where: { shopId },
      include: { supplier: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.shop.findUnique({
      where: { id: shopId },
      select: { name: true, currency: true, taxRate: true },
    }),
  ]);

  // A. Financial totals using exact Decimal calculations
  let grossRevenue = new Decimal(0);
  let totalTax = new Decimal(0);
  let totalDiscount = new Decimal(0);
  let totalCOGS = new Decimal(0);

  const productSalesMap = new Map<string, { name: string; sku: string; units: number; revenue: Decimal }>();
  const trendMap = new Map<string, { date: string; revenue: Decimal; count: number }>();

  sales.forEach((s) => {
    grossRevenue = grossRevenue.plus(toDecimal(s.totalAmount));
    totalTax = totalTax.plus(toDecimal(s.taxAmount));
    totalDiscount = totalDiscount.plus(toDecimal(s.discountAmount));
    totalCOGS = totalCOGS.plus(toDecimal(s.totalCost));

    // Daily trend
    const dayKey = s.createdAt.toISOString().slice(0, 10);
    const existingTrend = trendMap.get(dayKey) || { date: dayKey, revenue: new Decimal(0), count: 0 };
    existingTrend.revenue = existingTrend.revenue.plus(toDecimal(s.totalAmount));
    existingTrend.count += 1;
    trendMap.set(dayKey, existingTrend);

    // Product best sellers
    s.items.forEach((item) => {
      const vId = item.variantId;
      const existing = productSalesMap.get(vId) || {
        name: item.variant.product.name,
        sku: item.variant.sku,
        units: 0,
        revenue: new Decimal(0),
      };
      existing.units += item.quantity;
      existing.revenue = existing.revenue.plus(toDecimal(item.totalPrice));
      productSalesMap.set(vId, existing);
    });
  });

  const netSales = grossRevenue.minus(totalTax);
  const grossProfit = netSales.minus(totalCOGS);

  let totalExpenses = new Decimal(0);
  expenses.forEach((e) => {
    totalExpenses = totalExpenses.plus(toDecimal(e.amount));
  });

  const netProfit = grossProfit.minus(totalExpenses);

  const grossMarginPct = netSales.gt(0)
    ? grossProfit.div(netSales).mul(100).toDecimalPlaces(1).toNumber()
    : 0;

  const netMarginPct = netSales.gt(0)
    ? netProfit.div(netSales).mul(100).toDecimalPlaces(1).toNumber()
    : 0;

  // B. Inventory Valuations
  let totalUnitsInStock = 0;
  let assetValuationAtCost = new Decimal(0);
  let retailValuation = new Decimal(0);
  let lowStockCount = 0;
  let outOfStockCount = 0;
  const lowStockItems: any[] = [];

  inventoryItems.forEach((inv) => {
    const qty = inv.quantity;
    totalUnitsInStock += qty;

    if (qty <= 0) {
      outOfStockCount++;
      lowStockItems.push({
        id: inv.id,
        name: inv.variant.product.name,
        sku: inv.variant.sku,
        stock: qty,
        reorderLevel: inv.variant.reorderLevel,
        status: "OUT_OF_STOCK",
      });
    } else if (qty <= inv.variant.reorderLevel) {
      lowStockCount++;
      lowStockItems.push({
        id: inv.id,
        name: inv.variant.product.name,
        sku: inv.variant.sku,
        stock: qty,
        reorderLevel: inv.variant.reorderLevel,
        status: "LOW_STOCK",
      });
    }

    if (qty > 0) {
      const lineCost = toDecimal(inv.variant.costPrice).mul(qty);
      const lineRetail = toDecimal(inv.variant.sellingPrice).mul(qty);
      assetValuationAtCost = assetValuationAtCost.plus(lineCost);
      retailValuation = retailValuation.plus(lineRetail);
    }
  });

  // Top 5 best sellers
  const bestSellers = Array.from(productSalesMap.values())
    .sort((a, b) => b.units - a.units)
    .slice(0, 5)
    .map((item) => ({
      name: item.name,
      sku: item.sku,
      units: item.units,
      revenue: item.revenue.toNumber(),
    }));

  // Sorted trend array
  const salesTrends = Array.from(trendMap.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((t) => ({
      date: t.date,
      revenue: t.revenue.toNumber(),
      ordersCount: t.count,
    }));

  return {
    shop: {
      name: shop?.name || "Shop",
      currency: shop?.currency || "USD",
      taxRate: Number(shop?.taxRate || 0),
    },
    period: range,
    financials: {
      grossRevenue: grossRevenue.toNumber(),
      netSales: netSales.toNumber(),
      taxCollected: totalTax.toNumber(),
      discountsGiven: totalDiscount.toNumber(),
      cogs: totalCOGS.toNumber(),
      grossProfit: grossProfit.toNumber(),
      grossMarginPct,
      operatingExpenses: totalExpenses.toNumber(),
      netProfit: netProfit.toNumber(),
      netMarginPct,
      ordersCount: sales.length,
      averageOrderValue: sales.length > 0 ? grossRevenue.div(sales.length).toDecimalPlaces(2).toNumber() : 0,
    },
    inventory: {
      totalUnits: totalUnitsInStock,
      assetValuationAtCost: assetValuationAtCost.toNumber(),
      retailValuation: retailValuation.toNumber(),
      potentialGrossProfit: retailValuation.minus(assetValuationAtCost).toNumber(),
      lowStockCount,
      outOfStockCount,
      lowStockItems: lowStockItems.slice(0, 8),
    },
    bestSellers,
    salesTrends,
    recentMovements: recentMovements.map((m) => ({
      id: m.id,
      product: m.variant.product.name,
      delta: m.quantityDelta,
      balance: m.resultingBalance,
      type: m.movementType,
      time: m.createdAt,
    })),
    recentPurchaseOrders: recentPOs.map((po) => ({
      id: po.id,
      poNumber: po.poNumber,
      supplier: po.supplier.name,
      amount: Number(po.totalAmount),
      status: po.status,
    })),
  };
}

// -----------------------------------------------------------------------------
// 2. SHOPKEEPER DASHBOARD METRICS (OPERATIONAL ONLY - NO PROFIT DISCLOSURE)
// -----------------------------------------------------------------------------
export async function getShopkeeperDashboardMetrics(context: TenantContext) {
  const { shopId, user } = context;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [shiftSales, lowStockItems, recentMovements, shop] = await Promise.all([
    prisma.sale.findMany({
      where: {
        shopId,
        cashierId: user.id,
        createdAt: { gte: todayStart },
      },
      include: { items: true, payments: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.inventoryItem.findMany({
      where: {
        shopId,
        quantity: { lte: 5 }, // Items at or below general reorder threshold
      },
      include: {
        variant: { include: { product: true } },
      },
      take: 8,
    }),
    prisma.stockMovement.findMany({
      where: { shopId, performedBy: user.id },
      include: {
        variant: { include: { product: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.shop.findUnique({
      where: { id: shopId },
      select: { name: true, currency: true },
    }),
  ]);

  let todayVolume = new Decimal(0);
  shiftSales.forEach((s) => {
    todayVolume = todayVolume.plus(toDecimal(s.totalAmount));
  });

  return {
    shop: {
      name: shop?.name || "Shop",
      currency: shop?.currency || "USD",
    },
    shift: {
      todaySalesCount: shiftSales.length,
      todayVolume: todayVolume.toNumber(),
      recentTransactions: shiftSales.slice(0, 5).map((s) => ({
        id: s.id,
        receiptNumber: s.receiptNumber,
        amount: Number(s.totalAmount),
        status: s.status,
        time: s.createdAt,
      })),
    },
    inventoryAlerts: lowStockItems.map((item) => ({
      name: item.variant.product.name,
      sku: item.variant.sku,
      currentStock: item.quantity,
      reorderLevel: item.variant.reorderLevel,
      isOut: item.quantity <= 0,
    })),
    recentMovements: recentMovements.map((m) => ({
      id: m.id,
      product: m.variant.product.name,
      delta: m.quantityDelta,
      balance: m.resultingBalance,
      type: m.movementType,
      time: m.createdAt,
    })),
  };
}

// -----------------------------------------------------------------------------
// 3. PLATFORM ADMINISTRATOR METRICS
// -----------------------------------------------------------------------------
export async function getPlatformAdminMetrics(context: TenantContext) {
  if (!context.isPlatformAdmin && context.user.platformRole !== PlatformRole.SUPER_ADMIN) {
    throw new Error("Unauthorized. Platform Administrator privileges required.");
  }

  const [
    totalOrganizations,
    totalShops,
    totalUsers,
    activeOrganizations,
    recentAudits,
    planGroups,
    organizations,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.shop.count(),
    prisma.user.count(),
    prisma.organization.count({ where: { planStatus: "active" } }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      include: { user: { select: { email: true, fullName: true } } },
    }),
    prisma.organization.groupBy({
      by: ["plan"],
      _count: { id: true },
    }),
    prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { shops: true, memberships: true },
        },
      },
    }),
  ]);

  return {
    overview: {
      totalOrganizations,
      totalShops,
      totalUsers,
      activeOrganizations,
      suspendedOrganizations: totalOrganizations - activeOrganizations,
    },
    plans: planGroups.map((p) => ({
      plan: p.plan,
      count: p._count.id,
    })),
    organizations: organizations.map((o) => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
      plan: o.plan,
      planStatus: o.planStatus,
      maxShops: o.maxShops,
      shopsCount: o._count.shops,
      membershipsCount: o._count.memberships,
      createdAt: o.createdAt,
    })),
    systemHealth: {
      databaseStatus: "CONNECTED",
      databaseProvider: "Neon Serverless Postgres",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    },
    recentAudits: recentAudits.map((a) => ({
      id: a.id,
      action: a.action,
      entityType: a.entityType,
      performedBy: a.user?.fullName || a.user?.email || "System",
      createdAt: a.createdAt,
    })),
  };
}

// -----------------------------------------------------------------------------
// 4. DETAILED REPORTING DATA GENERATORS (FOR TABLES & CSV EXPORT)
// -----------------------------------------------------------------------------
export async function getSalesReportData(context: TenantContext, range: DateRangePreset = "30d") {
  const { shopId } = context;
  const { startDate, endDate } = resolveDateRange(range);

  const sales = await prisma.sale.findMany({
    where: {
      shopId,
      createdAt: startDate ? { gte: startDate, lte: endDate } : undefined,
    },
    include: {
      items: { include: { variant: { include: { product: true } } } },
      payments: true,
      customer: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return sales.map((s) => ({
    receiptNumber: s.receiptNumber,
    date: s.createdAt.toISOString(),
    customer: s.customer?.name || "Walk-in Customer",
    subtotal: Number(s.subtotal),
    discount: Number(s.discountAmount),
    tax: Number(s.taxAmount),
    total: Number(s.totalAmount),
    cogs: Number(s.totalCost),
    margin: Number(s.totalAmount) - Number(s.taxAmount) - Number(s.totalCost),
    paymentMethods: s.payments.map((p) => p.paymentMethod).join(", "),
    status: s.status,
  }));
}

export async function getInventoryValuationReportData(context: TenantContext) {
  const { shopId } = context;

  const items = await prisma.inventoryItem.findMany({
    where: { shopId },
    include: {
      variant: { include: { product: { include: { category: true } } } },
    },
    orderBy: { variant: { product: { name: "asc" } } },
  });

  return items.map((i) => {
    const qty = i.quantity;
    const cost = Number(i.variant.costPrice);
    const retail = Number(i.variant.sellingPrice);
    const totalCostValuation = qty * cost;
    const totalRetailValuation = qty * retail;
    const potentialProfit = totalRetailValuation - totalCostValuation;
    const marginPct = retail > 0 ? ((retail - cost) / retail) * 100 : 0;

    return {
      sku: i.variant.sku,
      barcode: i.variant.barcode || "—",
      name: i.variant.product.name,
      category: i.variant.product.category?.name || "General",
      quantity: qty,
      unitCost: cost,
      retailPrice: retail,
      totalCostValuation,
      totalRetailValuation,
      potentialProfit,
      marginPct: Math.round(marginPct * 10) / 10,
    };
  });
}

export async function getProfitLossReportData(context: TenantContext, range: DateRangePreset = "month") {
  const { shopId } = context;
  const { startDate, endDate } = resolveDateRange(range);

  const dateFilter = startDate ? { gte: startDate, lte: endDate } : undefined;

  const [sales, expenses] = await Promise.all([
    prisma.sale.findMany({
      where: {
        shopId,
        status: SaleStatus.COMPLETED,
        createdAt: dateFilter,
      },
    }),
    prisma.expense.findMany({
      where: {
        shopId,
        expenseDate: dateFilter,
      },
    }),
  ]);

  let grossRevenue = new Decimal(0);
  let taxCollected = new Decimal(0);
  let discounts = new Decimal(0);
  let cogs = new Decimal(0);

  sales.forEach((s) => {
    grossRevenue = grossRevenue.plus(toDecimal(s.totalAmount));
    taxCollected = taxCollected.plus(toDecimal(s.taxAmount));
    discounts = discounts.plus(toDecimal(s.discountAmount));
    cogs = cogs.plus(toDecimal(s.totalCost));
  });

  const netRevenue = grossRevenue.minus(taxCollected);
  const grossProfit = netRevenue.minus(cogs);

  const expensesByCategory: Record<string, number> = {};
  let totalExpenses = new Decimal(0);

  expenses.forEach((e) => {
    const cat = e.category;
    const amt = Number(e.amount);
    expensesByCategory[cat] = (expensesByCategory[cat] || 0) + amt;
    totalExpenses = totalExpenses.plus(toDecimal(e.amount));
  });

  const netProfit = grossProfit.minus(totalExpenses);

  return {
    period: range,
    grossRevenue: grossRevenue.toNumber(),
    taxCollected: taxCollected.toNumber(),
    discounts: discounts.toNumber(),
    netRevenue: netRevenue.toNumber(),
    cogs: cogs.toNumber(),
    grossProfit: grossProfit.toNumber(),
    grossMarginPercent: netRevenue.gt(0) ? grossProfit.div(netRevenue).mul(100).toDecimalPlaces(1).toNumber() : 0,
    expensesByCategory,
    totalExpenses: totalExpenses.toNumber(),
    netProfit: netProfit.toNumber(),
    netMarginPercent: netRevenue.gt(0) ? netProfit.div(netRevenue).mul(100).toDecimalPlaces(1).toNumber() : 0,
  };
}
