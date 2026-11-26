/** Формат кода обращения. Без зависимостей от Node: используется и в браузере. */

/** A-Z без O и I, цифры 2-9: 24 буквы + 8 цифр = 32 символа. */
export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 6;
export const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;

/** Приводит ввод пользователя к виду кода: без пробелов, в верхнем регистре. */
export function normalizeCode(input: string): string {
  return input.replace(/\s+/g, "").toUpperCase();
}

export function isValidCode(code: string): boolean {
  return CODE_PATTERN.test(code);
}
