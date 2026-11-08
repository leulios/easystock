import { prisma } from "../db";
import crypto from "crypto";
import { BotContext, TelegramUser } from "./types";
import { TenantContext } from "../tenant/context";
import { ShopRole } from "@prisma/client";

/**
 * Generates a high-entropy, short-lived deep-linking token for a user and shop.
 * Token expires in 15 minutes.
 */
export async function generateTelegramLinkToken(userId: string, shopId: string): Promise<string> {
  // Verify membership exists
  const membership = await prisma.userMembership.findFirst({
    where: {
      userId,
      OR: [{ shopId }, { shopId: null, role: ShopRole.SHOP_OWNER }],
    },
  });

  if (!membership) {
    throw new Error("User does not have an active membership in this shop.");
  }

  // Generate 24-byte random hex token
  const token = crypto.randomBytes(24).toString("hex");
  const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  // Store or update pending link token on a placeholder or existing TelegramAccount record
  const existingAccount = await prisma.telegramAccount.findFirst({
    where: { userId, shopId },
  });

  if (existingAccount) {
    await prisma.telegramAccount.update({
      where: { id: existingAccount.id },
      data: {
        linkToken: token,
        linkTokenExpires: expires,
      },
    });
  } else {
    // Generate a temporary unique placeholder chatId that gets replaced on /start
    const tempChatId = `pending_${token}`;
    await prisma.telegramAccount.create({
      data: {
        userId,
        shopId,
        telegramChatId: tempChatId,
        linkToken: token,
        linkTokenExpires: expires,
        isActive: false,
      },
    });
  }

  return token;
}

/**
 * Validates deep-link token and binds the Telegram chatId to the user's account.
 */
export async function verifyAndLinkTelegramAccount(
  token: string,
  telegramUser: TelegramUser,
  chatId: string
): Promise<{ success: boolean; message: string; user?: any; shop?: any; role?: ShopRole }> {
  const cleanToken = token.trim();
  const account = await prisma.telegramAccount.findUnique({
    where: { linkToken: cleanToken },
    include: {
      user: {
        include: {
          memberships: {
            include: {
              shop: true,
              organization: true,
            },
          },
        },
      },
      shop: true,
    },
  });

  if (!account) {
    return {
      success: false,
      message: "❌ Invalid or unrecognized link token. Please generate a new connection link from EasyStock Web Settings.",
    };
  }

  if (!account.linkTokenExpires || account.linkTokenExpires < new Date()) {
    return {
      success: false,
      message: "⚠️ This connection link has expired (15-minute limit). Please request a new link in EasyStock Settings.",
    };
  }

  // If this chatId was already linked to another account, remove or update it
  const conflicting = await prisma.telegramAccount.findUnique({
    where: { telegramChatId: chatId },
  });

  if (conflicting && conflicting.id !== account.id) {
    await prisma.telegramAccount.delete({ where: { id: conflicting.id } });
  }

  // Activate and link account
  const updated = await prisma.telegramAccount.update({
    where: { id: account.id },
    data: {
      telegramChatId: chatId,
      telegramUsername: telegramUser.username || null,
      firstName: telegramUser.first_name || null,
      lastName: telegramUser.last_name || null,
      isActive: true,
      linkToken: null,
      linkTokenExpires: null,
    },
    include: {
      user: true,
      shop: true,
    },
  });

  // Determine user role in this shop
  const membership = account.user.memberships.find(
    (m) => m.shopId === account.shopId || (m.shopId === null && m.role === ShopRole.SHOP_OWNER)
  );

  const role = membership?.role || ShopRole.SHOPKEEPER;

  // Record audit log
  await prisma.auditLog.create({
    data: {
      organizationId: account.shop.organizationId,
      shopId: account.shop.id,
      userId: account.userId,
      action: "TELEGRAM_ACCOUNT_LINKED",
      entityType: "TelegramAccount",
      entityId: updated.id,
      newData: {
        chatId,
        username: telegramUser.username,
        linkedAt: new Date().toISOString(),
      },
    },
  });

  return {
    success: true,
    message: "✅ Account linked successfully!",
    user: updated.user,
    shop: updated.shop,
    role,
  };
}

/**
 * Resolves full BotContext and underlying TenantContext for an incoming Telegram chatId.
 */
export async function resolveTelegramContext(chatId: string): Promise<BotContext | null> {
  const account = await prisma.telegramAccount.findFirst({
    where: {
      telegramChatId: chatId,
      isActive: true,
    },
    include: {
      user: {
        include: {
          memberships: {
            include: {
              organization: true,
              shop: true,
            },
          },
        },
      },
      shop: true,
    },
  });

  if (!account || !account.user.isActive) {
    return null;
  }

  const { user, shop } = account;
  const membership = user.memberships.find(
    (m) => m.shopId === shop.id || (m.shopId === null && m.role === ShopRole.SHOP_OWNER)
  );

  const role = membership?.role || ShopRole.SHOPKEEPER;

  return {
    chatId,
    isLinked: true,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      platformRole: user.platformRole,
    },
    shop: {
      id: shop.id,
      name: shop.name,
      code: shop.code,
      currency: shop.currency,
    },
    role,
    telegramAccount: {
      id: account.id,
      notifications: account.notifications,
      telegramUsername: account.telegramUsername,
    },
  };
}

/**
 * Builds a valid TenantContext from a BotContext for invoking core services.
 */
export async function buildTenantContextFromBot(botContext: BotContext): Promise<TenantContext> {
  if (!botContext.user || !botContext.shop) {
    throw new Error("Cannot build TenantContext from an unlinked Telegram session.");
  }

  const membership = await prisma.userMembership.findFirst({
    where: {
      userId: botContext.user.id,
      OR: [{ shopId: botContext.shop.id }, { shopId: null, role: ShopRole.SHOP_OWNER }],
    },
    include: {
      organization: true,
    },
  });

  if (!membership) {
    throw new Error("Active membership not found for this shop.");
  }

  const isOwner = botContext.role === ShopRole.SHOP_OWNER;

  return {
    user: {
      id: botContext.user.id,
      email: botContext.user.email,
      fullName: botContext.user.fullName,
      platformRole: botContext.user.platformRole as any,
      isActive: true,
    },
    organizationId: membership.organizationId,
    shopId: botContext.shop.id,
    role: botContext.role || ShopRole.SHOPKEEPER,
    isPlatformAdmin: botContext.user.platformRole === "SUPER_ADMIN",
    permissions: {
      canViewReports: isOwner || membership.canViewReports,
      canApplyDiscount: isOwner || membership.canApplyDiscount,
      canAdjustStock: isOwner || membership.canAdjustStock,
    },
  };
}

/**
 * Unlinks and disconnects a Telegram account.
 */
export async function disconnectTelegramAccount(chatId: string): Promise<boolean> {
  const account = await prisma.telegramAccount.findUnique({
    where: { telegramChatId: chatId },
  });

  if (!account) return false;

  await prisma.telegramAccount.delete({
    where: { id: account.id },
  });

  return true;
}
