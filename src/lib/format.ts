export const TIME_ZONE = "Africa/Douala";

export { formatFcfa } from "./money";

export function formatDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: TIME_ZONE }).format(d);
}

export function formatDateTime(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE,
  }).format(d);
}
