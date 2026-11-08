import { TelegramUpdate, BotContext, MessageCategory } from "./types";
import { telegramClient } from "./client";
import {
  resolveTelegramContext,
  verifyAndLinkTelegramAccount,
  disconnectTelegramAccount,
  buildTenantContextFromBot,
  updateTelegramLanguage,
  updateTelegramNotificationPreferences,
} from "./auth";
import {
  buildWelcomeMessage,
  buildHelpMessage,
  buildOwnerSalesSummaryMessage,
  buildShopkeeperSalesMessage,
  buildOwnerStockMessage,
  buildShopkeeperStockMessage,
  buildApprovalRequestCard,
  buildInteractiveMenuCard,
  buildNotificationPreferencesCard,
  buildLanguageSelectionCard,
  buildRoleReplyKeyboard,
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
  listUserRequests,
} from "./services/approval-service";
import {
  createBusinessDocument,
  updateDocumentStatus,
  listPendingDocuments,
} from "./services/document-service";
import {
  createShopMessage,
  getShopkeeperRecipients,
  getOwnerRecipients,
  listShopMessages,
} from "./services/communication-service";
import {
  getDailyBusinessSummaryData,
  formatDailyBusinessSummary,
} from "./services/summary-service";
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

    // 4. Handle Persistent Mobile Bottom Keyboard Taps (Bilingual English & Amharic)
    const isOwner = ctx.role === ShopRole.SHOP_OWNER;

    if (
      text.includes("Business Overview") ||
      text.includes("የንግድ ማጠቃለያ") ||
      text.includes("Today's Summary") ||
      text.includes("የዛሬ ማጠቃለያ")
    ) {
      await this.handleSummaryCommand(ctx);
      return;
    }

    if (
      text.includes("Pending Approvals") ||
      text.includes("Approvals") ||
      text.includes("ውሳኔ የሚጠብቁ")
    ) {
      await this.handlePendingCommand(ctx);
      return;
    }

    if (text.includes("Stock Search") || text.includes("ዕቃ መፈለጊያ") || text.includes("ዕቃ ፈልግ")) {
      const searchPrompt = ctx.language === "am"
        ? "📦 <b>የዕቃ ክምችትና ዋጋ መፈለጊያ / Product Search</b>\nለመፈለግ <code>/stock &lt;የዕቃ ስም ወይም ባርኮድ&gt;</code> ብለው ይጻፉ።\n<i>ምሳሌ:</i> <code>/stock ዘይት</code>"
        : "📦 <b>Product Search / ዕቃ መፈለጊያ</b>\nType <code>/stock &lt;item name or barcode&gt;</code>\n<i>Example:</i> <code>/stock milk</code>";
      await telegramClient.sendMessage(chatId, searchPrompt);
      return;
    }

    if (text.includes("Low Stock") || text.includes("ዝቅተኛ ክምችት")) {
      await this.handleLowStockAlerts(ctx);
      return;
    }

    if (text.includes("Purchase Invoices") || text.includes("Invoices") || text.includes("ደረሰኞች")) {
      await this.handleInvoicesCommand(ctx);
      return;
    }

    if (
      text.includes("Communicate with Staff") ||
      text.includes("ከሰራተኞች ጋር መነጋገርያ") ||
      text.includes("Message Staff")
    ) {
      await this.handleMsgCommand(ctx, "");
      return;
    }

    if (text.includes("Notifications") || text.includes("ማሳወቂያዎች")) {
      await this.handleNotifsCommand(ctx);
      return;
    }

    if (text.includes("Settings") || text.includes("ቅንብሮች")) {
      await this.handleSettingsMenu(ctx);
      return;
    }

    if (text.includes("My Shift Sales") || text.includes("My Sales") || text.includes("የዛሬ ሽያጬ")) {
      await this.handleMyDayCommand(ctx);
      return;
    }

    if (text.includes("Check Stock") || text.includes("ዕቃ መረጃ") || text.includes("ዕቃ ዋጋና ብዛት")) {
      const checkPrompt = ctx.language === "am"
        ? "🔍 <b>የዕቃ ዋጋና ያለ ብዛት ማረጋገጫ / Check Stock</b>\n<code>/checkstock &lt;የዕቃ ስም ወይም ባርኮድ&gt;</code> ብለው ይጻፉ።\n<i>ምሳሌ:</i> <code>/checkstock ዳቦ</code>"
        : "🔍 <b>Check Stock / ዕቃ መረጃ</b>\nType <code>/checkstock &lt;item name or code&gt;</code>\n<i>Example:</i> <code>/checkstock bread</code>";
      await telegramClient.sendMessage(chatId, checkPrompt);
      return;
    }

    if (text.includes("Send Request") || text.includes("Submit Request") || text.includes("ጥያቄ ላክ")) {
      await this.handleRequestCommand(ctx, "");
      return;
    }

    if (text.includes("My Requests") || text.includes("ጥያቄዎቼ")) {
      await this.handleMyRequestsCommand(ctx);
      return;
    }

    if (text.includes("Contact Owner") || text.includes("ባለቤቱን አግኝ")) {
      await this.handleMsgOwnerCommand(ctx, "");
      return;
    }

    if (text.includes("Send Document") || text.includes("Upload Receipt") || text.includes("ደረሰኝ ላክ")) {
      const docPrompt = ctx.language === "am"
        ? "📸 <b>ደረሰኝ ላክ / Upload Receipt</b>\nየአቅራቢውን ደረሰኝ ወይም የርክክብ ወረቀት ፎቶ በማንሳት እዚህ ይላኩት። በቀጥታ ለባለቤቱ ይቀርባል።"
        : "📸 <b>Upload Receipt / ደረሰኝ ላክ</b>\nTake a clear photo of the supplier receipt or delivery slip and send it here.";
      await telegramClient.sendMessage(chatId, docPrompt);
      return;
    }

    if (text.includes("Sales Notifications") || text.includes("የሽያጭ ማሳወቂያዎች")) {
      const notifInfo = ctx.language === "am"
        ? "🔔 <b>የሽያጭ ማሳወቂያዎች</b>\nእያንዳንዱ ሽያጭ ሲጠናቀቅ በሲስተሙ ይመዘገባል። የፈረቃዎን ሽያጭ በማንኛውም ጊዜ በ <b>/myday</b> ማየት ይችላሉ።"
        : "🔔 <b>Sales Notifications</b>\nAll sales you complete are immediately tracked. Check your shift performance anytime with <b>/myday</b>.";
      await telegramClient.sendMessage(chatId, notifInfo);
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

      case "/menu": {
        const menu = buildInteractiveMenuCard(ctx);
        await telegramClient.sendMessage(chatId, menu.text, {
          reply_markup: menu.replyMarkup,
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

      case "/myrequests": {
        await this.handleMyRequestsCommand(ctx);
        break;
      }

      case "/msg": {
        await this.handleMsgCommand(ctx, query);
        break;
      }

      case "/msgowner": {
        await this.handleMsgOwnerCommand(ctx, query);
        break;
      }

      case "/notifs": {
        await this.handleNotifsCommand(ctx);
        break;
      }

      case "/language": {
        await this.handleLanguageCommand(ctx);
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

      case "/syshealth": {
        await this.handleSysHealthCommand(ctx);
        break;
      }

      case "/broadcast": {
        await this.handleBroadcastCommand(ctx, query);
        break;
      }

      case "/adminhelp": {
        await this.handleAdminHelpCommand(ctx);
        break;
      }

      default: {
        await telegramClient.sendMessage(
          chatId,
          ctx.language === "am"
            ? `ያልታወቀ ትዕዛዝ። መመሪያ ለማየት <b>/help</b> ወይም ዋና ሜኑ ለማየት <b>/menu</b> ይጻፉ።`
            : `I didn't recognize that command. Type <b>/help</b> for commands or <b>/menu</b> to open the main menu.`
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

    // 1. Notification Preference Toggles (notif_tog:<key>)
    if (data.startsWith("notif_tog:")) {
      const key = data.replace("notif_tog:", "");
      const currentVal = ctx.telegramAccount?.notificationPreferences?.[key as keyof typeof ctx.telegramAccount.notificationPreferences] !== false;
      const res = await updateTelegramNotificationPreferences(chatId, key, !currentVal);

      if (messageId && res.success) {
        const updatedCard = buildNotificationPreferencesCard(res.preferences as any, ctx.language);
        await telegramClient.editMessageReplyMarkup(chatId, messageId, updatedCard.replyMarkup);
      }
      await telegramClient.answerCallbackQuery(query.id, `${key}: ${!currentVal ? "ON" : "OFF"}`);
      return;
    }

    // 2. Language Selection (lang:en, lang:am)
    if (data.startsWith("lang:")) {
      const lang = data.replace("lang:", "") as "en" | "am";
      await updateTelegramLanguage(chatId, lang);

      const replyKeyboard = buildRoleReplyKeyboard(ctx.role || ShopRole.SHOPKEEPER, lang);
      const confirmText = lang === "am"
        ? "✅ <b>ቋንቋው በተሳካ ሁኔታ ወደ አማርኛ ተቀይሯል።</b>"
        : "✅ <b>Language successfully updated to English.</b>";

      await telegramClient.sendMessage(chatId, confirmText, { reply_markup: replyKeyboard });
      await telegramClient.answerCallbackQuery(query.id, lang === "am" ? "አማርኛ ተመርጧል" : "English selected");
      return;
    }

    // 3. Owner Approval of a Request (appr:<requestId>)
    if (data.startsWith("appr:")) {
      const requestId = data.replace("appr:", "");
      try {
        const tenantCtx = await buildTenantContextFromBot(ctx);
        const updated = await approveRequest(tenantCtx, requestId, `Approved via Telegram by ${ctx.user?.fullName}`);

        if (messageId) {
          const editedText = `
✅ <b>REQUEST APPROVED / ጥያቄው ተፈቅዷል</b>
🏷️ <b>Ref:</b> <code>${updated.referenceCode}</code>
📌 <b>Title:</b> ${escapeHtml(updated.title)}
👑 <b>Approved by:</b> ${escapeHtml(ctx.user?.fullName || "Owner")}
⏰ <b>Time:</b> ${new Date().toLocaleTimeString()}
`.trim();
          await telegramClient.editMessageText(chatId, messageId, editedText);
        }

        await telegramClient.answerCallbackQuery(query.id, "Request approved!");

        // Notify requester
        await notifyRequesterDecision(updated.requesterId, updated.shopId, {
          referenceCode: updated.referenceCode,
          requestTitle: updated.title,
          approved: true,
          approverName: ctx.user?.fullName || "Owner",
        });
      } catch (err: any) {
        await telegramClient.answerCallbackQuery(query.id, `Error: ${err.message}`, true);
      }
      return;
    }

    // 4. Owner Rejection of a Request (rejc:<requestId>)
    if (data.startsWith("rejc:")) {
      const requestId = data.replace("rejc:", "");
      try {
        const tenantCtx = await buildTenantContextFromBot(ctx);
        const updated = await rejectRequest(tenantCtx, requestId, `Rejected via Telegram by ${ctx.user?.fullName}`);

        if (messageId) {
          const editedText = `
❌ <b>REQUEST REJECTED / ጥያቄው ውድቅ ተደርጓል</b>
🏷️ <b>Ref:</b> <code>${updated.referenceCode}</code>
📌 <b>Title:</b> ${escapeHtml(updated.title)}
👑 <b>Rejected by:</b> ${escapeHtml(ctx.user?.fullName || "Owner")}
⏰ <b>Time:</b> ${new Date().toLocaleTimeString()}
`.trim();
          await telegramClient.editMessageText(chatId, messageId, editedText);
        }

        await telegramClient.answerCallbackQuery(query.id, "Request rejected.");

        // Notify requester
        await notifyRequesterDecision(updated.requesterId, updated.shopId, {
          referenceCode: updated.referenceCode,
          requestTitle: updated.title,
          approved: false,
          approverName: ctx.user?.fullName || "Owner",
        });
      } catch (err: any) {
        await telegramClient.answerCallbackQuery(query.id, `Error: ${err.message}`, true);
      }
      return;
    }

    // 5. Document Action Buttons
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

    // 6. Direct Message Prompts
    if (data.startsWith("msg_to:")) {
      const targetUserId = data.replace("msg_to:", "");
      await telegramClient.answerCallbackQuery(query.id);
      await telegramClient.sendMessage(
        chatId,
        `💬 <b>Direct Message to Staff:</b>\nType: <code>/msg ${targetUserId} &lt;your message&gt;</code>`
      );
      return;
    }

    if (data.startsWith("msg_rep:")) {
      const replyUserId = data.replace("msg_rep:", "");
      await telegramClient.answerCallbackQuery(query.id);
      await telegramClient.sendMessage(
        chatId,
        `↩️ <b>Reply:</b>\nType: <code>/msg ${replyUserId} &lt;your reply message&gt;</code>`
      );
      return;
    }

    // 7. Shortcut Command Buttons
    if (data === "cmd:summary") {
      await telegramClient.answerCallbackQuery(query.id);
      await this.handleSummaryCommand(ctx);
      return;
    }

    if (data === "cmd:pending") {
      await telegramClient.answerCallbackQuery(query.id);
      await this.handlePendingCommand(ctx);
      return;
    }

    if (data === "cmd:alerts") {
      await telegramClient.answerCallbackQuery(query.id);
      await this.handleLowStockAlerts(ctx);
      return;
    }

    if (data === "cmd:invoices") {
      await telegramClient.answerCallbackQuery(query.id);
      await this.handleInvoicesCommand(ctx);
      return;
    }

    if (data === "cmd:myday") {
      await telegramClient.answerCallbackQuery(query.id);
      await this.handleMyDayCommand(ctx);
      return;
    }

    if (data === "cmd:myrequests") {
      await telegramClient.answerCallbackQuery(query.id);
      await this.handleMyRequestsCommand(ctx);
      return;
    }

    if (data === "cmd:msg_staff") {
      await telegramClient.answerCallbackQuery(query.id);
      await this.handleMsgCommand(ctx, "");
      return;
    }

    if (data === "cmd:broadcast_staff") {
      await telegramClient.answerCallbackQuery(query.id);
      await telegramClient.sendMessage(
        chatId,
        "📢 <b>Staff Broadcast Announcement:</b>\nType <code>/msg all &lt;announcement text&gt;</code>\n\n<i>Example:</i> <code>/msg all Staff meeting today at 6:00 PM.</code>"
      );
      return;
    }

    if (data === "cmd:msg_owner") {
      await telegramClient.answerCallbackQuery(query.id);
      await this.handleMsgOwnerCommand(ctx, "");
      return;
    }

    if (data === "cmd:notifs") {
      await telegramClient.answerCallbackQuery(query.id);
      await this.handleNotifsCommand(ctx);
      return;
    }

    if (data === "cmd:language") {
      await telegramClient.answerCallbackQuery(query.id);
      await this.handleLanguageCommand(ctx);
      return;
    }

    if (data === "cmd:help") {
      await telegramClient.answerCallbackQuery(query.id);
      await telegramClient.sendMessage(chatId, buildHelpMessage(ctx));
      return;
    }

    if (data === "cmd:menu") {
      await telegramClient.answerCallbackQuery(query.id);
      const menu = buildInteractiveMenuCard(ctx);
      await telegramClient.sendMessage(chatId, menu.text, { reply_markup: menu.replyMarkup });
      return;
    }

    if (data === "cmd:stock_prompt") {
      await telegramClient.answerCallbackQuery(query.id);
      await telegramClient.sendMessage(
        chatId,
        "📦 <b>Stock Search:</b>\nType <code>/stock &lt;item name or barcode&gt;</code>"
      );
      return;
    }

    if (data === "cmd:checkstock_prompt") {
      await telegramClient.answerCallbackQuery(query.id);
      await telegramClient.sendMessage(
        chatId,
        "🔍 <b>Check Stock:</b>\nType <code>/checkstock &lt;item name or code&gt;</code>"
      );
      return;
    }

    if (data === "cmd:request_prompt") {
      await telegramClient.answerCallbackQuery(query.id);
      await this.handleRequestCommand(ctx, "");
      return;
    }

    if (data === "cmd:upload_prompt") {
      await telegramClient.answerCallbackQuery(query.id);
      await telegramClient.sendMessage(
        chatId,
        "📸 <b>Send Document:</b>\nTake a clear photo of your paper receipt or delivery note and send it here."
      );
      return;
    }

    if (data.startsWith("cmd:stock_")) {
      const sku = data.replace("cmd:stock_", "");
      await telegramClient.answerCallbackQuery(query.id);
      await this.handleStockCommand(ctx, sku, ctx.role !== ShopRole.SHOP_OWNER);
      return;
    }

    await telegramClient.answerCallbackQuery(query.id);
  }

  /**
   * /summary — Owner Daily Sales & Revenue Report (Ethiopian Birr & Best-sellers)
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

    // Generate comprehensive summary
    const summaryData = await getDailyBusinessSummaryData(shopId, ctx.shop);
    const businessSummaryText = formatDailyBusinessSummary(summaryData, ctx.language);

    const salesReportText = buildOwnerSalesSummaryMessage(ctx.shop!.name, ctx.shop!.currency, {
      totalSalesCount: sales.length,
      grossSales: grossSales.toFixed(2),
      totalCost: totalCost.toFixed(2),
      grossProfit: grossProfit.toFixed(2),
      cashierBreakdown,
    });

    // Send formatted sales report (contains "Today's Sales Report") followed by operational status
    await telegramClient.sendMessage(ctx.chatId, salesReportText);
    await telegramClient.sendMessage(ctx.chatId, businessSummaryText);
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
    if (ctx.role !== ShopRole.SHOP_OWNER) {
      await telegramClient.sendMessage(ctx.chatId, "🔒 Available to Shop Owners only.");
      return;
    }

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
      },
      ctx.language
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
      }, ctx.language);
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
      }, ctx.language);
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
        referenceCode: req.referenceCode,
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
   * /request — Submit inventory adjustment or assistance request (Shopkeeper)
   */
  private async handleRequestCommand(ctx: BotContext, notes: string): Promise<void> {
    if (!notes) {
      const prompt = ctx.language === "am"
        ? `📝 <b>የክምችት ማስተካከያ ጥያቄ ማቅረቢያ:</b>\n<code>/request &lt;ዝርዝር መግለጫና ምክንያት&gt;</code> ብለው ይጻፉ።\n\n<i>ምሳሌ:</i>\n<code>/request 2 ማሸጊያ ውሃ ሲራገፍ ተሰብሯል</code>`
        : `📝 <b>How to submit an adjustment request:</b>\nType <code>/request &lt;product details & reason&gt;</code>\n\n<i>Example:</i>\n<code>/request 2 cartons of bottled water damaged during unloading</code>`;
      await telegramClient.sendMessage(ctx.chatId, prompt);
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

    const successText = ctx.language === "am"
      ? `✅ <b>ጥያቄዎ ተልኳል! / Request Submitted</b>\n🏷️ <b>መለያ:</b> <code>${req.referenceCode}</code>\nጥያቄዎ ውሳኔ እንዲያገኝ በቀጥታ ለሱቁ ባለቤት ደርሷል።`
      : `✅ <b>Request Submitted! / ጥያቄዎ ተልኳል</b>\n🏷️ <b>Ref:</b> <code>${req.referenceCode}</code>\nYour request has been routed to the Shop Owner for approval.`;

    await telegramClient.sendMessage(ctx.chatId, successText);

    // Notify Owner with 1-click buttons
    await notifyOwnerApprovalRequest(ctx.shop!.id, {
      id: req.id,
      referenceCode: req.referenceCode,
      requesterName: ctx.user!.fullName,
      title: req.title,
      approvalType: req.approvalType,
      notes: notes,
      details: req.details,
    });
  }

  /**
   * /myrequests — Track status of requests submitted by the shopkeeper
   */
  private async handleMyRequestsCommand(ctx: BotContext): Promise<void> {
    const tenantCtx = await buildTenantContextFromBot(ctx);
    const requests = await listUserRequests(tenantCtx);

    if (requests.length === 0) {
      await telegramClient.sendMessage(
        ctx.chatId,
        ctx.language === "am"
          ? "📋 ምንም ያቀረቧቸው ጥያቄዎች የሉም። አዲስ ጥያቄ ለማቅረብ <b>/request</b> ይጠቀሙ።"
          : "📋 You have not submitted any requests yet. Use <b>/request</b> to submit one."
      );
      return;
    }

    const statusBadge: Record<string, string> = {
      PENDING: "⏳ PENDING / የሚጠብቅ",
      APPROVED: "✅ APPROVED / ተፈቅዷል",
      REJECTED: "❌ REJECTED / ውድቅ የተደረገ",
      COMPLETED: "🏁 COMPLETED / የተጠናቀቀ",
      CANCELLED: "🚫 CANCELLED / የተሰረዘ",
    };

    const lines = requests.map((r) =>
      `• <code>${r.referenceCode}</code> — <b>${escapeHtml(r.title)}</b>\n  └ Status: <b>${statusBadge[r.status] || r.status}</b> (${new Date(r.createdAt).toLocaleDateString()})`
    ).join("\n\n");

    const text = `
📋 <b>My Submitted Requests / ያቀረቧቸው ጥያቄዎች (${requests.length})</b>

${lines}
`.trim();

    await telegramClient.sendMessage(ctx.chatId, text);
  }

  /**
   * /msg — Owner communication with staff (individual message or staff broadcast)
   */
  private async handleMsgCommand(ctx: BotContext, query: string): Promise<void> {
    if (ctx.role !== ShopRole.SHOP_OWNER) {
      await telegramClient.sendMessage(
        ctx.chatId,
        "🔒 This command is for Shop Owners. Use <b>/msgowner &lt;text&gt;</b> to contact the Owner."
      );
      return;
    }

    const tenantCtx = await buildTenantContextFromBot(ctx);

    // If query starts with "all ", broadcast announcement to all staff
    if (query.toLowerCase().startsWith("all ")) {
      const content = query.slice(4).trim();
      if (!content) {
        await telegramClient.sendMessage(
          ctx.chatId,
          "📢 Please provide the announcement text.\n<i>Example:</i> <code>/msg all Inventory count scheduled for Friday evening.</code>"
        );
        return;
      }

      const msg = await createShopMessage(tenantCtx, {
        recipientId: null, // broadcast
        category: "GENERAL",
        content,
      });

      await telegramClient.sendMessage(
        ctx.chatId,
        `📢 <b>Staff Announcement Broadcast!</b>\n🏷️ <b>Ref:</b> <code>${msg.referenceCode}</code>\nDispatched to all active shopkeepers.`
      );
      return;
    }

    // Direct message syntax: /msg <userId> <content>
    const parts = query.split(" ");
    if (parts.length >= 2 && parts[0].length >= 10) {
      const targetUserId = parts[0];
      const content = parts.slice(1).join(" ").trim();

      const msg = await createShopMessage(tenantCtx, {
        recipientId: targetUserId,
        category: "GENERAL",
        content,
      });

      await telegramClient.sendMessage(
        ctx.chatId,
        `💬 <b>Message Sent!</b>\n🏷️ <b>Ref:</b> <code>${msg.referenceCode}</code>\nDelivered directly to staff member.`
      );
      return;
    }

    // Otherwise, show active shopkeepers inline selection menu
    const staffMembers = await getShopkeeperRecipients(ctx.shop!.id);

    if (staffMembers.length === 0) {
      await telegramClient.sendMessage(
        ctx.chatId,
        "👥 <b>No Staff Connected:</b> None of your shopkeepers have linked their Telegram account yet.\nStaff members can link in <b>Settings &gt; Telegram</b>."
      );
      return;
    }

    const buttons = staffMembers.map((s) => [
      {
        text: `👤 ${escapeHtml(s.fullName || "Staff")}`,
        callback_data: `msg_to:${s.userId}`,
      },
    ]);

    buttons.unshift([
      {
        text: "📢 Broadcast Announcement to All Staff / ለሁሉም ሰራተኞች",
        callback_data: "cmd:broadcast_staff",
      },
    ]);

    await telegramClient.sendMessage(
      ctx.chatId,
      "💬 <b>Select a Staff Member to Message / ሰራተኛ ይምረጡ:</b>",
      {
        reply_markup: { inline_keyboard: buttons },
      }
    );
  }

  /**
   * /msgowner — Shopkeeper direct message to Shop Owner
   */
  private async handleMsgOwnerCommand(ctx: BotContext, query: string): Promise<void> {
    if (!query) {
      const prompt = ctx.language === "am"
        ? `💬 <b>ለሱቅ ባለቤት መልዕክት መላኪያ:</b>\n<code>/msgowner &lt;መልዕክትዎ&gt;</code> ብለው ይጻፉ።\n\n<i>ምሳሌ:</i>\n<code>/msgowner ደንበኛ 5 ካርቶን ኩኪስ በጅምላ ቅናሽ ይፈልጋሉ።</code>`
        : `💬 <b>Message the Shop Owner:</b>\nType <code>/msgowner &lt;your note or question&gt;</code>\n\n<i>Example:</i>\n<code>/msgowner Customer is asking for bulk pricing on 5 boxes of biscuits.</code>`;
      await telegramClient.sendMessage(ctx.chatId, prompt);
      return;
    }

    const owners = await getOwnerRecipients(ctx.shop!.id);
    const targetOwnerId = owners[0]?.userId || null;

    const tenantCtx = await buildTenantContextFromBot(ctx);
    const msg = await createShopMessage(tenantCtx, {
      recipientId: targetOwnerId,
      category: "GENERAL",
      content: query,
    });

    const confirm = ctx.language === "am"
      ? `✅ <b>መልዕክትዎ ለባለቤቱ ተልኳል!</b>\n🏷️ <b>መለያ:</b> <code>${msg.referenceCode}</code>`
      : `✅ <b>Your message has been delivered to the Shop Owner!</b>\n🏷️ <b>Ref:</b> <code>${msg.referenceCode}</code>`;

    await telegramClient.sendMessage(ctx.chatId, confirm);
  }

  /**
   * /notifs — View & configure notification preferences
   */
  private async handleNotifsCommand(ctx: BotContext): Promise<void> {
    const prefs = ctx.telegramAccount?.notificationPreferences || {};
    const card = buildNotificationPreferencesCard(prefs, ctx.language);
    await telegramClient.sendMessage(ctx.chatId, card.text, {
      reply_markup: card.replyMarkup,
    });
  }

  /**
   * /language — Switch bot language
   */
  private async handleLanguageCommand(ctx: BotContext): Promise<void> {
    const card = buildLanguageSelectionCard();
    await telegramClient.sendMessage(ctx.chatId, card.text, {
      reply_markup: card.replyMarkup,
    });
  }

  /**
   * Settings menu
   */
  private async handleSettingsMenu(ctx: BotContext): Promise<void> {
    const isAmharic = ctx.language === "am";
    const text = isAmharic
      ? `⚙️ <b>ቅንብሮች / Settings</b>\nየማሳወቂያ ምርጫዎችን ወይም ቋንቋን ለመቀየር ከታች ካሉት አንዱን ይምረጡ:`
      : `⚙️ <b>EasyStock Telegram Settings</b>\nConfigure your notifications or switch language below:`;

    const replyMarkup = {
      inline_keyboard: [
        [
          { text: "🔔 Notifications / ማሳወቂያዎች", callback_data: "cmd:notifs" },
          { text: "🌐 Language / ቋንቋ", callback_data: "cmd:language" },
        ],
        [
          { text: "🔌 Disconnect / መለያ ማቋረጥ", callback_data: "cmd:disconnect_prompt" },
        ],
      ],
    };

    await telegramClient.sendMessage(ctx.chatId, text, { reply_markup: replyMarkup });
  }

  /**
   * /syshealth — Platform Administrator Technical Health Check
   */
  private async handleSysHealthCommand(ctx: BotContext): Promise<void> {
    if (ctx.user?.platformRole !== "SUPER_ADMIN") {
      await telegramClient.sendMessage(
        ctx.chatId,
        "🔒 <b>Access Denied:</b> This command is restricted to Platform Administrators."
      );
      return;
    }

    const totalActiveAccounts = await prisma.telegramAccount.count({
      where: { isActive: true },
    });
    const totalPendingApprovals = await prisma.approvalRequest.count({
      where: { status: "PENDING" },
    });
    const totalDocuments = await prisma.businessDocument.count();

    const shopIdsWithTelegram = await prisma.telegramAccount.findMany({
      where: { isActive: true },
      select: { shopId: true },
      distinct: ["shopId"],
    });

    const webhook = await telegramClient.getWebhookInfo();
    const uptimeMinutes = Math.floor(process.uptime() / 60);
    const memMb = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);

    const text = `
🩺 <b>EasyStock Platform Health & Bot Diagnostics</b>

⏱️ <b>Uptime:</b> ${uptimeMinutes} minutes
💾 <b>Memory Usage:</b> ${memMb} MB
⚙️ <b>Node Version:</b> ${process.version}

🤖 <b>Telegram Integration:</b>
• <b>Active Telegram Accounts:</b> ${totalActiveAccounts}
• <b>Connected Shops:</b> ${shopIdsWithTelegram.length}
• <b>Pending Approvals in Queue:</b> ${totalPendingApprovals}
• <b>Total Documents Ingested:</b> ${totalDocuments}
• <b>Webhook Status:</b> ${webhook?.url ? "✅ Active" : "⚠️ Not configured / Polling"}

🛡️ <i>Zero-Impersonation Status: Active (Customer business data remains strictly isolated)</i>
`.trim();

    await telegramClient.sendMessage(ctx.chatId, text);
  }

  /**
   * /broadcast <message> — Platform Administrator System Announcement
   */
  private async handleBroadcastCommand(ctx: BotContext, messageText: string): Promise<void> {
    if (ctx.user?.platformRole !== "SUPER_ADMIN") {
      await telegramClient.sendMessage(
        ctx.chatId,
        "🔒 <b>Access Denied:</b> This command is restricted to Platform Administrators."
      );
      return;
    }

    if (!messageText) {
      await telegramClient.sendMessage(
        ctx.chatId,
        "📢 <b>Broadcast Command:</b>\nUsage: <code>/broadcast &lt;announcement text&gt;</code>\n\n<i>Example:</i> <code>/broadcast Scheduled platform maintenance tonight at 11:00 PM EAT.</code>"
      );
      return;
    }

    const accounts = await prisma.telegramAccount.findMany({
      where: { isActive: true },
      select: { telegramChatId: true },
    });

    const uniqueChatIds = Array.from(new Set(accounts.map((a) => a.telegramChatId)));

    const announcement = `
📢 <b>EASYSTOCK SYSTEM ANNOUNCEMENT / የስርዓት ማስታወቂያ</b>

${escapeHtml(messageText)}

<i>— EasyStock Platform Operations</i>
`.trim();

    let dispatchedCount = 0;
    for (const targetChatId of uniqueChatIds) {
      try {
        await telegramClient.sendMessage(targetChatId, announcement);
        dispatchedCount++;
      } catch (err) {
        console.error(`[TelegramRouter] Broadcast delivery error to ${targetChatId}:`, err);
      }
    }

    await telegramClient.sendMessage(
      ctx.chatId,
      `✅ <b>Broadcast Dispatched:</b> Successfully sent announcement to <b>${dispatchedCount}</b> active Telegram account(s).`
    );
  }

  /**
   * /adminhelp — Platform Administrator Guide & Privacy Notice
   */
  private async handleAdminHelpCommand(ctx: BotContext): Promise<void> {
    if (ctx.user?.platformRole !== "SUPER_ADMIN") {
      await telegramClient.sendMessage(
        ctx.chatId,
        "🔒 <b>Access Denied:</b> This command is restricted to Platform Administrators."
      );
      return;
    }

    const text = `
👑 <b>Platform Administrator Commands:</b>

• <code>/syshealth</code> — Bot health metrics, uptime, memory, and webhook status
• <code>/broadcast &lt;message&gt;</code> — Send global system announcement to all active Telegram accounts
• <code>/adminhelp</code> — Show this administrative command guide

🛡️ <b>Zero-Impersonation Policy:</b>
Platform administrators supervise technical health and platform infrastructure. Customer business records, shift totals, and financial summaries are protected by multi-tenant data boundaries and require explicit shop owner credentials.
`.trim();

    await telegramClient.sendMessage(ctx.chatId, text);
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
