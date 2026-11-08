import {
  SendMessageOptions,
  SendPhotoOptions,
  TelegramInlineKeyboardMarkup,
} from "./types";

/**
 * Lightweight, zero-dependency Telegram Bot API client.
 * Uses native fetch for optimal compatibility with Next.js App Router and serverless runtimes.
 */
export class TelegramClient {
  private botToken: string;
  private baseUrl: string;

  constructor(token?: string) {
    this.botToken = token || process.env.TELEGRAM_BOT_TOKEN || "";
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  public isConfigured(): boolean {
    return Boolean(this.botToken && this.botToken.length > 10);
  }

  private async callApi<T>(method: string, payload: Record<string, any>): Promise<T | null> {
    if (!this.isConfigured()) {
      console.warn(`[TelegramClient] Warning: TELEGRAM_BOT_TOKEN is not configured. Skipped call to ${method}`);
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/${method}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!data.ok) {
        console.error(`[TelegramClient] API Error in ${method}:`, data.description);
        return null;
      }

      return data.result as T;
    } catch (error) {
      console.error(`[TelegramClient] Network error calling ${method}:`, error);
      return null;
    }
  }

  /**
   * Send a text message to a chat
   */
  public async sendMessage(
    chatId: string | number,
    text: string,
    options?: SendMessageOptions
  ) {
    return this.callApi("sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: options?.parse_mode || "HTML",
      reply_markup: options?.reply_markup,
      disable_web_page_preview: options?.disable_web_page_preview ?? true,
    });
  }

  /**
   * Edit an existing message's text
   */
  public async editMessageText(
    chatId: string | number,
    messageId: number,
    text: string,
    options?: SendMessageOptions
  ) {
    return this.callApi("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: options?.parse_mode || "HTML",
      reply_markup: options?.reply_markup,
      disable_web_page_preview: options?.disable_web_page_preview ?? true,
    });
  }

  /**
   * Edit an existing message's inline keyboard markup
   */
  public async editMessageReplyMarkup(
    chatId: string | number,
    messageId: number,
    replyMarkup?: TelegramInlineKeyboardMarkup
  ) {
    return this.callApi("editMessageReplyMarkup", {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: replyMarkup,
    });
  }

  /**
   * Answer a callback query from an inline keyboard button tap
   */
  public async answerCallbackQuery(
    callbackQueryId: string,
    text?: string,
    showAlert = false
  ) {
    return this.callApi("answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      text,
      show_alert: showAlert,
    });
  }

  /**
   * Send a photo with an optional caption
   */
  public async sendPhoto(
    chatId: string | number,
    photoFileIdOrUrl: string,
    options?: SendPhotoOptions
  ) {
    return this.callApi("sendPhoto", {
      chat_id: chatId,
      photo: photoFileIdOrUrl,
      caption: options?.caption,
      parse_mode: options?.parse_mode || "HTML",
      reply_markup: options?.reply_markup,
    });
  }

  /**
   * Get file information from Telegram to download an attachment
   */
  public async getFile(fileId: string): Promise<{ file_path?: string } | null> {
    return this.callApi<{ file_path?: string }>("getFile", { file_id: fileId });
  }

  /**
   * Configure Telegram webhook URL
   */
  public async setWebhook(url: string, secretToken?: string) {
    return this.callApi("setWebhook", {
      url,
      secret_token: secretToken,
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: false,
    });
  }

  /**
   * Get current webhook status
   */
  public async getWebhookInfo(): Promise<{
    url?: string;
    has_custom_certificate?: boolean;
    pending_update_count?: number;
    last_error_date?: number;
    last_error_message?: string;
  } | null> {
    return this.callApi("getWebhookInfo", {});
  }

  /**
   * Get basic bot identity info
   */
  public async getMe() {
    return this.callApi("getMe", {});
  }
}

export const telegramClient = new TelegramClient();
