import type { Resume } from "../../types.js";
import { formatRange } from "../dates.js";
import { resumeKind } from "../files.js";
import { filenamePersonName } from "../naming.js";
import { collectRenderedStrings } from "./resumeText.js";
import { alnumTokens, htmlToText, normalizeText } from "./text.js";
import type { AtsFinding, PdfPage, PdfStructure } from "./types.js";

export interface ParseInput {
  pages: PdfPage[];
  resume: Resume;
  html: string;
  structure: PdfStructure;
  /** Headings the theme says it printed, in order. */
  expectedHeadings: string[];
  pdfFileName?: string;
}

interface Line {
  text: string;
  norm: string;
  page: number;
  lastOnPage: boolean;
  gaps: number[];
  strictText?: string;
}

const COLUMN_GAP_PT = 60;
const COLUMN_LINE_RATIO = 0.3;
const CONTACT_WINDOW = 6;
const FOOTER = /^page \d+ \/ \d+$/;
const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/;

function finding(level: AtsFinding["level"], code: string, message: string, extra: Partial<AtsFinding> = {}): AtsFinding {
  return { level, layer: "parse", code, message, ...extra };
}

function flatten(pages: PdfPage[]): Line[] {
  return pages.flatMap((page) => page.lines.map((line, index) => ({
    text: line.text,
    norm: normalizeText(line.text),
    page: page.page,
    lastOnPage: index === page.lines.length - 1,
    gaps: line.gaps,
    strictText: line.strictText,
  })));
}

/** Compare what the theme meant to print with what a text parser reads back from the PDF. */
export function analyzeExtractedText(input: ParseInput): AtsFinding[] {
  const findings: AtsFinding[] = [];
  const { resume, structure } = input;
  const lines = flatten(input.pages);
  const basics = resume.basics ?? {};
  const kind = resumeKind(resume);

  analyzeStructure(input, kind, findings);

  const totalChars = lines.reduce((sum, line) => sum + line.text.length, 0);
  if (totalChars < 50) {
    findings.push(finding("error", "no-text-layer", "The PDF has no usable text layer; parsers would see an empty document."));
    return findings;
  }

  const pdfTokens = new Set(alnumTokens(lines.map((line) => line.text).join("\n")));
  const missingTokens = [...new Set(alnumTokens(htmlToText(input.html)).filter((token) => token.length > 1))].filter((token) => !pdfTokens.has(token));
  if (missingTokens.length) {
    findings.push(finding("error", "text-missing-from-pdf", `${missingTokens.length} words of the HTML never reached the PDF text layer: ${missingTokens.slice(0, 20).join(", ")}${missingTokens.length > 20 ? ", ..." : ""}.`));
  }

  const unrendered = collectRenderedStrings(resume).filter((entry) => alnumTokens(entry.text).filter((token) => token.length > 1).some((token) => !pdfTokens.has(token)));
  if (unrendered.length) {
    findings.push(finding("warn", "field-not-rendered", `${unrendered.length} JSON fields are not readable in the PDF: ${unrendered.slice(0, 10).map((entry) => entry.path).join(", ")}${unrendered.length > 10 ? ", ..." : ""}.`, {
      hint: "The theme does not print these fields, or the words were split. Use the ats theme or move the facts into printed fields.",
    }));
  }

  const name = normalizeText(basics.name ?? "");
  if (name && lines[0]?.norm !== name) {
    findings.push(finding("error", "name-not-first-line", `First line is "${lines[0]?.text ?? ""}" instead of the candidate name.`, { page: 1, line: 1 }));
  }
  const label = normalizeText(basics.label ?? "");
  if (label && !lines.slice(0, 3).some((line) => line.norm.includes(label))) {
    findings.push(finding("warn", "label-not-near-name", "The title line (basics.label) is not within the first three lines."));
  }

  analyzeContact(resume, lines, findings);
  const headingIndex = analyzeHeadings(input.expectedHeadings, lines, findings);
  analyzeWorkEntries(resume, lines, headingIndex, findings);

  const orphans = lines.filter((line) => /^\d{4}$/.test(line.norm));
  if (orphans.length) findings.push(finding("warn", "date-orphan", `${orphans.length} line(s) hold only a year, so a date range wrapped: ${orphans.map((line) => `"${line.text}"`).join(", ")}.`));

  const hyphenated = lines.filter((line) => /[a-z]-$/i.test(line.text));
  if (hyphenated.length) {
    findings.push(finding("warn", "hyphen-line-break", `${hyphenated.length} line(s) end in a hyphen; parsers may glue the halves ("Event-" + "driven" → "Eventdriven"): ${hyphenated.slice(0, 5).map((line) => `"${line.text.slice(-30)}"`).join(", ")}.`, {
      hint: "Reword so the hyphenated term does not fall at the end of a line.",
    }));
  }

  const glued = lines.filter((line) => line.strictText !== undefined && wordCount(line.strictText) < wordCount(line.text));
  if (glued.length) {
    findings.push(finding("error", "words-glued", `${glued.length} line(s) lose their spaces in strict parsers, so words merge: ${glued.slice(0, 3).map((line) => `"${line.strictText!.slice(0, 60)}"`).join(", ")}.`, {
      page: glued[0]!.page,
      hint: "The PDF stores these spaces as separate empty text items. This is a theme defect, not a data problem: render with the ats theme.",
    }));
  }

  const footers = lines.filter((line) => FOOTER.test(line.norm));
  const inFlow = footers.filter((line) => !line.lastOnPage);
  if (inFlow.length) findings.push(finding("error", "footer-in-flow", `Page-number footer text appears inside the reading flow on page ${inFlow.map((line) => line.page).join(", ")}.`, { hint: "Use a theme without a footer (ats)." }));
  else if (footers.length) findings.push(finding("info", "footer-present", "Page-number footer present; it reads after the page content."));

  const columnLines = lines.filter((line) => line.gaps.some((gap) => gap > COLUMN_GAP_PT)).length;
  if (lines.length && columnLines / lines.length > COLUMN_LINE_RATIO) {
    findings.push(finding("error", "layout-multi-column", `${Math.round((columnLines / lines.length) * 100)}% of lines join text from two columns; strict parsers (Workday, Taleo) read them as one sentence.`, { hint: "Use the single-column ats theme." }));
  }

  return findings;
}

function wordCount(text: string): number {
  return text.split(" ").filter(Boolean).length;
}

function analyzeStructure(input: ParseInput, kind: ReturnType<typeof resumeKind>, findings: AtsFinding[]): void {
  const { structure, resume } = input;
  if (kind === "printable" && structure.pages > 2) findings.push(finding("error", "page-count", `${structure.pages} pages; printable CVs must fit two A4 pages.`));
  else findings.push(finding("info", "page-count", `${structure.pages} page${structure.pages === 1 ? "" : "s"}.`));

  const name = normalizeText(resume.basics?.name ?? "");
  if (!structure.title || (name && !normalizeText(structure.title).includes(name))) {
    findings.push(finding("warn", "pdf-title-missing", `PDF title metadata is "${structure.title ?? ""}"; it should carry the candidate name.`));
  }
  for (const font of structure.fonts) {
    if (!font.embedded) findings.push(finding("error", "font-not-embedded", `Font ${font.name} is not embedded; text may render or extract differently.`));
  }
  if (structure.images > 0) findings.push(finding("warn", "pdf-contains-image", `${structure.images} raster image(s) in the PDF; parsers ignore them and some penalise them.`));
  if (/<table[\s>]/i.test(input.html)) findings.push(finding("warn", "html-table", "The HTML uses a table; table cells scramble reading order in many parsers."));
  if (input.pdfFileName) {
    const expected = new RegExp(`^\\d{4}-\\d{2}-\\d{2}-${filenamePersonName(resume.basics?.name)}-CV-[a-z]{2}\\.pdf$`);
    if (!expected.test(input.pdfFileName)) findings.push(finding("warn", "file-name", `File name "${input.pdfFileName}" does not follow YYYY-MM-DD-Name-CV-xx.pdf.`));
  }
}

function analyzeContact(resume: Resume, lines: Line[], findings: AtsFinding[]): void {
  const basics = resume.basics ?? {};
  const head = lines.slice(0, CONTACT_WINDOW).map((line) => line.norm).join(" ");
  const headDigits = head.replace(/\D/g, "");

  if (basics.email) {
    if (!head.includes(normalizeText(basics.email))) findings.push(finding("error", "contact-email-missing", `Email ${basics.email} is not within the first ${CONTACT_WINDOW} lines.`));
  } else {
    findings.push(finding("warn", "contact-email-absent", "No email address in the JSON; every portal requires one.", { path: "basics.email" }));
  }
  if (!EMAIL.test(head) && basics.email) findings.push(finding("warn", "contact-email-unparsed", "No text in the header block matches an email pattern."));

  const phoneDigits = (basics.phone ?? "").replace(/\D/g, "");
  if (phoneDigits.length >= 6) {
    if (!headDigits.includes(phoneDigits)) findings.push(finding("error", "contact-phone-missing", `Phone ${basics.phone} is not within the first ${CONTACT_WINDOW} lines.`));
  } else {
    findings.push(finding("info", "contact-phone-absent", "No phone number in the JSON; many portals auto-fill and require one.", { path: "basics.phone" }));
  }

  const linkedin = (basics.profiles ?? []).find((profile) => /linkedin/i.test(`${profile.network ?? ""} ${profile.url ?? ""}`));
  if (linkedin) {
    if (!head.includes("linkedin.com/in/")) findings.push(finding("error", "contact-linkedin-missing", `LinkedIn profile is not within the first ${CONTACT_WINDOW} lines.`));
  } else {
    findings.push(finding("info", "contact-linkedin-absent", "No LinkedIn profile in the JSON; Workday cross-checks resumes against LinkedIn.", { path: "basics.profiles" }));
  }
}

function analyzeHeadings(expected: string[], lines: Line[], findings: AtsFinding[]): Map<string, number> {
  const found = new Map<string, number>();
  let previous = -1;
  let ordered = true;
  for (const heading of expected) {
    const norm = normalizeText(heading);
    const exact = lines.findIndex((line) => line.norm === norm);
    if (exact >= 0) {
      found.set(norm, exact);
      if (exact < previous) ordered = false;
      previous = Math.max(previous, exact);
      continue;
    }
    const merged = lines.find((line) => line.norm.includes(norm));
    if (merged) {
      findings.push(finding("error", "heading-not-isolated", `Heading "${heading}" shares its line with other text: "${merged.text}".`, { page: merged.page, hint: "Two-column layouts merge label and content on one line. Use the single-column ats theme." }));
    } else {
      findings.push(finding("error", "heading-missing", `Heading "${heading}" was not found in the PDF text.`));
    }
  }
  if (!ordered) findings.push(finding("warn", "heading-order", "Section headings appear in a different order than the theme emits them."));
  return found;
}

function analyzeWorkEntries(resume: Resume, lines: Line[], headingIndex: Map<string, number>, findings: AtsFinding[]): void {
  const work = resume.work ?? [];
  if (!work.length) return;
  const workHeading = [...headingIndex.entries()].find(([heading]) => heading.includes("experience") && !heading.startsWith("other"));
  let cursor = workHeading ? workHeading[1] + 1 : 0;

  work.forEach((entry, index) => {
    const position = normalizeText(entry.position);
    const company = normalizeText(entry.name);
    const range = normalizeText(formatRange(entry.startDate, entry.endDate));
    const path = `work[${index}]`;
    const at = lines.findIndex((line, lineIndex) => lineIndex >= cursor && line.norm.includes(position));
    if (at < 0) {
      findings.push(finding("error", "work-entry-split", `Position "${entry.position}" (${entry.name}) was not found after the work heading.`, { path }));
      return;
    }
    cursor = at + 1;
    const window = lines.slice(Math.max(0, at - 1), at + 4);
    const hasCompany = window.some((line) => line.norm.includes(company));
    const hasRange = window.some((line) => line.norm.includes(range));
    if (!hasCompany || !hasRange) {
      const rangeAnywhere = lines.some((line) => line.norm.includes(range));
      if (!hasRange && !rangeAnywhere) {
        findings.push(finding("error", "date-range-split", `Date range "${formatRange(entry.startDate, entry.endDate)}" for ${entry.name} is broken across lines.`, { path, page: lines[at]?.page, hint: "Dates must stay on one line; the ats theme keeps them unbreakable." }));
      } else {
        findings.push(finding("error", "work-entry-split", `${!hasCompany ? "Employer" : "Date range"} for "${entry.position}" at ${entry.name} is not within three lines of the position.`, { path, page: lines[at]?.page }));
      }
    }
  });
}
