import { describe, it, expect, beforeEach, vi } from "vitest";
import { Decimal } from "../decimal";
import { ShopRole, PlatformRole, PaymentMethod } from "@prisma/client";
import { TenantContext } from "../tenant/context";
import {
  getPlatformOverview,
  listAdminShops,
  suspendShop,
  reactivateShop,
  listAdminUsers,
  revokeAllUserSessions,
  generateAccountRecoveryLink,
  createSupportTicket,
  updateSupportTicket,
  startSupportInvestigationSession,
  getPlatformConfig,
  updatePlatformConfig,
  getSystemHealthTelemetry,
} from "../services/platform-admin-service";
import { createSale } from "../services/sales-service";
import { adjustStock } from "../services/inventory-service";
import { validateRecoveryToken, consumeRecoveryToken } from "../auth/service";


// -----------------------------------------------------------------------------
// In-Memory Relational Engine for Platform Admin Tests
// -----------------------------------------------------------------------------
class MockAdminDatabase {
  organizations: any[] = [];
  shops: any[] = [];
  users: any[] = [];
  sessions: any[] = [];
  memberships: any[] = [];
  products: any[] = [];
  variants: any[] = [];
  inventoryItems: any[] = [];
  stockMovements: any[] = [];
  sales: any[] = [];
  supportTickets: any[] = [];
  platformSettings: any[] = [];
  auditLogs: any[] = [];
}

const mockDb = new MockAdminDatabase();

vi.mock("../db", () => {
  const createClient = (): any => ({
    $queryRaw: async () => [{ 1: 1 }],
    $transaction: async (cb: any) => {
      const tx = createClient();
      return await cb(tx);
    },
    organization: {
      count: async (args?: any) => {
        if (args?.where?.planStatus) {
          return mockDb.organizations.filter((o) => o.planStatus === args.where.planStatus).length;
        }
        return mockDb.organizations.length;
      },
      findMany: async () => mockDb.organizations,
      groupBy: async () => [
        { plan: "standard", _count: { id: 2 } },
        { plan: "enterprise", _count: { id: 1 } },
      ],
    },
    shop: {
      count: async (args?: any) => {
        if (args?.where?.isActive !== undefined) {
          return mockDb.shops.filter((s) => s.isActive === args.where.isActive).length;
        }
        return mockDb.shops.length;
      },
      findUnique: async ({ where }: any) => {
        const s = mockDb.shops.find((item) => item.id === where.id);
        if (!s) return null;
        const org = mockDb.organizations.find((o) => o.id === s.organizationId);
        return { ...s, organization: org };
      },
      findFirst: async ({ where }: any) => {
        const s = mockDb.shops.find((item) => {
          if (where.id && item.id !== where.id) return false;
          if (where.organizationId && item.organizationId !== where.organizationId) return false;
          return true;
        });
        if (!s) return null;
        const org = mockDb.organizations.find((o) => o.id === s.organizationId);
        return { ...s, organization: org };
      },
      findMany: async ({ where }: any) => {
        return mockDb.shops
          .filter((s) => {
            if (where?.isActive !== undefined && s.isActive !== where.isActive) return false;
            return true;
          })
          .map((s) => ({
            ...s,
            organization: mockDb.organizations.find((o) => o.id === s.organizationId),
            _count: {
              sales: mockDb.sales.filter((sale) => sale.shopId === s.id).length,
              inventoryItems: mockDb.inventoryItems.filter((i) => i.shopId === s.id).length,
              memberships: mockDb.memberships.filter((m) => m.shopId === s.id).length,
            },
          }));
      },
      update: async ({ where, data }: any) => {
        const s = mockDb.shops.find((item) => item.id === where.id);
        if (!s) throw new Error("Shop not found");
        Object.assign(s, data);
        const org = mockDb.organizations.find((o) => o.id === s.organizationId);
        return { ...s, organization: org };
      },
    },
    user: {
      count: async () => mockDb.users.length,
      findUnique: async ({ where }: any) => {
        return mockDb.users.find((u) => u.id === where.id || u.email === where.email) || null;
      },
      findMany: async ({ select }: any) => {
        return mockDb.users.map((u) => ({
          id: u.id,
          email: u.email,
          fullName: u.fullName,
          phone: u.phone,
          platformRole: u.platformRole,
          isActive: u.isActive,
          lastLoginAt: u.lastLoginAt,
          createdAt: u.createdAt,
          _count: {
            sessions: mockDb.sessions.filter((s) => s.userId === u.id).length,
            memberships: mockDb.memberships.filter((m) => m.userId === u.id).length,
          },
          memberships: mockDb.memberships
            .filter((m) => m.userId === u.id)
            .map((m) => {
              const org = mockDb.organizations.find((o) => o.id === m.organizationId);
              const shop = mockDb.shops.find((s) => s.id === m.shopId);
              return {
                role: m.role,
                organization: { name: org?.name || "Org" },
                shop: shop ? { name: shop.name, code: shop.code } : null,
              };
            }),
        }));
      },
      update: async ({ where, data }: any) => {
        const u = mockDb.users.find((item) => item.id === where.id);
        if (!u) throw new Error("User not found");
        Object.assign(u, data);
        return u;
      },
    },

    userSession: {
      deleteMany: async ({ where }: any) => {
        const initialLen = mockDb.sessions.length;
        mockDb.sessions = mockDb.sessions.filter((s) => s.userId !== where.userId);
        return { count: initialLen - mockDb.sessions.length };
      },
    },
    supportTicket: {
      count: async () => mockDb.supportTickets.length,
      findUnique: async ({ where }: any) => {
        return mockDb.supportTickets.find((t) => t.id === where.id) || null;
      },
      findMany: async () => {
        return mockDb.supportTickets.map((t) => ({
          ...t,
          organization: mockDb.organizations.find((o) => o.id === t.organizationId),
          shop: mockDb.shops.find((s) => s.id === t.shopId),
        }));
      },
      create: async ({ data }: any) => {
        const t = { id: `ticket-${Date.now()}-${Math.random()}`, createdAt: new Date(), updatedAt: new Date(), ...data };
        mockDb.supportTickets.push(t);
        return t;
      },
      update: async ({ where, data }: any) => {
        const t = mockDb.supportTickets.find((item) => item.id === where.id);
        if (!t) throw new Error("Ticket not found");
        Object.assign(t, data);
        return t;
      },
    },
    platformSetting: {
      findMany: async () => mockDb.platformSettings,
      upsert: async ({ where, create, update }: any) => {
        let setting = mockDb.platformSettings.find((s) => s.key === where.key);
        if (setting) {
          Object.assign(setting, update);
        } else {
          setting = { ...create, updatedAt: new Date() };
          mockDb.platformSettings.push(setting);
        }
        return setting;
      },
    },
    auditLog: {
      count: async () => mockDb.auditLogs.length,
      findMany: async (args?: any) => {
        let items = mockDb.auditLogs;
        if (args?.where) {
          items = items.filter((l) => {
            if (args.where.action && l.action !== args.where.action) return false;
            if (args.where.entityType && l.entityType !== args.where.entityType) return false;
            if (args.where.entityId && l.entityId !== args.where.entityId) return false;
            return true;
          });
        }
        return items.map((l) => ({
          ...l,
          user: mockDb.users.find((u) => u.id === l.userId),
          organization: mockDb.organizations.find((o) => o.id === l.organizationId),
        }));
      },

      create: async ({ data }: any) => {
        const log = { id: `audit-${Date.now()}-${Math.random()}`, createdAt: new Date(), ...data };
        mockDb.auditLogs.push(log);
        return log;
      },
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
      findUnique: async ({ where }: any) => {
        const v = mockDb.variants.find((item) => item.id === where.id);
        if (!v) return null;
        const product = mockDb.products.find((p) => p.id === v.productId);
        return { ...v, product };
      },
    },
    inventoryItem: {
      upsert: async ({ where, create }: any) => {
        let inv = mockDb.inventoryItems.find(
          (i) => i.shopId === where.shopId_variantId.shopId && i.variantId === where.shopId_variantId.variantId
        );
        if (!inv) {
          inv = { id: `inv-${Date.now()}`, quantity: 0, version: 0, ...create };
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
        const sm = { id: `sm-${Date.now()}`, createdAt: new Date(), ...data };
        mockDb.stockMovements.push(sm);
        return sm;
      },
    },
    sale: {
      findUnique: async () => null,
      create: async ({ data }: any) => {
        const s = { id: `sale-${Date.now()}`, createdAt: new Date(), ...data };
        mockDb.sales.push(s);
        return s;
      },
    },
  });

  return { prisma: createClient() };
});

describe("Milestone 4: Secure Platform Administration & Governance", () => {
  const superAdminUser = {
    id: "usr-super-admin",
    email: "admin@easystock.app",
    fullName: "Lead Administrator",
    platformRole: PlatformRole.SUPER_ADMIN,
    isActive: true,
  };

  const shopOwnerUser = {
    id: "usr-shop-owner",
    email: "owner@retail.com",
    fullName: "Retail Owner",
    platformRole: PlatformRole.NONE,
    isActive: true,
  };

  const cashierUser = {
    id: "usr-cashier",
    email: "cashier@retail.com",
    fullName: "Sam Cashier",
    platformRole: PlatformRole.NONE,
    isActive: true,
  };

  const superAdminContext: TenantContext = {
    organizationId: "org-demo",
    shopId: "shop-main",
    user: superAdminUser,
    role: ShopRole.SHOP_OWNER,
    isPlatformAdmin: true,
    permissions: { canViewReports: true, canApplyDiscount: true, canAdjustStock: true },
  };

  const shopOwnerContext: TenantContext = {
    organizationId: "org-demo",
    shopId: "shop-main",
    user: shopOwnerUser,
    role: ShopRole.SHOP_OWNER,
    isPlatformAdmin: false,
    permissions: { canViewReports: true, canApplyDiscount: true, canAdjustStock: true },
  };

  const cashierContext: TenantContext = {
    organizationId: "org-demo",
    shopId: "shop-main",
    user: cashierUser,
    role: ShopRole.SHOPKEEPER,
    isPlatformAdmin: false,
    permissions: { canViewReports: false, canApplyDiscount: false, canAdjustStock: false },
  };

  beforeEach(() => {
    mockDb.organizations = [
      { id: "org-demo", name: "Metro Retailers", slug: "metro-retailers", plan: "standard", planStatus: "active" },
    ];

    mockDb.shops = [
      {
        id: "shop-main",
        organizationId: "org-demo",
        name: "Metro Branch 1",
        code: "METRO-01",
        currency: "USD",
        taxRate: new Decimal(10),
        isActive: true,
        suspensionReason: null,
        allowNegativeStock: false,
        deletedAt: null,
      },
    ];

    mockDb.users = [
      superAdminUser,
      shopOwnerUser,
      cashierUser,
      {
        id: "usr-staff-2",
        email: "staff2@retail.com",
        fullName: "Staff Two",
        platformRole: PlatformRole.NONE,
        isActive: true,
        phone: "+1 555-0199",
        lastLoginAt: new Date(),
        createdAt: new Date(),
      },
    ];

    mockDb.sessions = [
      { id: "sess-1", userId: cashierUser.id, tokenHash: "hash-1" },
      { id: "sess-2", userId: cashierUser.id, tokenHash: "hash-2" },
    ];

    mockDb.memberships = [
      { id: "m-1", userId: shopOwnerUser.id, organizationId: "org-demo", shopId: "shop-main", role: ShopRole.SHOP_OWNER },
      { id: "m-2", userId: cashierUser.id, organizationId: "org-demo", shopId: "shop-main", role: ShopRole.SHOPKEEPER },
    ];

    mockDb.products = [{ id: "p-1", organizationId: "org-demo", name: "Coffee Beans", sku: "CB-01" }];
    mockDb.variants = [{ id: "v-1", productId: "p-1", name: "1kg Bag", sku: "CB-01-1KG", costPrice: new Decimal(8), sellingPrice: new Decimal(15), reorderLevel: 2 }];
    mockDb.inventoryItems = [{ id: "i-1", shopId: "shop-main", variantId: "v-1", quantity: 20 }];
    mockDb.sales = [];
    mockDb.supportTickets = [];
    mockDb.platformSettings = [];
    mockDb.auditLogs = [];
  });

  // ---------------------------------------------------------------------------
  // 1. Strict Server-Side Authorization Boundary
  // ---------------------------------------------------------------------------
  it("rejects non-admin users from accessing all administrative functions", async () => {
    // Shop Owner should be rejected
    await expect(getPlatformOverview(shopOwnerContext)).rejects.toThrow(
      "Unauthorized: Platform Administrator privileges required."
    );
    await expect(listAdminShops(shopOwnerContext)).rejects.toThrow(
      "Unauthorized: Platform Administrator privileges required."
    );
    await expect(
      suspendShop(shopOwnerContext, { shopId: "shop-main", reason: "Illegal attempt" })
    ).rejects.toThrow("Unauthorized: Platform Administrator privileges required.");
    await expect(
      revokeAllUserSessions(shopOwnerContext, { userId: cashierUser.id, reason: "Unauthorized" })
    ).rejects.toThrow("Unauthorized: Platform Administrator privileges required.");
    await expect(getPlatformConfig(shopOwnerContext)).rejects.toThrow(
      "Unauthorized: Platform Administrator privileges required."
    );

    // Cashier should be rejected
    await expect(getPlatformOverview(cashierContext)).rejects.toThrow(
      "Unauthorized: Platform Administrator privileges required."
    );
  });

  // ---------------------------------------------------------------------------
  // 2. Shop Suspension with Reason & Consequence Enforcement
  // ---------------------------------------------------------------------------
  it("suspends a shop with mandatory reason and blocks POS checkout and inventory updates", async () => {
    // 1. Admin suspends shop
    const suspended = await suspendShop(superAdminContext, {
      shopId: "shop-main",
      reason: "Account under compliance audit for suspected fraud",
    });

    expect(suspended.isActive).toBe(false);
    expect(suspended.suspensionReason).toBe("Account under compliance audit for suspected fraud");

    // 2. Verify audit log entry
    const auditLog = mockDb.auditLogs.find((l) => l.action === "SHOP_SUSPENDED");
    expect(auditLog).toBeDefined();
    expect(auditLog.entityId).toBe("shop-main");
    expect(auditLog.newData.reason || auditLog.newData.suspensionReason).toContain("compliance audit");

    // 3. Verify Cashier POS checkout is blocked with suspension message
    await expect(
      createSale(cashierContext, {
        idempotencyKey: "12345678-1234-1234-1234-123456789abc",
        items: [{ variantId: "v-1", quantity: 1 }],
        payments: [{ paymentMethod: PaymentMethod.CASH, amount: 16.5 }],
      })
    ).rejects.toThrow("This shop is currently suspended by platform administration");

    // 4. Verify stock adjustment is blocked
    await expect(
      adjustStock(superAdminContext, {
        variantId: "v-1",
        adjustmentType: "ADD_QUANTITY",
        quantity: 5,
        reason: "Counting adjustment",
      })
    ).rejects.toThrow("This shop is currently suspended by platform administration");

    // 5. Verify customer data and inventory remain preserved
    expect(mockDb.inventoryItems[0].quantity).toBe(20);
  });

  it("reactivates a suspended shop with a verified audit memo", async () => {
    // Put in suspended state
    mockDb.shops[0].isActive = false;
    mockDb.shops[0].suspensionReason = "Payment dispute";

    const reactivated = await reactivateShop(superAdminContext, {
      shopId: "shop-main",
      reason: "Subscription arrears settled in full",
    });

    expect(reactivated.isActive).toBe(true);
    expect(reactivated.suspensionReason).toBeNull();

    const auditLog = mockDb.auditLogs.find((l) => l.action === "SHOP_REACTIVATED");
    expect(auditLog).toBeDefined();
    expect(auditLog.newData.reason).toBe("Subscription arrears settled in full");
  });

  // ---------------------------------------------------------------------------
  // 3. User Session Revocation & Password Privacy
  // ---------------------------------------------------------------------------
  it("revokes all active sessions for a target user account", async () => {
    expect(mockDb.sessions.filter((s) => s.userId === cashierUser.id).length).toBe(2);

    const result = await revokeAllUserSessions(superAdminContext, {
      userId: cashierUser.id,
      reason: "Employee departure / credential reset",
    });

    expect(result.success).toBe(true);
    expect(result.count).toBe(2);
    expect(mockDb.sessions.filter((s) => s.userId === cashierUser.id).length).toBe(0);

    const audit = mockDb.auditLogs.find((l) => l.action === "USER_SESSIONS_REVOKED");
    expect(audit).toBeDefined();
    expect(audit.newData.targetUserEmail).toBe(cashierUser.email);
  });

  it("lists accounts while protecting passwords and password hashes from exposure", async () => {
    const usersList = await listAdminUsers(superAdminContext);
    expect(usersList.items.length).toBeGreaterThanOrEqual(4);

    usersList.items.forEach((user: any) => {
      // Must NEVER return password or passwordHash
      expect(user.password).toBeUndefined();
      expect(user.passwordHash).toBeUndefined();
      expect(user.email).toBeDefined();
    });
  });

  it("generates a secure, single-use account recovery link with audit trail", async () => {
    const recovery = await generateAccountRecoveryLink(superAdminContext, {
      userId: shopOwnerUser.id,
      reason: "Customer verified over secure voice channel",
    });

    expect(recovery.recoveryUrl).toContain("/reset-password?token=");
    expect(recovery.userEmail).toBe(shopOwnerUser.email);
    expect(recovery.expiresAt).toBeInstanceOf(Date);

    const audit = mockDb.auditLogs.find((l) => l.action === "ACCOUNT_RECOVERY_LINK_GENERATED");
    expect(audit).toBeDefined();
    expect(audit.newData.tokenHash).toBeDefined();
  });

  it("validates and consumes account recovery link, updates password hash, revokes sessions, and prevents reuse", async () => {
    // 1. Ensure user has an active session before recovery
    mockDb.sessions.push({
      id: "session-to-revoke",
      userId: shopOwnerUser.id,
      tokenHash: "dummy-hash",
      activeShopId: "shop-main",
      expiresAt: new Date(Date.now() + 86400000),
    });
    expect(mockDb.sessions.filter((s) => s.userId === shopOwnerUser.id).length).toBeGreaterThan(0);

    // 2. Generate recovery link
    const recovery = await generateAccountRecoveryLink(superAdminContext, {
      userId: shopOwnerUser.id,
      reason: "Customer requested credential reset",
    });

    const parsedUrl = new URL(recovery.recoveryUrl, "http://localhost:3000");
    const token = parsedUrl.searchParams.get("token")!;
    const email = parsedUrl.searchParams.get("email")!;

    expect(token).toBeDefined();
    expect(email).toBe(shopOwnerUser.email);

    // 3. Validate token
    const validation = await validateRecoveryToken(token, email);
    expect(validation.valid).toBe(true);
    expect(validation.user?.id).toBe(shopOwnerUser.id);

    // 4. Consume token to set new password
    const newPassword = "NewStrongPassword2026!";
    const result = await consumeRecoveryToken(token, email, newPassword);
    expect(result.success).toBe(true);

    // Verify user password hash was updated
    const updatedUser = mockDb.users.find((u) => u.id === shopOwnerUser.id);
    expect(updatedUser.passwordHash).toBeDefined();

    // Verify user sessions were revoked
    expect(mockDb.sessions.filter((s) => s.userId === shopOwnerUser.id).length).toBe(0);

    // Verify audit log for consumption
    const resetLog = mockDb.auditLogs.find((l) => l.action === "ACCOUNT_PASSWORD_RESET");
    expect(resetLog).toBeDefined();
    expect(resetLog.entityId).toBe(shopOwnerUser.id);

    // 5. Single-use enforcement: Attempting to validate or consume again must fail
    const revalidation = await validateRecoveryToken(token, email);
    expect(revalidation.valid).toBe(false);
    expect(revalidation.error).toContain("already been used");

    await expect(consumeRecoveryToken(token, email, "AnotherPassword123!")).rejects.toThrow(
      "already been used"
    );
  });

  it("rejects expired or tampered account recovery tokens", async () => {
    // 1. Tampered token
    const tamperedValidation = await validateRecoveryToken("invalid-tampered-token", shopOwnerUser.email);
    expect(tamperedValidation.valid).toBe(false);
    expect(tamperedValidation.error).toContain("Invalid or unrecognized");

    // 2. Expired token
    const recovery = await generateAccountRecoveryLink(superAdminContext, {
      userId: shopOwnerUser.id,
      reason: "Testing expiration",
    });
    const parsedUrl = new URL(recovery.recoveryUrl, "http://localhost:3000");
    const token = parsedUrl.searchParams.get("token")!;
    const email = parsedUrl.searchParams.get("email")!;

    // Find the log and backdate expiration
    const tokenHash = require("crypto").createHash("sha256").update(token).digest("hex");
    const matchingLog = mockDb.auditLogs.find((l) => l.newData?.tokenHash === tokenHash);
    if (matchingLog) {
      matchingLog.newData.expiresAt = new Date(Date.now() - 3600 * 1000).toISOString();
    }

    const expiredValidation = await validateRecoveryToken(token, email);
    expect(expiredValidation.valid).toBe(false);
    expect(expiredValidation.error).toContain("expired");
  });


  // ---------------------------------------------------------------------------
  // 4. Support Tickets & Audited Support Investigation Sessions
  // ---------------------------------------------------------------------------
  it("tracks support tickets and logs time-limited, authorized support investigation sessions", async () => {
    // 1. Create support ticket
    const ticket = await createSupportTicket(superAdminContext, {
      title: "Stock movement ledger sync error",
      description: "Cashier reports negative inventory balance despite having items on shelf",
      severity: "HIGH",
      reportedByEmail: "owner@retail.com",
      shopId: "shop-main",
    });

    expect(ticket.id).toBeDefined();
    expect(ticket.status).toBe("OPEN");

    // 2. Start authorized investigation session
    const session = await startSupportInvestigationSession(superAdminContext, {
      shopId: "shop-main",
      ticketId: ticket.id,
      reason: "Investigating reported ledger discrepancy under ticket",
      durationMinutes: 60,
    });

    expect(session.sessionId).toBeDefined();
    expect(session.shopId).toBe("shop-main");
    expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());

    // Verify session logged to immutable audit trail
    const investigationLog = mockDb.auditLogs.find((l) => l.action === "SUPPORT_INVESTIGATION_STARTED");
    expect(investigationLog).toBeDefined();
    expect(investigationLog.newData.authorizedMinutes).toBe(60);
    expect(investigationLog.newData.investigatorEmail).toBe(superAdminUser.email);

    // 3. Resolve ticket
    const resolved = await updateSupportTicket(superAdminContext, {
      ticketId: ticket.id,
      status: "RESOLVED",
      resolutionNotes: "Re-indexed stock movements and explained threshold to owner",
    });

    expect(resolved.status).toBe("RESOLVED");
  });

  // ---------------------------------------------------------------------------
  // 5. System Health Diagnostics & Platform Configuration
  // ---------------------------------------------------------------------------
  it("returns monitored system telemetry with database ping and runtime status", async () => {
    const telemetry = await getSystemHealthTelemetry(superAdminContext);
    expect(telemetry.database.status).toBe("HEALTHY");
    expect(telemetry.runtime.nodeVersion).toBeDefined();
    expect(telemetry.runtime.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(telemetry.services.sessionEngine.status).toBe("ACTIVE");
    expect(telemetry.services.externalApm.status).toBe("NOT_CONFIGURED");
  });

  it("updates platform-wide configuration and logs change in audit trail", async () => {
    const config = await updatePlatformConfig(superAdminContext, {
      maintenanceMode: true,
      maintenanceNotice: "System undergoing maintenance from 02:00 to 03:00 UTC",
      supportContactEmail: "support@easystock.app",
      allowNewRegistrations: false,
    });

    expect(config.maintenanceMode).toBe(true);
    expect(config.allowNewRegistrations).toBe(false);

    const retrieved = await getPlatformConfig(superAdminContext);
    expect(retrieved.maintenanceMode).toBe(true);
    expect(retrieved.allowNewRegistrations).toBe(false);

    const audit = mockDb.auditLogs.find((l) => l.action === "PLATFORM_CONFIG_UPDATED");
    expect(audit).toBeDefined();
  });
});
