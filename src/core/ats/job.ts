import type { Resume } from "../../types.js";
import { JOB_COVERAGE_WARN_BELOW, STOPWORDS, TECH_SKILLS } from "./lexicon.js";
import { termMatches, uniqueTerms } from "./match.js";
import { renderedText } from "./resumeText.js";
import { TokenIndex, alnumTokens, normalizeText, percent } from "./text.js";
import type { AtsFinding, JobMatch } from "./types.js";

export interface JobTerm {
  term: string;
  count: number;
}

export interface JobTerms {
  title?: string;
  terms: JobTerm[];
}

const MAX_TERMS = 60;
const TITLE_LINE = /^(?:job title|position|role|title)\s*:\s*(.+)$/i;
const SEGMENT_SPLIT = /\.(?=\s|$)|[,;:\n•|()[\]!?]+|\s[-–—]\s/;
const TITLE_NOISE = new Set(["m/f/d", "w/m/d", "f/m/d", "d/f/m", "m/w/d", "gn", "mfd", "wmd", "fmd", "dfm", "mwd", "and", "or", "the", "a", "an", "of", "for", "in", "at", "to", "with"]);

function cleanWord(word: string): string {
  return normalizeText(word).replace(/^[^\p{L}\p{N}#+.]+/u, "").replace(/[^\p{L}\p{N}#+]+$/u, "");
}

/** Deterministic keyword extraction: skill terms, capitalised names and repeated phrases, 1-3 words long. */
export function extractJobTerms(jobText: string): JobTerms {
  const lines = jobText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const explicit = lines.map((line) => TITLE_LINE.exec(line)?.[1]?.trim()).find(Boolean);
  const title = (explicit ?? lines[0])?.slice(0, 120);

  const counts = new Map<string, { term: string; count: number; qualifies: boolean }>();
  for (const segment of jobText.split(SEGMENT_SPLIT)) {
    const words = segment.split(/\s+/).filter(Boolean);
    const tokens = words.map(cleanWord);
    const firstContent = tokens.findIndex(Boolean);
    for (let size = 1; size <= 3; size += 1) {
      for (let start = 0; start + size <= tokens.length; start += 1) {
        const slice = tokens.slice(start, start + size);
        if (slice.some((token) => !token || /^\d+$/.test(token))) continue;
        if (STOPWORDS.has(slice[0]!) || STOPWORDS.has(slice[slice.length - 1]!)) continue;
        if (slice.every((token) => STOPWORDS.has(token))) continue;
        const gram = slice.join(" ");
        const isTech = TECH_SKILLS.has(gram);
        if (size === 1 && gram.length < 2 && !isTech) continue;
        if (size === 1 && gram.length === 1 && !/^[A-Z]$/.test(words[start]!)) continue;
        const original = words.slice(start, start + size);
        const capitalised = start > firstContent && original.every((word) => /^[A-Z]/.test(word)) && !original.every((word) => /^[A-Z0-9]+$/.test(word) && word.length > 6);
        const entry = counts.get(gram) ?? { term: original.join(" ").replace(/[,:;.]+$/, ""), count: 0, qualifies: false };
        entry.count += 1;
        entry.qualifies = entry.qualifies || isTech || capitalised;
        counts.set(gram, entry);
      }
    }
  }

  const terms = [...counts.values()]
    .filter((entry) => entry.qualifies || entry.count >= 2)
    .filter((entry) => !(entry.count < 2 && !entry.qualifies))
    .sort((left, right) => right.count * right.term.split(" ").length - left.count * left.term.split(" ").length || left.term.localeCompare(right.term, "en"))
    .slice(0, MAX_TERMS)
    .map(({ term, count }) => ({ term, count }));
  return { title, terms: dedupeNested(terms) };
}

/** Drop a unigram when a kept multi-word tech term already contains it ("spark" inside "apache spark"). */
function dedupeNested(terms: JobTerm[]): JobTerm[] {
  const multi = terms.filter((entry) => entry.term.includes(" ") && TECH_SKILLS.has(normalizeText(entry.term)));
  return terms.filter((entry) => entry.term.includes(" ") || !multi.some((other) => alnumTokens(other.term).includes(normalizeText(entry.term))));
}

export function analyzeJobMatch(resume: Resume, jobText: string): { findings: AtsFinding[]; jobMatch: JobMatch } {
  const findings: AtsFinding[] = [];
  const extracted = extractJobTerms(jobText);
  const index = new TokenIndex(renderedText(resume));
  const terms = uniqueTerms(extracted.terms.map((entry) => entry.term));
  const matched = terms.filter((term) => termMatches(index, term));
  const missing = terms.filter((term) => !matched.includes(term));
  const label = resume.basics?.label;
  const titleAligned = alignTitle(extracted.title, label);
  const jobMatch: JobMatch = {
    total: terms.length,
    covered: matched.length,
    percent: percent(matched.length, terms.length),
    matched,
    missing,
    jobTitle: extracted.title,
    label,
    titleAligned,
  };

  findings.push({
    level: jobMatch.percent < JOB_COVERAGE_WARN_BELOW ? "warn" : "info",
    layer: "job",
    code: "job-keyword-coverage",
    message: `${jobMatch.covered}/${jobMatch.total} job-description terms found (${jobMatch.percent}%)${missing.length ? `; missing: ${missing.slice(0, 25).join(", ")}${missing.length > 25 ? ", ..." : ""}` : ""}.`,
    hint: "Mirror the posting's wording only where canonical evidence supports it.",
  });
  if (extracted.title && label) {
    findings.push({
      level: titleAligned ? "info" : "warn",
      layer: "job",
      code: titleAligned ? "title-aligned" : "title-mismatch",
      message: titleAligned ? `basics.label "${label}" aligns with the posting title "${extracted.title}".` : `basics.label "${label}" does not align with the posting title "${extracted.title}".`,
      path: "basics.label",
      hint: titleAligned ? undefined : "basics.label is tailorable; align it when canonical positions support the title.",
    });
  }
  return { findings, jobMatch };
}

function alignTitle(title?: string, label?: string): boolean {
  if (!title || !label) return false;
  const titleTokens = new Set(alnumTokens(title).filter((token) => !TITLE_NOISE.has(token)));
  const labelTokens = alnumTokens(label).filter((token) => !TITLE_NOISE.has(token));
  if (!labelTokens.length) return false;
  const overlap = labelTokens.filter((token) => titleTokens.has(token)).length;
  return overlap / labelTokens.length >= 0.6;
}
