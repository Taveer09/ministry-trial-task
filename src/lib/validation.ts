import { z } from "zod";
import {
  CATEGORIES,
  REASON_MAX_LENGTH,
  REPLY_MAX_LENGTH,
  ROOM_MAX_LENGTH,
  STATUSES,
  TEXT_MAX_LENGTH,
  TEXT_MIN_LENGTH,
} from "./constants";

export const submitRequestSchema = z.object({
  category: z.enum(CATEGORIES, { error: "Выберите категорию" }),
  text: z
    .string({ error: "Текст обязателен" })
    .trim()
    .min(TEXT_MIN_LENGTH, { error: "Опишите проблему или идею" })
    .max(TEXT_MAX_LENGTH, { error: `Не больше ${TEXT_MAX_LENGTH} символов` }),
  room: z
    .string()
    .trim()
    .max(ROOM_MAX_LENGTH, { error: `Кабинет: не больше ${ROOM_MAX_LENGTH} символов` })
    .optional()
    .nullable()
    .transform((value) => (value ? value : null)),
});

export type SubmitRequestInput = z.input<typeof submitRequestSchema>;
export type SubmitRequestData = z.output<typeof submitRequestSchema>;

export const moderatorUpdateSchema = z
  .object({
    status: z.enum(STATUSES, { error: "Неизвестный статус" }).optional(),
    publicReply: z
      .string()
      .max(REPLY_MAX_LENGTH, { error: `Ответ: не больше ${REPLY_MAX_LENGTH} символов` })
      .optional(),
    rejectionReason: z
      .string()
      .max(REASON_MAX_LENGTH, { error: `Причина: не больше ${REASON_MAX_LENGTH} символов` })
      .optional(),
  })
  .strict()
  .refine((data) => data.status !== undefined || data.publicReply !== undefined, {
    error: "Нужно изменить статус или ответ",
  });

export type ModeratorUpdateInput = z.infer<typeof moderatorUpdateSchema>;

export const loginSchema = z.object({
  password: z.string().min(1, { error: "Введите пароль" }).max(200),
});

export const categoryFilterSchema = z.enum(CATEGORIES).optional();
export const statusFilterSchema = z.enum(STATUSES).optional();

/** Первое сообщение об ошибке zod в виде строки для ответа API. */
export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Некорректные данные";
}
