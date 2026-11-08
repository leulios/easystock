import {
  BotContext,
  TelegramInlineKeyboardMarkup,
  TelegramReplyKeyboardMarkup,
} from "./types";
import { ShopRole } from "@prisma/client";

/**
 * Builds the persistent mobile bottom keyboard based on user role
 */
export function buildRoleReplyKeyboard(role: ShopRole): TelegramReplyKeyboardMarkup {
  if (role === ShopRole.SHOP_OWNER) {
    return {
      keyboard: [
        [
          { text: "📊 Today's Summary / የዛሬ ማጠቃለያ" },
          { text: "⏳ Approvals / ውሳኔ የሚጠብቁ" },
        ],
        [
          { text: "📦 Stock Search / ዕቃ መፈለጊያ" },
          { text: "⚠️ Low Stock / ዝቅተኛ ክምችት" },
        ],
        [
          { text: "📄 Invoices / ደረሰኞች" },
          { text: "📖 Help / መመሪያ" },
        ],
      ],
      resize_keyboard: true,
      is_persistent: true,
    };
  } else {
    // Shopkeeper / Sales Staff
    return {
      keyboard: [
        [
          { text: "🛍️ My Shift Sales / የዛሬ ሽያጬ" },
          { text: "🔍 Check Stock / ዕቃ መረጃ" },
        ],
        [
          { text: "📝 Submit Request / ጥያቄ ላክ" },
          { text: "📸 Upload Receipt / ደረሰኝ ላክ" },
        ],
        [
          { text: "📖 Help / መመሪያ" },
        ],
      ],
      resize_keyboard: true,
      is_persistent: true,
    };
  }
}

/**
 * Escapes characters for HTML parse mode in Telegram
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Bilingual Welcome Message after account linking
 */
export function buildWelcomeMessage(ctx: BotContext): {
  text: string;
  replyMarkup: TelegramReplyKeyboardMarkup;
} {
  const isOwner = ctx.role === ShopRole.SHOP_OWNER;
  const shopName = escapeHtml(ctx.shop?.name || "EasyStock Shop");
  const userName = escapeHtml(ctx.user?.fullName || "Partner");
  const replyMarkup = buildRoleReplyKeyboard(ctx.role || ShopRole.SHOPKEEPER);

  if (isOwner) {
    const text = `
👋 <b>Welcome, ${userName}! / እንኳን ደህና መጡ!</b>
🏪 <b>Shop:</b> ${shopName} (Owner / ባለቤት)

Your EasyStock account is now securely linked to Telegram.
መለያዎ በተሳካ ሁኔታ ከቴሌግራም ጋር ተገናኝቷል።

<b>👑 Owner Quick Actions / የባለቤት ፈጣን ትዕዛዞች:</b>
• /summary — Today's sales & revenue / የዛሬ ሽያጭ ማጠቃለያ
• /stock &lt;name/sku&gt; — Check stock, cost & retail price / የዕቃ ክምችትና ዋጋ
• /pending — Pending approvals & invoices / ውሳኔ የሚጠብቁ ጥያቄዎች
• /alerts — Low stock alerts / ዝቅተኛ ክምችት
• /help — Full command guide / የመመሪያ ዝርዝር

<i>Use the 1-tap menu buttons below on your phone for quick everyday tasks!</i>
`.trim();

    return { text, replyMarkup };
  } else {
    // Shopkeeper / Sales Staff
    const text = `
👋 <b>Hello, ${userName}! / ሰላም!</b>
🏪 <b>Shop:</b> ${shopName} (Cashier / ሻጭ)

Your EasyStock account is linked. You have sales and operational access.
መለያዎ ተገናኝቷል። የሽያጭ እና የስራ መዳረሻ አለዎት።

<b>🛍️ Staff Commands / የሰራተኛ ትዕዛዞች:</b>
• /myday — View your shift sales today / የዛሬ ሽያጭዎ
• /checkstock &lt;name/barcode&gt; — View product price & stock / የዕቃ ዋጋና ብዛት
• /request — Submit a stock adjustment request / የክምችት ማስተካከያ ጥያቄ ላክ
• /help — View available commands / መመሪያ ይመልከቱ

📸 <i>Tip: You can send photos of supplier delivery receipts or purchase invoices directly here to submit them to your owner!</i>
`.trim();

    return { text, replyMarkup };
  }
}

/**
 * Help command text tailored to user role
 */
export function buildHelpMessage(ctx: BotContext): string {
  const isOwner = ctx.role === ShopRole.SHOP_OWNER;

  if (isOwner) {
    return `
📖 <b>EasyStock Bot Guide (Shop Owner) / የባለቤት መመሪያ</b>

<b>Financial & Daily Operations:</b>
• <code>/summary</code> — Full shift sales, gross revenue, and cashier breakdown.
• <code>/today</code> — Quick summary of today's totals.
• <code>/pending</code> — List items and invoices awaiting your approval.

<b>Inventory & Catalog:</b>
• <code>/stock &lt;item&gt;</code> — Search products to see available balance, cost, and selling price.
• <code>/alerts</code> — List products that have fallen below their reorder level.

<b>Documents & Invoices:</b>
• Forward or send any photo or PDF of a supplier invoice to immediately log it.

<b>Account & Settings:</b>
• <code>/disconnect</code> — Unlink your Telegram account from EasyStock.
`.trim();
  }

  return `
📖 <b>EasyStock Bot Guide (Shopkeeper) / የሻጭ መመሪያ</b>

<b>Daily Shift:</b>
• <code>/myday</code> — Check how many sales you recorded today and your total volume.
• <code>/checkstock &lt;item/code&gt;</code> — Search whether an item is in stock and its customer selling price.

<b>Stock Requests:</b>
• <code>/request</code> — Send a note to the owner to adjust stock (e.g. damaged item or new shipment count).

<b>Invoices & Deliveries:</b>
• Snap a photo of any supplier delivery note or purchase receipt and send it here. It will be sent to the Owner for approval.

<b>Account:</b>
• <code>/disconnect</code> — Unlink this Telegram chat.
`.trim();
}

/**
 * Owner Daily Sales Summary Message
 */
export function buildOwnerSalesSummaryMessage(
  shopName: string,
  currency: string,
  summary: {
    totalSalesCount: number;
    grossSales: string;
    totalCost: string;
    grossProfit: string;
    cashierBreakdown: { cashierName: string; count: number; total: string }[];
  }
): string {
  let cashierLines = "";
  if (summary.cashierBreakdown.length > 0) {
    cashierLines = "\n<b>Cashier Activity / የሰራተኞች ሽያጭ:</b>\n" +
      summary.cashierBreakdown
        .map((c) => `• <b>${escapeHtml(c.cashierName)}:</b> ${c.count} sales (${c.total} ${currency})`)
        .join("\n");
  }

  return `
📊 <b>Today's Sales Report / የዛሬ የሽያጭ ማጠቃለያ</b>
🏪 <b>Shop:</b> ${escapeHtml(shopName)}
📅 <b>Date:</b> ${new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}

• <b>Total Transactions / ጠቅላላ ግብይቶች:</b> ${summary.totalSalesCount}
• <b>Gross Revenue / ጠቅላላ ገቢ:</b> <code>${summary.grossSales} ${currency}</code>
• <b>Cost of Goods / የወጪ ዋጋ:</b> <code>${summary.totalCost} ${currency}</code>
• <b>Gross Profit / ጥቅል ትርፍ:</b> <code>${summary.grossProfit} ${currency}</code>
${cashierLines}

<i>Generated automatically by EasyStock.</i>
`.trim();
}

/**
 * Shopkeeper Personal Shift Sales Message
 */
export function buildShopkeeperSalesMessage(
  cashierName: string,
  shopName: string,
  currency: string,
  metrics: { salesCount: number; salesTotal: string }
): string {
  return `
🛍️ <b>Your Shift Performance / የዛሬ የስራ ሰዓት ሽያጭዎ</b>
👤 <b>Cashier / ሻጭ:</b> ${escapeHtml(cashierName)}
🏪 <b>Shop:</b> ${escapeHtml(shopName)}
📅 <b>Date:</b> ${new Date().toLocaleDateString()}

• <b>Completed Sales / የተጠናቀቁ ሽያጮች:</b> ${metrics.salesCount}
• <b>Total Volume / ጠቅላላ የተሸጠው:</b> <code>${metrics.salesTotal} ${currency}</code>

👏 Keep up the great work! / መልካም የስራ ቀን!
`.trim();
}

/**
 * Stock check result for Owner (includes cost & margin)
 */
export function buildOwnerStockMessage(
  item: {
    productName: string;
    variantName: string;
    sku: string;
    barcode?: string | null;
    quantity: number;
    sellingPrice: string;
    costPrice: string;
    currency: string;
  }
): string {
  return `
📦 <b>Stock Details (Owner View)</b>
<b>Product:</b> ${escapeHtml(item.productName)} (${escapeHtml(item.variantName)})
<b>SKU:</b> <code>${escapeHtml(item.sku)}</code>
${item.barcode ? `<b>Barcode:</b> <code>${escapeHtml(item.barcode)}</code>\n` : ""}\
<b>Available Quantity / ያለ ብዛት:</b> <b>${item.quantity} units</b>
<b>Selling Price / መሸጫ ዋጋ:</b> ${item.sellingPrice} ${item.currency}
<b>Cost Price / መግዣ ዋጋ:</b> ${item.costPrice} ${item.currency}
`.trim();
}

/**
 * Stock check result for Shopkeeper (cost prices strictly hidden)
 */
export function buildShopkeeperStockMessage(
  item: {
    productName: string;
    variantName: string;
    sku: string;
    quantity: number;
    sellingPrice: string;
    currency: string;
  }
): string {
  const inStockBadge = item.quantity > 0 ? "✅ IN STOCK / አለ" : "❌ OUT OF STOCK / አልቋል";

  return `
🔍 <b>Product Stock Inquiry / የዕቃ መረጃ</b>
<b>Product:</b> ${escapeHtml(item.productName)} (${escapeHtml(item.variantName)})
<b>SKU:</b> <code>${escapeHtml(item.sku)}</code>
<b>Status:</b> ${inStockBadge}
<b>Available / ያለ ብዛት:</b> <b>${item.quantity} units</b>
<b>Selling Price / መሸጫ ዋጋ:</b> <b>${item.sellingPrice} ${item.currency}</b>
`.trim();
}

/**
 * Approval Request card for Shop Owner with interactive inline buttons
 */
export function buildApprovalRequestCard(req: {
  id: string;
  requesterName: string;
  title: string;
  approvalType: string;
  notes?: string;
  details: any;
}): { text: string; replyMarkup: TelegramInlineKeyboardMarkup } {
  const text = `
🔔 <b>New Request Awaiting Approval / አዲስ ውሳኔ የሚጠብቅ ጥያቄ</b>
👤 <b>From Staff / ከሰራተኛ:</b> ${escapeHtml(req.requesterName)}
📌 <b>Type / አይነት:</b> ${escapeHtml(req.approvalType)}
📝 <b>Title:</b> ${escapeHtml(req.title)}
${req.notes ? `💬 <b>Notes / ማስታወሻ:</b> ${escapeHtml(req.notes)}\n` : ""}\
⏰ <b>Time:</b> ${new Date().toLocaleTimeString()}

<i>Review and tap an action below to execute immediately:</i>
`.trim();

  const replyMarkup: TelegramInlineKeyboardMarkup = {
    inline_keyboard: [
      [
        { text: "✅ Approve / ፍቀድ", callback_data: `appr:${req.id}` },
        { text: "❌ Reject / ከልክል", callback_data: `rejc:${req.id}` },
      ],
    ],
  };

  return { text, replyMarkup };
}

/**
 * Supplier Document / Invoice Intake card for Owner
 */
export function buildDocumentIntakeCard(doc: {
  id: string;
  uploaderName: string;
  documentType: string;
  title: string;
  notes?: string;
}): { text: string; replyMarkup: TelegramInlineKeyboardMarkup } {
  const text = `
📄 <b>New Invoice/Document Uploaded / አዲስ ደረሰኝ/ሰነድ ቀርቧል</b>
👤 <b>Uploaded by / የላከው:</b> ${escapeHtml(doc.uploaderName)}
📁 <b>Document Type:</b> ${escapeHtml(doc.documentType)}
📑 <b>Title:</b> ${escapeHtml(doc.title)}
${doc.notes ? `💬 <b>Notes:</b> ${escapeHtml(doc.notes)}\n` : ""}\

<i>Choose how to process this document:</i>
`.trim();

  const replyMarkup: TelegramInlineKeyboardMarkup = {
    inline_keyboard: [
      [
        { text: "📥 Create PO / ግዢ መዝግብ", callback_data: `doc_po:${doc.id}` },
        { text: "💸 Log Expense / ወጪ መዝግብ", callback_data: `doc_exp:${doc.id}` },
      ],
      [
        { text: "📁 Archive / ሰነዱን መዝግብ", callback_data: `doc_arc:${doc.id}` },
        { text: "🗑️ Dismiss / ሰርዝ", callback_data: `doc_del:${doc.id}` },
      ],
    ],
  };

  return { text, replyMarkup };
}
