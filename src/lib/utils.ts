import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function safeUrl(url: string): string {
  try {
    const parsed = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : "#";
  } catch {
    return "#";
  }
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("es", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

