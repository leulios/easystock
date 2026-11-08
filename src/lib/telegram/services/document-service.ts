import { prisma } from "../../db";
import { TenantContext } from "../../tenant/context";

export interface CreateDocumentInput {
  title: string;
  fileId: string;
  documentType?: "PURCHASE_INVOICE" | "DELIVERY_NOTE" | "EXPENSE_RECEIPT" | "OTHER";
  fileUrl?: string;
  mimeType?: string;
  fileSize?: number;
  notes?: string;
  metadata?: Record<string, any>;
}

/**
 * Creates and registers a new business document uploaded via Telegram or web.
 */
export async function createBusinessDocument(
  context: TenantContext,
  input: CreateDocumentInput
) {
  const { shopId, user } = context;

  const doc = await prisma.businessDocument.create({
    data: {
      shopId,
      uploadedById: user.id,
      title: input.title,
      fileId: input.fileId,
      documentType: input.documentType || "PURCHASE_INVOICE",
      fileUrl: input.fileUrl || null,
      mimeType: input.mimeType || null,
      fileSize: input.fileSize || null,
      notes: input.notes || null,
      metadata: input.metadata || {},
      status: "PENDING_REVIEW",
    },
    include: {
      shop: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: context.organizationId,
      shopId,
      userId: user.id,
      action: "DOCUMENT_UPLOADED",
      entityType: "BusinessDocument",
      entityId: doc.id,
      newData: {
        title: doc.title,
        type: doc.documentType,
      },
    },
  });

  return doc;
}

/**
 * Lists pending documents for review.
 */
export async function listPendingDocuments(context: TenantContext) {
  const { shopId } = context;
  return prisma.businessDocument.findMany({
    where: { shopId, status: "PENDING_REVIEW" },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

/**
 * Updates document status (e.g. APPROVED, ARCHIVED, PROCESSED).
 */
export async function updateDocumentStatus(
  context: TenantContext,
  documentId: string,
  status: "APPROVED" | "REJECTED" | "PROCESSED",
  notes?: string
) {
  const { shopId, user } = context;

  const doc = await prisma.businessDocument.findFirst({
    where: { id: documentId, shopId },
  });

  if (!doc) {
    throw new Error("Document not found or access denied.");
  }

  const updated = await prisma.businessDocument.update({
    where: { id: doc.id },
    data: {
      status,
      reviewedById: user.id,
      reviewedAt: new Date(),
      notes: notes || doc.notes,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: context.organizationId,
      shopId,
      userId: user.id,
      action: "DOCUMENT_STATUS_UPDATED",
      entityType: "BusinessDocument",
      entityId: doc.id,
      newData: { status, notes },
    },
  });

  return updated;
}
