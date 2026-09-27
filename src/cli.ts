#!/usr/bin/env node
import { access, copyFile, mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Command } from "commander";
import { readResume, resumeKind } from "./core/files.js";
import { defaultOutputBaseName, resumeLanguageCode } from "./core/naming.js";
import { DEFAULT_OUTPUT_DIRECTORY } from "./core/output.js";
import { assertValid, validateResumeFile } from "./core/validate.js";
import { renderHtml } from "./renderers/html.js";
import { renderMarkdown } from "./renderers/markdown.js";
import { renderPdf } from "./renderers/pdf.js";
import { renderOdt } from "./renderers/odt.js";

const program = new Command();
program.name("cv").description("Validate and render JSON Resume profiles without editorial transformations.").version("0.1.0");

function printValidation(result: Awaited<ReturnType<typeof validateResumeFile>>, resumePath: string): void {
  console.log(`${result.valid ? "VALID" : "INVALID"} ${result.kind} resume`);
  const resolvedResumePath = path.resolve(resumePath);
  console.log(`${result.kind === "canonical" ? "canonical" : result.kind === "printable" ? "printable" : "resume"}: ${resolvedResumePath}`);
  for (const warning of result.warnings) console.log(`warning: ${warning}`);
  for (const error of result.errors) console.error(`error: ${error}`);
  if (result.canonicalPath) console.log(`canonical: ${result.canonicalPath}`);
}

const EXAMPLE_CANONICAL_PATH = path.join("profiles", "example", "canonical-career.json");

program.command("init")
  .argument("<name>", "Folder name to create under profiles/, e.g. your first name")
  .action(async (name: string) => {
    const targetDirectory = path.join("profiles", name);
    const targetPath = path.join(targetDirectory, "canonical-career.json");

    let exists = true;
    try {
      await access(targetPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") exists = false;
      else throw error;
    }
    if (exists) throw new Error(`${targetPath} already exists. Edit it directly or choose a different name.`);

    await mkdir(targetDirectory, { recursive: true });
    await copyFile(EXAMPLE_CANONICAL_PATH, targetPath);
    console.log(`canonical: ${path.resolve(targetPath)}`);
    console.log("Next steps:");
    console.log(`  1. Replace the sample data in ${targetPath} with your own career facts.`);
    console.log(`  2. Run: pnpm cv validate ${targetPath}`);
    console.log(`  3. Use the tailor-cv skill to generate ${path.join(targetDirectory, "printable-career.json")}`);
  });

program.command("validate")
  .argument("<resume>", "Path to canonical or printable JSON Resume")
  .action(async (resumePath: string) => {
    const result = await validateResumeFile(resumePath);
    printValidation(result, resumePath);
    if (!result.valid) process.exitCode = 1;
  });

program.command("build")
  .argument("<resume>", "Path to JSON Resume")
  .option("-f, --formats <formats>", "Comma-separated: pdf,html,markdown,odt", "pdf")
  .option("-t, --theme <theme>", "Theme name", "modern-europass")
  .option("-o, --out <directory>", "Output directory", DEFAULT_OUTPUT_DIRECTORY)
  .action(async (resumePath: string, options: { formats: string; theme: string; out: string }) => {
    const validation = await validateResumeFile(resumePath);
    assertValid(validation, resumePath);
    const resume = await readResume(resumePath);
    const formats = [...new Set(options.formats.split(",").map((format) => format.trim().toLowerCase()).filter(Boolean))];
    const supported = new Set(["pdf", "html", "markdown", "md", "odt"]);
    for (const format of formats) if (!supported.has(format)) throw new Error(`Unsupported format: ${format}`);

    const outputDirectory = path.resolve(options.out);
    await mkdir(outputDirectory, { recursive: true });
    const base = defaultOutputBaseName(resume);
    const html = renderHtml(resume, options.theme);
    const markdown = renderMarkdown(resume);

    if (formats.includes("html")) {
      const output = path.join(outputDirectory, `${base}.html`);
      await writeFile(output, html, "utf8");
      console.log(`html: ${output}`);
    }
    if (formats.includes("markdown") || formats.includes("md")) {
      const output = path.join(outputDirectory, `${base}.md`);
      await writeFile(output, markdown, "utf8");
      console.log(`markdown: ${output}`);
    }
    if (formats.includes("pdf")) {
      const output = path.join(outputDirectory, `${base}.pdf`);
      const pageCount = await renderPdf(html, output);
      console.log(`pdf: ${output} (${pageCount} page${pageCount === 1 ? "" : "s"})`);
      if (resumeKind(resume) === "printable" && pageCount > 2) {
        throw new Error(`Printable PDF exceeds the two-page budget: ${pageCount} pages. Revise printable JSON; the renderer will not shrink or remove content.`);
      }
    }
    if (formats.includes("odt")) {
      const output = path.join(outputDirectory, `${base}.odt`);
      const engine = await renderOdt(markdown, html, output, path.resolve("themes", options.theme), resumeLanguageCode(resume));
      console.log(`odt: ${output} (${engine})`);
    }
  });

program.command("inspect")
  .argument("<resume>", "Path to JSON Resume")
  .option("-t, --theme <theme>", "Theme name", "modern-europass")
  .action(async (resumePath: string, options: { theme: string }) => {
    const validation = await validateResumeFile(resumePath);
    printValidation(validation, resumePath);
    if (!validation.valid) {
      process.exitCode = 1;
      return;
    }
    const resume = await readResume(resumePath);
    const selected = resume.meta?.["x-cv"]?.selectedWorkIds?.length ?? resume.work?.length ?? 0;
    const omitted = resume.meta?.["x-cv"]?.omittedWorkIds?.length ?? 0;
    console.log(`work: ${selected} detailed, ${omitted} condensed`);
    if (resumeKind(resume) === "printable") {
      const scratch = await mkdtemp(path.join(tmpdir(), "cv-generator-inspect-"));
      try {
        const pdfPath = path.join(scratch, "inspect.pdf");
        const pages = await renderPdf(renderHtml(resume, options.theme), pdfPath);
        console.log(`page budget: ${pages}/2 ${pages <= 2 ? "PASS" : "FAIL"}`);
        if (pages > 2) process.exitCode = 1;
      } finally {
        await rm(scratch, { recursive: true, force: true });
      }
    }
  });

program.parseAsync().catch((error: unknown) => {
  console.error((error as Error).message);
  process.exitCode = 1;
});
