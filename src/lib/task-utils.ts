import { format, isToday, isTomorrow, isPast, parseISO } from "date-fns";

export const PRIORITY_CONFIG = {
  urgent: { label: "Urgent", color: "#ef4444", bgClass: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  high: { label: "High", color: "#f97316", bgClass: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  normal: { label: "Normal", color: "#3b82f6", bgClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  low: { label: "Low", color: "#6b7280", bgClass: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400" },
} as const;

export type Priority = keyof typeof PRIORITY_CONFIG;

export function formatDueDate(dateStr: string | null): { text: string; overdue: boolean } | null {
  if (!dateStr) return null;

  const date = parseISO(dateStr);

  if (isToday(date)) {
    return { text: "Today", overdue: false };
  }

  if (isTomorrow(date)) {
    return { text: "Tomorrow", overdue: false };
  }

  const overdue = isPast(date);
  return { text: format(date, "MMM d"), overdue };
}

export function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
