"use server";

import { getCurrentContext } from "./auth";
import { generateTelegramLinkToken } from "@/lib/telegram/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export interface TelegramLinkResult {
  success: boolean;
  linkUrl?: string;
  botUsername?: string;
  error?: string;
}

export interface TelegramAccountInfo {
  id: string;
  telegramChatId: string;
  telegramUsername: string | null;
  firstName: string | null;
  isActive: boolean;
  createdAt: Date;
}

/**
 * Generates a secure, 15-minute deep link for the current user and active shop.
 */
export async function getTelegramLinkUrlAction(): Promise<TelegramLinkResult> {
  try {
    const context = await getCurrentContext();
    if (!context || !context.user || !context.shopId) {
      return { success: false, error: "Unauthorized: Please log in to generate a Telegram connection link." };
    }

    const token = await generateTelegramLinkToken(context.user.id, context.shopId);
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || "EasyStockApp_bot";
    const linkUrl = `https://t.me/${botUsername}?start=LINK_${token}`;

    return {
      success: true,
      linkUrl,
      botUsername,
    };
  } catch (error: any) {
    console.error("[TelegramAction] Error generating link token:", error);
    return { success: false, error: error.message || "Failed to generate link" };
  }
}

/**
 * Disconnects and unlinks the current user's Telegram account for this shop.
 */
export async function disconnectTelegramAction(): Promise<{ success: boolean; error?: string }> {
  try {
    const context = await getCurrentContext();
    if (!context || !context.user || !context.shopId) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.telegramAccount.deleteMany({
      where: {
        userId: context.user.id,
        shopId: context.shopId,
      },
    });

    revalidatePath(`/${context.shopId}/settings`);
    return { success: true };
  } catch (error: any) {
    console.error("[TelegramAction] Error disconnecting account:", error);
    return { success: false, error: error.message || "Failed to disconnect Telegram account" };
  }
}

/**
 * Fetches the active Telegram account for the current user in this shop.
 */
export async function getTelegramAccountStatusAction(): Promise<{
  success: boolean;
  account: TelegramAccountInfo | null;
  botUsername: string;
  error?: string;
}> {
  try {
    const context = await getCurrentContext();
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || "EasyStockApp_bot";

    if (!context || !context.user || !context.shopId) {
      return { success: false, account: null, botUsername, error: "Unauthorized" };
    }

    const account = await prisma.telegramAccount.findFirst({
      where: {
        userId: context.user.id,
        shopId: context.shopId,
        isActive: true,
      },
      select: {
        id: true,
        telegramChatId: true,
        telegramUsername: true,
        firstName: true,
        isActive: true,
        createdAt: true,
      },
    });

    return {
      success: true,
      account,
      botUsername,
    };
  } catch (error: any) {
    console.error("[TelegramAction] Error checking account status:", error);
    return {
      success: false,
      account: null,
      botUsername: process.env.TELEGRAM_BOT_USERNAME || "EasyStockApp_bot",
      error: error.message,
    };
  }
}
