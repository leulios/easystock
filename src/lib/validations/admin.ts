import { z } from "zod";

export const suspendShopSchema = z.object({
  shopId: z.string().uuid("Invalid shop ID"),
  reason: z
    .string()
    .min(5, "A descriptive suspension reason is required (at least 5 characters)")
    .max(500),
});

export type SuspendShopInput = z.infer<typeof suspendShopSchema>;

export const reactivateShopSchema = z.object({
  shopId: z.string().uuid("Invalid shop ID"),
  reason: z
    .string()
    .min(3, "A reactivation reason is required (at least 3 characters)")
    .max(500),
});

export type ReactivateShopInput = z.infer<typeof reactivateShopSchema>;

export const revokeUserSessionsSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  reason: z
    .string()
    .min(3, "A reason for revoking sessions is required")
    .max(255),
});

export type RevokeUserSessionsInput = z.infer<typeof revokeUserSessionsSchema>;

export const generateRecoveryTokenSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  reason: z
    .string()
    .min(5, "An audit reason for account recovery assistance is required")
    .max(255),
});

export type GenerateRecoveryTokenInput = z.infer<typeof generateRecoveryTokenSchema>;

export const createSupportTicketSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(150),
  description: z.string().min(10, "Description must be at least 10 characters").max(2000),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  reportedByEmail: z.string().email("Invalid reporter email").toLowerCase(),
  organizationId: z.string().uuid().optional().nullable(),
  shopId: z.string().uuid().optional().nullable(),
});

export type CreateSupportTicketInput = z.infer<typeof createSupportTicketSchema>;

export const updateSupportTicketSchema = z.object({
  ticketId: z.string().uuid("Invalid ticket ID"),
  status: z.enum(["OPEN", "INVESTIGATING", "RESOLVED"]),
  resolutionNotes: z.string().max(1000).optional().nullable(),
  assignedTo: z.string().max(100).optional().nullable(),
});

export type UpdateSupportTicketInput = z.infer<typeof updateSupportTicketSchema>;

export const supportInvestigationSchema = z.object({
  shopId: z.string().uuid("Invalid shop ID"),
  ticketId: z.string().uuid().optional().nullable(),
  reason: z
    .string()
    .min(10, "A detailed reason for support access is required (at least 10 characters)")
    .max(500),
  durationMinutes: z.number().int().min(15).max(120).default(60),
});

export type SupportInvestigationInput = z.infer<typeof supportInvestigationSchema>;

export const updatePlatformConfigSchema = z.object({
  maintenanceMode: z.boolean(),
  maintenanceNotice: z.string().max(500),
  supportContactEmail: z.string().email("Invalid support email"),
  allowNewRegistrations: z.boolean(),
});

export type UpdatePlatformConfigInput = z.infer<typeof updatePlatformConfigSchema>;
