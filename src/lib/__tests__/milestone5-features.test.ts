import { describe, it, expect, beforeEach, vi } from "vitest";
import { Decimal } from "../decimal";
import { ShopRole, PlatformRole, MovementType } from "@prisma/client";
import { TenantContext } from "../tenant/context";
import { parseCsvText, validateProductImport, executeProductImport } from "../services/import-service";
import { transferStockBetweenShops } from "../services/inventory-service";

// -----------------------------------------------------------------------------
// In-Memory Relational Engine for Milestone 5 Tests
// -----------------------------------------------------------------------------
class MockM5Database {
  organizations: any[] = [];
  shops: any[] = [];
  users: any[] = [];
  categories: any[] = [];
  products: any[] = [];
  variants: any[] = [];
  inventoryItems: any[] = [];
  stockMovements: any[] = [];
  auditLogs: any[] = [];
}

const mockDb = new MockM5Database();

vi.mock("../db", () => {
  const createClient = (): any => ({
    $transaction: async (cb: any) => {
      const tx = createClient();
      return await cb(tx);
    },
    organization: {
      findUnique: async ({ where }: any) => mockDb.organizations.find((o) => o.id === where.id) || null,
    },
    shop: {
      findUnique: async ({ where }: any) => mockDb.shops.find((s) => s.id === where.id) || null,
      findFirst: async ({ where }: any) => {
        return (
          mockDb.shops.find((s) => {
            if (where.id && s.id !== where.id) return false;
            if (where.organizationId && s.organizationId !== where.organizationId) return false;
            return true;
          }) || null
        );
      },
    },
    category: {
      findMany: async ({ where }: any) => {
        return mockDb.categories.filter((c) => {
          if (where.organizationId && c.organizationId !== where.organizationId) return false;
          if (where.deletedAt === null && c.deletedAt !== null) return false;
          return true;
        });
      },
      create: async ({ data }: any) => {
        const cat = { id: `cat-${Date.now()}-${Math.random()}`, ...data, deletedAt: null };
        mockDb.categories.push(cat);
        return cat;
      },
    },
    product: {
      findMany: async ({ where }: any) => {
        return mockDb.products.filter((p) => {
          if (where.organizationId && p.organizationId !== where.organizationId) return false;
          if (where.deletedAt === null && p.deletedAt !== null) return false;
          return true;
        });
      },
      create: async ({ data }: any) => {
        const prod = { id: `prod-${Date.now()}-${Math.random()}`, ...data, deletedAt: null };
        mockDb.products.push(prod);
        return prod;
      },
    },
    productVariant: {
      findUnique: async ({ where }: any) => {
        const v = mockDb.variants.find((item) => item.id === where.id);
        if (!v) return null;
        const prod = mockDb.products.find((p) => p.id === v.productId);
        return { ...v, product: prod };
      },
      create: async ({ data }: any) => {
        const variant = { id: `var-${Date.now()}-${Math.random()}`, ...data, deletedAt: null };
        mockDb.variants.push(variant);
        return variant;
      },
    },
    inventoryItem: {
      findUnique: async ({ where }: any) => {
        if (where.shopId_variantId) {
          return (
            mockDb.inventoryItems.find(
              (i) => i.shopId === where.shopId_variantId.shopId && i.variantId === where.shopId_variantId.variantId
            ) || null
          );
        }
        return mockDb.inventoryItems.find((i) => i.id === where.id) || null;
      },
      upsert: async ({ where, update, create }: any) => {
        let item = mockDb.inventoryItems.find(
          (i) => i.shopId === where.shopId_variantId.shopId && i.variantId === where.shopId_variantId.variantId
        );
        if (!item) {
          item = { id: `inv-${Date.now()}-${Math.random()}`, ...create, version: 1 };
          mockDb.inventoryItems.push(item);
        } else {
          Object.assign(item, update);
        }
        return item;
      },
      create: async ({ data }: any) => {
        const inv = { id: `inv-${Date.now()}-${Math.random()}`, ...data, version: 1 };
        mockDb.inventoryItems.push(inv);
        return inv;
      },
      update: async ({ where, data }: any) => {
        const item = mockDb.inventoryItems.find((i) => i.id === where.id);
        if (!item) throw new Error("Inventory item not found");
        if (data.quantity !== undefined) item.quantity = data.quantity;
        if (data.version?.increment) item.version = (item.version || 0) + 1;
        return item;
      },
    },
    stockMovement: {
      create: async ({ data }: any) => {
        const sm = { id: `sm-${Date.now()}-${Math.random()}`, createdAt: new Date(), ...data };
        mockDb.stockMovements.push(sm);
        return sm;
      },
      findMany: async () => mockDb.stockMovements,
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

describe("Milestone 5: High-Value Features & Operational Reliability", () => {
  const orgA = "org-retail-a";
  const orgB = "org-retail-b";

  const mainShopA = {
    id: "shop-main-a",
    organizationId: orgA,
    name: "Main Flagship",
    code: "MAIN-01",
    currency: "ETB",
    taxRate: new Decimal(15),
    allowNegativeStock: false,
    isActive: true,
  };

  const branchShopA = {
    id: "shop-branch-a",
    organizationId: orgA,
    name: "Downtown Outlet",
    code: "BRANCH-01",
    currency: "ETB",
    taxRate: new Decimal(15),
    allowNegativeStock: false,
    isActive: true,
  };

  const competitorShopB = {
    id: "shop-competitor-b",
    organizationId: orgB,
    name: "Competitor Mart",
    code: "COMP-01",
    currency: "ETB",
    taxRate: new Decimal(15),
    allowNegativeStock: false,
    isActive: true,
  };

  const ownerUser = {
    id: "user-owner",
    email: "owner@retail.com",
    fullName: "Abebe Owner",
    platformRole: PlatformRole.NONE,
    isActive: true,
  };

  const cashierUser = {
    id: "user-cashier",
    email: "cashier@retail.com",
    fullName: "Chaltu Cashier",
    platformRole: PlatformRole.NONE,
    isActive: true,
  };

  const ownerContext: TenantContext = {
    organizationId: orgA,
    shopId: mainShopA.id,
    user: ownerUser,
    role: ShopRole.SHOP_OWNER,
    isPlatformAdmin: false,
    permissions: { canViewReports: true, canApplyDiscount: true, canAdjustStock: true },
  };

  const cashierContext: TenantContext = {
    organizationId: orgA,
    shopId: mainShopA.id,
    user: cashierUser,
    role: ShopRole.SHOPKEEPER,
    isPlatformAdmin: false,
    permissions: { canViewReports: false, canApplyDiscount: false, canAdjustStock: false },
  };

  beforeEach(() => {
    mockDb.organizations = [
      { id: orgA, name: "Retail Alpha", slug: "retail-alpha" },
      { id: orgB, name: "Retail Beta", slug: "retail-beta" },
    ];
    mockDb.shops = [mainShopA, branchShopA, competitorShopB];
    mockDb.users = [ownerUser, cashierUser];
    mockDb.categories = [];
    mockDb.products = [];
    mockDb.variants = [];
    mockDb.inventoryItems = [];
    mockDb.stockMovements = [];
    mockDb.auditLogs = [];
  });

  // ---------------------------------------------------------------------------
  // 1. CSV Parsing & Robust Format Normalization
  // ---------------------------------------------------------------------------
  it("parses CSV strings with commas, semicolons, and quoted values", () => {
    const csvComma = `Name,SKU,Barcode,CostPrice,SellingPrice,InitialStock\n"Arabica Coffee, Dark Roast",COF-01,123456789,150.00,220.00,50`;
    const rowsComma = parseCsvText(csvComma);

    expect(rowsComma.length).toBe(1);
    expect(rowsComma[0].name).toBe("Arabica Coffee, Dark Roast");
    expect(rowsComma[0].sku).toBe("COF-01");
    expect(rowsComma[0].costprice).toBe("150.00");
    expect(rowsComma[0].sellingprice).toBe("220.00");

    // Semicolon delimited
    const csvSemicolon = `Name;SKU;CostPrice;SellingPrice\nWhite Sugar 5kg;SUG-05;300.00;380.00`;
    const rowsSemi = parseCsvText(csvSemicolon);
    expect(rowsSemi.length).toBe(1);
    expect(rowsSemi[0].sku).toBe("SUG-05");
  });

  // ---------------------------------------------------------------------------
  // 2. CSV Pre-Flight Validation, Error Reporting & Collision Detection
  // ---------------------------------------------------------------------------
  it("validates CSV products, rejects invalid fields, and catches in-file duplicate SKUs", async () => {
    const rawRows: Array<Record<string, string>> = [
      // Valid row
      { name: "Cooking Oil 1L", sku: "OIL-1L", costprice: "120.00", sellingprice: "150.00", initialstock: "20" },
      // Invalid price & missing name
      { name: "", sku: "BAD-01", costprice: "-10", sellingprice: "abc" },
      // Duplicate SKU in same file
      { name: "Duplicate Oil", sku: "OIL-1L", costprice: "120.00", sellingprice: "150.00" },
    ];

    const validation = await validateProductImport(ownerContext, rawRows);

    expect(validation.totalRows).toBe(3);
    expect(validation.validRowsCount).toBe(1);
    expect(validation.invalidRowsCount).toBe(2);
    expect(validation.validRows[0].sku).toBe("OIL-1L");

    const duplicateError = validation.errors.find((e) => e.message.includes("Duplicate SKU"));
    expect(duplicateError).toBeDefined();
    expect(duplicateError?.rowNumber).toBe(4);
  });

  it("detects existing database SKU collisions during validation", async () => {
    // Existing product in organization
    mockDb.products.push({
      id: "prod-existing",
      organizationId: orgA,
      name: "Existing Tea",
      sku: "TEA-100",
      deletedAt: null,
    });

    const rawRows = [
      { name: "New Tea Brand", sku: "TEA-100", costprice: "50.00", sellingprice: "75.00" },
      { name: "Coffee Blend", sku: "COF-NEW", costprice: "100.00", sellingprice: "140.00" },
    ];

    const validation = await validateProductImport(ownerContext, rawRows);

    expect(validation.validRowsCount).toBe(1);
    expect(validation.validRows[0].sku).toBe("COF-NEW");

    const collisionError = validation.errors.find((e) => e.message.includes("already exists in your shop"));
    expect(collisionError).toBeDefined();
    expect(collisionError?.sku).toBe("TEA-100");
  });

  // ---------------------------------------------------------------------------
  // 3. Atomic Bulk CSV Product Import Execution
  // ---------------------------------------------------------------------------
  it("atomically imports valid products, auto-creates categories, and writes opening stock ledger", async () => {
    const validRows = [
      {
        name: "Yirgacheffe Coffee 500g",
        sku: "YIRG-500",
        barcode: "100200300",
        category: "Beverages",
        unitOfMeasure: "pkt",
        costPrice: 200.0,
        sellingPrice: 290.0,
        reorderLevel: 10,
        initialStock: 40,
      },
      {
        name: "Wheat Flour 25kg",
        sku: "WHEAT-25",
        category: "Grains",
        unitOfMeasure: "qtl",
        costPrice: 1800.0,
        sellingPrice: 2200.0,
        reorderLevel: 5,
        initialStock: 15,
      },
    ];

    const result = await executeProductImport(ownerContext, validRows);

    expect(result.success).toBe(true);
    expect(result.importedCount).toBe(2);
    expect(result.categoriesCreatedCount).toBe(2);

    // Verify database entries
    expect(mockDb.products.length).toBe(2);
    expect(mockDb.categories.length).toBe(2);
    expect(mockDb.inventoryItems.length).toBe(2);

    // Verify stock movements for opening balance
    const movements = mockDb.stockMovements.filter((m) => m.referenceType === "OPENING_BALANCE");
    expect(movements.length).toBe(2);
    expect(movements[0].quantityDelta).toBe(40);
    expect(movements[0].movementType).toBe(MovementType.MANUAL_ADJUSTMENT);

    // Verify audit log
    const audit = mockDb.auditLogs.find((a) => a.action === "PRODUCTS_CSV_IMPORT");
    expect(audit).toBeDefined();
    expect(audit.newData.importedCount).toBe(2);
  });

  // ---------------------------------------------------------------------------
  // 4. Inter-Branch Stock Transfers
  // ---------------------------------------------------------------------------
  it("transfers stock between two shops within the same organization with dual ledger entries", async () => {
    // Setup product & stock in Main Flagship
    const prod = { id: "p-transfer", organizationId: orgA, name: "Premium Honey 1kg", sku: "HNY-01" };
    mockDb.products.push(prod);
    const variant = {
      id: "v-transfer",
      productId: prod.id,
      name: "1kg Jar",
      sku: "HNY-01",
      costPrice: new Decimal(250),
      sellingPrice: new Decimal(380),
    };
    mockDb.variants.push(variant);

    // Main shop has 50 units
    mockDb.inventoryItems.push({
      id: "inv-main",
      shopId: mainShopA.id,
      variantId: variant.id,
      quantity: 50,
      version: 1,
    });

    // Downtown branch has 10 units
    mockDb.inventoryItems.push({
      id: "inv-branch",
      shopId: branchShopA.id,
      variantId: variant.id,
      quantity: 10,
      version: 1,
    });

    // Transfer 15 units from Main -> Downtown
    const result = await transferStockBetweenShops(ownerContext, {
      targetShopId: branchShopA.id,
      variantId: variant.id,
      quantity: 15,
      notes: "Replenishing low stock",
    });

    expect(result.quantity).toBe(15);
    expect(result.sourceRemaining).toBe(35);
    expect(result.targetNewBalance).toBe(25);

    // Verify source shop inventory item
    const mainInv = mockDb.inventoryItems.find((i) => i.shopId === mainShopA.id);
    expect(mainInv.quantity).toBe(35);

    // Verify target shop inventory item
    const branchInv = mockDb.inventoryItems.find((i) => i.shopId === branchShopA.id);
    expect(branchInv.quantity).toBe(25);

    // Verify stock movements
    const transferOut = mockDb.stockMovements.find((m) => m.movementType === MovementType.TRANSFER_OUT);
    expect(transferOut).toBeDefined();
    expect(transferOut.quantityDelta).toBe(-15);
    expect(transferOut.resultingBalance).toBe(35);

    const transferIn = mockDb.stockMovements.find((m) => m.movementType === MovementType.TRANSFER_IN);
    expect(transferIn).toBeDefined();
    expect(transferIn.quantityDelta).toBe(15);
    expect(transferIn.resultingBalance).toBe(25);
  });

  it("rejects stock transfer with insufficient stock when negative stock is disallowed", async () => {
    const prod = { id: "p-low", organizationId: orgA, name: "Limited Olive Oil", sku: "OLV-01" };
    mockDb.products.push(prod);
    const variant = { id: "v-low", productId: prod.id, name: "Standard", sku: "OLV-01", costPrice: new Decimal(400) };
    mockDb.variants.push(variant);

    mockDb.inventoryItems.push({
      id: "inv-low",
      shopId: mainShopA.id,
      variantId: variant.id,
      quantity: 5,
      version: 1,
    });

    // Attempt to transfer 10 units when only 5 exist
    await expect(
      transferStockBetweenShops(ownerContext, {
        targetShopId: branchShopA.id,
        variantId: variant.id,
        quantity: 10,
      })
    ).rejects.toThrow("Insufficient stock for transfer");
  });

  it("strictly rejects stock transfers to shops belonging to a different organization", async () => {
    const prod = { id: "p-secret", organizationId: orgA, name: "Special Reserve", sku: "RES-01" };
    mockDb.products.push(prod);
    const variant = { id: "v-secret", productId: prod.id, name: "Standard", sku: "RES-01", costPrice: new Decimal(100) };
    mockDb.variants.push(variant);

    mockDb.inventoryItems.push({
      id: "inv-secret",
      shopId: mainShopA.id,
      variantId: variant.id,
      quantity: 20,
      version: 1,
    });

    // Attempt cross-tenant transfer into competitorShopB (organization B)
    await expect(
      transferStockBetweenShops(ownerContext, {
        targetShopId: competitorShopB.id,
        variantId: variant.id,
        quantity: 5,
      })
    ).rejects.toThrow("belongs to a different organization");
  });

  it("rejects stock transfer if user lacks Shop Owner or Shop Manager role", async () => {
    await expect(
      transferStockBetweenShops(cashierContext, {
        targetShopId: branchShopA.id,
        variantId: "v-dummy",
        quantity: 5,
      })
    ).rejects.toThrow("You do not have permission to transfer stock between shops");
  });
});
