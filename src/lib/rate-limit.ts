import { RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS } from "./constants";

export interface RateLimitResult {
  allowed: boolean;
  /** Сколько обращений уже учтено в окне. */
  used: number;
  /** Через сколько миллисекунд освободится место (0, если можно сейчас). */
  retryAfterMs: number;
}

/**
 * Скользящее окно: учитываются обращения, созданные строго позже now - windowMs.
 * Обращение, созданное ровно 60 минут назад, уже не считается.
 */
export function checkRateLimit(
  timestamps: readonly number[],
  now: number,
  max: number = RATE_LIMIT_MAX,
  windowMs: number = RATE_LIMIT_WINDOW_MS,
): RateLimitResult {
  const windowStart = now - windowMs;
  const inWindow = timestamps.filter((t) => t > windowStart).sort((a, b) => a - b);
  if (inWindow.length < max) {
    return { allowed: true, used: inWindow.length, retryAfterMs: 0 };
  }
  // Место освободится, когда самое старое из последних `max` выйдет из окна.
  const oldestBlocking = inWindow[inWindow.length - max];
  return {
    allowed: false,
    used: inWindow.length,
    retryAfterMs: Math.max(0, oldestBlocking + windowMs - now),
  };
}
