import { prisma } from "../db";
import { telegramClient } from "./client";
import {
  buildApprovalRequestCard,
  buildDocumentIntakeCard,
  escapeHtml,
} from "./messages";
import { ShopRole } from "@prisma/client";

/**
 * Finds all active Telegram chat IDs for Shop Owners of a given shop.
 */
async function getOwnerChatIds(shopId: string): Promise<string[]> {
  const accounts = await prisma.telegramAccount.findMany({
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
    select: { telegramChatId: true },
  });

  return accounts.map((a) => a.telegramChatId);
}

/**
 * Alerts the Shop Owner when a product's inventory drops to or below the reorder level.
 */
export async function notifyOwnerLowStock(
  shopId: string,
  item: {
    productName: string;
    variantName: string;
    sku: string;
    currentQuantity: number;
    reorderLevel: number;
    currency: string;
  }
) {
  const chatIds = await getOwnerChatIds(shopId);
  if (chatIds.length === 0) return;

  const text = `
⚠️ <b>LOW STOCK ALERT / ዝቅተኛ የክምችት ማስጠንቀቂያ</b>
📦 <b>Product:</b> ${escapeHtml(item.productName)} (${escapeHtml(item.variantName)})
🏷️ <b>SKU:</b> <code>${escapeHtml(item.sku)}</code>
📉 <b>Remaining / የቀረው:</b> <b>${item.currentQuantity} units</b> (Reorder Level: ${item.reorderLevel})

<i>Please arrange for reordering soon. / እባክዎ ተጨማሪ አቅርቦት ያዘጋጁ።</i>
`.trim();

  for (const chatId of chatIds) {
    await telegramClient.sendMessage(chatId, text, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: `📦 Check ${escapeHtml(item.productName)}`, callback_data: `cmd:stock_${item.sku}` },
          ],
        ],
      },
    });
  }
}

/**
 * Notifies the Shop Owner when a staff member submits an inventory approval request.
 */
export async function notifyOwnerApprovalRequest(
  shopId: string,
  request: {
    id: string;
    requesterName: string;
    title: string;
    approvalType: string;
    notes?: string;
    details: any;
  }
) {
  const chatIds = await getOwnerChatIds(shopId);
  if (chatIds.length === 0) return;

  const card = buildApprovalRequestCard(request);

  for (const chatId of chatIds) {
    await telegramClient.sendMessage(chatId, card.text, {
      reply_markup: card.replyMarkup,
    });
  }
}

/**
 * Notifies the requesting staff member when the owner has approved or rejected their request.
 */
export async function notifyRequesterDecision(
  requesterId: string,
  shopId: string,
  decision: {
    requestTitle: string;
    approved: boolean;
    approverName: string;
    notes?: string;
  }
) {
  const account = await prisma.telegramAccount.findFirst({
    where: {
      userId: requesterId,
      shopId,
      isActive: true,
    },
  });

  if (!account) return;

  const statusBadge = decision.approved
    ? "✅ <b>APPROVED / ተፈቅዷል</b>"
    : "❌ <b>REJECTED / ውድቅ ተደርጓል</b>";

  const text = `
📢 <b>Request Decision Update / የጥያቄዎ ውሳኔ</b>
📌 <b>Request:</b> ${escapeHtml(decision.requestTitle)}
⚖️ <b>Status:</b> ${statusBadge}
👤 <b>Reviewed by:</b> ${escapeHtml(decision.approverName)}
${decision.notes ? `💬 <b>Notes:</b> ${escapeHtml(decision.notes)}\n` : ""}\
⏰ <b>Time:</b> ${new Date().toLocaleTimeString()}
`.trim();

  await telegramClient.sendMessage(account.telegramChatId, text);
}

/**
 * Notifies the Shop Owner when a new supplier document or paper invoice is received.
 */
export async function notifyOwnerNewDocument(
  shopId: string,
  doc: {
    id: string;
    uploaderName: string;
    title: string;
    documentType: string;
    notes?: string;
  }
) {
  const chatIds = await getOwnerChatIds(shopId);
  if (chatIds.length === 0) return;

  const card = buildDocumentIntakeCard(doc);

  for (const chatId of chatIds) {
    await telegramClient.sendMessage(chatId, card.text, {
      reply_markup: card.replyMarkup,
    });
  }
}
