import { z } from "zod";

const configSchema = z.object({
  MODERATOR_PASSWORD: z
    .string({ error: "MODERATOR_PASSWORD не задан. Скопируйте .env.example в .env.local" })
    .min(8, { error: "MODERATOR_PASSWORD должен быть не короче 8 символов" }),
  SESSION_SECRET: z
    .string({ error: "SESSION_SECRET не задан. Скопируйте .env.example в .env.local" })
    .min(16, { error: "SESSION_SECRET должен быть не короче 16 символов" }),
  DATABASE_PATH: z.string().min(1).default("data/app.db"),
});

export type AppConfig = z.infer<typeof configSchema>;

/** Читает и проверяет переменные окружения. Бросает понятную ошибку, если их нет. */
export function getConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = configSchema.safeParse({
    MODERATOR_PASSWORD: env.MODERATOR_PASSWORD,
    SESSION_SECRET: env.SESSION_SECRET,
    DATABASE_PATH: env.DATABASE_PATH || undefined,
  });
  if (!parsed.success) {
    throw new Error(`Ошибка конфигурации: ${parsed.error.issues.map((i) => i.message).join("; ")}`);
  }
  return parsed.data;
}

export function getDatabasePath(env: NodeJS.ProcessEnv = process.env): string {
  return env.DATABASE_PATH || "data/app.db";
}
