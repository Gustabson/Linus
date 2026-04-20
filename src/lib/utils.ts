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

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("es", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export const SECTION_LABELS: Record<string, string> = {
  PHILOSOPHY: "Filosofía Educativa",
  BEHAVIOR: "Comportamiento",
  EXERCISES: "Ejercicios",
  PROBLEMS: "Resolución de Problemas",
  ANTI_BULLYING: "Convivencia y Bullying",
  ECONOMY: "Educación Económica",
  SCIENTIFIC_METHOD: "Método Científico",
  ETHICS: "Ética",
  ASSESSMENT: "Evaluación",
  RESOURCES: "Recursos y Bibliografía",
};

export const SECTION_DESCRIPTIONS: Record<string, string> = {
  PHILOSOPHY: "Principios y valores que guían este currículo",
  BEHAVIOR: "Normas de convivencia y conducta esperada",
  EXERCISES: "Actividades prácticas y tareas",
  PROBLEMS: "Desafíos de pensamiento crítico",
  ANTI_BULLYING: "Prevención y resolución de conflictos",
  ECONOMY: "Conceptos de educación financiera",
  SCIENTIFIC_METHOD: "Razonamiento empírico y experimentación",
  ETHICS: "Dilemas morales y razonamiento ético",
  ASSESSMENT: "Criterios de evaluación y rúbricas",
  RESOURCES: "Bibliografía y materiales complementarios",
};

export const SECTION_ORDER = [
  "PHILOSOPHY",
  "BEHAVIOR",
  "EXERCISES",
  "PROBLEMS",
  "ANTI_BULLYING",
  "ECONOMY",
  "SCIENTIFIC_METHOD",
  "ETHICS",
  "ASSESSMENT",
  "RESOURCES",
];
