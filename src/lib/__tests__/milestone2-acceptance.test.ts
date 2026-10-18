import { describe, it, expect, beforeEach, vi } from "vitest";
import { Decimal } from "../decimal";
import { ShopRole, PlatformRole, MovementType, SaleStatus, POStatus } from "@prisma/client";
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
    this.auditLogs = data.auditLogs;
  }
}

const mockDb = new MockDatabase();

// Mock the prisma client with transactional guarantees
vi.mock("../db", () => {
  const createClient = (isTx = false) => ({
    $transaction: async (callback: any) => {
      const snap = mockDb.snapshot();
      try {
        const txClient = createClient(true);
        const result = await callback(txClient);
        return result;
      } catch (err) {
        // Rollback entire state on failure
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
    },
    product: {
      findFirst: async ({ where }: any) => {
        return (
          mockDb.products.find((p) => {
            if (where.id && p.id !== where.id) return false;
            if (where.organizationId && p.organizationId !== where.organizationId) return false;
            if (where.sku && p.sku !== where.sku) return false;
            if (where.id?.not && p.id === where.id.not) return false;
            if (where.deletedAt === null && p.deletedAt !== null) return false;
            return true;
          }) || null
        );
      },
      create: async ({ data }: any) => {
        const p = { id: `prod-${Date.now()}-${Math.random()}`, ...data, deletedAt: null };
        mockDb.products.push(p);
        return p;
      },
      update: async ({ where, data }: any) => {
        const p = mockDb.products.find((item) => item.id === where.id);
        if (!p) throw new Error("Not found");
        Object.assign(p, data);
        return p;
      },
      findMany: async ({ where }: any) => {
        return mockDb.products.filter((p) => {
          if (where.organizationId && p.organizationId !== where.organizationId) return false;
          if (where.deletedAt === null && p.deletedAt !== null) return false;
          return true;
        });
      },
      count: async () => mockDb.products.length,
    },
    productVariant: {
      findUnique: async ({ where }: any) => {
        const v = mockDb.variants.find((item) => item.id === where.id);
        if (!v) return null;
        const product = mockDb.products.find((p) => p.id === v.productId);
        return { ...v, product };
      },
      findMany: async ({ where }: any) => {
        return mockDb.variants
          .filter((v) => {
            if (where.id?.in && !where.id.in.includes(v.id)) return false;
            const product = mockDb.products.find((p) => p.id === v.productId);
            if (where.product?.organizationId && product?.organizationId !== where.product.organizationId) {
              return false;
            }
            return true;
          })
          .map((v) => ({
            ...v,
            product: mockDb.products.find((p) => p.id === v.productId),
          }));
      },
      create: async ({ data }: any) => {
        const v = { id: `var-${Date.now()}-${Math.random()}`, ...data };
        mockDb.variants.push(v);
        return v;
      },
      update: async ({ where, data }: any) => {
        const v = mockDb.variants.find((item) => item.id === where.id);
        if (!v) throw new Error("Not found");
        Object.assign(v, data);
        return v;
      },
    },
    inventoryItem: {
      findUnique: async ({ where }: any) => {
        const { shopId, variantId } = where.shopId_variantId || {};
        return (
          mockDb.inventoryItems.find((i) => i.shopId === shopId && i.variantId === variantId) || null
        );
      },
      create: async ({ data }: any) => {
        const item = {
          id: `inv-${Date.now()}-${Math.random()}`,
          shopId: data.shopId,
          variantId: data.variantId,
          quantity: data.quantity || 0,
          version: 0,
        };
        mockDb.inventoryItems.push(item);
        return item;
      },
      upsert: async ({ where, create }: any) => {
        const { shopId, variantId } = where.shopId_variantId || {};
        let item = mockDb.inventoryItems.find((i) => i.shopId === shopId && i.variantId === variantId);
        if (!item) {
          item = { id: `inv-${Date.now()}-${Math.random()}`, shopId, variantId, quantity: create.quantity || 0, version: 0 };
          mockDb.inventoryItems.push(item);
        }
        return item;
      },
      update: async ({ where, data }: any) => {
        const item = mockDb.inventoryItems.find((i) => i.id === where.id);
        if (!item) throw new Error("Inventory item not found");
        if (data.quantity !== undefined) item.quantity = data.quantity;
        if (data.version?.increment) item.version += 1;
        return item;
      },
    },
    stockMovement: {
      create: async ({ data }: any) => {
        const sm = { id: `sm-${Date.now()}-${Math.random()}`, ...data, createdAt: new Date() };
        mockDb.stockMovements.push(sm);
        return sm;
      },
      findMany: async ({ where }: any) => {
        return mockDb.stockMovements.filter((sm) => {
          if (where.shopId && sm.shopId !== where.shopId) return false;
          if (where.variantId && sm.variantId !== where.variantId) return false;
          return true;
        });
      },
      count: async () => mockDb.stockMovements.length,
    },
    sale: {
      findUnique: async ({ where }: any) => {
        const sale = mockDb.sales.find((s) => s.idempotencyKey === where.idempotencyKey);
        if (!sale) return null;
        return {
          ...sale,
          items: mockDb.saleItems.filter((i) => i.saleId === sale.id),
          payments: mockDb.paymentTransactions.filter((p) => p.saleId === sale.id),
        };
      },
      findFirst: async ({ where }: any) => {
        const sale = mockDb.sales.find((s) => {
          if (where.id && s.id !== where.id) return false;
          if (where.shopId && s.shopId !== where.shopId) return false;
          return true;
        });
        if (!sale) return null;
        return {
          ...sale,
          items: mockDb.saleItems.filter((i) => i.saleId === sale.id),
          payments: mockDb.paymentTransactions.filter((p) => p.saleId === sale.id),
        };
      },
      create: async ({ data }: any) => {
        const saleId = `sale-${Date.now()}-${Math.random()}`;
        const sale = {
          id: saleId,
          shopId: data.shopId,
          customerId: data.customerId,
          receiptNumber: data.receiptNumber,
          idempotencyKey: data.idempotencyKey,
          status: data.status,
          subtotal: data.subtotal,
          taxAmount: data.taxAmount,
          discountAmount: data.discountAmount,
          totalAmount: data.totalAmount,
          totalCost: data.totalCost,
          cashierId: data.cashierId,
          notes: data.notes,
          createdAt: new Date(),
        };
        mockDb.sales.push(sale);

        // Nested creates
        if (data.items?.create) {
          for (const item of data.items.create) {
            mockDb.saleItems.push({
              id: `si-${Date.now()}-${Math.random()}`,
              saleId,
              ...item,
            });
          }
        }
        if (data.payments?.create) {
          for (const pay of data.payments.create) {
            mockDb.paymentTransactions.push({
              id: `pt-${Date.now()}-${Math.random()}`,
              saleId,
              ...pay,
            });
          }
        }

        return {
          ...sale,
          items: mockDb.saleItems.filter((i) => i.saleId === saleId),
          payments: mockDb.paymentTransactions.filter((p) => p.saleId === saleId),
        };
      },
      update: async ({ where, data }: any) => {
        const sale = mockDb.sales.find((s) => s.id === where.id);
        if (!sale) throw new Error("Sale not found");
        Object.assign(sale, data);
        return sale;
      },
      count: async () => mockDb.sales.length,
      findMany: async () => mockDb.sales,
    },
    supplier: {
      findFirst: async ({ where }: any) => {
        return (
          mockDb.suppliers.find((s) => {
            if (where.id && s.id !== where.id) return false;
            if (where.organizationId && s.organizationId !== where.organizationId) return false;
            return true;
          }) || null
        );
      },
      create: async ({ data }: any) => {
        const sup = { id: `sup-${Date.now()}-${Math.random()}`, ...data, deletedAt: null };
        mockDb.suppliers.push(sup);
        return sup;
      },
      findMany: async () => mockDb.suppliers,
    },
    purchaseOrder: {
      findUnique: async ({ where }: any) => {
        const { shopId, poNumber } = where.shopId_poNumber || {};
        const po = mockDb.purchaseOrders.find((p) => p.shopId === shopId && p.poNumber === poNumber);
        if (!po) return null;
        return {
          ...po,
          items: mockDb.purchaseOrderItems.filter((i) => i.purchaseOrderId === po.id),
        };
      },
      findFirst: async ({ where }: any) => {
        const po = mockDb.purchaseOrders.find((p) => {
          if (where.id && p.id !== where.id) return false;
          if (where.shopId && p.shopId !== where.shopId) return false;
          return true;
        });
        if (!po) return null;
        return {
          ...po,
          supplier: mockDb.suppliers.find((s) => s.id === po.supplierId),
          items: mockDb.purchaseOrderItems.filter((i) => i.purchaseOrderId === po.id).map((i) => ({
            ...i,
            variant: {
              ...mockDb.variants.find((v) => v.id === i.variantId),
              product: mockDb.products.find((prod) => prod.id === mockDb.variants.find((v) => v.id === i.variantId)?.productId),
            },
          })),
        };
      },
      create: async ({ data }: any) => {
        const poId = `po-${Date.now()}-${Math.random()}`;
        const po = {
          id: poId,
          shopId: data.shopId,
          supplierId: data.supplierId,
          poNumber: data.poNumber,
          status: data.status,
          totalAmount: data.totalAmount,
          createdAt: new Date(),
        };
        mockDb.purchaseOrders.push(po);
        if (data.items?.create) {
          for (const item of data.items.create) {
            mockDb.purchaseOrderItems.push({
              id: `poi-${Date.now()}-${Math.random()}`,
              purchaseOrderId: poId,
              ...item,
            });
          }
        }
        return {
          ...po,
          supplier: mockDb.suppliers.find((s) => s.id === po.supplierId),
          items: mockDb.purchaseOrderItems.filter((i) => i.purchaseOrderId === poId),
        };
      },
      update: async ({ where, data }: any) => {
        const po = mockDb.purchaseOrders.find((p) => p.id === where.id);
        if (!po) throw new Error("PO not found");
        Object.assign(po, data);
        return {
          ...po,
          items: mockDb.purchaseOrderItems.filter((i) => i.purchaseOrderId === po.id),
        };
      },
      count: async () => mockDb.purchaseOrders.length,
      findMany: async () => mockDb.purchaseOrders,
    },
    purchaseOrderItem: {
      update: async ({ where, data }: any) => {
        const item = mockDb.purchaseOrderItems.find((i) => i.id === where.id);
        if (!item) throw new Error("PO item not found");
        Object.assign(item, data);
        return item;
      },
    },
    auditLog: {
      create: async ({ data }: any) => {
        mockDb.auditLogs.push(data);
        return data;
      },
    },
  });

  return { prisma: createClient() };
});

// Import services after mock setup
import { createProduct, updateProduct, archiveProduct } from "../services/product-service";
import { adjustStock, verifyStockIntegrity } from "../services/inventory-service";
import { createSale, processReturn } from "../services/sales-service";
import { createSupplier, createPurchaseOrder, receivePurchaseStock } from "../services/purchase-service";

describe("Milestone 2 Acceptance Tests: Core Inventory & Business Operations", () => {
  const tenantA: TenantContext = {
    organizationId: "org-alpha",
    shopId: "shop-alpha-1",
    user: {
      id: "user-owner-1",
      email: "owner@alpha.com",
      fullName: "Alpha Owner",
      platformRole: PlatformRole.NONE,
      isActive: true,
    },
    role: ShopRole.SHOP_OWNER,
    isPlatformAdmin: false,
    permissions: { canViewReports: true, canApplyDiscount: true, canAdjustStock: true },
  };

  const tenantB: TenantContext = {
    organizationId: "org-beta",
    shopId: "shop-beta-1",
    user: {
      id: "user-owner-2",
      email: "owner@beta.com",
      fullName: "Beta Owner",
      platformRole: PlatformRole.NONE,
      isActive: true,
    },
    role: ShopRole.SHOP_OWNER,
    isPlatformAdmin: false,
    permissions: { canViewReports: true, canApplyDiscount: true, canAdjustStock: true },
  };

  beforeEach(() => {
    // Reset DB state before each test
    mockDb.organizations = [
      { id: "org-alpha", name: "Alpha Retail" },
      { id: "org-beta", name: "Beta Stores" },
    ];
    mockDb.shops = [
      { id: "shop-alpha-1", organizationId: "org-alpha", name: "Alpha Main", currency: "USD", taxRate: 10, allowNegativeStock: false, isActive: true },
      { id: "shop-beta-1", organizationId: "org-beta", name: "Beta Store", currency: "USD", taxRate: 5, allowNegativeStock: false, isActive: true },
    ];
    mockDb.products = [];
    mockDb.variants = [];
    mockDb.inventoryItems = [];
    mockDb.stockMovements = [];
    mockDb.sales = [];
    mockDb.saleItems = [];
    mockDb.paymentTransactions = [];
    mockDb.suppliers = [];
    mockDb.purchaseOrders = [];
    mockDb.purchaseOrderItems = [];
    mockDb.auditLogs = [];
  });

  // ---------------------------------------------------------------------------
  // 1. PRODUCT CREATION & SKU UNIQUENESS
  // ---------------------------------------------------------------------------
  it("creates a product with initial opening stock and records it in the stock ledger", async () => {
    const result = await createProduct(tenantA, {
      name: "Mechanical Keyboard",
      sku: "KEY-001",
      barcode: "1234567890",
      costPrice: 45.0,
      sellingPrice: 89.99,
      unitOfMeasure: "pcs",
      reorderLevel: 5,
      initialStock: 20,
    });

    expect(result.product.name).toBe("Mechanical Keyboard");
    expect(result.variant.sku).toBe("KEY-001");
    expect(result.inventory.quantity).toBe(20);

    // Verify stock ledger movement
    expect(mockDb.stockMovements).toHaveLength(1);
    expect(mockDb.stockMovements[0].quantityDelta).toBe(20);
    expect(mockDb.stockMovements[0].movementType).toBe(MovementType.MANUAL_ADJUSTMENT);
    expect(mockDb.stockMovements[0].resultingBalance).toBe(20);
  });

  it("prevents duplicate SKUs within the same organization", async () => {
    await createProduct(tenantA, {
      name: "Mouse Wireless",
      sku: "MOUSE-01",
      costPrice: 10,
      sellingPrice: 20,
      unitOfMeasure: "pcs",
      reorderLevel: 2,
      initialStock: 5,
    });

    await expect(
      createProduct(tenantA, {
        name: "Mouse Wireless V2",
        sku: "MOUSE-01", // Duplicate!
        costPrice: 12,
        sellingPrice: 25,
        unitOfMeasure: "pcs",
        reorderLevel: 2,
        initialStock: 10,
      })
    ).rejects.toThrow('SKU "MOUSE-01" already exists');
  });

  // ---------------------------------------------------------------------------
  // 2. PURCHASING, SUPPLIERS & STOCK RECEIVING
  // ---------------------------------------------------------------------------
  it("records purchase orders without modifying inventory until goods are actually received", async () => {
    const prod = await createProduct(tenantA, {
      name: "USB-C Cable",
      sku: "CABLE-01",
      costPrice: 3.5,
      sellingPrice: 9.99,
      unitOfMeasure: "pcs",
      reorderLevel: 10,
      initialStock: 0,
    });

    const supplier = await createSupplier(tenantA, {
      name: "Cable Suppliers Inc",
      paymentTerms: "Net 30",
    });

    const po = await createPurchaseOrder(tenantA, {
      supplierId: supplier.id,
      poNumber: "PO-1001",
      items: [{ variantId: prod.variant.id, orderedQuantity: 50, unitCost: 3.5 }],
    });

    // Stock must STILL be 0
    const invBefore = mockDb.inventoryItems.find((i) => i.variantId === prod.variant.id);
    expect(invBefore?.quantity).toBe(0);

    // Receive 30 units (partial delivery)
    const updatedPO = await receivePurchaseStock(tenantA, {
      purchaseOrderId: po.id,
      items: [{ variantId: prod.variant.id, receivedQuantity: 30 }],
    });

    expect(updatedPO.status).toBe(POStatus.PARTIALLY_RECEIVED);
    const invAfter = mockDb.inventoryItems.find((i) => i.variantId === prod.variant.id);
    expect(invAfter?.quantity).toBe(30);

    // Verify stock ledger movement
    const receiptMovements = mockDb.stockMovements.filter(
      (m) => m.movementType === MovementType.PURCHASE_RECEIPT
    );
    expect(receiptMovements).toHaveLength(1);
    expect(receiptMovements[0].quantityDelta).toBe(30);
    expect(receiptMovements[0].referenceId).toBe("PO-1001");
  });

  it("prevents receiving more than the pending ordered purchase quantity (prevents double receipt)", async () => {
    const prod = await createProduct(tenantA, {
      name: "HDMI Adapter",
      sku: "HDMI-01",
      costPrice: 8,
      sellingPrice: 19.99,
      unitOfMeasure: "pcs",
      reorderLevel: 5,
      initialStock: 0,
    });

    const supplier = await createSupplier(tenantA, { name: "Display Co" });
    const po = await createPurchaseOrder(tenantA, {
      supplierId: supplier.id,
      poNumber: "PO-1002",
      items: [{ variantId: prod.variant.id, orderedQuantity: 10, unitCost: 8 }],
    });

    // Attempting to receive 15 units when only 10 were ordered
    await expect(
      receivePurchaseStock(tenantA, {
        purchaseOrderId: po.id,
        items: [{ variantId: prod.variant.id, receivedQuantity: 15 }],
      })
    ).rejects.toThrow("Only 10 units are pending receipt");
  });

  // ---------------------------------------------------------------------------
  // 3. SALES, TAXES & DECIMAL PRECISION
  // ---------------------------------------------------------------------------
  it("processes a multi-line checkout with exact Decimal tax calculation and stock deduction", async () => {
    const prod1 = await createProduct(tenantA, {
      name: "Espresso Beans 1kg",
      sku: "COF-01",
      costPrice: 12.0,
      sellingPrice: 24.5,
      unitOfMeasure: "bag",
      reorderLevel: 5,
      initialStock: 15,
    });

    const prod2 = await createProduct(tenantA, {
      name: "Oat Milk 1L",
      sku: "MILK-01",
      costPrice: 1.8,
      sellingPrice: 4.25,
      unitOfMeasure: "carton",
      reorderLevel: 10,
      initialStock: 20,
    });

    // Sell: 2x Beans ($49.00), 4x Oat Milk ($17.00). Subtotal: $66.00. Tax (10%): $6.60. Total: $72.60.
    const saleResult = await createSale(tenantA, {
      idempotencyKey: "sale-key-001",
      items: [
        { variantId: prod1.variant.id, quantity: 2 },
        { variantId: prod2.variant.id, quantity: 4 },
      ],
      payments: [
        {
          paymentMethod: "CASH" as any,
          amount: 72.6,
        },
      ],
    });

    const sale = saleResult.sale;
    expect(new Decimal(sale.subtotal).toString()).toBe("66");
    expect(new Decimal(sale.taxAmount).toString()).toBe("6.6");
    expect(new Decimal(sale.totalAmount).toString()).toBe("72.6");

    // Verify stock deductions
    const inv1 = mockDb.inventoryItems.find((i) => i.variantId === prod1.variant.id);
    const inv2 = mockDb.inventoryItems.find((i) => i.variantId === prod2.variant.id);
    expect(inv1?.quantity).toBe(13); // 15 - 2
    expect(inv2?.quantity).toBe(16); // 20 - 4

    // Verify stock movements
    const movements = mockDb.stockMovements.filter((m) => m.movementType === MovementType.SALE_DEDUCTION);
    expect(movements).toHaveLength(2);
    expect(movements.find((m) => m.variantId === prod1.variant.id)?.quantityDelta).toBe(-2);
    expect(movements.find((m) => m.variantId === prod2.variant.id)?.quantityDelta).toBe(-4);
  });

  // ---------------------------------------------------------------------------
  // 4. INSUFFICIENT STOCK & TRANSACTION ROLLBACK
  // ---------------------------------------------------------------------------
  it("rejects sales with insufficient stock and rolls back all changes", async () => {
    const prod = await createProduct(tenantA, {
      name: "Limited Edition Mug",
      sku: "MUG-LTD",
      costPrice: 5.0,
      sellingPrice: 15.0,
      unitOfMeasure: "pcs",
      reorderLevel: 2,
      initialStock: 3,
    });

    // Attempt to buy 5 units when only 3 are available
    await expect(
      createSale(tenantA, {
        idempotencyKey: "sale-key-insufficient",
        items: [{ variantId: prod.variant.id, quantity: 5 }],
        payments: [{ paymentMethod: "CASH" as any, amount: 82.5 }], // $75 + 10% tax = $82.50
      })
    ).rejects.toThrow('Insufficient stock for "Limited Edition Mug');

    // Verify complete rollback: inventory must still be 3, no sale created, no sale movement
    const inv = mockDb.inventoryItems.find((i) => i.variantId === prod.variant.id);
    expect(inv?.quantity).toBe(3);
    expect(mockDb.sales).toHaveLength(0);
    const saleMovements = mockDb.stockMovements.filter((m) => m.movementType === MovementType.SALE_DEDUCTION);
    expect(saleMovements).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // 5. IDEMPOTENCY & DUPLICATE SALE PREVENTION
  // ---------------------------------------------------------------------------
  it("returns existing sale on duplicate submission without double-deducting stock", async () => {
    const prod = await createProduct(tenantA, {
      name: "USB Flash Drive",
      sku: "DRIVE-32GB",
      costPrice: 4.0,
      sellingPrice: 10.0,
      unitOfMeasure: "pcs",
      reorderLevel: 5,
      initialStock: 10,
    });

    const key = "idempotent-uuid-12345";

    // First checkout
    const result1 = await createSale(tenantA, {
      idempotencyKey: key,
      items: [{ variantId: prod.variant.id, quantity: 2 }],
      payments: [{ paymentMethod: "CREDIT_CARD" as any, amount: 22.0 }], // $20 + 10% tax
    });

    expect(result1.isDuplicateReplay).toBe(false);
    expect(mockDb.inventoryItems.find((i) => i.variantId === prod.variant.id)?.quantity).toBe(8);

    // Duplicate submission with same idempotency key (e.g. cashier double click or network retry)
    const result2 = await createSale(tenantA, {
      idempotencyKey: key,
      items: [{ variantId: prod.variant.id, quantity: 2 }],
      payments: [{ paymentMethod: "CREDIT_CARD" as any, amount: 22.0 }],
    });

    expect(result2.isDuplicateReplay).toBe(true);
    expect(result2.sale.id).toBe(result1.sale.id);
    // Crucial: stock must still be 8, not 6!
    expect(mockDb.inventoryItems.find((i) => i.variantId === prod.variant.id)?.quantity).toBe(8);
  });

  // ---------------------------------------------------------------------------
  // 6. RETURNS & RESTOCKING
  // ---------------------------------------------------------------------------
  it("processes returns, updates sale status, and restocks returned units into inventory", async () => {
    const prod = await createProduct(tenantA, {
      name: "Wireless Earbuds",
      sku: "AUDIO-01",
      costPrice: 20.0,
      sellingPrice: 50.0,
      unitOfMeasure: "pair",
      reorderLevel: 2,
      initialStock: 10,
    });

    const { sale } = await createSale(tenantA, {
      idempotencyKey: "sale-key-return-test",
      items: [{ variantId: prod.variant.id, quantity: 3 }],
      payments: [{ paymentMethod: "CASH" as any, amount: 165.0 }], // $150 + $15 tax
    });

    expect(mockDb.inventoryItems.find((i) => i.variantId === prod.variant.id)?.quantity).toBe(7);

    // Return 1 pair of earbuds with restock: true
    const returnResult = await processReturn(tenantA, {
      saleId: sale.id,
      items: [{ variantId: prod.variant.id, quantity: 1, restock: true }],
      reason: "Customer changed mind",
      refundMethod: "CASH" as any,
    });

    expect(returnResult.sale.status).toBe(SaleStatus.REFUNDED);
    // Stock is restored by +1 -> 8
    expect(mockDb.inventoryItems.find((i) => i.variantId === prod.variant.id)?.quantity).toBe(8);

    // Verify RETURN_RESTOCK movement
    const returnMovement = mockDb.stockMovements.find(
      (m) => m.movementType === MovementType.RETURN_RESTOCK
    );
    expect(returnMovement).toBeDefined();
    expect(returnMovement?.quantityDelta).toBe(1);
    expect(returnMovement?.resultingBalance).toBe(8);
  });

  // ---------------------------------------------------------------------------
  // 7. SOURCE-OF-TRUTH STOCK INTEGRITY RECONCILIATION
  // ---------------------------------------------------------------------------
  it("maintains perfect mathematical consistency between stock ledger and materialized balance", async () => {
    const prod = await createProduct(tenantA, {
      name: "Smart Watch",
      sku: "WATCH-01",
      costPrice: 50,
      sellingPrice: 120,
      unitOfMeasure: "pcs",
      reorderLevel: 3,
      initialStock: 10, // +10 (Manual Adjustment)
    });

    // Sale of 2 (-2)
    await createSale(tenantA, {
      idempotencyKey: "integrity-sale-1",
      items: [{ variantId: prod.variant.id, quantity: 2 }],
      payments: [{ paymentMethod: "CASH" as any, amount: 264 }],
    });

    // Manual count adjustment to 15 (+7)
    await adjustStock(tenantA, {
      variantId: prod.variant.id,
      adjustmentType: "SET_QUANTITY",
      quantity: 15,
      reason: "Quarterly stocktake audit",
    });

    // Verify integrity: sum(deltas) === currentStock
    const integrity = await verifyStockIntegrity(tenantA.shopId, prod.variant.id);
    expect(integrity.isValid).toBe(true);
    expect(integrity.currentQuantity).toBe(15);
    expect(integrity.calculatedBalance).toBe(15);
    expect(integrity.difference).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // 8. CROSS-TENANT DATA ISOLATION
  // ---------------------------------------------------------------------------
  it("strictly isolates products and stock between different organizations", async () => {
    // Tenant B creates a product
    const betaProduct = await createProduct(tenantB, {
      name: "Secret Beta Device",
      sku: "BETA-01",
      costPrice: 100,
      sellingPrice: 200,
      unitOfMeasure: "pcs",
      reorderLevel: 1,
      initialStock: 5,
    });

    // Tenant A attempts to execute a sale using Tenant B's product variant
    await expect(
      createSale(tenantA, {
        idempotencyKey: "cross-tenant-hack-attempt",
        items: [{ variantId: betaProduct.variant.id, quantity: 1 }],
        payments: [{ paymentMethod: "CASH" as any, amount: 220 }],
      })
    ).rejects.toThrow("belong to another organization");
  });
});
