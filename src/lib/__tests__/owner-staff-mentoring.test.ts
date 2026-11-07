import { describe, it, expect, beforeEach, vi } from "vitest";
import { Decimal } from "../decimal";
import { ShopRole, PlatformRole, SaleStatus, PaymentMethod } from "@prisma/client";
import { TenantContext } from "../tenant/context";
import {
  addStaffMember,
  updateStaffMember,
  removeStaffMember,
  listShopStaff,
  resetStaffPassword,
  toggleStaffStatus,
} from "../services/staff-service";
import { loginUser } from "../auth/service";
import { hashPassword, verifyPassword } from "../auth/password";

// -----------------------------------------------------------------------------
// In-Memory Database for Owner Staff Mentoring & Credential Management
// -----------------------------------------------------------------------------
class MockStaffDb {
  organizations: any[] = [];
  shops: any[] = [];
  users: any[] = [];
  memberships: any[] = [];
  sessions: any[] = [];
  sales: any[] = [];
  auditLogs: any[] = [];

  clear() {
    this.organizations = [];
    this.shops = [];
    this.users = [];
    this.memberships = [];
    this.sessions = [];
    this.sales = [];
    this.auditLogs = [];
  }
}

const mockDb = new MockStaffDb();

vi.mock("../db", () => {
  return {
    prisma: {
      $transaction: async (cb: any) => cb(vi.mocked(prismaClient)),
      organization: {
        findUnique: async ({ where }: any) => mockDb.organizations.find((o) => o.id === where.id) || null,
        findFirst: async ({ where }: any) => mockDb.organizations.find((o) => o.id === where.id) || null,
      },
      shop: {
        findUnique: async ({ where }: any) => mockDb.shops.find((s) => s.id === where.id) || null,
        findFirst: async ({ where }: any) => mockDb.shops.find((s) => s.id === where.id) || null,
      },
      user: {
        findUnique: async ({ where }: any) => {
          if (where.email) {
            const u = mockDb.users.find((u) => u.email.toLowerCase() === where.email.toLowerCase());
            if (!u) return null;
            return {
              ...u,
              memberships: mockDb.memberships
                .filter((m) => m.userId === u.id)
                .map((m) => ({
                  ...m,
                  organization: mockDb.organizations.find((o) => o.id === m.organizationId),
                  shop: mockDb.shops.find((s) => s.id === m.shopId),
                })),
            };
          }
          if (where.id) {
            return mockDb.users.find((u) => u.id === where.id) || null;
          }
          return null;
        },
        findFirst: async ({ where }: any) => {
          const u = mockDb.users.find((item) => {
            if (where.email && item.email.toLowerCase() !== where.email.toLowerCase()) return false;
            if (where.phone && item.phone !== where.phone) return false;
            if (where.OR) {
              return where.OR.some((cond: any) => {
                if (cond.email && item.email.toLowerCase() === cond.email.toLowerCase()) return true;
                if (cond.phone && item.phone === cond.phone) return true;
                return false;
              });
            }
            return true;
          });
          if (!u) return null;
          return {
            ...u,
            memberships: mockDb.memberships
              .filter((m) => m.userId === u.id)
              .map((m) => ({
                ...m,
                organization: mockDb.organizations.find((o) => o.id === m.organizationId),
                shop: mockDb.shops.find((s) => s.id === m.shopId),
              })),
          };
        },
        create: async ({ data }: any) => {
          const u = {
            id: `usr-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            isActive: true,
            lastLoginAt: null,
            createdAt: new Date(),
            ...data,
          };
          mockDb.users.push(u);
          return u;
        },
        update: async ({ where, data }: any) => {
          const u = mockDb.users.find((item) => item.id === where.id);
          if (!u) throw new Error("User not found");
          Object.assign(u, data);
          return u;
        },
      },
      userMembership: {
        findFirst: async ({ where }: any) => {
          const m = mockDb.memberships.find((item) => {
            if (where.id && item.id !== where.id) return false;
            if (where.userId && item.userId !== where.userId) return false;
            if (where.organizationId && item.organizationId !== where.organizationId) return false;
            if (where.shopId !== undefined && item.shopId !== where.shopId) return false;
            return true;
          });
          if (!m) return null;
          const user = mockDb.users.find((u) => u.id === m.userId);
          return { ...m, user };
        },
        findMany: async ({ where }: any) => {
          return mockDb.memberships
            .filter((m) => {
              if (where.organizationId && m.organizationId !== where.organizationId) return false;
              if (where.OR) {
                return where.OR.some((cond: any) => {
                  if (cond.shopId && m.shopId === cond.shopId) return true;
                  if (cond.shopId === null && cond.role && m.shopId === null && m.role === cond.role) return true;
                  return false;
                });
              }
              return true;
            })
            .map((m) => ({
              ...m,
              user: mockDb.users.find((u) => u.id === m.userId),
            }));
        },
        create: async ({ data }: any) => {
          const m = {
            id: `mem-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...data,
          };
          mockDb.memberships.push(m);
          return {
            ...m,
            user: mockDb.users.find((u) => u.id === m.userId),
          };
        },
        update: async ({ where, data }: any) => {
          const m = mockDb.memberships.find((item) => item.id === where.id);
          if (!m) throw new Error("Membership not found");
          Object.assign(m, data);
          return {
            ...m,
            user: mockDb.users.find((u) => u.id === m.userId),
          };
        },
        delete: async ({ where }: any) => {
          const idx = mockDb.memberships.findIndex((item) => item.id === where.id);
          if (idx !== -1) mockDb.memberships.splice(idx, 1);
          return { success: true };
        },
      },
      userSession: {
        create: async ({ data }: any) => {
          const s = {
            id: `sess-${Date.now()}`,
            ...data,
            createdAt: new Date(),
          };
          mockDb.sessions.push(s);
          return s;
        },
      },
      sale: {
        findMany: async ({ where }: any) => {
          return mockDb.sales.filter((s) => {
            if (where.shopId && s.shopId !== where.shopId) return false;
            if (where.cashierId && s.cashierId !== where.cashierId) return false;
            if (where.status && s.status !== where.status) return false;
            return true;
          });
        },
      },
      auditLog: {
        create: async ({ data }: any) => {
          const a = { id: `aud-${Date.now()}`, ...data, createdAt: new Date() };
          mockDb.auditLogs.push(a);
          return a;
        },
      },
    },
  };
});

// Reference to mocked prismaClient for $transaction
const prismaClient = (await vi.importActual("../db") as any).prisma;

describe("Owner Staff Mentoring, Credentials & Account Governance", () => {
  const orgId = "org-habesha-01";
  const shopId = "shop-addis-main";

  let ownerContext: TenantContext;
  let cashierContext: TenantContext;
  let ownerUserId: string;

  beforeEach(async () => {
    mockDb.clear();

    mockDb.organizations.push({
      id: orgId,
      name: "Habesha Retail Corp",
      slug: "habesha-retail",
    });

    mockDb.shops.push({
      id: shopId,
      organizationId: orgId,
      name: "Addis Ababa Main Store",
      code: "ADD-MAIN",
      currency: "ETB",
      taxRate: new Decimal(0),
      isActive: true,
    });

    const ownerPasswordHash = await hashPassword("OwnerPass2026!");
    ownerUserId = "usr-owner-001";
    mockDb.users.push({
      id: ownerUserId,
      email: "owner@habesharetail.com",
      fullName: "Dawit Owner",
      phone: "+251911000000",
      passwordHash: ownerPasswordHash,
      isActive: true,
      lastLoginAt: new Date(),
      createdAt: new Date(),
    });

    mockDb.memberships.push({
      id: "mem-owner-001",
      userId: ownerUserId,
      organizationId: orgId,
      shopId: null, // Org-wide owner
      role: ShopRole.SHOP_OWNER,
      canViewReports: true,
      canApplyDiscount: true,
      canAdjustStock: true,
      createdAt: new Date(),
    });

    ownerContext = {
      organizationId: orgId,
      shopId,
      user: {
        id: ownerUserId,
        email: "owner@habesharetail.com",
        fullName: "Dawit Owner",
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

    cashierContext = {
      organizationId: orgId,
      shopId,
      user: {
        id: "usr-cashier-001",
        email: "cashier1@shop.com",
        fullName: "Test Cashier",
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
  });

  // ---------------------------------------------------------------------------
  // 1. Owner provides Username & Password to create Shopkeeper Account
  // ---------------------------------------------------------------------------
  it("allows Shop Owner to create a shopkeeper account with a custom username and password", async () => {
    const newStaff = await addStaffMember(ownerContext, {
      usernameOrEmail: "abebe",
      fullName: "Abebe Kebede",
      password: "CashierPassword2026!",
      phone: "+251911223344",
      role: ShopRole.SHOPKEEPER,
      pin: "1234",
    });

    expect(newStaff.username).toBe("abebe");
    expect(newStaff.fullName).toBe("Abebe Kebede");
    expect(newStaff.role).toBe(ShopRole.SHOPKEEPER);
    expect(newStaff.hasPin).toBe(true);

    // Verify user in DB has correctly hashed the owner-provided password
    const userInDb = mockDb.users.find((u) => u.email === "abebe");
    expect(userInDb).toBeDefined();
    expect(userInDb.fullName).toBe("Abebe Kebede");
    expect(userInDb.phone).toBe("+251911223344");

    const isMatch = await verifyPassword("CashierPassword2026!", userInDb.passwordHash);
    expect(isMatch).toBe(true);

    // Verify wrong password fails
    const isWrongMatch = await verifyPassword("WrongPass!", userInDb.passwordHash);
    expect(isWrongMatch).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 2. Shopkeeper logs in with Username and Owner-Assigned Password
  // ---------------------------------------------------------------------------
  it("allows Shopkeeper to log in using their username and the password given by the owner", async () => {
    // 1. Owner registers shopkeeper
    await addStaffMember(ownerContext, {
      usernameOrEmail: "meron",
      fullName: "Meron Tesfaye",
      password: "MeronSecret123!",
      role: ShopRole.SHOPKEEPER,
    });

    // 2. Shopkeeper logs in with username "meron"
    const loginResult = await loginUser({
      email: "meron",
      password: "MeronSecret123!",
    });

    expect(loginResult.token).toBeDefined();
    expect(loginResult.user.fullName).toBe("Meron Tesfaye");
    expect(loginResult.activeShop.id).toBe(shopId);
  });

  // ---------------------------------------------------------------------------
  // 3. Owner monitors all staff accounts and their shift sales performance
  // ---------------------------------------------------------------------------
  it("allows Owner to list and mentor staff accounts under their shop with sales metrics", async () => {
    // 1. Add 2 staff members
    const staff1 = await addStaffMember(ownerContext, {
      usernameOrEmail: "abebe",
      fullName: "Abebe Kebede",
      password: "PassAbebe1!",
      role: ShopRole.SHOPKEEPER,
    });

    const staff2 = await addStaffMember(ownerContext, {
      usernameOrEmail: "helen",
      fullName: "Helen Haile",
      password: "PassHelen1!",
      role: ShopRole.SHOP_MANAGER,
    });

    // 2. Add sample sales recorded by staff1 today
    mockDb.sales.push(
      {
        id: "sale-01",
        shopId,
        cashierId: staff1.userId,
        status: SaleStatus.COMPLETED,
        totalAmount: new Decimal("450.00"),
        createdAt: new Date(),
      },
      {
        id: "sale-02",
        shopId,
        cashierId: staff1.userId,
        status: SaleStatus.COMPLETED,
        totalAmount: new Decimal("550.00"),
        createdAt: new Date(),
      }
    );

    // 3. Owner lists shop staff
    const staffList = await listShopStaff(ownerContext);

    expect(staffList.length).toBeGreaterThanOrEqual(3); // Owner + Abebe + Helen

    const abebeInfo = staffList.find((s) => s.username === "abebe");
    expect(abebeInfo).toBeDefined();
    expect(abebeInfo?.todaySalesCount).toBe(2);
    expect(abebeInfo?.todaySalesTotal).toBe(1000);
    expect(abebeInfo?.isActive).toBe(true);

    const helenInfo = staffList.find((s) => s.username === "helen");
    expect(helenInfo).toBeDefined();
    expect(helenInfo?.role).toBe(ShopRole.SHOP_MANAGER);
    expect(helenInfo?.todaySalesCount).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // 4. Owner resets/changes staff password directly
  // ---------------------------------------------------------------------------
  it("allows Shop Owner to reset/change a staff member's password", async () => {
    const staff = await addStaffMember(ownerContext, {
      usernameOrEmail: "chala",
      fullName: "Chala Gemechu",
      password: "OldPassword123!",
      role: ShopRole.SHOPKEEPER,
    });

    // Owner updates Chala's password
    const resetResult = await resetStaffPassword(ownerContext, {
      membershipId: staff.id,
      newPassword: "BrandNewPassword2026!",
    });

    expect(resetResult.success).toBe(true);

    // Old password fails login
    await expect(
      loginUser({ email: "chala", password: "OldPassword123!" })
    ).rejects.toThrow(/Invalid email or password/i);

    // New password succeeds login
    const loginResult = await loginUser({ email: "chala", password: "BrandNewPassword2026!" });
    expect(loginResult.user.fullName).toBe("Chala Gemechu");
  });

  // ---------------------------------------------------------------------------
  // 5. Owner suspends and reactivates staff account (governance)
  // ---------------------------------------------------------------------------
  it("allows Shop Owner to suspend a staff account, blocking login, and reactivate it later", async () => {
    const staff = await addStaffMember(ownerContext, {
      usernameOrEmail: "selam",
      fullName: "Selam Tadesse",
      password: "SelamPass123!",
      role: ShopRole.SHOPKEEPER,
    });

    // Verify initial login succeeds
    const initialLogin = await loginUser({ email: "selam", password: "SelamPass123!" });
    expect(initialLogin.user.fullName).toBe("Selam Tadesse");

    // Owner suspends Selam's account
    const suspendResult = await toggleStaffStatus(ownerContext, {
      membershipId: staff.id,
      isActive: false,
    });
    expect(suspendResult.isActive).toBe(false);

    // Suspended account cannot log in
    await expect(
      loginUser({ email: "selam", password: "SelamPass123!" })
    ).rejects.toThrow(/deactivated/i);

    // Owner reactivates Selam's account
    const activateResult = await toggleStaffStatus(ownerContext, {
      membershipId: staff.id,
      isActive: true,
    });
    expect(activateResult.isActive).toBe(true);

    // Login succeeds again
    const reactivatedLogin = await loginUser({ email: "selam", password: "SelamPass123!" });
    expect(reactivatedLogin.user.fullName).toBe("Selam Tadesse");
  });

  // ---------------------------------------------------------------------------
  // 6. Security: Shopkeepers cannot add staff, reset passwords, or suspend users
  // ---------------------------------------------------------------------------
  it("rejects Shopkeeper from adding staff, resetting passwords, or modifying account status", async () => {
    const staff = await addStaffMember(ownerContext, {
      usernameOrEmail: "stafftarget",
      fullName: "Target Staff",
      password: "TargetPassword123!",
      role: ShopRole.SHOPKEEPER,
    });

    // 1. Cashier cannot add staff
    await expect(
      addStaffMember(cashierContext, {
        usernameOrEmail: "roguestaff",
        fullName: "Rogue",
        password: "RoguePass123!",
        role: ShopRole.SHOPKEEPER,
      })
    ).rejects.toThrow(/Unauthorized/i);

    // 2. Cashier cannot reset password
    await expect(
      resetStaffPassword(cashierContext, {
        membershipId: staff.id,
        newPassword: "HackedPassword123!",
      })
    ).rejects.toThrow(/Unauthorized/i);

    // 3. Cashier cannot suspend account
    await expect(
      toggleStaffStatus(cashierContext, {
        membershipId: staff.id,
        isActive: false,
      })
    ).rejects.toThrow(/Unauthorized/i);
  });

  // ---------------------------------------------------------------------------
  // 7. Owner cannot deactivate their own owner account
  // ---------------------------------------------------------------------------
  it("prevents the Shop Owner from deactivating their own account", async () => {
    const ownerMembership = mockDb.memberships.find((m) => m.userId === ownerUserId);
    await expect(
      toggleStaffStatus(ownerContext, {
        membershipId: ownerMembership.id,
        isActive: false,
      })
    ).rejects.toThrow(/Cannot deactivate your own owner account/i);
  });
});
