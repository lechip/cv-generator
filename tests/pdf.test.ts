import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { readResume } from "../src/core/files.js";
import { renderHtml } from "../src/renderers/html.js";
import { renderPdf } from "../src/renderers/pdf.js";

test("replaceable printable PDF is no more than two A4 pages", { skip: process.env.RUN_PDF_TESTS !== "1" }, async () => {
  const scratch = await mkdtemp(path.join(tmpdir(), "cv-generator-pdf-test-"));
  try {
    const resume = await readResume("profiles/example/printable-career.json");
    const pages = await renderPdf(renderHtml(resume, "modern-europass"), path.join(scratch, "resume.pdf"));
    assert.ok(pages <= 2, `expected <= 2 pages, got ${pages}`);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});
