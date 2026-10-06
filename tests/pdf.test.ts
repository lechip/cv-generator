import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { runAtsCheck } from "../src/core/ats/index.js";
import { readResume } from "../src/core/files.js";
import { getTheme, renderHtml, themeNames } from "../src/renderers/html.js";
import { renderPdf } from "../src/renderers/pdf.js";

const skip = process.env.RUN_PDF_TESTS !== "1";

for (const theme of themeNames()) {
  test(`replaceable printable PDF with the ${theme} theme is no more than two A4 pages`, { skip }, async () => {
    const scratch = await mkdtemp(path.join(tmpdir(), "cv-generator-pdf-test-"));
    try {
      const resume = await readResume("profiles/example/printable-career.json");
      const pages = await renderPdf(renderHtml(resume, theme), path.join(scratch, "resume.pdf"), getTheme(theme).pdf);
      assert.ok(pages <= 2, `expected <= 2 pages, got ${pages}`);
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  });
}

async function check(resumePath: string, theme: string) {
  const scratch = await mkdtemp(path.join(tmpdir(), "cv-generator-ats-test-"));
  try {
    const resume = await readResume(resumePath);
    const canonical = resume.meta?.["x-cv"]?.kind === "printable" ? await readResume(path.join(path.dirname(resumePath), resume.meta["x-cv"].canonicalPath!)) : undefined;
    const html = renderHtml(resume, theme);
    const pdfPath = path.join(scratch, "resume.pdf");
    await renderPdf(html, pdfPath, getTheme(theme).pdf);
    return runAtsCheck({
      resumePath,
      resume,
      canonical,
      theme,
      html,
      expectedHeadings: getTheme(theme).sectionHeadings(resume),
      pdf: { bytes: new Uint8Array(await readFile(pdfPath)) },
    });
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

test("ats-check passes the example printable and the standard fixture with the ats theme", { skip, timeout: 60_000 }, async () => {
  for (const resumePath of ["profiles/example/printable-career.json", "tests/fixtures/standard.json"]) {
    const report = await check(resumePath, "ats");
    assert.equal(report.counts.error, 0, `${resumePath}: ${report.findings.filter((finding) => finding.level === "error").map((finding) => finding.message).join("\n")}`);
    assert.ok(report.ok);
    assert.ok(!report.findings.some((finding) => finding.code === "words-glued"), `${resumePath}: strict parsers must keep every space`);
  }
});

test("ats-check documents the two-column limitation of modern-europass", { skip, timeout: 60_000 }, async () => {
  const report = await check("profiles/example/printable-career.json", "modern-europass");
  assert.equal(report.ok, false);
  assert.ok(report.findings.some((finding) => finding.code === "heading-not-isolated"));
  assert.ok(report.findings.some((finding) => finding.code === "words-glued"), "tagged PDFs lose spaces in strict parsers");
});
