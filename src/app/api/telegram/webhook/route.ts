import { NextRequest, NextResponse } from "next/server";
import { telegramRouter } from "@/lib/telegram/router";
import { TelegramUpdate } from "@/lib/telegram/types";

export const dynamic = "force-dynamic";

/**
 * Health check endpoint for monitoring bot status
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "EasyStock Telegram Webhook",
    timestamp: new Date().toISOString(),
  });
}

/**
 * Receives incoming webhook events directly from Telegram
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Verify webhook secret token if configured
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (expectedSecret) {
      const incomingSecret = req.headers.get("x-telegram-bot-api-secret-token");
      if (incomingSecret !== expectedSecret) {
        console.warn("[Telegram Webhook] Unauthorized request rejected: invalid secret token.");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // 2. Parse payload
    const body = (await req.json()) as TelegramUpdate;
    if (!body || !body.update_id) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // 3. Process update
    // We await router handling to ensure completion within serverless execution lifecycle
    await telegramRouter.handleUpdate(body);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[Telegram Webhook] Error processing incoming update:", error);
    // Always return 200 to prevent Telegram from infinitely retrying a bad update
    return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
  }
}
