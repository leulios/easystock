/**
 * Telegram Bot API Type Definitions for EasyStock Bot
 */

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

export interface TelegramDocument {
  file_id: string;
  file_unique_id: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramInlineKeyboardButton {
  text: string;
  url?: string;
  callback_data?: string;
}

export interface TelegramInlineKeyboardMarkup {
  inline_keyboard: TelegramInlineKeyboardButton[][];
}

export interface TelegramKeyboardButton {
  text: string;
}

export interface TelegramReplyKeyboardMarkup {
  keyboard: TelegramKeyboardButton[][];
  resize_keyboard?: boolean;
  one_time_keyboard?: boolean;
  is_persistent?: boolean;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  photo?: TelegramPhotoSize[];
  document?: TelegramDocument;
  caption?: string;
  reply_to_message?: TelegramMessage;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
  chat_instance?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface SendMessageOptions {
  parse_mode?: "HTML" | "MarkdownV2";
  reply_markup?: TelegramInlineKeyboardMarkup | TelegramReplyKeyboardMarkup;
  disable_web_page_preview?: boolean;
}

export interface SendPhotoOptions {
  caption?: string;
  parse_mode?: "HTML" | "MarkdownV2";
  reply_markup?: TelegramInlineKeyboardMarkup;
}

export interface BotContext {
  chatId: string;
  user?: {
    id: string;
    email: string;
    fullName: string;
    platformRole: string;
  };
  shop?: {
    id: string;
    name: string;
    code: string;
    currency: string;
  };
  role?: "SHOP_OWNER" | "SHOP_MANAGER" | "SHOPKEEPER";
  isLinked: boolean;
  telegramAccount?: {
    id: string;
    notifications: string;
    telegramUsername?: string | null;
  };
}
