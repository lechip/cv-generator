import type { CefrLevel, LanguageEntry, OtherExperience, Resume, StrengthEntry } from "../types.js";

const cefrRanks: Record<CefrLevel, number> = {
  A1: 100,
  A2: 200,
  B1: 300,
  B2: 400,
  C1: 500,
  C2: 600,
};

const cefrDescriptions: Record<CefrLevel, string> = {
  A1: "Beginner",
  A2: "Elementary",
  B1: "Intermediate",
  B2: "Upper Intermediate",
  C1: "Advanced",
  C2: "Proficient",
};

const proficiencyRanks: Record<string, number> = {
  "native or bilingual": 600,
  native: 600,
  bilingual: 600,
  c2: 600,
  c1: 550,
  "full professional": 500,
  b2: 450,
  "professional working": 400,
  b1: 350,
  "limited working": 300,
  a2: 250,
  elementary: 200,
  a1: 150,
};

function normalizeProficiency(value: string): string {
  return value.trim().toLocaleLowerCase("en").replace(/\s+proficiency$/, "").replace(/\s+/g, " ");
}

export function languageProficiencyRank(fluency: string): number {
  return proficiencyRanks[normalizeProficiency(fluency)] ?? 0;
}

function structuredProficiencyRank(language: LanguageEntry): number {
  const proficiency = language["x-cv"]?.proficiency;
  return proficiency?.framework === "CEFR" ? cefrRanks[proficiency.level] : languageProficiencyRank(language.fluency);
}

function languageStatusRank(language: LanguageEntry): number {
  const status = language["x-cv"]?.proficiency?.status;
  return status === "native" ? 2 : status === "bilingual" ? 1 : 0;
}

export function languageDisplayFluency(language: LanguageEntry): string {
  const proficiency = language["x-cv"]?.proficiency;
  if (proficiency?.framework !== "CEFR") return language.fluency;
  if (proficiency.status === "native") return `Native (${proficiency.level})`;
  if (proficiency.status === "bilingual") return `Bilingual (${proficiency.level})`;
  return `${cefrDescriptions[proficiency.level]} (${proficiency.level})`;
}

export function sortLanguages(languages: LanguageEntry[] = []): LanguageEntry[] {
  return [...languages].sort((left, right) => {
    const proficiencyDifference = structuredProficiencyRank(right) - structuredProficiencyRank(left);
    const statusDifference = languageStatusRank(right) - languageStatusRank(left);
    return proficiencyDifference || statusDifference || left.language.localeCompare(right.language, "en", { sensitivity: "base" });
  });
}

export interface ViewModel {
  resume: Resume;
  strengths: StrengthEntry[];
  languages: LanguageEntry[];
  otherExperience?: OtherExperience;
  printable: boolean;
}

export function createViewModel(resume: Resume): ViewModel {
  return {
    resume,
    strengths: resume["x-cv"]?.strengths ?? [],
    languages: sortLanguages(resume.languages),
    otherExperience: resume["x-cv"]?.otherExperience,
    printable: resume.meta?.["x-cv"]?.kind === "printable",
  };
}
