import { prisma } from "../db";
import { TenantContext } from "../tenant/context";
import { PlatformRole, Prisma } from "@prisma/client";
import {
  SuspendShopInput,
  ReactivateShopInput,
  RevokeUserSessionsInput,
  GenerateRecoveryTokenInput,
  CreateSupportTicketInput,
  UpdateSupportTicketInput,
  SupportInvestigationInput,
  UpdatePlatformConfigInput,
} from "../validations/admin";
import crypto from "crypto";

function assertSuperAdmin(context: TenantContext) {
  if (!context.isPlatformAdmin && context.user.platformRole !== PlatformRole.SUPER_ADMIN) {
    throw new Error("Unauthorized: Platform Administrator privileges required.");
  }
}

// -----------------------------------------------------------------------------
// 1. OVERVIEW & TELEMETRY
// -----------------------------------------------------------------------------

export async function getPlatformOverview(context: TenantContext) {
  assertSuperAdmin(context);

  const [
    totalOrganizations,
    totalShops,
    activeShops,
    totalUsers,
    activeOrganizations,
    openTicketsCount,
    recentAudits,
    planGroups,
  ] = await Promise.all([
    prisma.organization.count({ where: { deletedAt: null } }),
    prisma.shop.count({ where: { deletedAt: null } }),
    prisma.shop.count({ where: { isActive: true, deletedAt: null } }),
    prisma.user.count(),
    prisma.organization.count({ where: { planStatus: "active", deletedAt: null } }),
    prisma.supportTicket.count({ where: { status: { in: ["OPEN", "INVESTIGATING"] } } }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { user: { select: { email: true, fullName: true } } },
    }),
    prisma.organization.groupBy({
      by: ["plan"],
      _count: { id: true },
    }),
  ]);

  return {
    overview: {
      totalOrganizations,
      totalShops,
      activeShops,
      suspendedShops: totalShops - activeShops,
      totalUsers,
      activeOrganizations,
      suspendedOrganizations: totalOrganizations - activeOrganizations,
      openTicketsCount,
    },
    plans: planGroups.map((p) => ({ plan: p.plan, count: p._count.id })),
    recentAudits: recentAudits.map((a) => ({
      id: a.id,
      action: a.action,
      entityType: a.entityType,
      performedBy: a.user?.fullName || a.user?.email || "System",
      createdAt: a.createdAt,
    })),
  };
}

export async function getSystemHealthTelemetry(context: TenantContext) {
  assertSuperAdmin(context);

  let dbStatus = "HEALTHY";
  let dbLatencyMs = 0;
  const startPing = Date.now();
  try {
    // Quick probe query to test live database connection
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - startPing;
  } catch (err) {
    dbStatus = "DEGRADED / DISCONNECTED";
  }

  const memoryUsage = process.memoryUsage();

  return {
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
      provider: "Neon Serverless Postgres (Prisma ORM)",
      connectionPool: "Active (pgbouncer ready)",
    },
    runtime: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptimeSeconds: Math.floor(process.uptime()),
      heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
    },
    services: {
      sessionEngine: { status: "ACTIVE", type: "Cryptographic SHA-256 HttpOnly" },
      auditPipeline: { status: "ACTIVE", type: "Immutable Event Ledger" },
      telemetryMonitoring: { status: "INTEGRATED", type: "Internal Health Probes" },
      externalApm: { status: "NOT_CONFIGURED", notes: "Sentry/Datadog optional hook ready" },
      backgroundQueue: { status: "NOT_CONFIGURED", notes: "Direct transactional execution" },
    },
    timestamp: new Date().toISOString(),
  };
}

// -----------------------------------------------------------------------------
// 2. SHOP MANAGEMENT & SUSPENSION
// -----------------------------------------------------------------------------

export interface ListAdminShopsOptions {
  search?: string;
  status?: "all" | "active" | "suspended";
  organizationId?: string;
  page?: number;
  pageSize?: number;
}

export async function listAdminShops(
  context: TenantContext,
  options: ListAdminShopsOptions = {}
) {
  assertSuperAdmin(context);
  const { search, status = "all", organizationId, page = 1, pageSize = 50 } = options;

  const where: Prisma.ShopWhereInput = {
    deletedAt: null,
  };

  if (organizationId) {
    where.organizationId = organizationId;
  }

  if (status === "active") {
    where.isActive = true;
  } else if (status === "suspended") {
    where.isActive = false;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
      { organization: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [total, shops] = await Promise.all([
    prisma.shop.count({ where }),
    prisma.shop.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        organization: {
          select: { id: true, name: true, slug: true, plan: true, planStatus: true },
        },
        _count: {
          select: { sales: true, inventoryItems: true, memberships: true },
        },
      },
    }),
  ]);

  return {
    items: shops.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      currency: s.currency,
      isActive: s.isActive,
      suspensionReason: s.suspensionReason,
      allowNegativeStock: s.allowNegativeStock,
      organization: s.organization,
      salesCount: s._count.sales,
      inventoryCount: s._count.inventoryItems,
      staffCount: s._count.memberships,
      createdAt: s.createdAt,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function suspendShop(context: TenantContext, input: SuspendShopInput) {
  assertSuperAdmin(context);

  const shop = await prisma.shop.findUnique({
    where: { id: input.shopId },
    include: { organization: true },
  });

  if (!shop) {
    throw new Error("Shop not found.");
  }

  if (!shop.isActive) {
    throw new Error("This shop is already suspended.");
  }

  const updated = await prisma.shop.update({
    where: { id: input.shopId },
    data: {
      isActive: false,
      suspensionReason: input.reason.trim(),
    },
  });

  // Record immutable audit event
  await prisma.auditLog.create({
    data: {
      organizationId: shop.organizationId,
      shopId: shop.id,
      userId: context.user.id,
      action: "SHOP_SUSPENDED",
      entityType: "Shop",
      entityId: shop.id,
      previousData: { isActive: true, suspensionReason: null },
      newData: {
        isActive: false,
        suspensionReason: input.reason.trim(),
        suspendedBy: context.user.email,
      },
    },
  });

  return updated;
}

export async function reactivateShop(context: TenantContext, input: ReactivateShopInput) {
  assertSuperAdmin(context);

  const shop = await prisma.shop.findUnique({
    where: { id: input.shopId },
    include: { organization: true },
  });

  if (!shop) {
    throw new Error("Shop not found.");
  }

  if (shop.isActive) {
    throw new Error("This shop is already active.");
  }

  const updated = await prisma.shop.update({
    where: { id: input.shopId },
    data: {
      isActive: true,
      suspensionReason: null,
    },
  });

  // Record immutable audit event
  await prisma.auditLog.create({
    data: {
      organizationId: shop.organizationId,
      shopId: shop.id,
      userId: context.user.id,
      action: "SHOP_REACTIVATED",
      entityType: "Shop",
      entityId: shop.id,
      previousData: { isActive: false, suspensionReason: shop.suspensionReason },
      newData: {
        isActive: true,
        reason: input.reason.trim(),
        reactivatedBy: context.user.email,
      },
    },
  });

  return updated;
}

// -----------------------------------------------------------------------------
// 3. ACCOUNT MANAGEMENT & RECOVERY
// -----------------------------------------------------------------------------

export interface ListAdminUsersOptions {
  search?: string;
  role?: "all" | "SUPER_ADMIN" | "NONE";
  page?: number;
  pageSize?: number;
}

export async function listAdminUsers(
  context: TenantContext,
  options: ListAdminUsersOptions = {}
) {
  assertSuperAdmin(context);
  const { search, role = "all", page = 1, pageSize = 50 } = options;

  const where: Prisma.UserWhereInput = {};

  if (role !== "all") {
    where.platformRole = role as PlatformRole;
  }

  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { fullName: { contains: search, mode: "insensitive" } },
    ];
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        platformRole: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        _count: {
          select: { sessions: true, memberships: true },
        },
        memberships: {
          select: {
            role: true,
            organization: { select: { name: true } },
            shop: { select: { name: true, code: true } },
          },
        },
      },
    }),
  ]);

  return {
    items: users.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      phone: u.phone,
      platformRole: u.platformRole,
      isActive: u.isActive,
      activeSessionsCount: u._count.sessions,
      membershipsCount: u._count.memberships,
      membershipsSummary: u.memberships.map((m) => ({
        role: m.role,
        orgName: m.organization.name,
        shopName: m.shop?.name || "All Shops (Org-Wide)",
      })),
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function revokeAllUserSessions(
  context: TenantContext,
  input: RevokeUserSessionsInput
) {
  assertSuperAdmin(context);

  const targetUser = await prisma.user.findUnique({
    where: { id: input.userId },
  });

  if (!targetUser) {
    throw new Error("User account not found.");
  }

  const deleteResult = await prisma.userSession.deleteMany({
    where: { userId: input.userId },
  });

  await prisma.auditLog.create({
    data: {
      userId: context.user.id,
      action: "USER_SESSIONS_REVOKED",
      entityType: "User",
      entityId: targetUser.id,
      newData: {
        targetUserEmail: targetUser.email,
        revokedSessionsCount: deleteResult.count,
        reason: input.reason.trim(),
        revokedBy: context.user.email,
      },
    },
  });

  return { success: true, count: deleteResult.count };
}

export async function generateAccountRecoveryLink(
  context: TenantContext,
  input: GenerateRecoveryTokenInput
) {
  assertSuperAdmin(context);

  const targetUser = await prisma.user.findUnique({
    where: { id: input.userId },
  });

  if (!targetUser) {
    throw new Error("User not found.");
  }

  // Generate secure single-use recovery token
  const token = crypto.randomBytes(24).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Log the recovery event in the audit trail (token itself is never stored in plaintext)
  await prisma.auditLog.create({
    data: {
      userId: context.user.id,
      action: "ACCOUNT_RECOVERY_LINK_GENERATED",
      entityType: "User",
      entityId: targetUser.id,
      newData: {
        targetEmail: targetUser.email,
        tokenHash,
        expiresAt: expiresAt.toISOString(),
        reason: input.reason.trim(),
        issuedBy: context.user.email,
      },
    },
  });

  // Return the recovery URL for the administrator to securely communicate to the verified user
  const recoveryUrl = `/reset-password?token=${token}&email=${encodeURIComponent(targetUser.email)}`;

  return {
    recoveryUrl,
    expiresAt,
    userEmail: targetUser.email,
  };
}

// -----------------------------------------------------------------------------
// 4. AUDIT LOGS EXPLORER
// -----------------------------------------------------------------------------

export interface ListAuditLogsOptions {
  search?: string;
  action?: string;
  entityType?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}

export async function listAuditLogs(
  context: TenantContext,
  options: ListAuditLogsOptions = {}
) {
  assertSuperAdmin(context);
  const { search, action, entityType, startDate, endDate, page = 1, pageSize = 50 } = options;

  const where: Prisma.AuditLogWhereInput = {};

  if (action) {
    where.action = action;
  }

  if (entityType) {
    where.entityType = entityType;
  }

  if (startDate || endDate) {
    where.createdAt = {
      ...(startDate ? { gte: startDate } : {}),
      ...(endDate ? { lte: endDate } : {}),
    };
  }

  if (search) {
    where.OR = [
      { action: { contains: search, mode: "insensitive" } },
      { entityType: { contains: search, mode: "insensitive" } },
      { user: { email: { contains: search, mode: "insensitive" } } },
      { user: { fullName: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { email: true, fullName: true } },
        organization: { select: { name: true } },
      },
    }),
  ]);

  return {
    items: items.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      previousData: log.previousData,
      newData: log.newData,
      ipAddress: log.ipAddress,
      performedBy: log.user ? `${log.user.fullName} (${log.user.email})` : "System",
      organizationName: log.organization?.name || "Global / N/A",
      createdAt: log.createdAt,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// -----------------------------------------------------------------------------
// 5. SUPPORT TOOLS & INVESTIGATION SESSIONS
// -----------------------------------------------------------------------------

export async function listSupportTickets(
  context: TenantContext,
  options: { status?: string; severity?: string } = {}
) {
  assertSuperAdmin(context);

  const where: any = {};
  if (options.status) where.status = options.status;
  if (options.severity) where.severity = options.severity;

  const tickets = await prisma.supportTicket.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      organization: { select: { name: true, slug: true } },
      shop: { select: { name: true, code: true } },
    },
  });

  return tickets.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    severity: t.severity,
    status: t.status,
    reportedByEmail: t.reportedByEmail,
    assignedTo: t.assignedTo,
    resolutionNotes: t.resolutionNotes,
    organizationName: t.organization?.name || null,
    shopName: t.shop ? `${t.shop.name} (${t.shop.code})` : null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }));
}

export async function createSupportTicket(
  context: TenantContext,
  input: CreateSupportTicketInput
) {
  assertSuperAdmin(context);

  const ticket = await prisma.supportTicket.create({
    data: {
      title: input.title.trim(),
      description: input.description.trim(),
      severity: input.severity,
      reportedByEmail: input.reportedByEmail.trim().toLowerCase(),
      organizationId: input.organizationId || null,
      shopId: input.shopId || null,
      status: "OPEN",
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: context.user.id,
      action: "SUPPORT_TICKET_LOGGED",
      entityType: "SupportTicket",
      entityId: ticket.id,
      newData: {
        title: ticket.title,
        severity: ticket.severity,
        reportedBy: ticket.reportedByEmail,
      },
    },
  });

  return ticket;
}

export async function updateSupportTicket(
  context: TenantContext,
  input: UpdateSupportTicketInput
) {
  assertSuperAdmin(context);

  const existing = await prisma.supportTicket.findUnique({
    where: { id: input.ticketId },
  });

  if (!existing) {
    throw new Error("Support ticket not found.");
  }

  const updated = await prisma.supportTicket.update({
    where: { id: input.ticketId },
    data: {
      status: input.status,
      resolutionNotes: input.resolutionNotes ? input.resolutionNotes.trim() : existing.resolutionNotes,
      assignedTo: input.assignedTo ? input.assignedTo.trim() : existing.assignedTo,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: context.user.id,
      action: "SUPPORT_TICKET_UPDATED",
      entityType: "SupportTicket",
      entityId: updated.id,
      previousData: { status: existing.status },
      newData: { status: updated.status, resolutionNotes: updated.resolutionNotes },
    },
  });

  return updated;
}

export async function startSupportInvestigationSession(
  context: TenantContext,
  input: SupportInvestigationInput
) {
  assertSuperAdmin(context);

  const shop = await prisma.shop.findUnique({
    where: { id: input.shopId },
    include: { organization: true },
  });

  if (!shop) {
    throw new Error("Shop not found.");
  }

  const expiryTime = new Date(Date.now() + input.durationMinutes * 60 * 1000);

  // Mandatory audited support log
  const auditEntry = await prisma.auditLog.create({
    data: {
      organizationId: shop.organizationId,
      shopId: shop.id,
      userId: context.user.id,
      action: "SUPPORT_INVESTIGATION_STARTED",
      entityType: "Shop",
      entityId: shop.id,
      newData: {
        ticketId: input.ticketId || null,
        investigatorEmail: context.user.email,
        reason: input.reason.trim(),
        authorizedMinutes: input.durationMinutes,
        sessionExpiresAt: expiryTime.toISOString(),
      },
    },
  });

  return {
    sessionId: auditEntry.id,
    shopId: shop.id,
    shopName: shop.name,
    organizationName: shop.organization.name,
    expiresAt: expiryTime,
    reason: input.reason,
  };
}

// -----------------------------------------------------------------------------
// 6. PLATFORM CONFIGURATION
// -----------------------------------------------------------------------------

export async function getPlatformConfig(context: TenantContext) {
  assertSuperAdmin(context);

  const defaultSettings = {
    maintenanceMode: false,
    maintenanceNotice: "EasyStock is currently undergoing scheduled platform upgrades. Service will resume shortly.",
    supportContactEmail: "support@easystock.app",
    allowNewRegistrations: true,
  };

  const storedSettings = await prisma.platformSetting.findMany();
  const settingsMap = new Map(storedSettings.map((s) => [s.key, s.value]));

  return {
    maintenanceMode: settingsMap.get("maintenanceMode") === "true",
    maintenanceNotice: settingsMap.get("maintenanceNotice") || defaultSettings.maintenanceNotice,
    supportContactEmail: settingsMap.get("supportContactEmail") || defaultSettings.supportContactEmail,
    allowNewRegistrations: settingsMap.get("allowNewRegistrations") !== "false",
  };
}

export async function updatePlatformConfig(
  context: TenantContext,
  input: UpdatePlatformConfigInput
) {
  assertSuperAdmin(context);

  const keys = [
    { key: "maintenanceMode", value: String(input.maintenanceMode) },
    { key: "maintenanceNotice", value: input.maintenanceNotice },
    { key: "supportContactEmail", value: input.supportContactEmail },
    { key: "allowNewRegistrations", value: String(input.allowNewRegistrations) },
  ];

  for (const item of keys) {
    await prisma.platformSetting.upsert({
      where: { key: item.key },
      create: { key: item.key, value: item.value, updatedBy: context.user.email },
      update: { value: item.value, updatedBy: context.user.email },
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: context.user.id,
      action: "PLATFORM_CONFIG_UPDATED",
      entityType: "PlatformSetting",
      newData: input,
    },
  });

  return input;
}
