import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import { readResume } from "../src/core/files.js";
import { packDocx } from "../src/renderers/docx.js";
import { getTheme, themeNames } from "../src/renderers/html.js";

const execFile = promisify(execFileCallback);

test("only the clera theme owns a Word layout", () => {
  assert.deepEqual(themeNames().filter((name) => getTheme(name).docx), ["clera"]);
});

test("clera docx reproduces every section, keeps links and is byte-for-byte deterministic", async () => {
  const resume = await readResume("profiles/example/printable-career.json");
  const parts = getTheme("clera").docx!(resume);
  const files = Object.fromEntries(parts);
  const document = files["word/document.xml"]!;
  for (const expected of [
    "Alex Example",
    "Senior Backend Engineer",
    "alex@example.test",
    "Work Experience",
    "Globex Systems",
    "January 2024 - Present",
    "Other Experience",
    "Education",
    "Technical University of Munich",
    "Skills",
    "Languages: ",
    "Native (C2)",
  ]) {
    assert.ok(document.includes(expected), `expected document.xml to include ${expected}`);
  }
  assert.match(document, /<w:pStyle w:val="Heading1"\/><\/w:pPr><w:r><w:t xml:space="preserve">Work Experience</);
  assert.match(document, /<w:tab w:val="right"/);
  assert.match(files["word/_rels/document.xml.rels"]!, /Target="mailto:alex@example.test" TargetMode="External"/);
  assert.match(files["docProps/core.xml"]!, /<dc:title>Alex Example - CV<\/dc:title>/);
  assert.ok(packDocx(parts).equals(packDocx(getTheme("clera").docx!(resume))));
});

test("the packed docx is a valid zip archive", { skip: process.platform === "win32" }, async (t) => {
  const scratch = await mkdtemp(path.join(tmpdir(), "cv-generator-docx-test-"));
  try {
    const output = path.join(scratch, "resume.docx");
    await writeFile(output, packDocx(getTheme("clera").docx!(await readResume("profiles/example/printable-career.json"))));
    let stdout: string;
    try {
      ({ stdout } = await execFile("unzip", ["-t", output]));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return t.skip("unzip not installed");
      throw error;
    }
    assert.match(stdout, /No errors detected/);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});
