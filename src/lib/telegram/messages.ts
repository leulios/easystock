import {
  BotContext,
  TelegramInlineKeyboardMarkup,
  TelegramReplyKeyboardMarkup,
  NotificationPreferences,
} from "./types";
import { ShopRole } from "@prisma/client";

/**
 * Escapes characters for HTML parse mode in Telegram
 */
export function escapeHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Builds the persistent mobile bottom keyboard based on user role and language
 */
export function buildRoleReplyKeyboard(
  role: ShopRole,
  language: "en" | "am" = "en"
): TelegramReplyKeyboardMarkup {
  const isAmharic = language === "am";

  if (role === ShopRole.SHOP_OWNER) {
    if (isAmharic) {
      return {
        keyboard: [
          [{ text: "📊 የንግድ ማጠቃለያ" }, { text: "⏳ ውሳኔ የሚጠብቁ" }],
          [{ text: "📦 ዕቃ መፈለጊያ" }, { text: "⚠️ ዝቅተኛ ክምችት" }],
          [{ text: "📄 ደረሰኞች" }, { text: "💬 ከሰራተኞች ጋር መነጋገርያ" }],
          [{ text: "🔔 ማሳወቂያዎች" }, { text: "⚙️ ቅንብሮች" }],
          [{ text: "📖 መመሪያ" }],
        ],
        resize_keyboard: true,
        is_persistent: true,
      };
    }
    return {
      keyboard: [
        [{ text: "📊 Business Overview" }, { text: "⏳ Pending Approvals" }],
        [{ text: "📦 Stock Search" }, { text: "⚠️ Low Stock" }],
        [{ text: "📄 Purchase Invoices" }, { text: "💬 Communicate with Staff" }],
        [{ text: "🔔 Notifications" }, { text: "⚙️ Settings" }],
        [{ text: "📖 Help" }],
      ],
      resize_keyboard: true,
      is_persistent: true,
    };
  } else {
    // Shopkeeper / Sales Staff
    if (isAmharic) {
      return {
        keyboard: [
          [{ text: "🛍️ የዛሬ ሽያጬ" }, { text: "🔍 ዕቃ መረጃ" }],
          [{ text: "📝 ጥያቄ ላክ" }, { text: "📋 ጥያቄዎቼ" }],
          [{ text: "👑 ባለቤቱን አግኝ" }, { text: "📸 ደረሰኝ ላክ" }],
          [{ text: "🔔 የሽያጭ ማሳወቂያዎች" }, { text: "📖 መመሪያ" }],
        ],
        resize_keyboard: true,
        is_persistent: true,
      };
    }
    return {
      keyboard: [
        [{ text: "🛍️ My Sales" }, { text: "🔍 Check Stock" }],
        [{ text: "📝 Send Request" }, { text: "📋 My Requests" }],
        [{ text: "👑 Contact Owner" }, { text: "📸 Send Document" }],
        [{ text: "🔔 Sales Notifications" }, { text: "📖 Help" }],
      ],
      resize_keyboard: true,
      is_persistent: true,
    };
  }
}

/**
 * Builds the interactive inline menu card for common one-tap actions
 */
export function buildInteractiveMenuCard(
  ctx: BotContext
): { text: string; replyMarkup: TelegramInlineKeyboardMarkup } {
  const isOwner = ctx.role === ShopRole.SHOP_OWNER;
  const isAmharic = ctx.language === "am";
  const shopName = escapeHtml(ctx.shop?.name || "EasyStock");

  if (isOwner) {
    const text = isAmharic
      ? `👑 <b>የባለቤት ዋና መቆጣጠሪያ / Owner Center — ${shopName}</b>\nይምረጡ ወይም ከታች ያሉትን ቁልፎች ይጠቀሙ:`
      : `👑 <b>EasyStock Owner Communication & Action Center — ${shopName}</b>\nSelect an action or use the persistent keyboard below:`;

    const replyMarkup: TelegramInlineKeyboardMarkup = {
      inline_keyboard: isAmharic
        ? [
            [
              { text: "📊 የዛሬ ማጠቃለያ", callback_data: "cmd:summary" },
              { text: "⏳ ውሳኔ የሚጠብቁ", callback_data: "cmd:pending" },
            ],
            [
              { text: "📦 ዕቃ ፈልግ", callback_data: "cmd:stock_prompt" },
              { text: "⚠️ ዝቅተኛ ክምችት", callback_data: "cmd:alerts" },
            ],
            [
              { text: "💬 ለሰራተኛ ላክ", callback_data: "cmd:msg_staff" },
              { text: "📢 አጠቃላይ ማስታወቂያ", callback_data: "cmd:broadcast_staff" },
            ],
            [
              { text: "📄 ደረሰኞች", callback_data: "cmd:invoices" },
              { text: "🔔 የማሳወቂያ ቅንብር", callback_data: "cmd:notifs" },
            ],
            [
              { text: "🌐 ቋንቋ ቀይር (Language)", callback_data: "cmd:language" },
              { text: "📖 መመሪያ", callback_data: "cmd:help" },
            ],
          ]
        : [
            [
              { text: "📊 Sales Summary", callback_data: "cmd:summary" },
              { text: "⏳ Pending Approvals", callback_data: "cmd:pending" },
            ],
            [
              { text: "📦 Stock Search", callback_data: "cmd:stock_prompt" },
              { text: "⚠️ Low Stock", callback_data: "cmd:alerts" },
            ],
            [
              { text: "💬 Message Staff", callback_data: "cmd:msg_staff" },
              { text: "📢 Staff Announcement", callback_data: "cmd:broadcast_staff" },
            ],
            [
              { text: "📄 Purchase Invoices", callback_data: "cmd:invoices" },
              { text: "🔔 Notification Preferences", callback_data: "cmd:notifs" },
            ],
            [
              { text: "🌐 Change Language", callback_data: "cmd:language" },
              { text: "📖 Help Guide", callback_data: "cmd:help" },
            ],
          ],
    };

    return { text, replyMarkup };
  } else {
    // Shopkeeper
    const text = isAmharic
      ? `🛍️ <b>የሻጭ የስራ መቆጣጠሪያ / Shopkeeper Center — ${shopName}</b>\nከታች ከተዘረዘሩት አንዱን ይምረጡ:`
      : `🛍️ <b>EasyStock Shopkeeper Center — ${shopName}</b>\nSelect an action below:`;

    const replyMarkup: TelegramInlineKeyboardMarkup = {
      inline_keyboard: isAmharic
        ? [
            [
              { text: "🛍️ የዛሬ ሽያጬ", callback_data: "cmd:myday" },
              { text: "🔍 ዕቃ ዋጋና ብዛት", callback_data: "cmd:checkstock_prompt" },
            ],
            [
              { text: "📝 ጥያቄ ላክ", callback_data: "cmd:request_prompt" },
              { text: "📋 ጥያቄዎቼ", callback_data: "cmd:myrequests" },
            ],
            [
              { text: "👑 ባለቤቱን አግኝ", callback_data: "cmd:msg_owner" },
              { text: "📸 ደረሰኝ ላክ", callback_data: "cmd:upload_prompt" },
            ],
            [
              { text: "🌐 ቋንቋ ቀይር", callback_data: "cmd:language" },
              { text: "📖 መመሪያ", callback_data: "cmd:help" },
            ],
          ]
        : [
            [
              { text: "🛍️ My Shift Sales", callback_data: "cmd:myday" },
              { text: "🔍 Check Stock & Price", callback_data: "cmd:checkstock_prompt" },
            ],
            [
              { text: "📝 Submit Request", callback_data: "cmd:request_prompt" },
              { text: "📋 My Requests", callback_data: "cmd:myrequests" },
            ],
            [
              { text: "👑 Contact Owner", callback_data: "cmd:msg_owner" },
              { text: "📸 Upload Receipt", callback_data: "cmd:upload_prompt" },
            ],
            [
              { text: "🌐 Change Language", callback_data: "cmd:language" },
              { text: "📖 Help Guide", callback_data: "cmd:help" },
            ],
          ],
    };

    return { text, replyMarkup };
  }
}

/**
 * Bilingual Welcome Message after account linking
 */
export function buildWelcomeMessage(ctx: BotContext): {
  text: string;
  replyMarkup: TelegramReplyKeyboardMarkup;
} {
  const isOwner = ctx.role === ShopRole.SHOP_OWNER;
  const isAmharic = ctx.language === "am";
  const shopName = escapeHtml(ctx.shop?.name || "EasyStock Shop");
  const userName = escapeHtml(ctx.user?.fullName || "Partner");
  const replyMarkup = buildRoleReplyKeyboard(ctx.role || ShopRole.SHOPKEEPER, ctx.language);

  if (isOwner) {
    const text = isAmharic
      ? `
👋 <b>እንኳን ደህና መጡ፣ ${userName}!</b>
🏪 <b>ሱቅ:</b> ${shopName} (ባለቤት / Owner)

የ EasyStock መለያዎ በተሳካ ሁኔታ ከቴሌግራም ጋር ተገናኝቷል።
የዕለት ተዕለት ተግባራትን ከዚህ ሆነው በቀላሉ ማከናወን ይችላሉ።

<b>👑 ዋና ዋና የባለቤት ትዕዛዞች:</b>
• /summary — የዛሬ ሽያጭና የንግድ ማጠቃለያ
• /stock &lt;ስም/ኮድ&gt; — የዕቃ ክምችት፣ መግዣና መሸጫ ዋጋ
• /pending — ውሳኔ የሚጠብቁ ጥያቄዎች
• /alerts — ዝቅተኛ ክምችት ያላቸው ዕቃዎች
• /msg — ለሰራተኞች መልዕክት ወይም ማስታወቂያ መላኪያ
• /notifs — የማሳወቂያ ምርጫዎችን ማስተካከያ
• /help — ሙሉ የመመሪያ ዝርዝር

<i>በሞባይልዎ ላይ ከታች ያሉትን ፈጣን ቁልፎች ይጠቀሙ!</i>
`.trim()
      : `
👋 <b>Welcome, ${userName}!</b>
🏪 <b>Shop:</b> ${shopName} (Owner)

Your EasyStock account is securely connected to Telegram.
Manage your business operations directly through this communication center.

<b>👑 Owner Quick Actions:</b>
• /summary — Today's sales, revenue & best-sellers
• /stock &lt;name/sku&gt; — Available inventory, cost & selling price
• /pending — Pending staff requests & uploaded invoices
• /alerts — Low-stock alerts
• /msg — Send message or announcement to shop staff
• /notifs — Configure your notification preferences
• /help — Complete command & operational guide

<i>Use the 1-tap persistent menu buttons below on your phone for everyday tasks!</i>
`.trim();

    return { text, replyMarkup };
  } else {
    // Shopkeeper / Sales Staff
    const text = isAmharic
      ? `
👋 <b>ሰላም፣ ${userName}!</b>
🏪 <b>ሱቅ:</b> ${shopName} (የሽያጭ ሰራተኛ / Cashier)

የ EasyStock መለያዎ ተገናኝቷል። የሽያጭ እና የስራ መዳረሻ አለዎት።

<b>🛍️ የሰራተኛ ትዕዛዞች:</b>
• /myday — የዛሬ የግል ሽያጭዎ መጠንና ብዛት
• /checkstock &lt;ስም/ኮድ&gt; — የዕቃ መሸጫ ዋጋና ያለ ብዛት
• /request — የክምችት ማስተካከያ ጥያቄ ለባለቤቱ ማቅረቢያ
• /myrequests — ያቀረቧቸውን ጥያቄዎች ሁኔታ መከታተያ
• /msgowner — ለሱቁ ባለቤት ቀጥታ መልዕክት መላኪያ
• /help — መመሪያ

📸 <i>ጠቃሚ ምክር: የአቅራቢዎችን ደረሰኝ ወይም የዕቃ ርክክብ ወረቀት ፎቶ በማንሳት እዚህ በመላክ ለባለቤቱ ማስገባት ይችላሉ!</i>
`.trim()
      : `
👋 <b>Hello, ${userName}!</b>
🏪 <b>Shop:</b> ${shopName} (Sales Staff)

Your EasyStock account is linked. You have sales and operational access.

<b>🛍️ Staff Commands:</b>
• /myday — View your shift sales and transaction count today
• /checkstock &lt;name/code&gt; — Search item availability and selling price
• /request — Submit a stock adjustment request to the Owner
• /myrequests — Track the status of your submitted requests
• /msgowner — Send a direct message or issue note to the Owner
• /help — Full help guide

📸 <i>Tip: Take a photo of any paper invoice or delivery slip and send it here to route it to the Owner!</i>
`.trim();

    return { text, replyMarkup };
  }
}

/**
 * Help command text tailored to user role and language
 */
export function buildHelpMessage(ctx: BotContext): string {
  const isOwner = ctx.role === ShopRole.SHOP_OWNER;
  const isPlatformAdmin = ctx.user?.platformRole === "SUPER_ADMIN";
  const isAmharic = ctx.language === "am";

  const adminSection = isPlatformAdmin
    ? `\n\n👑 <b>Platform Administrator Commands:</b>\n• <code>/syshealth</code> — Bot health, uptime, memory & webhook status\n• <code>/broadcast &lt;message&gt;</code> — System-wide broadcast announcement\n• <code>/adminhelp</code> — Admin diagnostics & privacy reference`
    : "";

  if (isOwner) {
    if (isAmharic) {
      return `
📖 <b>የ EasyStock ባለቤት መመሪያ / Owner Guide</b>

<b>የሽያጭና የገንዘብ እንቅስቃሴ:</b>
• <code>/summary</code> ወይም <code>/today</code> — የዛሬ ሙሉ የሽያጭ፣ ገቢና የሰራተኞች እንቅስቃሴ ማጠቃለያ
• <code>/pending</code> — ውሳኔ የሚጠብቁ የሰራተኛ ጥያቄዎችና ደረሰኞች

<b>የዕቃ ክምችት:</b>
• <code>/stock &lt;ዕቃ&gt;</code> — የዕቃውን ብዛት፣ መግዣ ዋጋና መሸጫ ዋጋ መመልከቻ
• <code>/alerts</code> — ከማስጠንቀቂያ ደረጃ በታች ያሉ ዕቃዎች ዝርዝር

<b>ግንኙነትና ሰነዶች:</b>
• <code>/msg</code> — ለሰራተኞች መልዕክት ወይም አጠቃላይ ማስታወቂያ መላኪያ
• ማንኛውንም የደረሰኝ ፎቶ ወይም PDF ወደዚህ በመላክ በቀጥታ ይመዝግቡ

<b>ቅንብሮች:</b>
• <code>/notifs</code> — የማሳወቂያ ማብሪያና ማጥፊያ
• <code>/language</code> — ቋንቋ መቀየሪያ (English / አማርኛ)
• <code>/disconnect</code> — መለያዎን ከቴሌግራም መለያየት${adminSection}
`.trim();
    }

    return `
📖 <b>EasyStock Bot Guide (Shop Owner)</b>

<b>Financial & Daily Operations:</b>
• <code>/summary</code> or <code>/today</code> — Shift sales, gross revenue, and cashier breakdown.
• <code>/pending</code> — Pending stock adjustment requests and incoming invoices.

<b>Inventory & Catalog:</b>
• <code>/stock &lt;item&gt;</code> — Search products to see available balance, cost, and selling price.
• <code>/alerts</code> — List products that have fallen below their reorder level.

<b>Staff Communication & Invoices:</b>
• <code>/msg</code> — Send a direct message or broadcast announcement to shopkeepers.
• Send or forward photos/PDFs of supplier delivery slips to log them.

<b>Preferences & Account:</b>
• <code>/notifs</code> — Configure granular notification preferences (alerts, sales, messages).
• <code>/language</code> — Switch bot language (English / አማርኛ).
• <code>/disconnect</code> — Unlink your Telegram account.${adminSection}
`.trim();
  }

  // Shopkeeper
  if (isAmharic) {
    return `
📖 <b>የ EasyStock የሰራተኛ መመሪያ / Staff Guide</b>

<b>የስራ ሰዓት ሽያጭ:</b>
• <code>/myday</code> — የዛሬ ሽያጭዎን ብዛትና ድምር ይመልከቱ
• <code>/checkstock &lt;ዕቃ/ኮድ&gt;</code> — የዕቃ መሸጫ ዋጋና ያለ ብዛት መረጃ

<b>ጥያቄዎችና ግንኙነት:</b>
• <code>/request &lt;ዝርዝር&gt;</code> — የተበላሸ ወይም የጎደለ ዕቃ ማስተካከያ ጥያቄ ለባለቤቱ ማቅረቢያ
• <code>/myrequests</code> — የጥያቄዎችዎን የውሳኔ ሁኔታ መከታተያ
• <code>/msgowner &lt;መልዕክት&gt;</code> — ለባለቤቱ ቀጥታ መልዕክት መላኪያ

<b>ሰነዶችና ደረሰኞች:</b>
• የአቅራቢዎችን ደረሰኝ ፎቶ አንስተው እዚህ ይላኩ

<b>ቅንብሮች:</b>
• <code>/language</code> — ቋንቋ መቀየሪያ (English / አማርኛ)
• <code>/disconnect</code> — መለያዎን ማቋረጥ
`.trim();
  }

  return `
📖 <b>EasyStock Bot Guide (Shopkeeper)</b>

<b>Daily Shift:</b>
• <code>/myday</code> — Check how many sales you recorded today and your total volume.
• <code>/checkstock &lt;item/code&gt;</code> — Search whether an item is in stock and its customer selling price.

<b>Stock Requests & Communication:</b>
• <code>/request &lt;details&gt;</code> — Send a note to the owner to adjust stock (e.g. damaged item).
• <code>/myrequests</code> — View your submitted requests and their approval statuses.
• <code>/msgowner &lt;message&gt;</code> — Send a direct note or question to the shop owner.

<b>Invoices & Deliveries:</b>
• Snap a photo of any supplier delivery note or purchase receipt and send it here.

<b>Account:</b>
• <code>/language</code> — Switch bot language (English / አማርኛ).
• <code>/disconnect</code> — Unlink this Telegram chat.
`.trim();
}

/**
 * Interactive Notification Preferences Card
 */
export function buildNotificationPreferencesCard(
  prefs: NotificationPreferences,
  language: "en" | "am" = "en"
): { text: string; replyMarkup: TelegramInlineKeyboardMarkup } {
  const isAmharic = language === "am";

  const getStatus = (val?: boolean) => (val !== false ? "✅ ON" : "❌ OFF");

  const text = isAmharic
    ? `🔔 <b>የማሳወቂያ ምርጫዎች / Notification Preferences</b>\nየሚፈልጓቸውን ማሳወቂያዎች ለማብራት ወይም ለማጥፋት ቁልፎቹን ይጫኑ:`
    : `🔔 <b>Notification Center & Preferences</b>\nTap any toggle button below to enable or disable specific notifications:`;

  const replyMarkup: TelegramInlineKeyboardMarkup = {
    inline_keyboard: [
      [
        {
          text: `🛍️ ${isAmharic ? "አዲስ ሽያጭ" : "New Sales"}: ${getStatus(prefs.newSales)}`,
          callback_data: `notif_tog:newSales`,
        },
        {
          text: `📊 ${isAmharic ? "የዕለት ማጠቃለያ" : "Daily Summary"}: ${getStatus(prefs.dailySummary)}`,
          callback_data: `notif_tog:dailySummary`,
        },
      ],
      [
        {
          text: `⚠️ ${isAmharic ? "ዝቅተኛ ክምችት" : "Low Stock"}: ${getStatus(prefs.lowStock)}`,
          callback_data: `notif_tog:lowStock`,
        },
        {
          text: `📝 ${isAmharic ? "የዕቃ ጥያቄዎች" : "Inventory Requests"}: ${getStatus(prefs.inventoryRequests)}`,
          callback_data: `notif_tog:inventoryRequests`,
        },
      ],
      [
        {
          text: `⚖️ ${isAmharic ? "ውሳኔዎች" : "Approvals"}: ${getStatus(prefs.approvals)}`,
          callback_data: `notif_tog:approvals`,
        },
        {
          text: `🧾 ${isAmharic ? "የግዢ ደረሰኞች" : "Purchase Invoices"}: ${getStatus(prefs.purchaseInvoices)}`,
          callback_data: `notif_tog:purchaseInvoices`,
        },
      ],
      [
        {
          text: `💬 ${isAmharic ? "መልዕክቶች" : "Messages"}: ${getStatus(prefs.messages)}`,
          callback_data: `notif_tog:messages`,
        },
        {
          text: `📢 ${isAmharic ? "የንግድ ክስተቶች" : "Business Events"}: ${getStatus(prefs.businessEvents)}`,
          callback_data: `notif_tog:businessEvents`,
        },
      ],
    ],
  };

  return { text, replyMarkup };
}

/**
 * Language Selection Card
 */
export function buildLanguageSelectionCard(): {
  text: string;
  replyMarkup: TelegramInlineKeyboardMarkup;
} {
  const text = `
🌐 <b>Select Your Language / ቋንቋ ይምረጡ</b>

Please choose your preferred language for the EasyStock Telegram Bot:
እባክዎ ለ EasyStock ቴሌግራም ቦት የሚመርጡትን ቋንቋ ይምረጡ:
`.trim();

  const replyMarkup: TelegramInlineKeyboardMarkup = {
    inline_keyboard: [
      [
        { text: "🇬🇧 English", callback_data: "lang:en" },
        { text: "🇪🇹 አማርኛ (Amharic)", callback_data: "lang:am" },
      ],
    ],
  };

  return { text, replyMarkup };
}

/**
 * Approval Request card for Shop Owner with interactive inline buttons
 */
export function buildApprovalRequestCard(req: {
  id: string;
  referenceCode?: string;
  requesterName: string;
  title: string;
  approvalType: string;
  notes?: string;
  details: any;
}): { text: string; replyMarkup: TelegramInlineKeyboardMarkup } {
  const refLine = req.referenceCode ? `🏷️ <b>Ref:</b> <code>${req.referenceCode}</code>\n` : "";

  const text = `
🔔 <b>New Request Awaiting Approval / አዲስ ውሳኔ የሚጠብቅ ጥያቄ</b>
${refLine}👤 <b>From Staff / ከሰራተኛ:</b> ${escapeHtml(req.requesterName)}
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

/**
 * Shopkeeper Personal Shift Sales Message
 */
export function buildShopkeeperSalesMessage(
  cashierName: string,
  shopName: string,
  currency: string,
  metrics: { salesCount: number; salesTotal: string },
  language: "en" | "am" = "en"
): string {
  const isAmharic = language === "am";

  if (isAmharic) {
    return `
🛍️ <b>የዛሬ የስራ ሰዓት ሽያጭዎ / Your Shift Sales</b>
👤 <b>ሻጭ:</b> ${escapeHtml(cashierName)}
🏪 <b>ሱቅ:</b> ${escapeHtml(shopName)}
📅 <b>ቀን:</b> ${new Date().toLocaleDateString()}

• <b>የተጠናቀቁ ሽያጮች:</b> <b>${metrics.salesCount}</b> ደረሰኞች
• <b>ጠቅላላ የተሸጠው:</b> <b>${metrics.salesTotal} ${currency}</b>

👏 መልካም የስራ ቀን! በርቱ!
`.trim();
  }

  return `
🛍️ <b>Your Shift Performance / የዛሬ የስራ ሰዓት ሽያጭዎ</b>
👤 <b>Cashier:</b> ${escapeHtml(cashierName)}
🏪 <b>Shop:</b> ${escapeHtml(shopName)}
📅 <b>Date:</b> ${new Date().toLocaleDateString()}

• <b>Completed Sales:</b> <b>${metrics.salesCount}</b>
• <b>Total Volume:</b> <b>${metrics.salesTotal} ${currency}</b>

👏 Keep up the great work!
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
  },
  language: "en" | "am" = "en"
): string {
  const isAmharic = language === "am";

  if (isAmharic) {
    return `
📦 <b>የዕቃ መረጃ (የባለቤት እይታ)</b>
<b>ዕቃ:</b> ${escapeHtml(item.productName)} (${escapeHtml(item.variantName)})
<b>SKU:</b> <code>${escapeHtml(item.sku)}</code>
${item.barcode ? `<b>ባርኮድ:</b> <code>${escapeHtml(item.barcode)}</code>\n` : ""}\
<b>ያለ ብዛት:</b> <b>${item.quantity} units</b>
<b>መሸጫ ዋጋ:</b> <b>${item.sellingPrice} ${item.currency}</b>
<b>መግዣ ዋጋ:</b> <b>${item.costPrice} ${item.currency}</b>
`.trim();
  }

  return `
📦 <b>Stock Details (Owner View)</b>
<b>Product:</b> ${escapeHtml(item.productName)} (${escapeHtml(item.variantName)})
<b>SKU:</b> <code>${escapeHtml(item.sku)}</code>
${item.barcode ? `<b>Barcode:</b> <code>${escapeHtml(item.barcode)}</code>\n` : ""}\
<b>Available Quantity:</b> <b>${item.quantity} units</b>
<b>Selling Price:</b> <b>${item.sellingPrice} ${item.currency}</b>
<b>Cost Price:</b> <b>${item.costPrice} ${item.currency}</b>
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
  },
  language: "en" | "am" = "en"
): string {
  const isAmharic = language === "am";
  const inStockBadge = item.quantity > 0
    ? isAmharic ? "✅ አለ (IN STOCK)" : "✅ IN STOCK / አለ"
    : isAmharic ? "❌ አልቋል (OUT OF STOCK)" : "❌ OUT OF STOCK / አልቋል";

  if (isAmharic) {
    return `
🔍 <b>የዕቃ መረጃ / Product Stock Inquiry</b>
<b>ዕቃ:</b> ${escapeHtml(item.productName)} (${escapeHtml(item.variantName)})
<b>SKU:</b> <code>${escapeHtml(item.sku)}</code>
<b>ሁኔታ:</b> ${inStockBadge}
<b>ያለ ብዛት:</b> <b>${item.quantity} units</b>
<b>መሸጫ ዋጋ:</b> <b>${item.sellingPrice} ${item.currency}</b>
`.trim();
  }

  return `
🔍 <b>Product Stock Inquiry / የዕቃ መረጃ</b>
<b>Product:</b> ${escapeHtml(item.productName)} (${escapeHtml(item.variantName)})
<b>SKU:</b> <code>${escapeHtml(item.sku)}</code>
<b>Status:</b> ${inStockBadge}
<b>Available:</b> <b>${item.quantity} units</b>
<b>Selling Price:</b> <b>${item.sellingPrice} ${item.currency}</b>
`.trim();
}

/**
 * Owner Daily Sales Summary Message (Preserved for backwards compatibility with existing tests)
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
