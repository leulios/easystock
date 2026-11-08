import { prisma } from "../db";
import { telegramClient } from "./client";
import {
  buildApprovalRequestCard,
  buildDocumentIntakeCard,
  escapeHtml,
} from "./messages";
import { ShopRole } from "@prisma/client";
import {
  getDailyBusinessSummaryData,
  formatDailyBusinessSummary,
} from "./services/summary-service";

interface OwnerAccountRecord {
  telegramChatId: string;
  language: "en" | "am";
  notifications: string;
  notificationPreferences: Record<string, boolean>;
}

/**
 * Finds all active Telegram accounts for Shop Owners of a given shop.
 */
async function getOwnerAccounts(shopId: string): Promise<OwnerAccountRecord[]> {
  if (!prisma.telegramAccount?.findMany) return [];
  try {
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
      select: {
        telegramChatId: true,
        language: true,
        notifications: true,
        notificationPreferences: true,
      },
    });

    return (accounts || []).map((a) => ({
      telegramChatId: a.telegramChatId,
      language: (a.language as "en" | "am") || "en",
      notifications: a.notifications,
      notificationPreferences: (a.notificationPreferences as any) || {
        newSales: true,
        dailySummary: true,
        lowStock: true,
        inventoryRequests: true,
        approvals: true,
        purchaseInvoices: true,
        messages: true,
        businessEvents: true,
      },
    }));
  } catch {
    return [];
  }
}

/**
 * Real-time notification when a new sale is completed at POS
 */
export async function notifyOwnerNewSale(
  shopId: string,
  sale: {
    receiptNumber: string;
    totalAmount: string;
    currency: string;
    itemsCount: number;
    cashierName: string;
    paymentMethod: string;
  }
) {
  const owners = await getOwnerAccounts(shopId);
  if (owners.length === 0) return;

  for (const owner of owners) {
    if (owner.notifications === "NONE" || owner.notificationPreferences?.newSales === false) {
      continue;
    }

    const isAmharic = owner.language === "am";
    const text = isAmharic
      ? `
🛍️ <b>አዲስ ሽያጭ ተመዝግቧል / New Sale</b>
🧾 <b>ደረሰኝ:</b> <code>${escapeHtml(sale.receiptNumber)}</code>
💰 <b>ድምር:</b> <b>${sale.totalAmount} ${sale.currency}</b>
📦 <b>የዕቃዎች ብዛት:</b> ${sale.itemsCount}
👤 <b>ሻጭ:</b> ${escapeHtml(sale.cashierName)}
💳 <b>አከፋፈል:</b> ${sale.paymentMethod}
⏰ <b>ሰዓት:</b> ${new Date().toLocaleTimeString()}
`.trim()
      : `
🛍️ <b>New Sale Recorded / አዲስ ሽያጭ</b>
🧾 <b>Receipt:</b> <code>${escapeHtml(sale.receiptNumber)}</code>
💰 <b>Total:</b> <b>${sale.totalAmount} ${sale.currency}</b>
📦 <b>Items:</b> ${sale.itemsCount}
👤 <b>Cashier:</b> ${escapeHtml(sale.cashierName)}
💳 <b>Method:</b> ${sale.paymentMethod}
⏰ <b>Time:</b> ${new Date().toLocaleTimeString()}
`.trim();

    await telegramClient.sendMessage(owner.telegramChatId, text);
  }
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
  const owners = await getOwnerAccounts(shopId);
  if (owners.length === 0) return;

  for (const owner of owners) {
    if (owner.notifications === "NONE" || owner.notificationPreferences?.lowStock === false) {
      continue;
    }

    const isAmharic = owner.language === "am";
    const text = isAmharic
      ? `
⚠️ <b>ዝቅተኛ የክምችት ማስጠንቀቂያ / Low Stock Alert</b>
📦 <b>ዕቃ:</b> ${escapeHtml(item.productName)} (${escapeHtml(item.variantName)})
🏷️ <b>SKU:</b> <code>${escapeHtml(item.sku)}</code>
📉 <b>ቀሪ ክምችት:</b> <b>${item.currentQuantity} units</b> (ማስጠንቀቂያ ደረጃ: ${item.reorderLevel})

<i>እባክዎ ተጨማሪ አቅርቦት ያዘጋጁ።</i>
`.trim()
      : `
⚠️ <b>LOW STOCK ALERT / ዝቅተኛ የክምችት ማስጠንቀቂያ</b>
📦 <b>Product:</b> ${escapeHtml(item.productName)} (${escapeHtml(item.variantName)})
🏷️ <b>SKU:</b> <code>${escapeHtml(item.sku)}</code>
📉 <b>Remaining:</b> <b>${item.currentQuantity} units</b> (Reorder Level: ${item.reorderLevel})

<i>Please arrange for reordering soon.</i>
`.trim();

    await telegramClient.sendMessage(owner.telegramChatId, text, {
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
    referenceCode?: string;
    requesterName: string;
    title: string;
    approvalType: string;
    notes?: string;
    details: any;
  }
) {
  const owners = await getOwnerAccounts(shopId);
  if (owners.length === 0) return;

  const card = buildApprovalRequestCard(request);

  for (const owner of owners) {
    if (owner.notifications === "NONE" || owner.notificationPreferences?.approvals === false) {
      continue;
    }
    await telegramClient.sendMessage(owner.telegramChatId, card.text, {
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
    referenceCode?: string;
    requestTitle: string;
    approved: boolean;
    approverName: string;
    notes?: string;
  }
) {
  if (!prisma.telegramAccount?.findFirst) return;
  let account;
  try {
    account = await prisma.telegramAccount.findFirst({
      where: {
        userId: requesterId,
        shopId,
        isActive: true,
      },
    });
  } catch {
    return;
  }

  if (!account) return;

  const isAmharic = account.language === "am";
  const statusBadge = decision.approved
    ? isAmharic ? "✅ <b>ተፈቅዷል (APPROVED)</b>" : "✅ <b>APPROVED / ተፈቅዷል</b>"
    : isAmharic ? "❌ <b>ውድቅ ተደርጓል (REJECTED)</b>" : "❌ <b>REJECTED / ውድቅ ተደርጓል</b>";

  const refLine = decision.referenceCode ? `🏷️ <b>Ref:</b> <code>${decision.referenceCode}</code>\n` : "";

  const text = isAmharic
    ? `
📢 <b>የጥያቄዎ ውሳኔ ደርሷል / Decision Update</b>
${refLine}📌 <b>ጥያቄ:</b> ${escapeHtml(decision.requestTitle)}
⚖️ <b>ውሳኔ:</b> ${statusBadge}
👑 <b>ውሳኔ ሰጪ:</b> ${escapeHtml(decision.approverName)}
${decision.notes ? `💬 <b>ማስታወሻ:</b> ${escapeHtml(decision.notes)}\n` : ""}\
⏰ <b>ሰዓት:</b> ${new Date().toLocaleTimeString()}
`.trim()
    : `
📢 <b>Request Decision Update / የጥያቄዎ ውሳኔ</b>
${refLine}📌 <b>Request:</b> ${escapeHtml(decision.requestTitle)}
⚖️ <b>Status:</b> ${statusBadge}
👑 <b>Reviewed by:</b> ${escapeHtml(decision.approverName)}
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
  const owners = await getOwnerAccounts(shopId);
  if (owners.length === 0) return;

  const card = buildDocumentIntakeCard(doc);

  for (const owner of owners) {
    if (owner.notifications === "NONE" || owner.notificationPreferences?.purchaseInvoices === false) {
      continue;
    }
    await telegramClient.sendMessage(owner.telegramChatId, card.text, {
      reply_markup: card.replyMarkup,
    });
  }
}

/**
 * Notifies the Shop Owner about important business events (e.g. system warnings, shift closing)
 */
export async function notifyBusinessEvent(
  shopId: string,
  event: {
    title: string;
    description: string;
    severity?: "INFO" | "WARNING" | "CRITICAL";
  }
) {
  const owners = await getOwnerAccounts(shopId);
  if (owners.length === 0) return;

  const severityEmoji: Record<string, string> = {
    INFO: "ℹ️",
    WARNING: "⚠️",
    CRITICAL: "🚨",
  };
  const emoji = severityEmoji[event.severity || "INFO"] || "ℹ️";

  const text = `
${emoji} <b>BUSINESS EVENT / የንግድ ማስታወቂያ</b>
📌 <b>${escapeHtml(event.title)}</b>

${escapeHtml(event.description)}

⏰ <b>Time:</b> ${new Date().toLocaleTimeString()}
`.trim();

  for (const owner of owners) {
    if (owner.notifications === "NONE" || owner.notificationPreferences?.businessEvents === false) {
      continue;
    }
    await telegramClient.sendMessage(owner.telegramChatId, text);
  }
}

/**
 * Dispatches automated daily business summary to all shop owners
 */
export async function sendDailySummaryToOwners(shopId: string) {
  const owners = await getOwnerAccounts(shopId);
  if (owners.length === 0) return;

  const data = await getDailyBusinessSummaryData(shopId);

  for (const owner of owners) {
    if (owner.notifications === "NONE" || owner.notificationPreferences?.dailySummary === false) {
      continue;
    }
    const text = formatDailyBusinessSummary(data, owner.language);
    await telegramClient.sendMessage(owner.telegramChatId, text);
  }
}
