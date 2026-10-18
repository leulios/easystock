import { prisma } from "../db";
import { TenantContext } from "../tenant/context";
import { InviteStaffInput, UpdateStaffInput } from "../validations/staff";
import { hashPin, hashPassword } from "../auth/password";
import { ShopRole } from "@prisma/client";
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

  return memberships.map((m) => ({
    id: m.id,
    userId: m.userId,
    email: m.user.email,
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
  }));
}

export async function addStaffMember(context: TenantContext, input: InviteStaffInput) {
  const { organizationId, shopId, user, role, isPlatformAdmin } = context;

  // Only Shop Owner or Platform Admin can onboard staff
  if (role !== ShopRole.SHOP_OWNER && !isPlatformAdmin) {
    throw new Error("Unauthorized: Only Shop Owners can invite or assign staff members.");
  }

  // 1. Check if user already exists
  let targetUser = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!targetUser) {
    // Generate secure temporary password for new staff user
    const temporaryPassword = crypto.randomBytes(12).toString("hex") + "A1!";
    const passwordHash = await hashPassword(temporaryPassword);

    targetUser = await prisma.user.create({
      data: {
        email: input.email,
        fullName: input.fullName.trim(),
        passwordHash,
      },
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
    throw new Error(`User "${input.email}" is already a staff member of this shop.`);
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
    fullName: targetUser.fullName,
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
    fullName: updated.user.fullName,
    role: updated.role,
    hasPin: Boolean(updated.pinHash),
    canViewReports: updated.canViewReports,
    canApplyDiscount: updated.canApplyDiscount,
    canAdjustStock: updated.canAdjustStock,
  };
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
