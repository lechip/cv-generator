import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Resume } from "../types.js";

export async function readResume(filePath: string): Promise<Resume> {
  const absolute = path.resolve(filePath);
  const text = await readFile(absolute, "utf8");
  try {
    return JSON.parse(text) as Resume;
  } catch (error) {
    throw new Error(`Invalid JSON in ${absolute}: ${(error as Error).message}`);
  }
}

export async function sha256File(filePath: string): Promise<string> {
  const data = await readFile(path.resolve(filePath));
  return createHash("sha256").update(data).digest("hex");
}

export function resumeKind(resume: Resume): "canonical" | "printable" | "standard" {
  const kind = resume.meta?.["x-cv"]?.kind;
  return kind === "canonical" || kind === "printable" ? kind : "standard";
}

export function resolveCanonicalPath(printablePath: string, resume: Resume): string | undefined {
  const configured = resume.meta?.["x-cv"]?.canonicalPath;
  return configured ? path.resolve(path.dirname(path.resolve(printablePath)), configured) : undefined;
}
