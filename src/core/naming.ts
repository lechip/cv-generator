import type { Resume } from "../types.js";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatGenerationDate(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function filenamePersonName(name?: string): string {
  const compact = (name ?? "")
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "")
    .replace(/[^A-Za-z0-9]+/g, "");
  return compact || "Resume";
}

export function resumeLanguageCode(resume: Resume): string {
  const configured = resume.meta?.["x-cv"]?.language?.trim() || "en";
  try {
    const language = new Intl.Locale(configured).language.toLowerCase();
    if (/^[a-z]{2}$/.test(language)) return language;
  } catch {
    // The error below provides a stable, application-specific message.
  }
  throw new Error(`Resume language must resolve to a two-letter ISO 639-1 code: ${configured}`);
}

export function defaultOutputBaseName(resume: Resume, date: Date = new Date()): string {
  return `${formatGenerationDate(date)}-${filenamePersonName(resume.basics?.name)}-CV-${resumeLanguageCode(resume)}`;
}
