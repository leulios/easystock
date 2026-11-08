import { prisma } from "../../db";
import { TenantContext } from "../../tenant/context";
import { MessageCategory } from "../types";
import { telegramClient } from "../client";
import { escapeHtml } from "../messages";
import { ShopRole } from "@prisma/client";

export interface CreateMessageInput {
  recipientId?: string | null; // null = broadcast to all staff
  category?: MessageCategory;
  content: string;
  fileId?: string;
  fileType?: "photo" | "document";
  replyToId?: string;
}

/**
 * Generates human-friendly unique tracking reference codes: MSG-YYYYMMDD-XXXX
 */
export function generateMessageReferenceCode(): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `MSG-${datePart}-${randomPart}`;
}

/**
 * Creates and delivers a business message between Owner and Staff.
 */
export async function createShopMessage(
  context: TenantContext,
  input: CreateMessageInput
) {
  const { shopId, user, organizationId } = context;
  const referenceCode = generateMessageReferenceCode();
  const category = input.category || "GENERAL";

  const message = await prisma.shopMessage.create({
    data: {
      referenceCode,
      shopId,
      senderId: user.id,
      recipientId: input.recipientId || null,
      category,
      content: input.content,
      fileId: input.fileId || null,
      fileType: input.fileType || null,
      replyToId: input.replyToId || null,
      status: "SENT",
    },
    include: {
      sender: {
        select: { id: true, fullName: true, email: true },
      },
      recipient: {
        select: { id: true, fullName: true, email: true },
      },
    },
  });

  // Audit communication entry
  await prisma.auditLog.create({
    data: {
      organizationId,
      shopId,
      userId: user.id,
      action: input.recipientId ? "MESSAGE_SENT" : "STAFF_ANNOUNCEMENT_SENT",
      entityType: "ShopMessage",
      entityId: message.id,
      newData: {
        referenceCode: message.referenceCode,
        category,
        recipientId: input.recipientId || "ALL_STAFF",
        preview: input.content.slice(0, 60),
      },
    },
  });

  // Outbound Telegram Notification dispatch
  await deliverMessageTelegramNotification(shopId, message);

  return message;
}

/**
 * Delivers Telegram notifications for new messages to the target user or staff broadcast
 */
async function deliverMessageTelegramNotification(shopId: string, message: any) {
  try {
    const isBroadcast = !message.recipientId;
    const categoryEmoji: Record<string, string> = {
      GENERAL: "💬",
      SALES_ISSUE: "⚠️",
      STOCK_REQUEST: "📦",
      CUSTOMER_ISSUE: "👥",
      PURCHASE_INFO: "🧾",
      OTHER: "📌",
    };
    const emoji = categoryEmoji[message.category] || "💬";

    if (isBroadcast) {
      // Broadcast to all active shopkeepers in the shop
      const staffAccounts = await prisma.telegramAccount.findMany({
        where: {
          shopId,
          isActive: true,
          user: {
            memberships: {
              some: {
                shopId,
                role: ShopRole.SHOPKEEPER,
              },
            },
          },
        },
      });

      const notificationText = `
📢 <b>OWNER ANNOUNCEMENT / የባለቤት ማስታወቂያ</b>
🏷️ <b>Ref:</b> <code>${message.referenceCode}</code>
👑 <b>From:</b> ${escapeHtml(message.sender.fullName || "Shop Owner")}
📁 <b>Category:</b> ${message.category}

${escapeHtml(message.content)}

<i>Sent to all active staff members</i>
`.trim();

      for (const staff of staffAccounts) {
        // Check preferences
        const prefs = (staff.notificationPreferences as any) || {};
        if (prefs.messages !== false) {
          await telegramClient.sendMessage(staff.telegramChatId, notificationText);
        }
      }
    } else {
      // Direct message to specific recipient
      const recipientAccount = await prisma.telegramAccount.findFirst({
        where: {
          userId: message.recipientId,
          shopId,
          isActive: true,
        },
      });

      if (recipientAccount) {
        const prefs = (recipientAccount.notificationPreferences as any) || {};
        if (prefs.messages !== false) {
          const directText = `
${emoji} <b>NEW MESSAGE / አዲስ መልዕክት</b>
🏷️ <b>Ref:</b> <code>${message.referenceCode}</code>
👤 <b>From:</b> ${escapeHtml(message.sender.fullName || "Colleague")}
📁 <b>Category:</b> ${message.category}
⏰ <b>Time:</b> ${new Date(message.createdAt).toLocaleTimeString()}

${escapeHtml(message.content)}
`.trim();

          const replyMarkup = {
            inline_keyboard: [
              [
                {
                  text: "↩️ Reply / መልስ ስጥ",
                  callback_data: `msg_rep:${message.senderId}`,
                },
              ],
            ],
          };

          await telegramClient.sendMessage(recipientAccount.telegramChatId, directText, {
            reply_markup: replyMarkup,
          });
        }
      }
    }
  } catch (err) {
    console.error("[CommunicationService] Error delivering message notification:", err);
  }
}

/**
 * Returns active shopkeepers in a shop with linked Telegram accounts for owner messaging
 */
export async function getShopkeeperRecipients(shopId: string) {
  const staff = await prisma.telegramAccount.findMany({
    where: {
      shopId,
      isActive: true,
      user: {
        memberships: {
          some: {
            shopId,
            role: ShopRole.SHOPKEEPER,
          },
        },
      },
    },
    include: {
      user: {
        select: { id: true, fullName: true, email: true },
      },
    },
  });

  return staff.map((s) => ({
    userId: s.userId,
    fullName: s.user.fullName,
    telegramChatId: s.telegramChatId,
    telegramUsername: s.telegramUsername,
  }));
}

/**
 * Returns active shop owners with linked Telegram accounts for staff messaging
 */
export async function getOwnerRecipients(shopId: string) {
  const owners = await prisma.telegramAccount.findMany({
    where: {
      shopId,
      isActive: true,
      user: {
        memberships: {
          some: {
            OR: [
              { shopId, role: ShopRole.SHOP_OWNER },
              { shopId: null, role: ShopRole.SHOP_OWNER },
            ],
          },
        },
      },
    },
    include: {
      user: {
        select: { id: true, fullName: true, email: true },
      },
    },
  });

  return owners.map((o) => ({
    userId: o.userId,
    fullName: o.user.fullName,
    telegramChatId: o.telegramChatId,
    telegramUsername: o.telegramUsername,
  }));
}

/**
 * Lists messages for a shop with filtering
 */
export async function listShopMessages(
  context: TenantContext,
  options?: {
    category?: MessageCategory;
    status?: string;
    limit?: number;
  }
) {
  const { shopId } = context;
  return prisma.shopMessage.findMany({
    where: {
      shopId,
      category: options?.category,
      status: options?.status,
    },
    include: {
      sender: { select: { id: true, fullName: true } },
      recipient: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: options?.limit || 20,
  });
}
