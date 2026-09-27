import { createRequire } from "node:module";
import path from "node:path";
import type { EducationEntry, LanguageEntry, Resume, ValidationResult, WorkEntry } from "../types.js";
import { readResume, resolveCanonicalPath, resumeKind, sha256File } from "./files.js";

const require = createRequire(import.meta.url);
const Ajv = require("ajv").default as new (options: Record<string, unknown>) => {
  compile: (schema: object) => ((data: unknown) => boolean) & { errors?: Array<{ instancePath: string; message?: string }> };
};
const addFormats = require("ajv-formats").default as (ajv: unknown) => void;
const officialSchema = require("@jsonresume/schema/schema.json") as object;
const canonicalSchema = require("../../schemas/canonical.schema.json") as object;
const printableSchema = require("../../schemas/printable.schema.json") as object;
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
ajv.compile(officialSchema);
const validateCanonical = ajv.compile(canonicalSchema);
const validatePrintable = ajv.compile(printableSchema);
const validateOfficial = ajv.compile({ $ref: "http://example.com/example.json" });

const comparableBasics = ["name", "email", "phone", "url", "location", "profiles"] as const;
const comparableWork = ["name", "location", "position", "url", "startDate", "endDate"] as const;
const comparableEducation = ["institution", "url", "area", "studyType", "startDate", "endDate", "score"] as const;
const comparableLanguage = ["language", "fluency"] as const;

function stable(value: unknown): string {
  if (Array.isArray(value)) return JSON.stringify(value.map(stable).sort());
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return JSON.stringify(Object.fromEntries(Object.keys(record).sort().map((key) => [key, stable(record[key])])));
  }
  return JSON.stringify(value);
}

function compareFields<T extends object>(
  label: string,
  selected: T,
  source: T,
  fields: readonly (keyof T)[],
  errors: string[],
): void {
  for (const field of fields) {
    if (stable(selected[field]) !== stable(source[field])) {
      errors.push(`${label}.${String(field)} differs from canonical data`);
    }
  }
}

function idsForCanonical(resume: Resume, errors: string[]): Map<string, WorkEntry> {
  const result = new Map<string, WorkEntry>();
  for (const [index, entry] of (resume.work ?? []).entries()) {
    const id = entry["x-cv"]?.id;
    if (!id) {
      errors.push(`canonical work[${index}] is missing x-cv.id`);
      continue;
    }
    if (result.has(id)) errors.push(`duplicate canonical work id: ${id}`);
    result.set(id, entry);
  }
  return result;
}

function requireStableIds(label: string, items: Array<{ "x-cv"?: { id?: string } }> | undefined, errors: string[]): void {
  const ids = new Set<string>();
  for (const [index, entry] of (items ?? []).entries()) {
    const id = entry["x-cv"]?.id;
    if (!id) errors.push(`canonical ${label}[${index}] is missing x-cv.id`);
    else if (ids.has(id)) errors.push(`duplicate canonical ${label} id: ${id}`);
    else ids.add(id);
  }
}

function validateLanguageProficiencies(languages: LanguageEntry[] | undefined, label: string, errors: string[]): void {
  for (const [index, language] of (languages ?? []).entries()) {
    const proficiency = language["x-cv"]?.proficiency;
    if (!proficiency) continue;
    if (language.fluency !== proficiency.level) {
      errors.push(`${label}[${index}].fluency must match x-cv.proficiency.level (${proficiency.level})`);
    }
    if (proficiency.status && proficiency.level !== "C2") {
      errors.push(`${label}[${index}].x-cv.proficiency.status requires CEFR level C2`);
    }
  }
}

function compareLanguageFacts(label: string, selected: LanguageEntry, source: LanguageEntry, errors: string[]): void {
  compareFields(label, selected, source, comparableLanguage, errors);
  if (stable(selected["x-cv"]?.proficiency) !== stable(source["x-cv"]?.proficiency)) {
    errors.push(`${label}.x-cv.proficiency differs from canonical data`);
  }
}

function pushSchemaErrors(
  validate: ((data: unknown) => boolean) & { errors?: Array<{ instancePath: string; message?: string }> },
  resume: Resume,
  errors: string[],
): void {
  if (!validate(resume)) {
    for (const error of validate.errors ?? []) {
      errors.push(`JSON Resume ${error.instancePath || "/"} ${error.message ?? "is invalid"}`);
    }
  }
}

function matchById<T extends { "x-cv"?: { id?: string; sourceId?: string } }>(items: T[] | undefined): Map<string, T> {
  return new Map((items ?? []).flatMap((item) => {
    const id = item["x-cv"]?.id ?? item["x-cv"]?.sourceId;
    return id ? [[id, item] as const] : [];
  }));
}

export async function validateResumeFile(filePath: string): Promise<ValidationResult> {
  const resume = await readResume(filePath);
  const kind = resumeKind(resume);
  const errors: string[] = [];
  const warnings: string[] = [];

  pushSchemaErrors(kind === "canonical" ? validateCanonical : kind === "printable" ? validatePrintable : validateOfficial, resume, errors);

  if (kind === "canonical") {
    idsForCanonical(resume, errors);
    requireStableIds("education", resume.education, errors);
    requireStableIds("language", resume.languages, errors);
    validateLanguageProficiencies(resume.languages, "canonical languages", errors);
    if (!resume.meta?.["x-cv"]?.source) errors.push("canonical meta.x-cv.source is required");
    if ((resume.work?.length ?? 0) === 0) errors.push("canonical work must contain at least one entry");
  }

  let canonicalPath: string | undefined;
  if (kind === "printable") {
    validateLanguageProficiencies(resume.languages, "printable languages", errors);
    const meta = resume.meta?.["x-cv"];
    canonicalPath = resolveCanonicalPath(filePath, resume);
    if (!canonicalPath) {
      errors.push("printable meta.x-cv.canonicalPath is required");
    } else {
      let canonical: Resume | undefined;
      try {
        canonical = await readResume(canonicalPath);
      } catch (error) {
        errors.push((error as Error).message);
      }

      if (canonical) {
        if (resumeKind(canonical) !== "canonical") {
          errors.push(`printable canonicalPath does not reference a canonical resume: ${canonicalPath}`);
        }
        const actualHash = await sha256File(canonicalPath);
        if (meta?.canonicalSha256 !== actualHash) {
          errors.push(`canonical hash is stale: expected ${actualHash}, found ${meta?.canonicalSha256 ?? "missing"}`);
        }

        compareFields("basics", resume.basics ?? {}, canonical.basics ?? {}, comparableBasics, errors);
        const canonicalWork = idsForCanonical(canonical, errors);
        const selectedIds = meta?.selectedWorkIds ?? [];
        const omittedIds = meta?.omittedWorkIds ?? [];
        const allIds = [...canonicalWork.keys()];
        const expectedOmitted = allIds.filter((id) => !selectedIds.includes(id));

        if (new Set(selectedIds).size !== selectedIds.length) errors.push("selectedWorkIds contains duplicates");
        if (stable([...omittedIds].sort()) !== stable([...expectedOmitted].sort())) {
          errors.push("omittedWorkIds does not match canonical entries not selected for detail");
        }

        const selectedWork = matchById(resume.work);
        if (stable([...selectedWork.keys()].sort()) !== stable([...selectedIds].sort())) {
          errors.push("printable work entries do not match selectedWorkIds");
        }
        for (const [id, entry] of selectedWork) {
          const source = canonicalWork.get(id);
          if (!source) errors.push(`selected work sourceId not found in canonical data: ${id}`);
          else compareFields(`work[${id}]`, entry, source, comparableWork, errors);
        }

        const canonicalEducation = matchById(canonical.education);
        for (const [id, entry] of matchById(resume.education)) {
          const source = canonicalEducation.get(id);
          if (!source) errors.push(`education sourceId not found in canonical data: ${id}`);
          else compareFields(`education[${id}]`, entry as EducationEntry, source as EducationEntry, comparableEducation, errors);
        }

        const canonicalLanguages = matchById(canonical.languages);
        for (const [id, entry] of matchById(resume.languages)) {
          const source = canonicalLanguages.get(id);
          if (!source) errors.push(`language sourceId not found in canonical data: ${id}`);
          else compareLanguageFacts(`language[${id}]`, entry as LanguageEntry, source as LanguageEntry, errors);
        }

        const other = resume["x-cv"]?.otherExperience;
        if (!other) {
          errors.push("printable x-cv.otherExperience is required");
        } else {
          if (other.count !== expectedOmitted.length) errors.push(`otherExperience.count must be ${expectedOmitted.length}`);
          if (other.totalCareerEntries !== allIds.length) errors.push(`otherExperience.totalCareerEntries must be ${allIds.length}`);
          for (const id of other.highlightedWorkIds) {
            if (!omittedIds.includes(id)) errors.push(`highlighted older role must be omitted from detail: ${id}`);
          }
          const expectedNames = other.highlightedWorkIds.map((id) => canonicalWork.get(id)?.name).filter(Boolean);
          if (stable(other.highlightedNames) !== stable(expectedNames)) {
            errors.push("otherExperience.highlightedNames does not match highlighted canonical work IDs");
          }
        }
      }
    }

    if (!resume["x-cv"]?.strengths?.length) errors.push("printable x-cv.strengths is required");
    if (!meta?.focus || !["recent", "relevant", "balanced"].includes(meta.focus)) {
      errors.push("printable meta.x-cv.focus must be recent, relevant, or balanced");
    }
  }

  if (kind === "standard") warnings.push("No meta.x-cv.kind found; only the official JSON Resume schema was checked");

  return { valid: errors.length === 0, kind, errors, warnings, canonicalPath };
}

export function assertValid(result: ValidationResult, filePath: string): void {
  if (!result.valid) {
    throw new Error(`Validation failed for ${path.resolve(filePath)}:\n- ${result.errors.join("\n- ")}`);
  }
}
