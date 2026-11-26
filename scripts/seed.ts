/**
 * Заполняет БД 10 вымышленными обращениями в разных статусах.
 * Все данные тестовые: ни реальных имён, ни реальных кабинетов.
 * Запуск: npm run seed
 */
import { existsSync } from "node:fs";
import { generateUniqueCode } from "../src/lib/code";
import { getDatabasePath } from "../src/lib/config";
import type { Category, Status } from "../src/lib/constants";
import { openDb } from "../src/lib/db";
import { codeExists, deleteAllRequests, insertRequest } from "../src/lib/repository";

if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

interface SeedItem {
  category: Category;
  text: string;
  room: string | null;
  status: Status;
  hoursAgo: number;
  publicReply?: string;
  rejectionReason?: string;
}

const ITEMS: SeedItem[] = [
  { category: "tech", text: "Тестовое обращение: в кабинете не включается проектор, горит красная лампочка.", room: "Т-101", status: "new", hoursAgo: 1 },
  { category: "canteen", text: "Тестовое обращение: хотелось бы больше вариантов без сахара на полдник.", room: null, status: "new", hoursAgo: 5 },
  { category: "idea", text: "Тестовая идея: поставить в холле полку для обмена книгами.", room: null, status: "new", hoursAgo: 26 },
  { category: "room", text: "Тестовое обращение: в кабинете очень холодно, окно плохо закрывается.", room: "Т-204", status: "in_progress", hoursAgo: 30, publicReply: "Передали завхозу, окно посмотрят на этой неделе." },
  { category: "tech", text: "Тестовое обращение: в компьютерном классе на трёх ПК не работает мышь.", room: "Т-305", status: "in_progress", hoursAgo: 50 },
  { category: "other", text: "Тестовое обращение: в раздевалке сломан крючок у третьего ряда.", room: null, status: "resolved", hoursAgo: 72, publicReply: "Крючок заменили. Спасибо, что написали." },
  { category: "idea", text: "Тестовая идея: проводить шахматный турнир на большой перемене раз в месяц.", room: null, status: "resolved", hoursAgo: 96, publicReply: "Идею поддержали, первый турнир в следующую пятницу." },
  { category: "canteen", text: "Тестовое обращение: хочу, чтобы в столовой продавали газировку.", room: null, status: "rejected", hoursAgo: 120, rejectionReason: "По правилам школьного питания газированные напитки продавать нельзя." },
  { category: "room", text: "Тестовое обращение: в кабинете нет розеток у задних парт.", room: "Т-110", status: "rejected", hoursAgo: 150, rejectionReason: "Дубликат: такое обращение уже в работе.", publicReply: "Следите за статусом первого обращения." },
  { category: "tech", text: "Тестовое обращение: в актовом зале фонит микрофон.", room: "Т-001", status: "new", hoursAgo: 0.25 },
];

function main() {
  const dbPath = getDatabasePath();
  const db = openDb(dbPath);
  const now = Date.now();
  const codes: { code: string; status: Status }[] = [];

  db.transaction(() => {
    deleteAllRequests(db);
    for (const item of ITEMS) {
      const createdAt = Math.round(now - item.hoursAgo * 60 * 60 * 1000);
      const updatedAt =
        item.status === "new" ? createdAt : Math.min(now, createdAt + 2 * 60 * 60 * 1000);
      const code = generateUniqueCode((c) => codeExists(db, c));
      insertRequest(db, {
        code,
        category: item.category,
        text: item.text,
        room: item.room,
        status: item.status,
        publicReply: item.publicReply ?? null,
        rejectionReason: item.rejectionReason ?? null,
        deviceId: "seed",
        createdAt,
        updatedAt,
      });
      codes.push({ code, status: item.status });
    }
  })();

  db.close();
  console.log(`Готово: ${codes.length} тестовых обращений в ${dbPath}`);
  for (const { code, status } of codes) console.log(`  ${code}  ${status}`);
}

try {
  main();
} catch (error) {
  console.error("Не удалось заполнить БД:", error);
  process.exit(1);
}
