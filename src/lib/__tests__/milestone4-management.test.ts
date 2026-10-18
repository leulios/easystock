import { describe, it, expect, beforeEach, vi } from "vitest";
import { Decimal } from "../decimal";
import { ShopRole, PlatformRole, MovementType, SaleStatus, PaymentMethod } from "@prisma/client";
import { TenantContext } from "../tenant/context";
import {
  createCustomer,
  updateCustomer,
  adjustCustomerCredit,
  deleteCustomer,
  listCustomers,
} from "../services/customer-service";
import { updateShopSettings, getShopSettings } from "../services/shop-service";
import {
  addStaffMember,
  updateStaffMember,
  removeStaffMember,
  listShopStaff,
} from "../services/staff-service";
import { createSale, processReturn } from "../services/sales-service";
import { verifyPin } from "../auth/password";

// -----------------------------------------------------------------------------
// In-Memory Relational Engine for Milestone 4
// -----------------------------------------------------------------------------
class MockManagementDb {
  organizations: any[] = [];
  shops: any[] = [];
  users: any[] = [];
  memberships: any[] = [];
  products: any[] = [];
  variants: any[] = [];
  inventoryItems: any[] = [];
  stockMovements: any[] = [];
  customers: any[] = [];
  sales: any[] = [];
  saleItems: any[] = [];
  payments: any[] = [];
  auditLogs: any[] = [];

  snapshot() {
    return JSON.stringify({
      organizations: this.organizations,
      shops: this.shops,
      users: this.users,
      memberships: this.memberships,
      products: this.products,
      variants: this.variants,
      inventoryItems: this.inventoryItems,
      stockMovements: this.stockMovements,
      customers: this.customers,
      sales: this.sales,
      saleItems: this.saleItems,
      payments: this.payments,
      auditLogs: this.auditLogs,
    });
  }

  restore(snap: string) {
    const data = JSON.parse(snap);
    this.organizations = data.organizations;
    this.shops = data.shops;
    this.users = data.users;
    this.memberships = data.memberships;
    this.products = data.products;
    this.variants = data.variants;
    this.inventoryItems = data.inventoryItems;
    this.stockMovements = data.stockMovements;
    this.customers = data.customers;
    this.sales = data.sales;
    this.saleItems = data.saleItems;
    this.payments = data.payments;
    this.auditLogs = data.auditLogs;
  }
}

const mockDb = new MockManagementDb();

vi.mock("../db", () => {
  const createClient = (): any => ({
    $transaction: async (cb: any) => {
      const snap = mockDb.snapshot();
      try {
        const tx = createClient();
        return await cb(tx);
      } catch (e) {
        mockDb.restore(snap);
        throw e;
      }
    },
    organization: {
      findFirst: async ({ where }: any) => {
        return mockDb.organizations.find((o) => o.id === where.id) || null;
      },
      findUnique: async ({ where }: any) => {
        return mockDb.organizations.find((o) => o.id === where.id) || null;
      },
      update: async ({ where, data }: any) => {
        const o = mockDb.organizations.find((item) => item.id === where.id);
        if (!o) throw new Error("Org not found");
        Object.assign(o, data);
        return o;
      },
      count: async () => mockDb.organizations.length,
    },
    shop: {
      findFirst: async ({ where }: any) => {
        return (
          mockDb.shops.find((s) => {
            if (where.id && s.id !== where.id) return false;
            if (where.organizationId && s.organizationId !== where.organizationId) return false;
            if (where.deletedAt === null && s.deletedAt !== null) return false;
            return true;
          }) || null
        );
      },
      findUnique: async ({ where }: any) => {
        return mockDb.shops.find((s) => s.id === where.id) || null;
      },
      update: async ({ where, data }: any) => {
        const s = mockDb.shops.find((item) => item.id === where.id);
        if (!s) throw new Error("Shop not found");
        Object.assign(s, data);
        return s;
      },
      count: async () => mockDb.shops.length,
    },
    user: {
      findUnique: async ({ where }: any) => {
        return mockDb.users.find((u) => u.email === where.email || u.id === where.id) || null;
      },
      create: async ({ data }: any) => {
        const u = {
          id: `usr-${Date.now()}-${Math.random()}`,
          isActive: true,
          lastLoginAt: null,
          createdAt: new Date(),
          ...data,
        };
        mockDb.users.push(u);
        return u;
      },
      count: async () => mockDb.users.length,
    },
    userMembership: {
      findFirst: async ({ where }: any) => {
        return (
          mockDb.memberships.find((m) => {
            if (where.id && m.id !== where.id) return false;
            if (where.userId && m.userId !== where.userId) return false;
            if (where.organizationId && m.organizationId !== where.organizationId) return false;
            if (where.shopId !== undefined && m.shopId !== where.shopId) return false;
            return true;
          }) || null
        );
      },
      findMany: async ({ where }: any) => {
        return mockDb.memberships
          .filter((m) => {
            if (where.organizationId && m.organizationId !== where.organizationId) return false;
            if (where.OR) {
              const matched = where.OR.some((cond: any) => {
                if (cond.shopId && m.shopId === cond.shopId) return true;
                if (cond.shopId === null && cond.role && m.shopId === null && m.role === cond.role)
                  return true;
                return false;
              });
              if (!matched) return false;
            }
            return true;
          })
          .map((m) => {
            const user = mockDb.users.find((u) => u.id === m.userId);
            return { ...m, user };
          });
      },
      create: async ({ data }: any) => {
        const m = {
          id: `mem-${Date.now()}-${Math.random()}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        mockDb.memberships.push(m);
        const user = mockDb.users.find((u) => u.id === m.userId);
        return { ...m, user };
      },
      update: async ({ where, data }: any) => {
        const m = mockDb.memberships.find((item) => item.id === where.id);
        if (!m) throw new Error("Membership not found");
        Object.assign(m, data);
        const user = mockDb.users.find((u) => u.id === m.userId);
        return { ...m, user };
      },
      delete: async ({ where }: any) => {
        const idx = mockDb.memberships.findIndex((item) => item.id === where.id);
        if (idx !== -1) mockDb.memberships.splice(idx, 1);
        return { id: where.id };
      },
    },
    customer: {
      findFirst: async ({ where }: any) => {
        return (
          mockDb.customers.find((c) => {
            if (where.id && c.id !== where.id) return false;
            if (where.organizationId && c.organizationId !== where.organizationId) return false;
            if (where.deletedAt === null && c.deletedAt !== null) return false;
            return true;
          }) || null
        );
      },
      findMany: async ({ where }: any) => {
        return mockDb.customers
          .filter((c) => {
            if (where.organizationId && c.organizationId !== where.organizationId) return false;
            if (where.deletedAt === null && c.deletedAt !== null) return false;
            if (where.outstandingCredit?.gt && Number(c.outstandingCredit) <= where.outstandingCredit.gt)
              return false;
            return true;
          })
          .map((c) => ({
            ...c,
            _count: {
              sales: mockDb.sales.filter((s) => s.customerId === c.id).length,
            },
          }));
      },
      create: async ({ data }: any) => {
        const c = {
          id: `cust-${Date.now()}-${Math.random()}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          ...data,
        };
        mockDb.customers.push(c);
        return c;
      },
      update: async ({ where, data }: any) => {
        const c = mockDb.customers.find((item) => item.id === where.id);
        if (!c) throw new Error("Customer not found");
        Object.assign(c, data);
        return c;
      },
      count: async () => mockDb.customers.filter((c) => c.deletedAt === null).length,
    },
    productVariant: {
      findMany: async ({ where }: any) => {
        return mockDb.variants
          .filter((v) => where.id.in.includes(v.id))
          .map((v) => {
            const product = mockDb.products.find((p) => p.id === v.productId);
            return { ...v, product };
          });
      },
    },
    inventoryItem: {
      upsert: async ({ where, create, update }: any) => {
        let inv = mockDb.inventoryItems.find(
          (i) => i.shopId === where.shopId_variantId.shopId && i.variantId === where.shopId_variantId.variantId
        );
        if (!inv) {
          inv = {
            id: `inv-${Date.now()}-${Math.random()}`,
            quantity: 0,
            version: 0,
            ...create,
          };
          mockDb.inventoryItems.push(inv);
        }
        return inv;
      },
      update: async ({ where, data }: any) => {
        const inv = mockDb.inventoryItems.find((i) => i.id === where.id);
        if (!inv) throw new Error("Inventory not found");
        if (data.quantity !== undefined) inv.quantity = data.quantity;
        return inv;
      },
    },
    stockMovement: {
      create: async ({ data }: any) => {
        const sm = { id: `mov-${Date.now()}-${Math.random()}`, createdAt: new Date(), ...data };
        mockDb.stockMovements.push(sm);
        return sm;
      },
    },
    sale: {
      findUnique: async ({ where }: any) => {
        if (where.idempotencyKey) {
          return mockDb.sales.find((s) => s.idempotencyKey === where.idempotencyKey) || null;
        }
        return mockDb.sales.find((s) => s.id === where.id) || null;
      },
      findFirst: async ({ where }: any) => {
        return (
          mockDb.sales.find((s) => {
            if (where.id && s.id !== where.id) return false;
            if (where.shopId && s.shopId !== where.shopId) return false;
            return true;
          }) || null
        );
      },
      create: async ({ data }: any) => {
        const sale = {
          id: `sale-${Date.now()}-${Math.random()}`,
          createdAt: new Date(),
          ...data,
          items: data.items?.create || [],
          payments: data.payments?.create || [],
        };
        mockDb.sales.push(sale);
        return sale;
      },
      update: async ({ where, data }: any) => {
        const sale = mockDb.sales.find((s) => s.id === where.id);
        if (!sale) throw new Error("Sale not found");
        Object.assign(sale, data);
        return sale;
      },
    },
    auditLog: {
      create: async ({ data }: any) => {
        const log = { id: `log-${Date.now()}-${Math.random()}`, createdAt: new Date(), ...data };
        mockDb.auditLogs.push(log);
        return log;
      },
    },
  });

  return { prisma: createClient() };
});

describe("Milestone 4: Customer Accounts, Shop Settings & Team Governance", () => {
  const orgId = "org-milestone-4";
  const shopId = "shop-branch-1";
  const ownerUser = {
    id: "usr-owner-1",
    email: "owner@company.com",
    fullName: "Jane Owner",
    platformRole: PlatformRole.NONE,
    isActive: true,
  };

  const cashierUser = {
    id: "usr-cashier-1",
    email: "cashier@company.com",
    fullName: "Bob Cashier",
    platformRole: PlatformRole.NONE,
    isActive: true,
  };

  const ownerContext: TenantContext = {
    organizationId: orgId,
    shopId,
    user: ownerUser,
    role: ShopRole.SHOP_OWNER,
    isPlatformAdmin: false,
    permissions: {
      canViewReports: true,
      canApplyDiscount: true,
      canAdjustStock: true,
    },
  };

  const cashierContext: TenantContext = {
    organizationId: orgId,
    shopId,
    user: cashierUser,
    role: ShopRole.SHOPKEEPER,
    isPlatformAdmin: false,
    permissions: {
      canViewReports: false,
      canApplyDiscount: false,
      canAdjustStock: false,
    },
  };

  beforeEach(() => {
    mockDb.organizations = [
      {
        id: orgId,
        name: "Acme Retailers",
        slug: "acme-retailers",
        plan: "standard",
        planStatus: "active",
        maxShops: 3,
      },
    ];

    mockDb.shops = [
      {
        id: shopId,
        organizationId: orgId,
        name: "Downtown Branch",
        code: "DT-01",
        currency: "USD",
        taxRate: new Decimal(10.0),
        taxNumber: "VAT-12345",
        receiptHeader: "Welcome to Downtown Branch",
        receiptFooter: "Thank you for shopping!",
        allowNegativeStock: false,
        isActive: true,
        deletedAt: null,
      },
    ];

    mockDb.users = [ownerUser, cashierUser];

    mockDb.memberships = [
      {
        id: "mem-owner-1",
        userId: ownerUser.id,
        organizationId: orgId,
        shopId: null, // Org-wide owner
        role: ShopRole.SHOP_OWNER,
        pinHash: null,
        canViewReports: true,
        canApplyDiscount: true,
        canAdjustStock: true,
      },
      {
        id: "mem-cashier-1",
        userId: cashierUser.id,
        organizationId: orgId,
        shopId,
        role: ShopRole.SHOPKEEPER,
        pinHash: null,
        canViewReports: false,
        canApplyDiscount: false,
        canAdjustStock: false,
      },
    ];

    mockDb.customers = [];
    mockDb.products = [];
    mockDb.variants = [];
    mockDb.inventoryItems = [];
    mockDb.stockMovements = [];
    mockDb.sales = [];
    mockDb.auditLogs = [];
  });

  // ---------------------------------------------------------------------------
  // 1. Customer Directory & Credit Ledger
  // ---------------------------------------------------------------------------
  it("creates a customer account and manages contact details", async () => {
    const customer = await createCustomer(ownerContext, {
      name: "Alice Wonderland",
      phone: "+1 555-0101",
      email: "alice@example.com",
      address: "123 Rabbit Hole Rd",
    });

    expect(customer.id).toBeDefined();
    expect(customer.name).toBe("Alice Wonderland");
    expect(customer.outstandingCredit).toBe(0);

    // List customer
    const list = await listCustomers(ownerContext);
    expect(list.total).toBe(1);
    expect(list.items[0].name).toBe("Alice Wonderland");

    // Update customer phone
    const updated = await updateCustomer(ownerContext, customer.id, {
      name: "Alice Wonderland",
      phone: "+1 555-9999",
    });

    expect(updated.phone).toBe("+1 555-9999");
  });

  it("adjusts customer store credit balance accurately and writes audit logs", async () => {
    const customer = await createCustomer(ownerContext, {
      name: "VIP Corporate Client",
      phone: "+1 555-0202",
    });

    // Post charge (credit extension)
    const afterCharge = await adjustCustomerCredit(ownerContext, {
      customerId: customer.id,
      amountDelta: 250.5,
      reason: "Advance shipment credit line extended",
    });

    expect(afterCharge.outstandingCredit).toBe(250.5);

    // Receive repayment
    const afterRepayment = await adjustCustomerCredit(ownerContext, {
      customerId: customer.id,
      amountDelta: -100.0,
      reason: "Cash counter repayment",
    });

    expect(afterRepayment.outstandingCredit).toBe(150.5);

    // Verify audit logs
    const creditLogs = mockDb.auditLogs.filter(
      (l) => l.action === "CUSTOMER_CREDIT_ADJUSTMENT" && l.entityId === customer.id
    );
    expect(creditLogs.length).toBe(2);
  });

  // ---------------------------------------------------------------------------
  // 2. Sales with Customer & Store Credit Integration
  // ---------------------------------------------------------------------------
  it("processes a POS sale charged to customer Store Credit and updates ledger balance", async () => {
    // 1. Create product and inventory
    const prod = {
      id: "prod-laptop",
      organizationId: orgId,
      name: "Pro Laptop",
      sku: "PRO-LAPTOP",
    };
    mockDb.products.push(prod);

    const variant = {
      id: "var-laptop-01",
      productId: prod.id,
      name: "16GB RAM",
      sku: "PRO-LAPTOP-16",
      costPrice: new Decimal(800.0),
      sellingPrice: new Decimal(1000.0),
      reorderLevel: 2,
    };
    mockDb.variants.push(variant);

    mockDb.inventoryItems.push({
      id: "inv-laptop-01",
      shopId,
      variantId: variant.id,
      quantity: 10,
      version: 1,
    });

    // 2. Create customer
    const customer = await createCustomer(ownerContext, {
      name: "Corporate Buyer",
    });
    expect(customer.outstandingCredit).toBe(0);

    // 3. Complete sale with STORE_CREDIT payment
    // Subtotal: 1000. Tax: 10% = 100. Grand Total = 1100.00
    const saleResult = await createSale(cashierContext, {
      idempotencyKey: "b1031d68-07d4-4a48-8df0-994df58a0b01",
      customerId: customer.id,
      items: [{ variantId: variant.id, quantity: 1 }],
      payments: [
        {
          paymentMethod: PaymentMethod.STORE_CREDIT,
          amount: 1100.0,
        },
      ],
    });

    expect(saleResult.sale.totalAmount.toNumber()).toBe(1100.0);
    expect(saleResult.sale.customerId).toBe(customer.id);

    // Verify customer's store credit balance increased by 1100.00
    const updatedCustomer = mockDb.customers.find((c) => c.id === customer.id);
    expect(Number(updatedCustomer.outstandingCredit)).toBe(1100.0);

    // Verify inventory deducted
    const inv = mockDb.inventoryItems.find((i) => i.id === "inv-laptop-01");
    expect(inv.quantity).toBe(9);
  });

  it("rejects STORE_CREDIT checkout if no customer account is selected", async () => {
    const prod = { id: "p1", organizationId: orgId, name: "P1", sku: "P1" };
    mockDb.products.push(prod);
    const variant = {
      id: "v1",
      productId: prod.id,
      name: "V1",
      sku: "V1",
      costPrice: new Decimal(10),
      sellingPrice: new Decimal(20),
      reorderLevel: 1,
    };
    mockDb.variants.push(variant);
    mockDb.inventoryItems.push({ id: "i1", shopId, variantId: variant.id, quantity: 5, version: 1 });

    // Attempt checkout without customerId using STORE_CREDIT
    await expect(
      createSale(cashierContext, {
        idempotencyKey: "b1031d68-07d4-4a48-8df0-994df58a0b02",
        customerId: null,
        items: [{ variantId: variant.id, quantity: 1 }],
        payments: [{ paymentMethod: PaymentMethod.STORE_CREDIT, amount: 22.0 }],
      })
    ).rejects.toThrow("A customer must be selected to purchase with Store Credit.");
  });

  it("decreases customer credit balance on sale return when refundMethod is STORE_CREDIT", async () => {
    const prod = { id: "p2", organizationId: orgId, name: "P2", sku: "P2" };
    mockDb.products.push(prod);
    const variant = {
      id: "v2",
      productId: prod.id,
      name: "V2",
      sku: "V2",
      costPrice: new Decimal(50),
      sellingPrice: new Decimal(100),
      reorderLevel: 1,
    };
    mockDb.variants.push(variant);
    mockDb.inventoryItems.push({ id: "i2", shopId, variantId: variant.id, quantity: 5, version: 1 });

    const customer = await createCustomer(ownerContext, { name: "Client A" });

    // Sale of 1 unit
    const saleRes = await createSale(ownerContext, {
      idempotencyKey: "b1031d68-07d4-4a48-8df0-994df58a0b03",
      customerId: customer.id,
      items: [{ variantId: variant.id, quantity: 1 }],
      payments: [{ paymentMethod: PaymentMethod.STORE_CREDIT, amount: 110.0 }],
    });

    const custAfterSale = mockDb.customers.find((c) => c.id === customer.id);
    expect(Number(custAfterSale.outstandingCredit)).toBe(110.0);

    // Return the item with STORE_CREDIT refund
    await processReturn(ownerContext, {
      saleId: saleRes.sale.id,
      items: [{ variantId: variant.id, quantity: 1, restock: true }],
      reason: "Customer changed mind",
      refundMethod: PaymentMethod.STORE_CREDIT,
    });

    const custAfterReturn = mockDb.customers.find((c) => c.id === customer.id);
    // 110 - 100 = 10.0 remaining (the unitPrice was 100)
    expect(Number(custAfterReturn.outstandingCredit)).toBe(10.0);
  });

  // ---------------------------------------------------------------------------
  // 3. Shop Settings & Store Policies
  // ---------------------------------------------------------------------------
  it("allows Shop Owner to update currency, taxes, and policies with audit trail", async () => {
    const updated = await updateShopSettings(ownerContext, {
      name: "Downtown Superstore",
      currency: "EUR",
      taxRate: 19.0,
      taxNumber: "DE-99887766",
      receiptHeader: "Willkommen!",
      receiptFooter: "Vielen Dank!",
      allowNegativeStock: true,
    });

    expect(updated.name).toBe("Downtown Superstore");
    expect(updated.currency).toBe("EUR");
    expect(updated.taxRate).toBe(19.0);
    expect(updated.allowNegativeStock).toBe(true);

    // Verify audit log
    const settingLog = mockDb.auditLogs.find((l) => l.action === "SHOP_SETTINGS_UPDATED");
    expect(settingLog).toBeDefined();
    expect(settingLog.newData.currency).toBe("EUR");
  });

  it("prevents non-owners (shopkeepers) from updating shop settings", async () => {
    await expect(
      updateShopSettings(cashierContext, {
        name: "Hacked Store Name",
        currency: "USD",
        taxRate: 0,
        allowNegativeStock: true,
      })
    ).rejects.toThrow("Unauthorized: Only Shop Owners can modify shop policies and settings.");
  });

  // ---------------------------------------------------------------------------
  // 4. Staff Management & Role Delegation
  // ---------------------------------------------------------------------------
  it("allows Shop Owner to add staff member with role, permissions, and POS PIN", async () => {
    const newStaff = await addStaffMember(ownerContext, {
      email: "newcashier@company.com",
      fullName: "Dave Cashier",
      role: ShopRole.SHOPKEEPER,
      pin: "4321",
      canViewReports: false,
      canApplyDiscount: true,
      canAdjustStock: false,
    });

    expect(newStaff.email).toBe("newcashier@company.com");
    expect(newStaff.role).toBe(ShopRole.SHOPKEEPER);
    expect(newStaff.hasPin).toBe(true);
    expect(newStaff.canApplyDiscount).toBe(true);
    expect(newStaff.canViewReports).toBe(false);

    // Verify PIN was securely hashed with bcrypt
    const membership = mockDb.memberships.find((m) => m.id === newStaff.id);
    expect(membership.pinHash).toBeDefined();
    const isPinCorrect = await verifyPin("4321", membership.pinHash);
    expect(isPinCorrect).toBe(true);

    const isPinWrong = await verifyPin("9999", membership.pinHash);
    expect(isPinWrong).toBe(false);
  });

  it("updates staff member permissions and role", async () => {
    // Add staff
    const staff = await addStaffMember(ownerContext, {
      email: "assistant@company.com",
      fullName: "Sarah Assistant",
      role: ShopRole.SHOPKEEPER,
      pin: "1122",
      canViewReports: false,
      canApplyDiscount: false,
      canAdjustStock: false,
    });

    // Promote to Manager and enable reports
    const updated = await updateStaffMember(ownerContext, {
      membershipId: staff.id,
      role: ShopRole.SHOP_MANAGER,
      canViewReports: true,
      canApplyDiscount: true,
      canAdjustStock: true,
    });

    expect(updated.role).toBe(ShopRole.SHOP_MANAGER);
    expect(updated.canViewReports).toBe(true);
    expect(updated.canAdjustStock).toBe(true);
  });

  it("protects owner from deleting their own membership", async () => {
    const ownerMembership = mockDb.memberships.find((m) => m.userId === ownerUser.id);
    await expect(
      removeStaffMember(ownerContext, ownerMembership.id)
    ).rejects.toThrow("Cannot remove your own owner membership.");
  });

  it("prevents shopkeepers from inviting or removing staff", async () => {
    await expect(
      addStaffMember(cashierContext, {
        email: "rogue@company.com",
        fullName: "Rogue User",
        role: ShopRole.SHOPKEEPER,
        canViewReports: false,
        canApplyDiscount: false,
        canAdjustStock: false,
      })
    ).rejects.toThrow("Unauthorized: Only Shop Owners can invite or assign staff members.");
  });
});
