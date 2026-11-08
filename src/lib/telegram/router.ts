import { TelegramUpdate, BotContext } from "./types";
import { telegramClient } from "./client";
import {
  resolveTelegramContext,
  verifyAndLinkTelegramAccount,
  disconnectTelegramAccount,
  buildTenantContextFromBot,
} from "./auth";
import {
  buildWelcomeMessage,
  buildHelpMessage,
  buildOwnerSalesSummaryMessage,
  buildShopkeeperSalesMessage,
  buildOwnerStockMessage,
  buildShopkeeperStockMessage,
  buildApprovalRequestCard,
  escapeHtml,
} from "./messages";
import { ShopRole } from "@prisma/client";
import { prisma } from "../db";
import { Decimal } from "../decimal";
import {
  approveRequest,
  rejectRequest,
  listPendingRequests,
  createApprovalRequest,
} from "./services/approval-service";
import {
  createBusinessDocument,
  updateDocumentStatus,
  listPendingDocuments,
} from "./services/document-service";
import {
  notifyOwnerApprovalRequest,
  notifyRequesterDecision,
  notifyOwnerNewDocument,
} from "./notifier";

export class TelegramRouter {
  /**
   * Main entry point for processing all incoming Telegram updates.
   */
  public async handleUpdate(update: TelegramUpdate): Promise<void> {
    try {
      if (update.message) {
        await this.handleMessage(update.message);
      } else if (update.callback_query) {
        await this.handleCallbackQuery(update.callback_query);
      }
    } catch (error) {
      console.error("[TelegramRouter] Unhandled error handling update:", error);
    }
  }

  /**
   * Handles text messages, commands, photos, and file attachments
   */
  private async handleMessage(message: NonNullable<TelegramUpdate["message"]>): Promise<void> {
    const chatId = String(message.chat.id);
    const text = message.text?.trim() || "";

    // 1. Deep linking /start command handling
    if (text.startsWith("/start")) {
      const parts = text.split(" ");
      if (parts.length > 1 && parts[1].startsWith("LINK_")) {
        const token = parts[1].replace("LINK_", "");
        if (message.from) {
          const linkResult = await verifyAndLinkTelegramAccount(token, message.from, chatId);
          if (!linkResult.success) {
            await telegramClient.sendMessage(chatId, linkResult.message);
            return;
          }

          // Successfully linked! Fetch context and send welcome
          const ctx = await resolveTelegramContext(chatId);
          if (ctx) {
            const welcome = buildWelcomeMessage(ctx);
            await telegramClient.sendMessage(chatId, welcome.text, {
              reply_markup: welcome.replyMarkup,
            });
            return;
          }
        }
      }
    }

    // 2. Resolve user context from database
    const ctx = await resolveTelegramContext(chatId);

    // If user is not yet connected to an EasyStock account
    if (!ctx || !ctx.isLinked || !ctx.user || !ctx.shop) {
      const unlinkedText = `
👋 <b>Welcome to EasyStock! / እንኳን ወደ EasyStock በደህና መጡ!</b>

Your Telegram account is not yet connected to an EasyStock shop.
የቴሌግራም መለያዎ ገና ከ EasyStock ሱቅ ጋር አልተገናኘም።

<b>How to connect / እንዴት ማገናኘት ይቻላል:</b>
1. Log in to your EasyStock account in the browser.
2. Go to <b>Settings ⚙️ &gt; Telegram Integration</b>.
3. Click <b>"Connect Telegram"</b> to open this bot with your secure link.

<i>EasyStock — Cloud POS & Inventory for Retail.</i>
`.trim();
      await telegramClient.sendMessage(chatId, unlinkedText);
      return;
    }

    // 3. Handle Media / Photos / Invoices sent to the bot
    if (message.photo || message.document) {
      await this.handleMediaUpload(ctx, message);
      return;
    }

    // 4. Handle Persistent Mobile Bottom Keyboard Taps
    if (text.includes("Today's Summary") || text.includes("የዛሬ ማጠቃለያ")) {
      await this.handleSummaryCommand(ctx);
      return;
    }
    if (text.includes("Approvals") || text.includes("ውሳኔ የሚጠብቁ")) {
      await this.handlePendingCommand(ctx);
      return;
    }
    if (text.includes("Stock Search") || text.includes("ዕቃ መፈለጊያ")) {
      await telegramClient.sendMessage(chatId, "📦 <b>Product Search / ዕቃ መፈለጊያ</b>\nType <code>/stock &lt;item name or barcode&gt;</code>\n<i>Example:</i> <code>/stock milk</code>");
      return;
    }
    if (text.includes("Low Stock") || text.includes("ዝቅተኛ ክምችት")) {
      await this.handleLowStockAlerts(ctx);
      return;
    }
    if (text.includes("Invoices") || text.includes("ደረሰኞች")) {
      await this.handleInvoicesCommand(ctx);
      return;
    }
    if (text.includes("My Shift Sales") || text.includes("የዛሬ ሽያጬ")) {
      await this.handleMyDayCommand(ctx);
      return;
    }
    if (text.includes("Check Stock") || text.includes("ዕቃ መረጃ")) {
      await telegramClient.sendMessage(chatId, "🔍 <b>Check Stock / ዕቃ መረጃ</b>\nType <code>/checkstock &lt;item name or code&gt;</code>\n<i>Example:</i> <code>/checkstock bread</code>");
      return;
    }
    if (text.includes("Submit Request") || text.includes("ጥያቄ ላክ")) {
      await this.handleRequestCommand(ctx, "");
      return;
    }
    if (text.includes("Upload Receipt") || text.includes("ደረሰኝ ላክ")) {
      await telegramClient.sendMessage(chatId, "📸 <b>Upload Receipt / ደረሰኝ ላክ</b>\nTake a clear photo of the supplier receipt or paper delivery slip and send it here.");
      return;
    }
    if (text.includes("Help") || text.includes("መመሪያ")) {
      await telegramClient.sendMessage(chatId, buildHelpMessage(ctx));
      return;
    }

    // 5. Command Dispatching
    const [command, ...args] = text.split(" ");
    const cleanCmd = command.toLowerCase().replace(/@.+$/, ""); // strip bot username if any
    const query = args.join(" ").trim();

    switch (cleanCmd) {
      case "/start": {
        const welcome = buildWelcomeMessage(ctx);
        await telegramClient.sendMessage(chatId, welcome.text, {
          reply_markup: welcome.replyMarkup,
        });
        break;
      }

      case "/help": {
        await telegramClient.sendMessage(chatId, buildHelpMessage(ctx));
        break;
      }

      case "/summary":
      case "/today": {
        await this.handleSummaryCommand(ctx);
        break;
      }

      case "/alerts": {
        await this.handleLowStockAlerts(ctx);
        break;
      }

      case "/invoices": {
        await this.handleInvoicesCommand(ctx);
        break;
      }

      case "/myday": {
        await this.handleMyDayCommand(ctx);
        break;
      }

      case "/stock": {
        await this.handleStockCommand(ctx, query, false);
        break;
      }

      case "/checkstock": {
        await this.handleStockCommand(ctx, query, true);
        break;
      }

      case "/pending": {
        await this.handlePendingCommand(ctx);
        break;
      }

      case "/request": {
        await this.handleRequestCommand(ctx, query);
        break;
      }

      case "/disconnect": {
        await disconnectTelegramAccount(chatId);
        await telegramClient.sendMessage(
          chatId,
          "🔌 <b>Disconnected.</b> Your Telegram account has been unlinked from EasyStock. You will no longer receive notifications."
        );
        break;
      }

      default: {
        // Fallback for conversational or unrecognized text
        await telegramClient.sendMessage(
          chatId,
          `I didn't recognize that command. Type <b>/help</b> to see all available actions.\nያልታወቀ ትዕዛዝ። መመሪያ ለማየት <b>/help</b> ይጻፉ።`
        );
      }
    }
  }

  /**
   * Handles interactive button clicks (callback queries)
   */
  private async handleCallbackQuery(query: NonNullable<TelegramUpdate["callback_query"]>): Promise<void> {
    const chatId = String(query.from.id);
    const data = query.data || "";
    const messageId = query.message?.message_id;

    const ctx = await resolveTelegramContext(chatId);
    if (!ctx) {
      await telegramClient.answerCallbackQuery(query.id, "Please link your account first via EasyStock.", true);
      return;
    }

    // 1. Owner Approval of a Request
    if (data.startsWith("appr:")) {
      const requestId = data.replace("appr:", "");
      if (ctx.role !== ShopRole.SHOP_OWNER) {
        await telegramClient.answerCallbackQuery(query.id, "Only the Shop Owner can approve requests.", true);
        return;
      }

      try {
        const tenantCtx = await buildTenantContextFromBot(ctx);
        const updated = await approveRequest(tenantCtx, requestId, `Approved via Telegram by ${ctx.user?.fullName}`);

        // Update the telegram message
        if (messageId) {
          const editedText = `
✅ <b>REQUEST APPROVED / ጥያቄው ጸድቋል</b>
📌 <b>Title:</b> ${escapeHtml(updated.title)}
👤 <b>Requester:</b> ${escapeHtml(updated.requester.fullName)}
👑 <b>Approved by:</b> ${escapeHtml(ctx.user?.fullName || "Owner")}
⏰ <b>Time:</b> ${new Date().toLocaleTimeString()}

<i>Inventory ledger movement executed atomically.</i>
`.trim();
          await telegramClient.editMessageText(chatId, messageId, editedText);
        }

        await telegramClient.answerCallbackQuery(query.id, "Approved successfully!");

        // Notify requesting staff member
        await notifyRequesterDecision(updated.requesterId, updated.shopId, {
          requestTitle: updated.title,
          approved: true,
          approverName: ctx.user?.fullName || "Owner",
        });
      } catch (err: any) {
        await telegramClient.answerCallbackQuery(query.id, `Error: ${err.message}`, true);
      }
      return;
    }

    // 2. Owner Rejection of a Request
    if (data.startsWith("rejc:")) {
      const requestId = data.replace("rejc:", "");
      if (ctx.role !== ShopRole.SHOP_OWNER) {
        await telegramClient.answerCallbackQuery(query.id, "Only the Shop Owner can reject requests.", true);
        return;
      }

      try {
        const tenantCtx = await buildTenantContextFromBot(ctx);
        const updated = await rejectRequest(tenantCtx, requestId, `Rejected via Telegram by ${ctx.user?.fullName}`);

        if (messageId) {
          const editedText = `
❌ <b>REQUEST REJECTED / ጥያቄው ውድቅ ተደርጓል</b>
📌 <b>Title:</b> ${escapeHtml(updated.title)}
👑 <b>Rejected by:</b> ${escapeHtml(ctx.user?.fullName || "Owner")}
⏰ <b>Time:</b> ${new Date().toLocaleTimeString()}
`.trim();
          await telegramClient.editMessageText(chatId, messageId, editedText);
        }

        await telegramClient.answerCallbackQuery(query.id, "Request rejected.");

        // Notify requester
        await notifyRequesterDecision(updated.requesterId, updated.shopId, {
          requestTitle: updated.title,
          approved: false,
          approverName: ctx.user?.fullName || "Owner",
        });
      } catch (err: any) {
        await telegramClient.answerCallbackQuery(query.id, `Error: ${err.message}`, true);
      }
      return;
    }

    // 3. Document Action Buttons
    if (data.startsWith("doc_")) {
      const [action, docId] = data.split(":");
      const tenantCtx = await buildTenantContextFromBot(ctx);

      if (action === "doc_arc") {
        await updateDocumentStatus(tenantCtx, docId, "APPROVED", "Archived to shop files");
        if (messageId) {
          await telegramClient.editMessageText(chatId, messageId, "📁 <b>Document archived to shop files.</b>");
        }
        await telegramClient.answerCallbackQuery(query.id, "Document archived.");
      } else if (action === "doc_del") {
        await updateDocumentStatus(tenantCtx, docId, "REJECTED", "Dismissed");
        if (messageId) {
          await telegramClient.editMessageText(chatId, messageId, "🗑️ <b>Document dismissed.</b>");
        }
        await telegramClient.answerCallbackQuery(query.id, "Dismissed.");
      } else {
        await telegramClient.answerCallbackQuery(query.id, "Open EasyStock web portal to complete invoice entry.");
      }
      return;
    }

    // 4. Shortcut Command Buttons
    if (data === "cmd:summary") {
      await telegramClient.answerCallbackQuery(query.id);
      await this.handleSummaryCommand(ctx);
      return;
    }

    if (data === "cmd:myday") {
      await telegramClient.answerCallbackQuery(query.id);
      await this.handleMyDayCommand(ctx);
      return;
    }

    if (data === "cmd:pending") {
      await telegramClient.answerCallbackQuery(query.id);
      await this.handlePendingCommand(ctx);
      return;
    }

    if (data === "cmd:request") {
      await telegramClient.answerCallbackQuery(query.id);
      await this.handleRequestCommand(ctx, "");
      return;
    }

    await telegramClient.answerCallbackQuery(query.id);
  }

  /**
   * /summary — Owner Daily Sales & Revenue Report
   */
  private async handleSummaryCommand(ctx: BotContext): Promise<void> {
    const isOwner = ctx.role === ShopRole.SHOP_OWNER;
    if (!isOwner) {
      await telegramClient.sendMessage(
        ctx.chatId,
        "🔒 <b>Restricted:</b> Business-wide financial summaries are available to Shop Owners only. Use <b>/myday</b> to view your personal shift sales."
      );
      return;
    }

    const shopId = ctx.shop!.id;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const sales = await prisma.sale.findMany({
      where: {
        shopId,
        createdAt: { gte: todayStart },
      },
      include: {
        items: true,
      },
    });

    let grossSales = new Decimal(0);
    let totalCost = new Decimal(0);
    const cashierMap = new Map<string, { count: number; total: Decimal }>();

    for (const s of sales) {
      grossSales = grossSales.plus(new Decimal(s.totalAmount));
      totalCost = totalCost.plus(new Decimal(s.totalCost));

      const existing = cashierMap.get(s.cashierId) || { count: 0, total: new Decimal(0) };
      cashierMap.set(s.cashierId, {
        count: existing.count + 1,
        total: existing.total.plus(new Decimal(s.totalAmount)),
      });
    }

    const grossProfit = grossSales.minus(totalCost);

    // Resolve cashier names
    const cashierIds = Array.from(cashierMap.keys());
    const cashiers = await prisma.user.findMany({
      where: { id: { in: cashierIds } },
      select: { id: true, fullName: true },
    });

    const cashierNameMap = new Map(cashiers.map((c) => [c.id, c.fullName]));
    const cashierBreakdown = Array.from(cashierMap.entries()).map(([cid, data]) => ({
      cashierName: cashierNameMap.get(cid) || "Cashier",
      count: data.count,
      total: data.total.toFixed(2),
    }));

    const text = buildOwnerSalesSummaryMessage(ctx.shop!.name, ctx.shop!.currency, {
      totalSalesCount: sales.length,
      grossSales: grossSales.toFixed(2),
      totalCost: totalCost.toFixed(2),
      grossProfit: grossProfit.toFixed(2),
      cashierBreakdown,
    });

    await telegramClient.sendMessage(ctx.chatId, text);
  }

  /**
   * /alerts — List low stock items (Owner only)
   */
  private async handleLowStockAlerts(ctx: BotContext): Promise<void> {
    const isOwner = ctx.role === ShopRole.SHOP_OWNER;
    if (!isOwner) {
      await telegramClient.sendMessage(ctx.chatId, "🔒 Available to Shop Owners only.");
      return;
    }

    const shopId = ctx.shop!.id;
    const inventory = await prisma.inventoryItem.findMany({
      where: { shopId },
      include: {
        variant: {
          include: { product: true },
        },
      },
      take: 50,
    });

    const lowStockItems = inventory.filter((i) => i.quantity <= i.variant.reorderLevel);

    if (lowStockItems.length === 0) {
      await telegramClient.sendMessage(
        ctx.chatId,
        "✅ <b>Good news!</b> All inventory items are currently above their reorder levels.\nሁሉም የዕቃ ክምችቶች በጥሩ ደረጃ ላይ ይገኛሉ።"
      );
      return;
    }

    const lines = lowStockItems.map((i) =>
      `• <b>${escapeHtml(i.variant.product.name)} (${escapeHtml(i.variant.name)}):</b> <b>${i.quantity} units</b> (Reorder at: ${i.variant.reorderLevel})`
    ).join("\n");

    const text = `
⚠️ <b>Low Stock Alert / ዝቅተኛ ክምችት ያላቸው ዕቃዎች (${lowStockItems.length})</b>

${lines}

<i>Consider reordering soon. / እባክዎ ተጨማሪ አቅርቦት ያዘጋጁ።</i>
`.trim();

    await telegramClient.sendMessage(ctx.chatId, text);
  }

  /**
   * /invoices — View pending supplier invoices & documents
   */
  private async handleInvoicesCommand(ctx: BotContext): Promise<void> {
    const tenantCtx = await buildTenantContextFromBot(ctx);
    const docs = await listPendingDocuments(tenantCtx);

    if (docs.length === 0) {
      await telegramClient.sendMessage(
        ctx.chatId,
        "📄 <b>No pending documents. / የሚጠብቅ ሰነድ የለም።</b>\nSnap a photo of any supplier delivery note or purchase receipt to log it here."
      );
      return;
    }

    const lines = docs.map((d) =>
      `• <b>${escapeHtml(d.title)}</b> (${d.documentType}) — <i>${new Date(d.createdAt).toLocaleDateString()}</i>`
    ).join("\n");

    const text = `
📑 <b>Pending Invoices & Documents / የሚጠብቁ ሰነዶች (${docs.length})</b>

${lines}

<i>Tap an action on document cards or visit the web portal to finalize.</i>
`.trim();

    await telegramClient.sendMessage(ctx.chatId, text);
  }

  /**
   * /myday — Personal shift sales for Shopkeepers
   */
  private async handleMyDayCommand(ctx: BotContext): Promise<void> {
    const shopId = ctx.shop!.id;
    const userId = ctx.user!.id;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const sales = await prisma.sale.findMany({
      where: {
        shopId,
        cashierId: userId,
        createdAt: { gte: todayStart },
      },
    });

    let totalVolume = new Decimal(0);
    for (const s of sales) {
      totalVolume = totalVolume.plus(new Decimal(s.totalAmount));
    }

    const text = buildShopkeeperSalesMessage(
      ctx.user!.fullName,
      ctx.shop!.name,
      ctx.shop!.currency,
      {
        salesCount: sales.length,
        salesTotal: totalVolume.toFixed(2),
      }
    );

    await telegramClient.sendMessage(ctx.chatId, text);
  }

  /**
   * /stock (Owner) & /checkstock (Staff) — Product search
   */
  private async handleStockCommand(ctx: BotContext, query: string, isStaffSafe = false): Promise<void> {
    if (!query) {
      const exampleCmd = isStaffSafe ? "/checkstock" : "/stock";
      await telegramClient.sendMessage(
        ctx.chatId,
        `Please specify a product name, SKU, or barcode.\n<i>Example:</i> <code>${exampleCmd} milk</code>`
      );
      return;
    }

    const shopId = ctx.shop!.id;

    // Search product variant
    const variant = await prisma.productVariant.findFirst({
      where: {
        product: {
          organization: {
            shops: { some: { id: shopId } },
          },
          deletedAt: null,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { barcode: query },
            { sku: query },
          ],
        },
      },
      include: {
        product: true,
        inventoryItems: {
          where: { shopId },
        },
      },
    });

    if (!variant) {
      await telegramClient.sendMessage(
        ctx.chatId,
        `❌ No product found matching "<b>${escapeHtml(query)}</b>".`
      );
      return;
    }

    const currentQty = variant.inventoryItems[0]?.quantity || 0;
    const currency = ctx.shop!.currency;

    if (isStaffSafe || ctx.role === ShopRole.SHOPKEEPER) {
      // Staff view: NEVER show cost price
      const text = buildShopkeeperStockMessage({
        productName: variant.product.name,
        variantName: variant.name,
        sku: variant.sku,
        quantity: currentQty,
        sellingPrice: Number(variant.sellingPrice).toFixed(2),
        currency,
      });
      await telegramClient.sendMessage(ctx.chatId, text);
    } else {
      // Owner view: includes cost price
      const text = buildOwnerStockMessage({
        productName: variant.product.name,
        variantName: variant.name,
        sku: variant.sku,
        barcode: variant.barcode,
        quantity: currentQty,
        sellingPrice: Number(variant.sellingPrice).toFixed(2),
        costPrice: Number(variant.costPrice).toFixed(2),
        currency,
      });
      await telegramClient.sendMessage(ctx.chatId, text);
    }
  }

  /**
   * /pending — View pending approvals & documents (Owner only)
   */
  private async handlePendingCommand(ctx: BotContext): Promise<void> {
    if (ctx.role !== ShopRole.SHOP_OWNER) {
      await telegramClient.sendMessage(ctx.chatId, "🔒 Available to Shop Owners only.");
      return;
    }

    const tenantCtx = await buildTenantContextFromBot(ctx);
    const pending = await listPendingRequests(tenantCtx);

    if (pending.length === 0) {
      await telegramClient.sendMessage(
        ctx.chatId,
        "🎉 <b>All caught up!</b> There are no pending approval requests at this time."
      );
      return;
    }

    await telegramClient.sendMessage(
      ctx.chatId,
      `⏳ <b>${pending.length} Request(s) Awaiting Your Review / ውሳኔ የሚጠብቁ ጥያቄዎች:</b>`
    );

    for (const req of pending) {
      const card = buildApprovalRequestCard({
        id: req.id,
        requesterName: req.requester.fullName,
        title: req.title,
        approvalType: req.approvalType,
        notes: req.decisionNotes || undefined,
        details: req.details,
      });
      await telegramClient.sendMessage(ctx.chatId, card.text, {
        reply_markup: card.replyMarkup,
      });
    }
  }

  /**
   * /request — Submit inventory adjustment or assistance request
   */
  private async handleRequestCommand(ctx: BotContext, notes: string): Promise<void> {
    if (!notes) {
      await telegramClient.sendMessage(
        ctx.chatId,
        `📝 <b>How to submit an adjustment request:</b>\nType <code>/request &lt;product details & reason&gt;</code>\n\n<i>Example:</i>\n<code>/request 2 cartons of bottled water damaged during unloading</code>`
      );
      return;
    }

    const tenantCtx = await buildTenantContextFromBot(ctx);
    const req = await createApprovalRequest(tenantCtx, {
      approvalType: "STOCK_ADJUSTMENT",
      title: notes.slice(0, 80),
      details: {
        description: notes,
        submittedVia: "Telegram",
        submittedAt: new Date().toISOString(),
      },
      notes,
    });

    await telegramClient.sendMessage(
      ctx.chatId,
      `✅ <b>Request Submitted! / ጥያቄዎ ተልኳል</b>\nYour request has been routed to the Shop Owner for approval.`
    );

    // Notify Owner with 1-click buttons
    await notifyOwnerApprovalRequest(ctx.shop!.id, {
      id: req.id,
      requesterName: ctx.user!.fullName,
      title: req.title,
      approvalType: req.approvalType,
      notes: notes,
      details: req.details,
    });
  }

  /**
   * Ingests Photos or Document files sent to the bot (e.g. paper invoices, delivery slips)
   */
  private async handleMediaUpload(
    ctx: BotContext,
    message: NonNullable<TelegramUpdate["message"]>
  ): Promise<void> {
    const fileId = message.photo
      ? message.photo[message.photo.length - 1].file_id // highest res
      : message.document?.file_id;

    if (!fileId) return;

    const mimeType = message.document?.mime_type || "image/jpeg";
    const fileSize = message.photo
      ? message.photo[message.photo.length - 1].file_size
      : message.document?.file_size;

    const caption = message.caption?.trim() || "";
    const title = caption ? caption.slice(0, 60) : `Invoice/Receipt (${new Date().toLocaleDateString()})`;

    const tenantCtx = await buildTenantContextFromBot(ctx);
    const doc = await createBusinessDocument(tenantCtx, {
      title,
      fileId,
      mimeType,
      fileSize,
      documentType: "PURCHASE_INVOICE",
      notes: caption || undefined,
    });

    await telegramClient.sendMessage(
      ctx.chatId,
      `📄 <b>Document Received! / ሰነዱ ደርሷል</b>\nSaved as <b>${escapeHtml(title)}</b>. Notifying the Shop Owner for processing.`
    );

    // Alert Owner
    await notifyOwnerNewDocument(ctx.shop!.id, {
      id: doc.id,
      uploaderName: ctx.user!.fullName,
      title: doc.title,
      documentType: doc.documentType,
      notes: caption || undefined,
    });
  }
}

export const telegramRouter = new TelegramRouter();
