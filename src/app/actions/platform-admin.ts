"use server";

import { getCurrentContext } from "./auth";
import {
  suspendShopSchema,
  SuspendShopInput,
  reactivateShopSchema,
  ReactivateShopInput,
  revokeUserSessionsSchema,
  RevokeUserSessionsInput,
  generateRecoveryTokenSchema,
  GenerateRecoveryTokenInput,
  createSupportTicketSchema,
  CreateSupportTicketInput,
  updateSupportTicketSchema,
  UpdateSupportTicketInput,
  supportInvestigationSchema,
  SupportInvestigationInput,
  updatePlatformConfigSchema,
  UpdatePlatformConfigInput,
} from "@/lib/validations/admin";
import {
  getPlatformOverview,
  getSystemHealthTelemetry,
  listAdminShops,
  suspendShop,
  reactivateShop,
  listAdminUsers,
  revokeAllUserSessions,
  generateAccountRecoveryLink,
  listAuditLogs,
  listSupportTickets,
  createSupportTicket,
  updateSupportTicket,
  startSupportInvestigationSession,
  getPlatformConfig,
  updatePlatformConfig,
  ListAdminShopsOptions,
  ListAdminUsersOptions,
  ListAuditLogsOptions,
} from "@/lib/services/platform-admin-service";
import { PlatformRole } from "@prisma/client";
import { revalidatePath } from "next/cache";

async function assertSuperAdminContext() {
  const context = await getCurrentContext();
  if (
    !context ||
    (context.user.platformRole !== PlatformRole.SUPER_ADMIN && !context.isPlatformAdmin)
  ) {
    throw new Error("Access Denied: Platform Administrator privileges required.");
  }
  return context;
}

export async function getPlatformOverviewAction() {
  try {
    const context = await assertSuperAdminContext();
    const data = await getPlatformOverview(context);
    return { success: true, ...data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getSystemHealthAction() {
  try {
    const context = await assertSuperAdminContext();
    const data = await getSystemHealthTelemetry(context);
    return { success: true, health: data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function listAdminShopsAction(options: ListAdminShopsOptions = {}) {
  try {
    const context = await assertSuperAdminContext();
    const result = await listAdminShops(context, options);
    return { success: true, ...result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function suspendShopAction(data: SuspendShopInput) {
  try {
    const context = await assertSuperAdminContext();
    const parsed = suspendShopSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: "Validation error", fieldErrors: parsed.error.flatten().fieldErrors };
    }
    const result = await suspendShop(context, parsed.data);
    revalidatePath("/platform-admin");
    revalidatePath("/platform-admin/shops");
    return { success: true, shop: result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function reactivateShopAction(data: ReactivateShopInput) {
  try {
    const context = await assertSuperAdminContext();
    const parsed = reactivateShopSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: "Validation error", fieldErrors: parsed.error.flatten().fieldErrors };
    }
    const result = await reactivateShop(context, parsed.data);
    revalidatePath("/platform-admin");
    revalidatePath("/platform-admin/shops");
    return { success: true, shop: result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function listAdminUsersAction(options: ListAdminUsersOptions = {}) {
  try {
    const context = await assertSuperAdminContext();
    const result = await listAdminUsers(context, options);
    return { success: true, ...result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function revokeUserSessionsAction(data: RevokeUserSessionsInput) {
  try {
    const context = await assertSuperAdminContext();
    const parsed = revokeUserSessionsSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false as const, error: "Validation error", fieldErrors: parsed.error.flatten().fieldErrors };
    }
    const result = await revokeAllUserSessions(context, parsed.data);
    revalidatePath("/platform-admin/accounts");
    return { success: true as const, count: result.count };
  } catch (err: any) {
    return { success: false as const, error: err.message };
  }
}

export async function generateRecoveryLinkAction(data: GenerateRecoveryTokenInput) {
  try {
    const context = await assertSuperAdminContext();
    const parsed = generateRecoveryTokenSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false as const, error: "Validation error", fieldErrors: parsed.error.flatten().fieldErrors };
    }
    const result = await generateAccountRecoveryLink(context, parsed.data);
    revalidatePath("/platform-admin/accounts");
    return { success: true as const, recoveryUrl: result.recoveryUrl, expiresAt: result.expiresAt, userEmail: result.userEmail };
  } catch (err: any) {
    return { success: false as const, error: err.message };
  }
}

export async function listAuditLogsAction(options: ListAuditLogsOptions = {}) {
  try {
    const context = await assertSuperAdminContext();
    const result = await listAuditLogs(context, options);
    return { success: true, ...result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function listSupportTicketsAction(options: { status?: string; severity?: string } = {}) {
  try {
    const context = await assertSuperAdminContext();
    const tickets = await listSupportTickets(context, options);
    return { success: true, tickets };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createSupportTicketAction(data: CreateSupportTicketInput) {
  try {
    const context = await assertSuperAdminContext();
    const parsed = createSupportTicketSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: "Validation error", fieldErrors: parsed.error.flatten().fieldErrors };
    }
    const ticket = await createSupportTicket(context, parsed.data);
    revalidatePath("/platform-admin/support");
    return { success: true, ticket };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateSupportTicketAction(data: UpdateSupportTicketInput) {
  try {
    const context = await assertSuperAdminContext();
    const parsed = updateSupportTicketSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: "Validation error", fieldErrors: parsed.error.flatten().fieldErrors };
    }
    const ticket = await updateSupportTicket(context, parsed.data);
    revalidatePath("/platform-admin/support");
    return { success: true, ticket };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function startInvestigationAction(data: SupportInvestigationInput) {
  try {
    const context = await assertSuperAdminContext();
    const parsed = supportInvestigationSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: "Validation error", fieldErrors: parsed.error.flatten().fieldErrors };
    }
    const session = await startSupportInvestigationSession(context, parsed.data);
    revalidatePath("/platform-admin/support");
    revalidatePath("/platform-admin/audit-logs");
    return { success: true, session };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getPlatformConfigAction() {
  try {
    const context = await assertSuperAdminContext();
    const config = await getPlatformConfig(context);
    return { success: true, config };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updatePlatformConfigAction(data: UpdatePlatformConfigInput) {
  try {
    const context = await assertSuperAdminContext();
    const parsed = updatePlatformConfigSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: "Validation error", fieldErrors: parsed.error.flatten().fieldErrors };
    }
    const config = await updatePlatformConfig(context, parsed.data);
    revalidatePath("/platform-admin/settings");
    return { success: true, config };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
