import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { analyzeResumeContent } from "../src/core/ats/content.js";
import { analyzeJobMatch, extractJobTerms } from "../src/core/ats/job.js";
import { analyzeExtractedText } from "../src/core/ats/parse.js";
import { TokenIndex, containsPhrase, htmlToText, normalizeText, stem } from "../src/core/ats/text.js";
import type { AtsFinding, PdfPage, PdfStructure } from "../src/core/ats/types.js";
import { readResume } from "../src/core/files.js";
import { getTheme, renderHtml } from "../src/renderers/html.js";
import type { Resume } from "../src/types.js";

const root = process.cwd();
const codes = (findings: AtsFinding[]) => findings.map((finding) => finding.code);
const noErrors = (findings: AtsFinding[]) => findings.filter((finding) => finding.level === "error");

test("text helpers normalise, stem and match phrases deterministically", () => {
  assert.equal(normalizeText("Event–driven “quotes”"), 'event-driven "quotes"');
  assert.equal(stem("services"), "service");
  assert.equal(stem("policies"), "policy");
  assert.ok(containsPhrase("Built services on Amazon Web Services and Node.js", "node.js"));
  assert.ok(containsPhrase("Query and cache optimization work", "cache optimizations"));
  assert.ok(new TokenIndex("Uses NodeJS daily").containsGlued("Node.js"));
  assert.ok(new TokenIndex("Uses Node.js daily").containsGlued("NodeJS"));
  assert.ok(!containsPhrase("Kafka streams", "Kubernetes"));
  assert.equal(htmlToText("<html><head><title>x</title><style>a{}</style></head><body><p>A &amp; B</p></body></html>"), "A & B");
});

test("content layer flags weak, generated and over-long bullets without raising errors", () => {
  const resume: Resume = {
    basics: { name: "Test Person", email: "t@example.test", summary: "Short." },
    work: [{
      name: "Co",
      position: "Engineer",
      startDate: "2020-01",
      highlights: [
        "Responsible for leveraging synergies — seamlessly",
        "Built a thing",
        "Built a thing",
        `Designed ${"very ".repeat(30)}long bullet`,
      ],
    }],
    meta: { "x-cv": { kind: "printable" } },
  };
  const { findings } = analyzeResumeContent(resume);
  const found = codes(findings);
  for (const code of ["label-missing", "summary-length", "bullet-weak-phrase", "bullet-no-action-verb", "ai-tell-word", "typography", "duplicate-bullet", "bullet-too-long"]) {
    assert.ok(found.includes(code), `expected ${code} in ${found.join(", ")}`);
  }
  assert.equal(noErrors(findings).length, 0, "content layer never raises errors");
  const aiTell = findings.find((finding) => finding.code === "ai-tell-word")!;
  assert.match(aiTell.message, /leveraging/);
  assert.match(aiTell.message, /synergies/);
  assert.match(aiTell.message, /seamlessly/);
});

test("content layer warns when a degree has no word parsers recognise", () => {
  const resume: Resume = {
    basics: { name: "Test Person" },
    education: [
      { institution: "Example University", studyType: "MSc", area: "Computer Science" },
      { institution: "Example University", studyType: "Bachelor of Science (BSc)", area: "Computer Science" },
    ],
    meta: { "x-cv": { kind: "printable" } },
  };
  const unclear = analyzeResumeContent(resume).findings.filter((finding) => finding.code === "education-degree-unclear");
  assert.deepEqual(unclear.map((finding) => finding.path), ["education[0].studyType"]);
});

test("legitimate nouns such as a test harness are not treated as generated prose", () => {
  const resume: Resume = {
    basics: { name: "Test Person", label: "Engineer", email: "t@example.test" },
    work: [{ name: "Co", position: "Engineer", startDate: "2020-01", highlights: ["Built a simulation harness that cut integration bugs in half"] }],
  };
  assert.ok(!codes(analyzeResumeContent(resume).findings).includes("ai-tell-word"));
});

test("content layer measures canonical keyword coverage and dropped metrics", async () => {
  const printable = await readResume(path.join(root, "profiles/example/printable-career.json"));
  const canonical = await readResume(path.join(root, "profiles/example/canonical-career.json"));
  const { findings, keywordCoverage } = analyzeResumeContent(printable, canonical);
  assert.ok(keywordCoverage);
  assert.equal(keywordCoverage.total, 13);
  assert.deepEqual(keywordCoverage.missing, ["Docker"]);
  assert.equal(noErrors(findings).length, 0);
  assert.equal(findings.find((finding) => finding.code === "keyword-coverage")?.level, "info", "a tailored CV may skip off-target skills");

  const general = structuredClone(printable);
  general.meta!["x-cv"]!.targetJob = null;
  assert.equal(analyzeResumeContent(general, canonical).findings.find((finding) => finding.code === "keyword-coverage")?.level, "warn", "a general CV must cover every skill");

  const dropped = structuredClone(printable);
  dropped.work![0]!.highlights = ["Designed the ledger service"];
  dropped.work![0]!.summary = "Owns the backend services.";
  assert.ok(codes(analyzeResumeContent(dropped, canonical).findings).includes("metric-dropped"));
});

const structure: PdfStructure = { pages: 1, title: "Test Person - CV", fonts: [{ name: "NotoSans", embedded: true }], images: 0 };
const parseResume: Resume = {
  basics: {
    name: "Test Person",
    label: "Engineer",
    email: "t@example.test",
    profiles: [{ network: "LinkedIn", url: "https://www.linkedin.com/in/test" }],
    summary: "Builds things.",
  },
  work: [{ name: "Co GmbH", position: "Senior Engineer", startDate: "2022-01", endDate: "2024-06", highlights: ["Built a thing"] }],
  skills: [{ name: "Core", keywords: ["TypeScript"] }],
  meta: { "x-cv": { kind: "printable" } },
};
const parseHtml = renderHtml(parseResume, "ats");
const parseHeadings = getTheme("ats").sectionHeadings(parseResume);
const goodLines = [
  "Test Person",
  "Engineer",
  "t@example.test | linkedin.com/in/test",
  "SUMMARY",
  "Builds things.",
  "SKILLS",
  "Core: TypeScript",
  "WORK EXPERIENCE",
  "Senior Engineer",
  "Co GmbH | January 2022 - June 2024",
  "• Built a thing",
];

function pages(lines: string[], gaps: Record<number, number[]> = {}): PdfPage[] {
  return [{ page: 1, lines: lines.map((text, index) => ({ text, y: 800 - index * 12, x: 50, gaps: gaps[index] ?? [] })) }];
}

function parse(lines: string[], gaps?: Record<number, number[]>): AtsFinding[] {
  return analyzeExtractedText({ pages: pages(lines, gaps), resume: parseResume, html: parseHtml, structure, expectedHeadings: parseHeadings });
}

test("parse layer accepts a clean single-column transcript", () => {
  const findings = parse(goodLines);
  assert.deepEqual(noErrors(findings), [], JSON.stringify(findings, null, 2));
});

test("parse layer reports merged headings, split dates, hyphen breaks, footers and columns", () => {
  const merged = [...goodLines];
  merged.splice(3, 2, "SUMMARY Builds things.");
  assert.ok(codes(parse(merged)).includes("heading-not-isolated"));

  const split = [...goodLines];
  split.splice(9, 1, "Co GmbH | January 2022 - June", "2024");
  const splitCodes = codes(parse(split));
  assert.ok(splitCodes.includes("date-range-split"));
  assert.ok(splitCodes.includes("date-orphan"));

  const hyphen = [...goodLines, "Built a service that is event-", "driven"];
  assert.ok(codes(parse(hyphen)).includes("hyphen-line-break"));

  const footer = [...goodLines];
  footer.splice(5, 0, "Page 1 / 2");
  assert.ok(codes(parse(footer)).includes("footer-in-flow"));
  assert.ok(!codes(parse([...goodLines, "Page 1 / 1"])).includes("footer-in-flow"));

  const columns = parse(goodLines, Object.fromEntries(goodLines.map((_, index) => [index, [80]])));
  assert.ok(codes(columns).includes("layout-multi-column"));

  const glued = pages(goodLines);
  glued[0]!.lines[2]!.strictText = "t@example.test|linkedin.com/in/test";
  assert.ok(codes(analyzeExtractedText({ pages: glued, resume: parseResume, html: parseHtml, structure, expectedHeadings: parseHeadings })).includes("words-glued"));
  assert.ok(!codes(parse(goodLines)).includes("words-glued"));

  const swapped = [goodLines[1]!, goodLines[0]!, ...goodLines.slice(2)];
  assert.ok(codes(parse(swapped)).includes("name-not-first-line"));

  const noContact = [...goodLines];
  noContact.splice(2, 1, "Berlin");
  const contactCodes = codes(parse(noContact));
  assert.ok(contactCodes.includes("contact-email-missing"));
  assert.ok(contactCodes.includes("contact-linkedin-missing"));
});

test("job layer extracts skill terms and reports coverage deterministically", async () => {
  const jobText = await readFile(path.join(root, "tests/fixtures/job.txt"), "utf8");
  const extracted = extractJobTerms(jobText);
  assert.equal(extracted.title, "Senior Backend Engineer (m/f/d) - Payments Platform");
  const names = extracted.terms.map((entry) => entry.term.toLowerCase());
  for (const expected of ["typescript", "node.js", "postgresql", "kafka", "kubernetes", "terraform", "ci/cd", "datadog"]) {
    assert.ok(names.includes(expected), `expected ${expected} in ${names.join(", ")}`);
  }
  assert.ok(!names.includes("improve"), "sentence-initial verbs are not keywords");
  assert.ok(!names.some((name) => name.includes(",")), "terms never span a comma");

  const printable = await readResume(path.join(root, "profiles/example/printable-career.json"));
  const { jobMatch, findings } = analyzeJobMatch(printable, jobText);
  assert.equal(jobMatch.titleAligned, true);
  assert.ok(jobMatch.matched.includes("Kafka"));
  assert.ok(jobMatch.missing.includes("Terraform"));
  assert.ok(codes(findings).includes("title-aligned"));
  assert.ok(codes(findings).includes("job-keyword-coverage"));
});
