import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import test from "node:test";
import { readResume } from "../src/core/files.js";
import { renderHtml } from "../src/renderers/html.js";
import { renderMarkdown } from "../src/renderers/markdown.js";
import { renderOdt } from "../src/renderers/odt.js";
import { countPdfPages } from "../src/renderers/pdf.js";

const execFile = promisify(execFileCallback);

test("editable ODT is valid, complete, and two pages in LibreOffice", { skip: process.env.RUN_ODT_TESTS !== "1", timeout: 30_000 }, async () => {
  const scratch = await mkdtemp(path.join(tmpdir(), "cv-generator-odt-test-"));
  try {
    const resume = await readResume("profiles/example/printable-career.json");
    const output = path.join(scratch, "resume.odt");
    await renderOdt(renderMarkdown(resume), renderHtml(resume, "modern-europass"), output, path.resolve("themes/modern-europass"));
    const integrity = await execFile("unzip", ["-t", output]);
    assert.match(integrity.stdout, /No errors detected/);
    const content = await execFile("unzip", ["-p", output, "content.xml"], { maxBuffer: 8 * 1024 * 1024 });
    for (const expected of [
      "Alex Example",
      "Globex Systems",
      "Other Experience",
      "Education",
      "Languages",
      "Native (C2)",
      "Proficient (C2)",
      "Advanced (C1)",
      "Intermediate (B1)",
    ]) {
      assert.ok(content.stdout.includes(expected), `expected ODT content to include ${expected}`);
    }
    const profile = path.join(scratch, "libreoffice-profile");
    const soffice = process.env.SOFFICE ?? "soffice";
    await execFile(soffice, [
      `-env:UserInstallation=${pathToFileURL(profile).href}`,
      "--headless", "--convert-to", "pdf", "--outdir", scratch, output,
    ]);
    assert.equal(await countPdfPages(path.join(scratch, "resume.pdf")), 2);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});
