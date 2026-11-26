import { randomInt } from "node:crypto";
import { CODE_ALPHABET, CODE_LENGTH } from "./code-format";

export { CODE_ALPHABET, CODE_LENGTH, CODE_PATTERN, isValidCode, normalizeCode } from "./code-format";

export const MAX_CODE_ATTEMPTS = 20;

/** randomInt(max) возвращает целое из [0, max). */
export type RandomIntFn = (max: number) => number;

const defaultRandomInt: RandomIntFn = (max) => randomInt(max);

export function generateCode(rng: RandomIntFn = defaultRandomInt): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    const index = rng(CODE_ALPHABET.length);
    if (!Number.isInteger(index) || index < 0 || index >= CODE_ALPHABET.length) {
      throw new RangeError(`Генератор вернул недопустимый индекс: ${index}`);
    }
    code += CODE_ALPHABET[index];
  }
  return code;
}

/**
 * Генерирует код, которого ещё нет в хранилище. При коллизии пробует снова.
 * После maxAttempts неудач бросает ошибку, чтобы не зациклиться.
 */
export function generateUniqueCode(
  exists: (code: string) => boolean,
  rng: RandomIntFn = defaultRandomInt,
  maxAttempts: number = MAX_CODE_ATTEMPTS,
): string {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateCode(rng);
    if (!exists(code)) return code;
  }
  throw new Error("Не удалось сгенерировать уникальный код обращения");
}
