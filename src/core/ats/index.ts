import type { Resume } from "../../types.js";
import { resumeKind } from "../files.js";
import { analyzeResumeContent } from "./content.js";
import { analyzeJobMatch } from "./job.js";
import { analyzeExtractedText } from "./parse.js";
import { extractPdfPages, inspectPdfStructure } from "./pdf.js";
import { countFindings } from "./report.js";
import type { AtsFinding, AtsReport } from "./types.js";

export interface AtsCheckInput {
  resumePath: string;
  resume: Resume;
  /** Canonical data, when the resume is a printable derivative; enables keyword coverage and metric checks. */
  canonical?: Resume;
  theme: string;
  html: string;
  /** Headings the theme emits for this resume, in order. */
  expectedHeadings: string[];
  pdf?: { bytes: Uint8Array; fileName?: string; path?: string };
  jobText?: string;
}

/** Read-only diagnostics. Nothing here edits resume data; findings are feedback for the tailoring skill. */
export async function runAtsCheck(input: AtsCheckInput): Promise<AtsReport> {
  const findings: AtsFinding[] = [];
  const content = analyzeResumeContent(input.resume, input.canonical);
  findings.push(...content.findings);

  let pdf: AtsReport["pdf"];
  if (input.pdf) {
    const structure = await inspectPdfStructure(input.pdf.bytes);
    const pages = await extractPdfPages(input.pdf.bytes);
    pdf = { ...structure, path: input.pdf.path };
    findings.push(...analyzeExtractedText({ pages, resume: input.resume, html: input.html, structure, expectedHeadings: input.expectedHeadings, pdfFileName: input.pdf.fileName }));
  }

  let jobMatch: AtsReport["jobMatch"];
  if (input.jobText?.trim()) {
    const job = analyzeJobMatch(input.resume, input.jobText);
    findings.push(...job.findings);
    jobMatch = job.jobMatch;
  }

  const counts = countFindings(findings);
  return {
    resumePath: input.resumePath,
    kind: resumeKind(input.resume),
    theme: input.theme,
    pdf,
    findings,
    keywordCoverage: content.keywordCoverage,
    jobMatch,
    counts,
    ok: counts.error === 0,
  };
}

export { analyzeResumeContent } from "./content.js";
export { analyzeJobMatch, extractJobTerms } from "./job.js";
export { analyzeExtractedText } from "./parse.js";
export { extractPdfPages, inspectPdfStructure } from "./pdf.js";
export { formatReport } from "./report.js";
export { collectRenderedStrings, renderedText } from "./resumeText.js";
export type * from "./types.js";
