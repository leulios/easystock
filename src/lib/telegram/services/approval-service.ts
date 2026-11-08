import { prisma } from "../../db";
import { TenantContext, assertCanManageInventory } from "../../tenant/context";
import { adjustStock } from "../../services/inventory-service";
import { StockAdjustmentInput } from "../../validations/catalog";
import { ShopRole } from "@prisma/client";

export interface CreateApprovalInput {
  approvalType: "STOCK_ADJUSTMENT" | "RETURN_RESTOCK" | "PURCHASE_RECEIVE" | "EXPENSE";
  title: string;
  details: Record<string, any>;
  notes?: string;
}

/**
 * Creates a new approval request submitted by a Shopkeeper.
 */
export async function createApprovalRequest(
  context: TenantContext,
  input: CreateApprovalInput
) {
  const { shopId, user } = context;

  const request = await prisma.approvalRequest.create({
    data: {
      shopId,
      requesterId: user.id,
      approvalType: input.approvalType,
      title: input.title,
      details: input.details,
      decisionNotes: input.notes || null,
      status: "PENDING",
    },
    include: {
      requester: true,
      shop: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: context.organizationId,
      shopId,
      userId: user.id,
      action: "APPROVAL_REQUEST_SUBMITTED",
      entityType: "ApprovalRequest",
      entityId: request.id,
      newData: {
        type: input.approvalType,
        title: input.title,
      },
    },
  });

  return request;
}

/**
 * Approves a pending request and executes the corresponding domain operation.
 * Can only be executed by a Shop Owner or Platform Super Admin.
 */
export async function approveRequest(
  context: TenantContext,
  requestId: string,
  approvalNotes?: string
) {
  assertCanManageInventory(context, "Approving inventory requests");
  const { shopId, user, role } = context;

  if (role !== ShopRole.SHOP_OWNER && !context.isPlatformAdmin) {
    throw new Error("Only the Shop Owner can approve operational requests.");
  }

  // Atomically claim and check request status
  const request = await prisma.approvalRequest.findFirst({
    where: { id: requestId, shopId },
    include: { requester: true, shop: true },
  });

  if (!request) {
    throw new Error("Approval request not found or access denied.");
  }

  if (request.status !== "PENDING") {
    throw new Error(`This request has already been ${request.status.toLowerCase()}.`);
  }

  const details = request.details as any;

  // Execute underlying domain logic based on type
  if (request.approvalType === "STOCK_ADJUSTMENT") {
    const adjustmentInput: StockAdjustmentInput = {
      variantId: details.variantId,
      adjustmentType: details.adjustmentType || "ADD_QUANTITY",
      quantity: Number(details.quantity),
      reason: details.reason || "Shopkeeper request via Telegram",
      notes: `Approved by ${user.fullName}. ${approvalNotes || details.notes || ""}`.trim(),
    };

    // Execute atomic stock adjustment under Owner authority
    await adjustStock(context, adjustmentInput);
  }

  // Update request to APPROVED
  const updated = await prisma.approvalRequest.update({
    where: { id: request.id },
    data: {
      status: "APPROVED",
      approverId: user.id,
      decisionNotes: approvalNotes || "Approved via Telegram",
      decisionAt: new Date(),
    },
    include: {
      requester: true,
      shop: true,
    },
  });

  // Write audit trail
  await prisma.auditLog.create({
    data: {
      organizationId: context.organizationId,
      shopId,
      userId: user.id,
      action: "APPROVAL_REQUEST_APPROVED",
      entityType: "ApprovalRequest",
      entityId: updated.id,
      newData: {
        approvalType: updated.approvalType,
        approvedBy: user.fullName,
      },
    },
  });

  return updated;
}

/**
 * Rejects a pending request with an optional reason.
 */
export async function rejectRequest(
  context: TenantContext,
  requestId: string,
  rejectionReason = "Rejected by Shop Owner"
) {
  assertCanManageInventory(context, "Rejecting requests");
  const { shopId, user, role } = context;

  if (role !== ShopRole.SHOP_OWNER && !context.isPlatformAdmin) {
    throw new Error("Only the Shop Owner can reject operational requests.");
  }

  const request = await prisma.approvalRequest.findFirst({
    where: { id: requestId, shopId },
  });

  if (!request) {
    throw new Error("Approval request not found or access denied.");
  }

  if (request.status !== "PENDING") {
    throw new Error(`This request has already been ${request.status.toLowerCase()}.`);
  }

  const updated = await prisma.approvalRequest.update({
    where: { id: request.id },
    data: {
      status: "REJECTED",
      approverId: user.id,
      decisionNotes: rejectionReason,
      decisionAt: new Date(),
    },
    include: {
      requester: true,
      shop: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: context.organizationId,
      shopId,
      userId: user.id,
      action: "APPROVAL_REQUEST_REJECTED",
      entityType: "ApprovalRequest",
      entityId: updated.id,
      newData: {
        reason: rejectionReason,
        rejectedBy: user.fullName,
      },
    },
  });

  return updated;
}

/**
 * Lists pending requests for a shop.
 */
export async function listPendingRequests(context: TenantContext) {
  const { shopId } = context;
  return prisma.approvalRequest.findMany({
    where: { shopId, status: "PENDING" },
    include: { requester: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}
