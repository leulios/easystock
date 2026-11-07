import { describe, it, expect, beforeEach, vi } from "vitest";
import { Decimal } from "../decimal";
import { ShopRole, PlatformRole, MovementType, SaleStatus, PaymentMethod, POStatus } from "@prisma/client";
import { TenantContext } from "../tenant/context";

// -----------------------------------------------------------------------------
// In-Memory Transactional Relational Database Engine for Acceptance Testing
// -----------------------------------------------------------------------------
class MockDatabase {
  organizations: any[] = [];
  shops: any[] = [];
  products: any[] = [];
  variants: any[] = [];
  inventoryItems: any[] = [];
  stockMovements: any[] = [];
  sales: any[] = [];
  saleItems: any[] = [];
  paymentTransactions: any[] = [];
  suppliers: any[] = [];
  purchaseOrders: any[] = [];
  purchaseOrderItems: any[] = [];
  expenses: any[] = [];
  platformSettings: any[] = [];
  auditLogs: any[] = [];

  snapshot() {
    return JSON.stringify({
      organizations: this.organizations,
      shops: this.shops,
      products: this.products,
      variants: this.variants,
      inventoryItems: this.inventoryItems,
      stockMovements: this.stockMovements,
      sales: this.sales,
      saleItems: this.saleItems,
      paymentTransactions: this.paymentTransactions,
      suppliers: this.suppliers,
      purchaseOrders: this.purchaseOrders,
      purchaseOrderItems: this.purchaseOrderItems,
      expenses: this.expenses,
      platformSettings: this.platformSettings,
      auditLogs: this.auditLogs,
    });
  }

  restore(snap: string) {
    const data = JSON.parse(snap);
    this.organizations = data.organizations;
    this.shops = data.shops;
    this.products = data.products;
    this.variants = data.variants;
    this.inventoryItems = data.inventoryItems;
    this.stockMovements = data.stockMovements;
    this.sales = data.sales;
    this.saleItems = data.saleItems;
    this.paymentTransactions = data.paymentTransactions;
    this.suppliers = data.suppliers;
    this.purchaseOrders = data.purchaseOrders;
    this.purchaseOrderItems = data.purchaseOrderItems;
    this.expenses = data.expenses;
    this.platformSettings = data.platformSettings;
    this.auditLogs = data.auditLogs;
  }
}

const mockDb = new MockDatabase();

// Mock prisma client
vi.mock("../db", () => {
  const createClient = () => ({
    $transaction: async (callback: any) => {
      const snap = mockDb.snapshot();
      try {
        const txClient = createClient();
        const result = await callback(txClient);
        return result;
      } catch (err) {
        mockDb.restore(snap);
        throw err;
      }
    },
    shop: {
      findFirst: async ({ where }: any) => {
        return (
          mockDb.shops.find((s) => {
            if (where.id && s.id !== where.id) return false;
            if (where.organizationId && s.organizationId !== where.organizationId) return false;
            return true;
          }) || null
        );
      },
      findUnique: async ({ where }: any) => {
        return mockDb.shops.find((s) => s.id === where.id) || null;
      },
      findMany: async () => mockDb.shops,
    },
    product: {
      findFirst: async ({ where }: any) => {
        return (
          mockDb.products.find((p) => {
            if (where.id && p.id !== where.id) return false;
            if (where.organizationId && p.organizationId !== where.organizationId) return false;
            if (where.sku && p.sku !== where.sku) return false;
            if (where.deletedAt === null && p.deletedAt !== null) return false;
            return true;
          }) || null
        );
      },
      create: async ({ data }: any) => {
        const p = { id: `prod-${Date.now()}-${Math.random()}`, ...data, deletedAt: null, createdAt: new Date() };
        mockDb.products.push(p);
        return p;
      },
      update: async ({ where, data }: any) => {
        const p = mockDb.products.find((item) => item.id === where.id);
        if (!p) throw new Error("Not found");
        Object.assign(p, data);
        return p;
      },
      findMany: async ({ where, skip = 0, take = 50 }: any) => {
        const res = mockDb.products
          .filter((p) => {
            if (where.organizationId && p.organizationId !== where.organizationId) return false;
            if (where.deletedAt === null && p.deletedAt !== null) return false;
            return true;
          })
          .map((p) => ({
            ...p,
            category: null,
            variants: mockDb.variants
              .filter((v) => v.productId === p.id && v.deletedAt === null)
              .map((v) => ({
                ...v,
                inventoryItems: mockDb.inventoryItems.filter((i) => i.variantId === v.id),
              })),
          }));
        return res.slice(skip, skip + take);
      },
      count: async ({ where }: any) => {
        return mockDb.products.filter((p) => {
          if (where.organizationId && p.organizationId !== where.organizationId) return false;
          if (where.deletedAt === null && p.deletedAt !== null) return false;
          return true;
        }).length;
      },
    },
    productVariant: {
      create: async ({ data }: any) => {
        const v = { id: `var-${Date.now()}-${Math.random()}`, ...data, deletedAt: null };
        mockDb.variants.push(v);
        return v;
      },
      findUnique: async ({ where }: any) => {
        const v = mockDb.variants.find((item) => item.id === where.id);
        if (!v) return null;
        const p = mockDb.products.find((prod) => prod.id === v.productId);
        return { ...v, product: p };
      },
      findMany: async ({ where }: any) => {
        return mockDb.variants
          .filter((v) => {
            if (where.id?.in && !where.id.in.includes(v.id)) return false;
            return true;
          })
          .map((v) => ({
            ...v,
            product: mockDb.products.find((prod) => prod.id === v.productId),
          }));
      },
      update: async ({ where, data }: any) => {
        const v = mockDb.variants.find((item) => item.id === where.id);
        if (!v) throw new Error("Variant not found");
        Object.assign(v, data);
        return v;
      },
    },
    inventoryItem: {
      upsert: async ({ where, create }: any) => {
        let item = mockDb.inventoryItems.find(
          (i) => i.shopId === where.shopId_variantId.shopId && i.variantId === where.shopId_variantId.variantId
        );
        if (!item) {
          item = { id: `inv-${Date.now()}-${Math.random()}`, ...create, version: 0 };
          mockDb.inventoryItems.push(item);
        }
        return item;
      },
      findUnique: async ({ where }: any) => {
        if (where.id) return mockDb.inventoryItems.find((i) => i.id === where.id) || null;
        if (where.shopId_variantId) {
          return (
            mockDb.inventoryItems.find(
              (i) => i.shopId === where.shopId_variantId.shopId && i.variantId === where.shopId_variantId.variantId
            ) || null
          );
        }
        return null;
      },
      findMany: async ({ where }: any) => {
        return mockDb.inventoryItems
          .filter((i) => {
            if (where.shopId && i.shopId !== where.shopId) return false;
            return true;
          })
          .map((i) => {
            const variant = mockDb.variants.find((v) => v.id === i.variantId);
            const product = variant ? mockDb.products.find((p) => p.id === variant.productId) : null;
            return {
              ...i,
              variant: variant ? { ...variant, product: { ...product, category: null } } : null,
            };
          });
      },
      create: async ({ data }: any) => {
        const item = { id: `inv-${Date.now()}-${Math.random()}`, ...data, version: 0 };
        mockDb.inventoryItems.push(item);
        return item;
      },
      update: async ({ where, data }: any) => {
        const item = mockDb.inventoryItems.find((i) => i.id === where.id);
        if (!item) throw new Error("Inventory item not found");
        if (data.quantity !== undefined) item.quantity = data.quantity;
        if (data.version?.increment) item.version = (item.version || 0) + data.version.increment;
        return item;
      },
    },
    stockMovement: {
      create: async ({ data }: any) => {
        const sm = { id: `mov-${Date.now()}-${Math.random()}`, ...data, createdAt: new Date() };
        mockDb.stockMovements.push(sm);
        return sm;
      },
      findMany: async ({ where }: any) => {
        return mockDb.stockMovements.filter((m) => {
          if (where.shopId && m.shopId !== where.shopId) return false;
          return true;
        });
      },
      count: async () => mockDb.stockMovements.length,
    },
    sale: {
      findUnique: async ({ where }: any) => {
        if (where.idempotencyKey) {
          return mockDb.sales.find((s) => s.idempotencyKey === where.idempotencyKey) || null;
        }
        return mockDb.sales.find((s) => s.id === where.id) || null;
      },
      findFirst: async ({ where }: any) => {
        const s = mockDb.sales.find((item) => {
          if (where.id && item.id !== where.id) return false;
          if (where.shopId && item.shopId !== where.shopId) return false;
          return true;
        });
        if (!s) return null;
        return {
          ...s,
          items: mockDb.saleItems.filter((si) => si.saleId === s.id),
        };
      },
      findMany: async ({ where }: any) => {
        return mockDb.sales
          .filter((s) => {
            if (where.shopId && s.shopId !== where.shopId) return false;
            if (where.cashierId && s.cashierId !== where.cashierId) return false;
            if (where.status && s.status !== where.status) return false;
            return true;
          })
          .map((s) => ({
            ...s,
            items: mockDb.saleItems.filter((si) => si.saleId === s.id),
            payments: mockDb.paymentTransactions.filter((pt) => pt.saleId === s.id),
            customer: null,
          }));
      },
      count: async ({ where }: any) => {
        return mockDb.sales.filter((s) => {
          if (where.shopId && s.shopId !== where.shopId) return false;
          if (where.cashierId && s.cashierId !== where.cashierId) return false;
          return true;
        }).length;
      },
      create: async ({ data }: any) => {
        const saleId = `sale-${Date.now()}-${Math.random()}`;
        if (data.items?.create) {
          data.items.create.forEach((it: any) => {
            mockDb.saleItems.push({ id: `si-${Date.now()}-${Math.random()}`, saleId, ...it });
          });
        }
        if (data.payments?.create) {
          data.payments.create.forEach((p: any) => {
            mockDb.paymentTransactions.push({ id: `pay-${Date.now()}-${Math.random()}`, saleId, ...p });
          });
        }
        const sale = {
          id: saleId,
          ...data,
          items: mockDb.saleItems.filter((si) => si.saleId === saleId),
          payments: mockDb.paymentTransactions.filter((p) => p.saleId === saleId),
          status: SaleStatus.COMPLETED,
          createdAt: new Date(),
        };
        mockDb.sales.push(sale);
        return sale;
      },
      update: async ({ where, data }: any) => {
        const s = mockDb.sales.find((item) => item.id === where.id);
        if (!s) throw new Error("Sale not found");
        Object.assign(s, data);
        return s;
      },
    },
    saleItem: {
      createMany: async ({ data }: any) => {
        data.forEach((item: any) => {
          mockDb.saleItems.push({ id: `si-${Date.now()}-${Math.random()}`, ...item });
        });
        return { count: data.length };
      },
    },
    paymentTransaction: {
      createMany: async ({ data }: any) => {
        data.forEach((p: any) => {
          mockDb.paymentTransactions.push({ id: `pay-${Date.now()}-${Math.random()}`, ...p });
        });
        return { count: data.length };
      },
    },
    supplier: {
      create: async ({ data }: any) => {
        const sup = { id: `sup-${Date.now()}`, ...data, deletedAt: null };
        mockDb.suppliers.push(sup);
        return sup;
      },
      findMany: async () => mockDb.suppliers.filter((s) => s.deletedAt === null),
      findFirst: async ({ where }: any) => mockDb.suppliers.find((s) => s.id === where.id) || null,
    },
    purchaseOrder: {
      create: async ({ data }: any) => {
        const po = { id: `po-${Date.now()}`, ...data, createdAt: new Date() };
        mockDb.purchaseOrders.push(po);
        return po;
      },
      findMany: async () => mockDb.purchaseOrders,
      findUnique: async ({ where }: any) => mockDb.purchaseOrders.find((po) => po.id === where.id) || null,
      findFirst: async ({ where }: any) => mockDb.purchaseOrders.find((po) => po.id === where.id) || null,
      count: async () => mockDb.purchaseOrders.length,
    },
    expense: {
      create: async ({ data }: any) => {
        const e = { id: `exp-${Date.now()}`, ...data, createdAt: new Date() };
        mockDb.expenses.push(e);
        return e;
      },
      findMany: async () => mockDb.expenses,
      count: async () => mockDb.expenses.length,
      aggregate: async () => ({ _sum: { amount: new Decimal(0) } }),
    },
    platformSetting: {
      findUnique: async ({ where }: any) => mockDb.platformSettings.find((ps) => ps.key === where.key) || null,
      upsert: async ({ where, create, update }: any) => {
        let ps = mockDb.platformSettings.find((p) => p.key === where.key);
        if (!ps) {
          ps = { key: where.key, ...create };
          mockDb.platformSettings.push(ps);
        } else {
          Object.assign(ps, update);
        }
        return ps;
      },
    },
    auditLog: {
      create: async ({ data }: any) => {
        mockDb.auditLogs.push({ id: `audit-${Date.now()}`, ...data, createdAt: new Date() });
      },
      findMany: async () => mockDb.auditLogs,
    },
  });

  return { prisma: createClient() };
});

import { createSale, processReturn, listSales } from "../services/sales-service";
import { adjustStock, batchReceiveStock, transferStockBetweenShops, listStockMovements } from "../services/inventory-service";
import { createProduct, updateProduct, archiveProduct, listProducts } from "../services/product-service";
import { createPurchaseOrder, receivePurchaseStock, createSupplier, listSuppliers } from "../services/purchase-service";
import { createExpense, listExpenses, getShopExpenseCategories, addCustomExpenseCategory } from "../services/expense-service";
import { getProfitLossReportData, getInventoryValuationReportData, getSalesReportData, getShopOwnerDashboardMetrics } from "../services/reporting-service";

describe("Shopkeeper Role Restrictions & Sales-Only Enforcement", () => {
  const shopkeeperContext: TenantContext = {
    organizationId: "org-test-1",
    shopId: "shop-test-1",
    user: {
      id: "shopkeeper-usr-1",
      email: "cashier@testshop.et",
      fullName: "Almaz Cashier",
      platformRole: PlatformRole.NONE,
      isActive: true,
    },
    role: ShopRole.SHOPKEEPER,
    isPlatformAdmin: false,
    permissions: {
      canViewReports: false,
      canApplyDiscount: false,
      canAdjustStock: false,
    },
  };

  const ownerContext: TenantContext = {
    organizationId: "org-test-1",
    shopId: "shop-test-1",
    user: {
      id: "owner-usr-1",
      email: "owner@testshop.et",
      fullName: "Abebe ShopOwner",
      platformRole: PlatformRole.NONE,
      isActive: true,
    },
    role: ShopRole.SHOP_OWNER,
    isPlatformAdmin: false,
    permissions: {
      canViewReports: true,
      canApplyDiscount: true,
      canAdjustStock: true,
    },
  };

  beforeEach(() => {
    mockDb.organizations = [{ id: "org-test-1", name: "Habesha Retail", slug: "habesha-retail" }];
    mockDb.shops = [
      {
        id: "shop-test-1",
        organizationId: "org-test-1",
        name: "Main Shop",
        code: "MAIN",
        currency: "ETB",
        taxRate: new Decimal(0),
        allowNegativeStock: false,
        isActive: true,
      },
    ];
    mockDb.products = [
      {
        id: "prod-1",
        organizationId: "org-test-1",
        name: "Cooking Oil 1L",
        sku: "OIL-1L",
        barcode: "1234567890",
        unitOfMeasure: "pcs",
        deletedAt: null,
      },
    ];
    mockDb.variants = [
      {
        id: "var-1",
        productId: "prod-1",
        name: "Standard",
        sku: "OIL-1L",
        barcode: "1234567890",
        costPrice: new Decimal("180.00"),
        sellingPrice: new Decimal("230.00"),
        reorderLevel: 5,
        deletedAt: null,
      },
    ];
    mockDb.inventoryItems = [
      {
        id: "inv-1",
        shopId: "shop-test-1",
        variantId: "var-1",
        quantity: 20,
        version: 1,
      },
    ];
    mockDb.sales = [];
    mockDb.saleItems = [];
    mockDb.stockMovements = [];
    mockDb.expenses = [];
    mockDb.suppliers = [];
    mockDb.purchaseOrders = [];
    mockDb.platformSettings = [];
    mockDb.auditLogs = [];
  });

  // ---------------------------------------------------------------------------
  // 1. Authorized Sales Workflow & Automatic Stock Deduction
  // ---------------------------------------------------------------------------
  it("allows Shopkeeper to record a sale and automatically deducts stock", async () => {
    const saleResult = await createSale(shopkeeperContext, {
      idempotencyKey: "sale-key-001",
      items: [{ variantId: "var-1", quantity: 3, unitPrice: 230, discount: 0 }],
      payments: [{ paymentMethod: PaymentMethod.CASH, amount: 690 }],
    });

    expect(saleResult.sale).toBeDefined();
    expect(saleResult.sale.receiptNumber).toMatch(/^RCP-/);
    expect(saleResult.isDuplicateReplay).toBe(false);

    // Verify stock item balance was deducted by 3 (20 -> 17)
    const inventory = mockDb.inventoryItems.find((i) => i.id === "inv-1");
    expect(inventory?.quantity).toBe(17);

    // Verify StockMovement audit trail was generated linking the cashier
    const movement = mockDb.stockMovements.find((m) => m.variantId === "var-1");
    expect(movement).toBeDefined();
    expect(movement?.movementType).toBe(MovementType.SALE_DEDUCTION);
    expect(movement?.quantityDelta).toBe(-3);
    expect(movement?.resultingBalance).toBe(17);
    expect(movement?.performedBy).toBe(shopkeeperContext.user.id);
  });

  it("prevents duplicate stock deductions when same sale is submitted twice (idempotency)", async () => {
    await createSale(shopkeeperContext, {
      idempotencyKey: "duplicate-sale-key",
      items: [{ variantId: "var-1", quantity: 2, unitPrice: 230, discount: 0 }],
      payments: [{ paymentMethod: PaymentMethod.CASH, amount: 460 }],
    });

    expect(mockDb.inventoryItems[0].quantity).toBe(18);

    // Replay with identical idempotency key
    const replayResult = await createSale(shopkeeperContext, {
      idempotencyKey: "duplicate-sale-key",
      items: [{ variantId: "var-1", quantity: 2, unitPrice: 230, discount: 0 }],
      payments: [{ paymentMethod: PaymentMethod.CASH, amount: 460 }],
    });

    expect(replayResult.isDuplicateReplay).toBe(true);
    // Stock remains 18 (deducted exactly once)
    expect(mockDb.inventoryItems[0].quantity).toBe(18);
  });

  // ---------------------------------------------------------------------------
  // 2. Product Search & Sensitive Cost Masking
  // ---------------------------------------------------------------------------
  it("masks product cost price to 0 when searched by a Shopkeeper", async () => {
    const products = await listProducts(shopkeeperContext, { search: "Cooking" });

    expect(products.items.length).toBe(1);
    const item = products.items[0];
    expect(item.name).toBe("Cooking Oil 1L");
    expect(item.sellingPrice).toBe(230);
    expect(item.currentStock).toBe(20);
    // Sensitive purchase cost must be 0 for Shopkeeper!
    expect(item.costPrice).toBe(0);

    // In contrast, Shop Owner can view actual cost price (180 ETB)
    const ownerProducts = await listProducts(ownerContext, { search: "Cooking" });
    expect(ownerProducts.items[0].costPrice).toBe(180);
  });

  // ---------------------------------------------------------------------------
  // 3. Prohibit Manual Inventory Adjustments by Shopkeeper
  // ---------------------------------------------------------------------------
  it("rejects Shopkeeper from manually adjusting inventory quantities", async () => {
    await expect(
      adjustStock(shopkeeperContext, {
        variantId: "var-1",
        quantity: 50,
        adjustmentType: "SET_QUANTITY",
        reason: "Counting discrepancy",
      })
    ).rejects.toThrow(/Unauthorized/i);

    // Stock remains untouched at 20
    expect(mockDb.inventoryItems[0].quantity).toBe(20);
  });

  it("rejects Shopkeeper from receiving stock batches", async () => {
    await expect(
      batchReceiveStock(shopkeeperContext, {
        items: [{ variantId: "var-1", quantity: 10, costPrice: 175 }],
        notes: "Delivery arrival",
      })
    ).rejects.toThrow(/Unauthorized/i);

    expect(mockDb.inventoryItems[0].quantity).toBe(20);
  });

  it("rejects Shopkeeper from viewing internal stock movement records", async () => {
    await expect(listStockMovements(shopkeeperContext, {})).rejects.toThrow(/Unauthorized/i);
  });

  // ---------------------------------------------------------------------------
  // 4. Prohibit Product Creation, Editing, and Deletion by Shopkeeper
  // ---------------------------------------------------------------------------
  it("rejects Shopkeeper from creating, updating, or archiving products", async () => {
    await expect(
      createProduct(shopkeeperContext, {
        name: "Sugar 1kg",
        sku: "SUGAR-1KG",
        barcode: "99887766",
        unitOfMeasure: "kg",
        costPrice: 90,
        sellingPrice: 110,
        initialStock: 10,
        reorderLevel: 5,
      })
    ).rejects.toThrow(/Unauthorized/i);

    await expect(
      updateProduct(shopkeeperContext, "prod-1", {
        sellingPrice: 250,
      })
    ).rejects.toThrow(/Unauthorized/i);

    await expect(archiveProduct(shopkeeperContext, "prod-1")).rejects.toThrow(/Unauthorized/i);
  });

  // ---------------------------------------------------------------------------
  // 5. Prohibit Purchases and Supplier Management by Shopkeeper
  // ---------------------------------------------------------------------------
  it("rejects Shopkeeper from creating suppliers, POs, or receiving purchase deliveries", async () => {
    await expect(
      createSupplier(shopkeeperContext, {
        name: "National Oil Wholesaler",
        phone: "0911000000",
      })
    ).rejects.toThrow(/Unauthorized/i);

    await expect(listSuppliers(shopkeeperContext)).rejects.toThrow(/Unauthorized/i);

    await expect(
      createPurchaseOrder(shopkeeperContext, {
        supplierId: "sup-1",
        poNumber: "PO-202611-001",
        items: [{ variantId: "var-1", orderedQuantity: 50, unitCost: 170 }],
      })
    ).rejects.toThrow(/Unauthorized/i);

    await expect(
      receivePurchaseStock(shopkeeperContext, {
        purchaseOrderId: "po-1",
        items: [{ variantId: "var-1", receivedQuantity: 50 }],
      })
    ).rejects.toThrow(/Unauthorized/i);
  });

  // ---------------------------------------------------------------------------
  // 6. Prohibit Business Expenses Management by Shopkeeper
  // ---------------------------------------------------------------------------
  it("rejects Shopkeeper from recording or managing business expenses", async () => {
    await expect(
      createExpense(shopkeeperContext, {
        category: "Transportation Cost",
        amount: 350,
        expenseDate: new Date().toISOString(),
        description: "Delivery fuel",
      })
    ).rejects.toThrow(/Unauthorized/i);

    await expect(listExpenses(shopkeeperContext, {})).rejects.toThrow(/Unauthorized/i);
    await expect(getShopExpenseCategories(shopkeeperContext)).rejects.toThrow(/Unauthorized/i);
    await expect(addCustomExpenseCategory(shopkeeperContext, "Rent")).rejects.toThrow(/Unauthorized/i);
  });

  // ---------------------------------------------------------------------------
  // 7. Prohibit Financial and Profit Reporting by Shopkeeper
  // ---------------------------------------------------------------------------
  it("rejects Shopkeeper from viewing profit reports or business metrics", async () => {
    await expect(getProfitLossReportData(shopkeeperContext, "month")).rejects.toThrow(/Unauthorized/i);
    await expect(getInventoryValuationReportData(shopkeeperContext)).rejects.toThrow(/Unauthorized/i);
    await expect(getSalesReportData(shopkeeperContext, "30d")).rejects.toThrow(/Unauthorized/i);
    await expect(getShopOwnerDashboardMetrics(shopkeeperContext, "30d")).rejects.toThrow(/Unauthorized/i);
  });

  // ---------------------------------------------------------------------------
  // 8. Completed Sales Protection: Require Owner Authorization for Returns
  // ---------------------------------------------------------------------------
  it("rejects Shopkeeper from processing returns or cancelling sales without Owner authorization", async () => {
    const saleResult = await createSale(shopkeeperContext, {
      idempotencyKey: "sale-to-return",
      items: [{ variantId: "var-1", quantity: 1, unitPrice: 230, discount: 0 }],
      payments: [{ paymentMethod: PaymentMethod.CASH, amount: 230 }],
    });

    await expect(
      processReturn(shopkeeperContext, {
        saleId: saleResult.sale.id,
        items: [{ variantId: "var-1", quantity: 1, restock: true }],
        refundMethod: PaymentMethod.CASH,
        reason: "Customer changed mind",
      })
    ).rejects.toThrow(/Unauthorized/i);

    // In contrast, Shop Owner can process returns
    const ownerReturnResult = await processReturn(ownerContext, {
      saleId: saleResult.sale.id,
      items: [{ variantId: "var-1", quantity: 1, restock: true }],
      refundMethod: PaymentMethod.CASH,
      reason: "Customer changed mind - Approved by Owner",
    });

    expect(ownerReturnResult.sale.status).toBe(SaleStatus.REFUNDED);
  });

  // ---------------------------------------------------------------------------
  // 9. Personal Sales History Isolation
  // ---------------------------------------------------------------------------
  it("restricts Shopkeeper to viewing only their own completed sales", async () => {
    // 1. Shopkeeper sale
    await createSale(shopkeeperContext, {
      idempotencyKey: "sk-sale-1",
      items: [{ variantId: "var-1", quantity: 1, unitPrice: 230 }],
      payments: [{ paymentMethod: PaymentMethod.CASH, amount: 230 }],
    });

    // 2. Owner sale
    await createSale(ownerContext, {
      idempotencyKey: "owner-sale-1",
      items: [{ variantId: "var-1", quantity: 2, unitPrice: 230 }],
      payments: [{ paymentMethod: PaymentMethod.CASH, amount: 460 }],
    });

    // Shopkeeper listing sales history
    const skHistory = await listSales(shopkeeperContext, {});
    expect(skHistory.items.length).toBe(1);
    expect(skHistory.items[0].cashierId).toBe(shopkeeperContext.user.id);

    // Owner listing sales history
    const ownerHistory = await listSales(ownerContext, {});
    expect(ownerHistory.items.length).toBe(2);
  });

  // ---------------------------------------------------------------------------
  // 10. Shop Owner Retains Full Authority
  // ---------------------------------------------------------------------------
  it("confirms Shop Owner retains full control over inventory, products, and expenses", async () => {
    // Owner can adjust stock
    const adjusted = await adjustStock(ownerContext, {
      variantId: "var-1",
      quantity: 50,
      adjustmentType: "SET_QUANTITY",
      reason: "Owner restock",
    });
    expect(adjusted.inventory.quantity).toBe(50);

    // Owner can create product
    const newProd = await createProduct(ownerContext, {
      name: "Wheat Flour 5kg",
      sku: "FLOUR-5KG",
      unitOfMeasure: "kg",
      costPrice: 250,
      sellingPrice: 320,
      initialStock: 15,
      reorderLevel: 5,
    });
    expect(newProd.product.name).toBe("Wheat Flour 5kg");

    // Owner can record expense
    const exp = await createExpense(ownerContext, {
      category: "Transportation Cost",
      amount: 400,
      expenseDate: new Date().toISOString(),
      description: "Freight delivery to store",
    });
    expect(Number(exp.amount)).toBe(400);

    // Owner can view P&L report
    const pl = await getProfitLossReportData(ownerContext, "month");
    expect(pl).toBeDefined();
    expect(pl.transportationCost).toBe(400);
  });
});
