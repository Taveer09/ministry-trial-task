import { DISPLAY_TIME_ZONE } from "./constants";

const formatter = new Intl.DateTimeFormat("ru-RU", {
  timeZone: DISPLAY_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDateTime(ms: number): string {
  return formatter.format(new Date(ms));
}
