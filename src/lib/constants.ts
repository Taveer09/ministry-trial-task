export const CATEGORIES = ["tech", "room", "canteen", "idea", "other"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  tech: "Техника",
  room: "Кабинет",
  canteen: "Столовая",
  idea: "Идея",
  other: "Другое",
};

export const STATUSES = ["new", "in_progress", "resolved", "rejected"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  new: "Новое",
  in_progress: "В работе",
  resolved: "Решено",
  rejected: "Отклонено",
};

export const TEXT_MIN_LENGTH = 1;
export const TEXT_MAX_LENGTH = 1000;
export const ROOM_MAX_LENGTH = 20;
export const REPLY_MAX_LENGTH = 1000;
export const REASON_MAX_LENGTH = 500;

export const RATE_LIMIT_MAX = 3;
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

export const DEVICE_COOKIE = "device_id";
export const DEVICE_COOKIE_MAX_AGE_S = 60 * 60 * 24 * 365;

export const SESSION_COOKIE = "moderator_session";
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export const DISPLAY_TIME_ZONE = "Asia/Oral";
