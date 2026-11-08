import { prisma } from "../../db";
import { Decimal } from "../../decimal";
import { escapeHtml } from "../messages";

export interface DailySummaryData {
  shopName: string;
  currency: string;
  date: string;
  totalSales: string;
  transactionCount: number;
  topSellingProducts: { name: string; quantity: number; revenue: string }[];
  lowStockCount: number;
  lowStockItems: { name: string; quantity: number; reorderLevel: number }[];
  pendingRequestsCount: number;
  pendingInvoicesCount: number;
  unreadMessagesCount: number;
}

/**
 * Aggregates complete daily business performance for a shop.
 */
export async function getDailyBusinessSummaryData(
  shopId: string,
  knownShop?: { name: string; currency: string }
): Promise<DailySummaryData> {
  let shopName = knownShop?.name || "EasyStock Shop";
  let currency = knownShop?.currency || "ETB";

  if (!knownShop && prisma.shop?.findUnique) {
    try {
      const shop = await prisma.shop.findUnique({
        where: { id: shopId },
        select: { name: true, currency: true },
      });
      if (shop) {
        shopName = shop.name;
        currency = shop.currency;
      }
    } catch {
      // Fallback to defaults
    }
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // 1. Sales today
  const sales = (prisma.sale?.findMany
    ? await prisma.sale.findMany({
        where: {
          shopId,
          createdAt: { gte: todayStart },
        },
        include: {
          items: {
            include: {
              variant: {
                include: { product: true },
              },
            },
          },
        },
      })
    : []) || [];

  let totalSalesDec = new Decimal(0);
  const variantMap = new Map<string, { name: string; quantity: number; revenue: Decimal }>();

  for (const s of sales) {
    totalSalesDec = totalSalesDec.plus(new Decimal(s.totalAmount));
    if (s.items) {
      for (const item of s.items) {
        if (!item.variant) continue;
        const vKey = item.variantId;
        const vName = `${item.variant.product?.name || "Item"} (${item.variant.name || ""})`;
        const existing = variantMap.get(vKey) || { name: vName, quantity: 0, revenue: new Decimal(0) };
        variantMap.set(vKey, {
          name: vName,
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue.plus(new Decimal(item.totalPrice)),
        });
      }
    }
  }

  // Top 3 best-selling products
  const topSelling = Array.from(variantMap.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 3)
    .map((p) => ({
      name: p.name,
      quantity: p.quantity,
      revenue: p.revenue.toFixed(2),
    }));

  // 2. Low-stock inventory
  let inventory: any[] = [];
  try {
    if (prisma.inventoryItem?.findMany) {
      inventory = await prisma.inventoryItem.findMany({
        where: { shopId },
        include: {
          variant: { include: { product: true } },
        },
      });
    }
  } catch {
    inventory = [];
  }

  const lowStock = (inventory || []).filter((i) => i.variant && i.quantity <= i.variant.reorderLevel);
  const lowStockPreview = lowStock.slice(0, 3).map((i) => ({
    name: `${i.variant.product?.name || "Product"} (${i.variant.name || ""})`,
    quantity: i.quantity,
    reorderLevel: i.variant.reorderLevel,
  }));

  // 3. Pending requests
  let pendingRequestsCount = 0;
  try {
    if (prisma.approvalRequest?.count) {
      pendingRequestsCount = await prisma.approvalRequest.count({ where: { shopId, status: "PENDING" } });
    }
  } catch {
    pendingRequestsCount = 0;
  }

  // 4. Pending invoices
  let pendingInvoicesCount = 0;
  try {
    if (prisma.businessDocument?.count) {
      pendingInvoicesCount = await prisma.businessDocument.count({ where: { shopId, status: "PENDING_REVIEW" } });
    }
  } catch {
    pendingInvoicesCount = 0;
  }

  // 5. Unread messages
  let unreadMessagesCount = 0;
  try {
    if (prisma.shopMessage?.count) {
      unreadMessagesCount = await prisma.shopMessage.count({ where: { shopId, isRead: false, createdAt: { gte: todayStart } } });
    }
  } catch {
    unreadMessagesCount = 0;
  }

  return {
    shopName,
    currency,
    date: new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    totalSales: totalSalesDec.toFixed(2),
    transactionCount: sales.length,
    topSellingProducts: topSelling,
    lowStockCount: lowStock.length,
    lowStockItems: lowStockPreview,
    pendingRequestsCount,
    pendingInvoicesCount,
    unreadMessagesCount,
  };
}

/**
 * Builds formatted daily summary message in English or Amharic
 */
export function formatDailyBusinessSummary(
  data: DailySummaryData,
  language: "en" | "am" = "en"
): string {
  const isAmharic = language === "am";

  if (isAmharic) {
    let topSection = "• ዛሬ ምንም የተሸጠ ዕቃ የለም";
    if (data.topSellingProducts.length > 0) {
      topSection = data.topSellingProducts
        .map((p, idx) => `${idx + 1}. <b>${escapeHtml(p.name)}</b> — <b>${p.quantity}</b> ተሽጧል (${p.revenue} ${data.currency})`)
        .join("\n");
    }

    let lowStockSection = "✅ ሁሉም ክምችት በጥሩ ደረጃ ላይ ይገኛል";
    if (data.lowStockCount > 0) {
      const itemsList = data.lowStockItems
        .map((i) => `• <b>${escapeHtml(i.name)}:</b> ቀሪ ${i.quantity} (ማስጠንቀቂያ: ${i.reorderLevel})`)
        .join("\n");
      lowStockSection = `⚠️ <b>${data.lowStockCount}</b> ዕቃዎች ዝቅተኛ ክምችት ላይ ናቸው:\n${itemsList}`;
    }

    return `
📊 <b>የዕለት የንግድ ማጠቃለያ — ${escapeHtml(data.shopName)}</b>
📅 <b>ቀን:</b> ${data.date}

💰 <b>የዛሬ ጠቅላላ ሽያጭ:</b> <b>${data.totalSales} ${data.currency}</b>
🧾 <b>የሽያጭ ብዛት:</b> <b>${data.transactionCount}</b> ደረሰኞች

🏆 <b>ተወዳጅና በብዛት የተሸጡ ዕቃዎች:</b>
${topSection}

📦 <b>የክምችት ሁኔታ:</b>
${lowStockSection}

⏳ <b>ውሳኔ የሚጠብቁ ተግባራት:</b>
• የክምችት ማስተካከያ ጥያቄዎች: <b>${data.pendingRequestsCount}</b>
• የሚገመገሙ አዳዲስ ደረሰኞች: <b>${data.pendingInvoicesCount}</b>
• አዳዲስ መልዕክቶች: <b>${data.unreadMessagesCount}</b>

<i>EasyStock — የንግድ ረዳትዎ</i>
`.trim();
  }

  // English version
  let topSection = "• No sales recorded yet today";
  if (data.topSellingProducts.length > 0) {
    topSection = data.topSellingProducts
      .map((p, idx) => `${idx + 1}. <b>${escapeHtml(p.name)}</b> — <b>${p.quantity} sold</b> (${p.revenue} ${data.currency})`)
      .join("\n");
  }

  let lowStockSection = "✅ All inventory items are well-stocked";
  if (data.lowStockCount > 0) {
    const itemsList = data.lowStockItems
      .map((i) => `• <b>${escapeHtml(i.name)}:</b> ${i.quantity} left (reorder at ${i.reorderLevel})`)
      .join("\n");
    lowStockSection = `⚠️ <b>${data.lowStockCount}</b> items are running low:\n${itemsList}`;
  }

  return `
📊 <b>Daily Business Summary — ${escapeHtml(data.shopName)}</b>
📅 <b>Date:</b> ${data.date}

💰 <b>Total Sales:</b> <b>${data.totalSales} ${data.currency}</b>
🧾 <b>Transactions:</b> <b>${data.transactionCount}</b> sales

🏆 <b>Best-Selling Products:</b>
${topSection}

📦 <b>Inventory Status:</b>
${lowStockSection}

⏳ <b>Pending Actions:</b>
• Inventory Requests: <b>${data.pendingRequestsCount}</b>
• Purchase Invoices to Review: <b>${data.pendingInvoicesCount}</b>
• Unread Messages: <b>${data.unreadMessagesCount}</b>

<i>EasyStock — Your Retail Assistant</i>
`.trim();
}
