import { prisma } from "../db";
import crypto from "crypto";
import { hashPassword, verifyPassword } from "./password";
import { generateSessionToken, hashSessionToken, getSessionExpiryDate } from "./session";
import { RegisterInput, LoginInput } from "../validations/auth";
import { ShopRole, PlatformRole } from "@prisma/client";
import { TenantContext } from "../tenant/context";

export interface AuthResult {
  token: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    platformRole: PlatformRole;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  activeShop: {
    id: string;
    name: string;
    code: string;
    currency: string;
  };
}

/**
 * Transactional onboarding: registers a new Shop Owner, their Organization, and initial Shop.
 */
export async function registerShopOwner(
  input: RegisterInput,
  meta?: { ipAddress?: string; userAgent?: string }
): Promise<AuthResult> {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existingUser) {
    throw new Error("An account with this email address already exists.");
  }

  const baseSlug = input.organizationName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
  const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;
  const passwordHash = await hashPassword(input.password);
  const rawToken = generateSessionToken();
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = getSessionExpiryDate();

  // Execute entire onboarding within a single database transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create Organization
    const organization = await tx.organization.create({
      data: {
        name: input.organizationName,
        slug,
      },
    });

    // 2. Create Initial Shop
    const shop = await tx.shop.create({
      data: {
        organizationId: organization.id,
        name: input.shopName,
        code: input.shopCode.toUpperCase(),
        currency: input.currency || "USD",
      },
    });

    // 3. Create User
    const user = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        fullName: input.fullName,
        platformRole: PlatformRole.NONE,
      },
    });

    // 4. Create User Membership as Shop Owner
    await tx.userMembership.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        shopId: shop.id,
        role: ShopRole.SHOP_OWNER,
        canViewReports: true,
        canApplyDiscount: true,
        canAdjustStock: true,
      },
    });

    // 5. Create Session
    await tx.userSession.create({
      data: {
        userId: user.id,
        tokenHash,
        activeShopId: shop.id,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        expiresAt,
      },
    });

    // 6. Record Audit Log
    await tx.auditLog.create({
      data: {
        organizationId: organization.id,
        shopId: shop.id,
        userId: user.id,
        action: "TENANT_REGISTERED",
        entityType: "Organization",
        entityId: organization.id,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      },
    });

    return {
      token: rawToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        platformRole: user.platformRole,
      },
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      },
      activeShop: {
        id: shop.id,
        name: shop.name,
        code: shop.code,
        currency: shop.currency,
      },
    };
  });

  return result;
}

/**
 * Authenticates user credentials and provisions a new session cookie.
 */
export async function loginUser(
  input: LoginInput,
  meta?: { ipAddress?: string; userAgent?: string }
): Promise<AuthResult> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: {
      memberships: {
        include: {
          organization: true,
          shop: true,
        },
      },
    },
  });

  if (!user || !user.isActive) {
    throw new Error("Invalid email or password.");
  }

  const isValidPassword = await verifyPassword(input.password, user.passwordHash);
  if (!isValidPassword) {
    throw new Error("Invalid email or password.");
  }

  // Determine active shop from memberships
  const primaryMembership = user.memberships[0];
  if (!primaryMembership && user.platformRole === PlatformRole.NONE) {
    throw new Error("Your account has no associated shop memberships.");
  }

  const activeShop = primaryMembership?.shop;
  const organization = primaryMembership?.organization;

  const rawToken = generateSessionToken();
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = getSessionExpiryDate();

  await prisma.userSession.create({
    data: {
      userId: user.id,
      tokenHash,
      activeShopId: activeShop?.id ?? null,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      expiresAt,
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    token: rawToken,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      platformRole: user.platformRole,
    },
    organization: organization
      ? {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
        }
      : { id: "", name: "", slug: "" },
    activeShop: activeShop
      ? {
          id: activeShop.id,
          name: activeShop.name,
          code: activeShop.code,
          currency: activeShop.currency,
        }
      : { id: "", name: "", code: "", currency: "USD" },
  };
}

/**
 * Switches the active shop in the current session after verifying membership.
 */
export async function switchActiveShop(sessionToken: string, targetShopId: string): Promise<boolean> {
  const tokenHash = hashSessionToken(sessionToken);
  const session = await prisma.userSession.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          memberships: true,
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) {
    throw new Error("Session is invalid or expired.");
  }

  // Verify user has access to target shop (or is platform super admin)
  const isSuperAdmin = session.user.platformRole === PlatformRole.SUPER_ADMIN;
  const hasMembership = session.user.memberships.some(
    (m) => m.shopId === targetShopId || (m.shopId === null && m.role === ShopRole.SHOP_OWNER)
  );

  if (!isSuperAdmin && !hasMembership) {
    throw new Error("You do not have permission to access the requested shop.");
  }

  await prisma.userSession.update({
    where: { id: session.id },
    data: { activeShopId: targetShopId },
  });

  return true;
}

/**
 * Resolves full multi-tenant context from a raw session token.
 */
export async function resolveSessionContext(sessionToken?: string): Promise<TenantContext | null> {
  if (!sessionToken) return null;

  const tokenHash = hashSessionToken(sessionToken);
  const session = await prisma.userSession.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          memberships: {
            include: {
              organization: true,
              shop: true,
            },
          },
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date() || !session.user.isActive) {
    return null;
  }

  const { user } = session;
  const isPlatformAdmin = user.platformRole === PlatformRole.SUPER_ADMIN;

  // Locate the membership corresponding to activeShopId
  let activeMembership = user.memberships.find((m) => m.shopId === session.activeShopId);

  // If no direct shop match, check for org-level owner membership
  if (!activeMembership && user.memberships.length > 0) {
    activeMembership = user.memberships[0];
  }

  if (!activeMembership && !isPlatformAdmin) {
    return null;
  }

  const organizationId = activeMembership?.organizationId ?? "";
  const shopId = session.activeShopId ?? activeMembership?.shopId ?? "";
  const role = activeMembership?.role ?? ShopRole.SHOPKEEPER;

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      platformRole: user.platformRole,
      isActive: user.isActive,
    },
    organizationId,
    shopId,
    role,
    isPlatformAdmin,
    permissions: {
      canViewReports: activeMembership?.canViewReports ?? (role === ShopRole.SHOP_OWNER),
      canApplyDiscount: activeMembership?.canApplyDiscount ?? (role === ShopRole.SHOP_OWNER),
      canAdjustStock: activeMembership?.canAdjustStock ?? (role === ShopRole.SHOP_OWNER),
    },
  };
}

/**
 * Invalidates a session token upon logout.
 */
export async function logoutSession(sessionToken: string): Promise<void> {
  const tokenHash = hashSessionToken(sessionToken);
  await prisma.userSession.deleteMany({
    where: { tokenHash },
  });
}

/**
 * Validates whether an account recovery token is valid, unconsumed, and unexpired.
 */
export async function validateRecoveryToken(token: string, email: string) {
  if (!token || !email) {
    return { valid: false, error: "Missing recovery token or email." };
  }

  const cleanEmail = email.toLowerCase().trim();
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const user = await prisma.user.findUnique({
    where: { email: cleanEmail },
  });

  if (!user) {
    return { valid: false, error: "User account not found." };
  }

  // Find the recovery link generation audit log
  const recoveryLogs = await prisma.auditLog.findMany({
    where: {
      action: "ACCOUNT_RECOVERY_LINK_GENERATED",
      entityType: "User",
      entityId: user.id,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const matchingLog = recoveryLogs.find((l) => {
    const data = l.newData as any;
    return (
      data?.tokenHash === tokenHash &&
      data?.targetEmail?.toLowerCase() === cleanEmail
    );
  });

  if (!matchingLog) {
    return { valid: false, error: "Invalid or unrecognized recovery token." };
  }

  const logData = matchingLog.newData as any;
  if (new Date(logData.expiresAt).getTime() < Date.now()) {
    return { valid: false, error: "This recovery link has expired (1 hour limit). Please request a new link from your administrator." };
  }

  // Check if token was already consumed
  const consumptionLogs = await prisma.auditLog.findMany({
    where: {
      action: "ACCOUNT_PASSWORD_RESET",
      entityType: "User",
      entityId: user.id,
    },
  });

  const isConsumed = consumptionLogs.some((l) => {
    const data = l.newData as any;
    return data?.tokenHash === tokenHash;
  });

  if (isConsumed) {
    return { valid: false, error: "This single-use recovery link has already been used." };
  }

  return { valid: true, user: { id: user.id, email: user.email, fullName: user.fullName } };
}

/**
 * Consumes a validated recovery token to set a new password, terminating all prior sessions.
 */
export async function consumeRecoveryToken(token: string, email: string, newPassword: string) {
  const validation = await validateRecoveryToken(token, email);
  if (!validation.valid || !validation.user) {
    throw new Error(validation.error || "Invalid recovery token.");
  }

  if (newPassword.length < 8) {
    throw new Error("Password must be at least 8 characters long.");
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const passwordHash = await hashPassword(newPassword);

  return prisma.$transaction(async (tx) => {
    // 1. Update password
    await tx.user.update({
      where: { id: validation.user!.id },
      data: { passwordHash },
    });

    // 2. Invalidate all existing sessions for security
    await tx.userSession.deleteMany({
      where: { userId: validation.user!.id },
    });

    // 3. Record consumption in append-only audit trail
    await tx.auditLog.create({
      data: {
        userId: validation.user!.id,
        action: "ACCOUNT_PASSWORD_RESET",
        entityType: "User",
        entityId: validation.user!.id,
        newData: {
          tokenHash,
          targetEmail: validation.user!.email,
          consumedAt: new Date().toISOString(),
        },
      },
    });

    return { success: true };
  });
}

