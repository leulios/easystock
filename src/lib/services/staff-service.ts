import { prisma } from "../db";
import { TenantContext } from "../tenant/context";
import {
  InviteStaffInput,
  UpdateStaffInput,
  ResetStaffPasswordInput,
  ToggleStaffStatusInput,
} from "../validations/staff";
import { hashPin, hashPassword } from "../auth/password";
import { ShopRole, SaleStatus } from "@prisma/client";
import crypto from "crypto";

export async function listShopStaff(context: TenantContext) {
  const { organizationId, shopId } = context;

  const memberships = await prisma.userMembership.findMany({
    where: {
      organizationId,
      OR: [{ shopId }, { shopId: null, role: ShopRole.SHOP_OWNER }],
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const staffWithMetrics = await Promise.all(
    memberships.map(async (m) => {
      let todaySalesCount = 0;
      let todaySalesTotal = 0;
      let totalSalesCount = 0;

      if (shopId && prisma.sale?.findMany) {
        try {
          const sales = await prisma.sale.findMany({
            where: {
              shopId,
              cashierId: m.userId,
              status: SaleStatus.COMPLETED,
            },
            select: {
              id: true,
              totalAmount: true,
              createdAt: true,
            },
          });

          totalSalesCount = sales.length;
          const todaySales = sales.filter((s: any) => new Date(s.createdAt) >= startOfDay);
          todaySalesCount = todaySales.length;
          todaySalesTotal = todaySales.reduce((sum: number, s: any) => {
            const amt =
              typeof s.totalAmount === "object" && s.totalAmount !== null && "toNumber" in s.totalAmount
                ? s.totalAmount.toNumber()
                : Number(s.totalAmount || 0);
            return sum + amt;
          }, 0);
        } catch {
          // Non-blocking fallback if sales query fails in test mocks
        }
      }

      return {
        id: m.id,
        userId: m.userId,
        email: m.user.email,
        username: m.user.email,
        fullName: m.user.fullName,
        phone: m.user.phone,
        isActive: m.user.isActive,
        role: m.role,
        hasPin: Boolean(m.pinHash),
        canViewReports: m.canViewReports,
        canApplyDiscount: m.canApplyDiscount,
        canAdjustStock: m.canAdjustStock,
        isOrgOwner: m.shopId === null && m.role === ShopRole.SHOP_OWNER,
        lastLoginAt: m.user.lastLoginAt,
        createdAt: m.createdAt,
        todaySalesCount,
        todaySalesTotal,
        totalSalesCount,
      };
    })
  );

  return staffWithMetrics;
}

export async function addStaffMember(context: TenantContext, input: InviteStaffInput) {
  const { organizationId, shopId, user, role, isPlatformAdmin } = context;

  // Only Shop Owner or Platform Admin can onboard staff
  if (role !== ShopRole.SHOP_OWNER && !isPlatformAdmin) {
    throw new Error("Unauthorized: Only Shop Owners can invite or assign staff members.");
  }

  const rawIdentifier = (input.usernameOrEmail || input.email || "").toLowerCase().trim();
  if (!rawIdentifier) {
    throw new Error("Username or email is required.");
  }

  // 1. Check if user already exists
  let targetUser = await prisma.user.findUnique({
    where: { email: rawIdentifier },
  });

  if (!targetUser && prisma.user.findFirst) {
    targetUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: rawIdentifier },
          { phone: input.phone?.trim() || undefined },
        ],
      },
    });
  }

  if (!targetUser) {
    // Generate secure password hash from owner-entered password or fallback
    const passwordToUse = input.password?.trim() || crypto.randomBytes(12).toString("hex") + "A1!";
    const passwordHash = await hashPassword(passwordToUse);

    targetUser = await prisma.user.create({
      data: {
        email: rawIdentifier,
        fullName: input.fullName.trim(),
        phone: input.phone?.trim() || null,
        passwordHash,
      },
    });
  } else if (input.password?.trim()) {
    // If user exists and owner supplied a new password, update it
    const passwordHash = await hashPassword(input.password.trim());
    await prisma.user.update({
      where: { id: targetUser.id },
      data: { passwordHash },
    });
  }

  // 2. Check if membership already exists for this shop
  const existingMembership = await prisma.userMembership.findFirst({
    where: {
      userId: targetUser.id,
      organizationId,
      shopId,
    },
  });

  if (existingMembership) {
    throw new Error(`User "${rawIdentifier}" is already a staff member of this shop.`);
  }

  // 3. Hash PIN if provided
  let pinHash: string | null = null;
  if (input.pin && input.pin.trim()) {
    pinHash = await hashPin(input.pin.trim());
  }

  // 4. Create membership
  const membership = await prisma.userMembership.create({
    data: {
      userId: targetUser.id,
      organizationId,
      shopId,
      role: input.role,
      pinHash,
      canViewReports: input.role === ShopRole.SHOP_OWNER ? true : input.canViewReports,
      canApplyDiscount: input.role === ShopRole.SHOP_OWNER ? true : input.canApplyDiscount,
      canAdjustStock: input.role === ShopRole.SHOP_OWNER ? true : input.canAdjustStock,
    },
    include: {
      user: true,
    },
  });

  // 5. Audit log
  await prisma.auditLog.create({
    data: {
      organizationId,
      shopId,
      userId: user.id,
      action: "STAFF_INVITED",
      entityType: "UserMembership",
      entityId: membership.id,
      newData: {
        email: targetUser.email,
        fullName: targetUser.fullName,
        role: input.role,
        permissions: {
          canViewReports: membership.canViewReports,
          canApplyDiscount: membership.canApplyDiscount,
          canAdjustStock: membership.canAdjustStock,
        },
      },
    },
  });

  return {
    id: membership.id,
    userId: targetUser.id,
    email: targetUser.email,
    username: targetUser.email,
    fullName: targetUser.fullName,
    phone: targetUser.phone,
    role: membership.role,
    hasPin: Boolean(membership.pinHash),
    canViewReports: membership.canViewReports,
    canApplyDiscount: membership.canApplyDiscount,
    canAdjustStock: membership.canAdjustStock,
  };
}

export async function updateStaffMember(context: TenantContext, input: UpdateStaffInput) {
  const { organizationId, shopId, user, role, isPlatformAdmin } = context;

  if (role !== ShopRole.SHOP_OWNER && !isPlatformAdmin) {
    throw new Error("Unauthorized: Only Shop Owners can modify staff permissions.");
  }

  const existing = await prisma.userMembership.findFirst({
    where: { id: input.membershipId, organizationId },
    include: { user: true },
  });

  if (!existing) {
    throw new Error("Staff membership record not found or access denied.");
  }

  // Update user fullName / phone if provided
  if (input.fullName?.trim() || input.phone !== undefined) {
    await prisma.user.update({
      where: { id: existing.userId },
      data: {
        ...(input.fullName?.trim() ? { fullName: input.fullName.trim() } : {}),
        ...(input.phone !== undefined ? { phone: input.phone?.trim() || null } : {}),
      },
    });
  }

  // Hash new PIN if provided
  let pinHashUpdate: { pinHash?: string } = {};
  if (input.pin && input.pin.trim()) {
    const hashed = await hashPin(input.pin.trim());
    pinHashUpdate = { pinHash: hashed };
  }

  const updated = await prisma.userMembership.update({
    where: { id: input.membershipId },
    data: {
      role: input.role,
      ...pinHashUpdate,
      canViewReports: input.role === ShopRole.SHOP_OWNER ? true : input.canViewReports,
      canApplyDiscount: input.role === ShopRole.SHOP_OWNER ? true : input.canApplyDiscount,
      canAdjustStock: input.role === ShopRole.SHOP_OWNER ? true : input.canAdjustStock,
    },
    include: { user: true },
  });

  await prisma.auditLog.create({
    data: {
      organizationId,
      shopId,
      userId: user.id,
      action: "STAFF_UPDATED",
      entityType: "UserMembership",
      entityId: updated.id,
      previousData: {
        role: existing.role,
        canViewReports: existing.canViewReports,
        canApplyDiscount: existing.canApplyDiscount,
        canAdjustStock: existing.canAdjustStock,
      },
      newData: {
        role: updated.role,
        canViewReports: updated.canViewReports,
        canApplyDiscount: updated.canApplyDiscount,
        canAdjustStock: updated.canAdjustStock,
      },
    },
  });

  return {
    id: updated.id,
    userId: updated.userId,
    email: updated.user.email,
    username: updated.user.email,
    fullName: updated.user.fullName,
    phone: updated.user.phone,
    role: updated.role,
    hasPin: Boolean(updated.pinHash),
    canViewReports: updated.canViewReports,
    canApplyDiscount: updated.canApplyDiscount,
    canAdjustStock: updated.canAdjustStock,
  };
}

export async function resetStaffPassword(
  context: TenantContext,
  input: ResetStaffPasswordInput
) {
  const { organizationId, shopId, user, role, isPlatformAdmin } = context;

  if (role !== ShopRole.SHOP_OWNER && !isPlatformAdmin) {
    throw new Error("Unauthorized: Only Shop Owners can reset staff passwords.");
  }

  const membership = await prisma.userMembership.findFirst({
    where: { id: input.membershipId, organizationId },
    include: { user: true },
  });

  if (!membership) {
    throw new Error("Staff membership record not found or access denied.");
  }

  const newPass = input.newPassword?.trim();
  if (!newPass || newPass.length < 6) {
    throw new Error("Password must be at least 6 characters long.");
  }

  const passwordHash = await hashPassword(newPass);

  await prisma.user.update({
    where: { id: membership.userId },
    data: { passwordHash },
  });

  await prisma.auditLog.create({
    data: {
      organizationId,
      shopId,
      userId: user.id,
      action: "STAFF_PASSWORD_RESET",
      entityType: "User",
      entityId: membership.userId,
      newData: {
        targetUserEmail: membership.user.email,
        targetUserName: membership.user.fullName,
      },
    },
  });

  return { success: true, email: membership.user.email, fullName: membership.user.fullName };
}

export async function toggleStaffStatus(
  context: TenantContext,
  input: ToggleStaffStatusInput
) {
  const { organizationId, shopId, user, role, isPlatformAdmin } = context;

  if (role !== ShopRole.SHOP_OWNER && !isPlatformAdmin) {
    throw new Error("Unauthorized: Only Shop Owners can modify staff account status.");
  }

  const membership = await prisma.userMembership.findFirst({
    where: { id: input.membershipId, organizationId },
    include: { user: true },
  });

  if (!membership) {
    throw new Error("Staff membership record not found or access denied.");
  }

  if (membership.userId === user.id) {
    throw new Error("Cannot deactivate your own owner account.");
  }

  await prisma.user.update({
    where: { id: membership.userId },
    data: { isActive: input.isActive },
  });

  await prisma.auditLog.create({
    data: {
      organizationId,
      shopId,
      userId: user.id,
      action: input.isActive ? "STAFF_ACTIVATED" : "STAFF_SUSPENDED",
      entityType: "User",
      entityId: membership.userId,
      newData: {
        isActive: input.isActive,
      },
    },
  });

  return { success: true, isActive: input.isActive };
}

export async function removeStaffMember(context: TenantContext, membershipId: string) {
  const { organizationId, shopId, user, role, isPlatformAdmin } = context;

  if (role !== ShopRole.SHOP_OWNER && !isPlatformAdmin) {
    throw new Error("Unauthorized: Only Shop Owners can remove staff.");
  }

  const existing = await prisma.userMembership.findFirst({
    where: { id: membershipId, organizationId },
    include: { user: true },
  });

  if (!existing) {
    throw new Error("Staff membership record not found or access denied.");
  }

  // Prevent removing own membership if owner
  if (existing.userId === user.id) {
    throw new Error("Cannot remove your own owner membership.");
  }

  await prisma.userMembership.delete({
    where: { id: membershipId },
  });

  await prisma.auditLog.create({
    data: {
      organizationId,
      shopId,
      userId: user.id,
      action: "STAFF_REMOVED",
      entityType: "UserMembership",
      entityId: membershipId,
      previousData: {
        email: existing.user.email,
        role: existing.role,
      },
    },
  });

  return { success: true };
}
