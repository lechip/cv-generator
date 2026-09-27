import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { formatMonth, formatRange } from "../src/core/dates.js";
import { readResume } from "../src/core/files.js";
import { languageDisplayFluency, languageProficiencyRank, sortLanguages } from "../src/core/model.js";
import { defaultOutputBaseName, filenamePersonName, formatGenerationDate, resumeLanguageCode } from "../src/core/naming.js";
import { DEFAULT_OUTPUT_DIRECTORY } from "../src/core/output.js";
import { validateResumeFile } from "../src/core/validate.js";
import { renderHtml } from "../src/renderers/html.js";
import { renderMarkdown } from "../src/renderers/markdown.js";
import type { Resume } from "../src/types.js";

const root = process.cwd();
const canonicalPath = path.join(root, "profiles/example/canonical-career.json");
const printablePath = path.join(root, "profiles/example/printable-career.json");

test("canonical profile validates and preserves the full career inventory", async () => {
  const result = await validateResumeFile(canonicalPath);
  const resume = await readResume(canonicalPath);
  assert.equal(result.valid, true, result.errors.join("\n"));
  assert.equal(resume.work?.length, 6);
  assert.equal(resume.education?.length, 2);
  assert.equal(resume.languages?.length, 4);
  assert.equal(resume.awards?.length, 1);
});

test("replaceable printable profile reconciles three detailed and three condensed roles", async () => {
  const result = await validateResumeFile(printablePath);
  const resume = await readResume(printablePath);
  assert.equal(result.valid, true, result.errors.join("\n"));
  assert.equal(resume.work?.length, 3);
  assert.equal(resume["x-cv"]?.otherExperience?.count, 3);
  assert.equal(resume["x-cv"]?.otherExperience?.totalCareerEntries, 6);
});

async function makeTemporaryPair(): Promise<{ directory: string; canonical: string; printable: string }> {
  const directory = await mkdtemp(path.join(tmpdir(), "cv-generator-test-"));
  const canonical = path.join(directory, "canonical-career.json");
  const printable = path.join(directory, "printable-career.json");
  const canonicalBytes = await readFile(canonicalPath);
  const tailored = JSON.parse(await readFile(printablePath, "utf8")) as Resume;
  tailored.meta!["x-cv"]!.canonicalPath = "canonical-career.json";
  tailored.meta!["x-cv"]!.canonicalSha256 = createHash("sha256").update(canonicalBytes).digest("hex");
  await writeFile(canonical, canonicalBytes);
  await writeFile(printable, `${JSON.stringify(tailored, null, 2)}\n`);
  return { directory, canonical, printable };
}

test("canonical hash invalidates a stale printable profile", async () => {
  const pair = await makeTemporaryPair();
  try {
    assert.equal((await validateResumeFile(pair.printable)).valid, true);
    const canonical = JSON.parse(await readFile(pair.canonical, "utf8")) as Resume;
    canonical.basics!.summary = `${canonical.basics!.summary} Updated.`;
    await writeFile(pair.canonical, `${JSON.stringify(canonical, null, 2)}\n`);
    const stale = await validateResumeFile(pair.printable);
    assert.equal(stale.valid, false);
    assert.match(stale.errors.join("\n"), /canonical hash is stale/);
  } finally {
    await rm(pair.directory, { recursive: true, force: true });
  }
});

test("printable canonicalPath must identify a canonical resume", async () => {
  const pair = await makeTemporaryPair();
  try {
    const source = JSON.parse(await readFile(pair.canonical, "utf8")) as Resume;
    source.meta!["x-cv"]!.kind = "printable";
    const sourceBytes = `${JSON.stringify(source, null, 2)}\n`;
    await writeFile(pair.canonical, sourceBytes);

    const printable = JSON.parse(await readFile(pair.printable, "utf8")) as Resume;
    printable.meta!["x-cv"]!.canonicalSha256 = createHash("sha256").update(sourceBytes).digest("hex");
    await writeFile(pair.printable, `${JSON.stringify(printable, null, 2)}\n`);

    const invalid = await validateResumeFile(pair.printable);
    assert.equal(invalid.valid, false);
    assert.match(invalid.errors.join("\n"), /canonicalPath does not reference a canonical resume/);
  } finally {
    await rm(pair.directory, { recursive: true, force: true });
  }
});

test("immutable work facts cannot be rewritten in printable JSON", async () => {
  const pair = await makeTemporaryPair();
  try {
    const tailored = JSON.parse(await readFile(pair.printable, "utf8")) as Resume;
    tailored.work![0]!.name = "Invented Employer";
    await writeFile(pair.printable, `${JSON.stringify(tailored, null, 2)}\n`);
    const mismatch = await validateResumeFile(pair.printable);
    assert.equal(mismatch.valid, false);
    assert.match(mismatch.errors.join("\n"), /work\[work-globex-2025\]\.name differs/);
  } finally {
    await rm(pair.directory, { recursive: true, force: true });
  }
});

test("structured language proficiency cannot diverge from canonical JSON", async () => {
  const pair = await makeTemporaryPair();
  try {
    const tailored = JSON.parse(await readFile(pair.printable, "utf8")) as Resume;
    const english = tailored.languages!.find(({ language }) => language === "English")!;
    english.fluency = "C1";
    english["x-cv"]!.proficiency!.level = "C1";
    await writeFile(pair.printable, `${JSON.stringify(tailored, null, 2)}\n`);
    const mismatch = await validateResumeFile(pair.printable);
    assert.equal(mismatch.valid, false);
    assert.match(mismatch.errors.join("\n"), /language\[language-english\]\.x-cv\.proficiency differs/);
  } finally {
    await rm(pair.directory, { recursive: true, force: true });
  }
});

test("date formatting is deterministic", () => {
  assert.equal(formatMonth("2025-09"), "September 2025");
  assert.equal(formatMonth("2016"), "2016");
  assert.equal(formatRange("2025-09"), "September 2025 - Present");
});

test("default output names use date, compact person name, and ISO language", () => {
  const resume: Resume = {
    basics: { name: "María José Öztürk-Dupont" },
    meta: { "x-cv": { kind: "printable", language: "es-ES" } },
  };
  const date = new Date(2026, 7, 3, 12, 0, 0);
  assert.equal(formatGenerationDate(date), "2026-08-03");
  assert.equal(filenamePersonName(resume.basics?.name), "MariaJoseOzturkDupont");
  assert.equal(resumeLanguageCode(resume), "es");
  assert.equal(defaultOutputBaseName(resume, date), "2026-08-03-MariaJoseOzturkDupont-CV-es");
  assert.equal(resumeLanguageCode({}), "en");
  assert.throws(() => resumeLanguageCode({ meta: { "x-cv": { kind: "canonical", language: "invalid" } } }), /two-letter ISO 639-1/);
  assert.equal(DEFAULT_OUTPUT_DIRECTORY, "output");
});

test("languages use deterministic CEFR labels and proficiency-first ordering", () => {
  const languages = [
    { language: "French", fluency: "B1", "x-cv": { proficiency: { framework: "CEFR" as const, level: "B1" as const } } },
    { language: "Spanish", fluency: "C2", "x-cv": { proficiency: { framework: "CEFR" as const, level: "C2" as const, status: "native" as const } } },
    { language: "German", fluency: "C1", "x-cv": { proficiency: { framework: "CEFR" as const, level: "C1" as const } } },
    { language: "English", fluency: "C2", "x-cv": { proficiency: { framework: "CEFR" as const, level: "C2" as const } } },
    { language: "Esperanto", fluency: "Conversational" },
  ];
  assert.deepEqual(sortLanguages(languages).map(({ language }) => language), ["Spanish", "English", "German", "French", "Esperanto"]);
  assert.deepEqual(languages.map(({ language }) => language), ["French", "Spanish", "German", "English", "Esperanto"]);
  assert.deepEqual(sortLanguages(languages).map(languageDisplayFluency), [
    "Native (C2)",
    "Proficient (C2)",
    "Advanced (C1)",
    "Intermediate (B1)",
    "Conversational",
  ]);
  assert.ok(languageProficiencyRank("C2") > languageProficiencyRank("Full Professional Proficiency"));
});

test("every CEFR level and bilingual status has a stable display label", () => {
  const display = (level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2", status?: "native" | "bilingual") =>
    languageDisplayFluency({
      language: "Example",
      fluency: level,
      "x-cv": { proficiency: { framework: "CEFR", level, ...(status ? { status } : {}) } },
    });

  const levels = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
  assert.deepEqual(levels.map((level) => display(level)), [
    "Beginner (A1)",
    "Elementary (A2)",
    "Intermediate (B1)",
    "Upper Intermediate (B2)",
    "Advanced (C1)",
    "Proficient (C2)",
  ]);
  assert.equal(display("C2", "native"), "Native (C2)");
  assert.equal(display("C2", "bilingual"), "Bilingual (C2)");
});

test("all renderers use the shared language proficiency ordering", async () => {
  const resume = await readResume(printablePath);
  const html = renderHtml(resume, "modern-europass");
  const markdown = renderMarkdown(resume);
  for (const output of [html, markdown]) {
    const offsets = ["Spanish", "English", "German", "French"].map((language) => output.lastIndexOf(language));
    assert.ok(offsets.every((offset) => offset >= 0));
    assert.ok(offsets.every((offset, index) => index === 0 || offsets[index - 1]! < offset));
    for (const label of ["Native (C2)", "Proficient (C2)", "Advanced (C1)", "Intermediate (B1)"]) {
      assert.ok(output.includes(label));
    }
  }
});

test("renderers reproduce every supplied work entry without selecting content", async () => {
  const resume = await readResume(canonicalPath);
  const html = renderHtml(resume, "modern-europass");
  const markdown = renderMarkdown(resume);
  for (const work of resume.work ?? []) {
    assert.match(html, new RegExp(work.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(markdown, new RegExp(work.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("semantic HTML and Markdown snapshots remain stable", async () => {
  const resume = await readResume(path.join(root, "tests/fixtures/standard.json"));
  const markdown = renderMarkdown(resume);
  const html = renderHtml(resume, "modern-europass").replace(/<style>[\s\S]*<\/style>/, "<style>[theme-css]</style>");
  assert.equal(markdown, await readFile(path.join(root, "tests/snapshots/standard.md"), "utf8"));
  assert.equal(html, (await readFile(path.join(root, "tests/snapshots/standard.html"), "utf8")).trimEnd());
});
