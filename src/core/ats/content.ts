import type { Resume, WorkEntry } from "../../types.js";
import { ACRONYMS, ACRONYM_SUGGEST, ACTION_VERB_FORMS, AI_TELL_WORDS, DEGREE_WORDS, BULLET_MAX_WORDS, FIRST_PERSON, STRENGTH_GROUPS, SUMMARY_WORDS, WEAK_PHRASES } from "./lexicon.js";
import { termMatches, uniqueTerms } from "./match.js";
import { collectRenderedStrings, type RenderedString } from "./resumeText.js";
import { TokenIndex, alnumTokens, normalizeText, percent, stem, wordCount } from "./text.js";
import type { AtsFinding, KeywordCoverage } from "./types.js";

export interface ContentAnalysis {
  findings: AtsFinding[];
  keywordCoverage?: KeywordCoverage;
}

const SMART_TYPOGRAPHY = /[—“”‘’…]/;
const EN_DASH = /–/;

function finding(level: AtsFinding["level"], code: string, message: string, extra: Partial<AtsFinding> = {}): AtsFinding {
  return { level, layer: "content", code, message, ...extra };
}

function hasDigit(value: string | undefined): boolean {
  return /\d/.test(value ?? "");
}

/** JSON-only writing and keyword checks. Never ERROR: content is the skill's call, this is its feedback. */
export function analyzeResumeContent(resume: Resume, canonical?: Resume): ContentAnalysis {
  const findings: AtsFinding[] = [];
  const strings = collectRenderedStrings(resume);
  const index = new TokenIndex(strings.map((entry) => entry.text).join("\n"));
  const basics = resume.basics ?? {};

  if (!basics.label?.trim()) {
    findings.push(finding("warn", "label-missing", "basics.label is empty; parsers and LLM rankers read the title line under the name first.", {
      path: "basics.label",
      hint: "Set the market-standard title you are applying for, supported by canonical positions.",
    }));
  }

  if (basics.summary) {
    const words = wordCount(basics.summary);
    if (words < SUMMARY_WORDS.min || words > SUMMARY_WORDS.max) {
      findings.push(finding("warn", "summary-length", `Summary has ${words} words; target ${SUMMARY_WORDS.min}-${SUMMARY_WORDS.max}.`, { path: "basics.summary" }));
    }
    if (FIRST_PERSON.test(basics.summary)) {
      findings.push(finding("warn", "summary-first-person", "Summary uses first person (I, my, we).", { path: "basics.summary", hint: "Write in implied third person: 'Senior engineer with ...'." }));
    }
  }

  const strengths = resume["x-cv"]?.strengths ?? [];
  if (strengths.length && (strengths.length < STRENGTH_GROUPS.min || strengths.length > STRENGTH_GROUPS.max)) {
    findings.push(finding("info", "strength-groups", `${strengths.length} skill groups; the skill targets ${STRENGTH_GROUPS.min}-${STRENGTH_GROUPS.max}.`, { path: "x-cv.strengths" }));
  }

  analyzeBullets(resume, canonical, findings);
  analyzeEducation(resume, findings);
  analyzeProse(strings, findings);
  analyzeTypography(strings, findings);

  const keywordCoverage = canonical ? analyzeKeywordCoverage(resume, canonical, index, findings) : undefined;
  analyzeAcronyms(index, findings);

  return { findings, keywordCoverage };
}

function analyzeBullets(resume: Resume, canonical: Resume | undefined, findings: AtsFinding[]): void {
  const canonicalById = new Map<string, WorkEntry>();
  for (const entry of canonical?.work ?? []) if (entry["x-cv"]?.id) canonicalById.set(entry["x-cv"].id, entry);
  const seen = new Map<string, string>();
  let bullets = 0;
  let withNumbers = 0;

  (resume.work ?? []).forEach((work, workIndex) => {
    (work.highlights ?? []).forEach((highlight, highlightIndex) => {
      const path = `work[${workIndex}].highlights[${highlightIndex}]`;
      bullets += 1;
      if (hasDigit(highlight)) withNumbers += 1;
      const tokens = alnumTokens(highlight);
      const first = tokens[0] ?? "";
      const firstWord = normalizeText(highlight).split(" ")[0] ?? "";
      // "Co-architected", "Re-platformed": the verb follows a co-/re- prefix.
      const prefixed = /^(co|re)-(.+)$/.exec(firstWord)?.[2];
      if (first && !ACTION_VERB_FORMS.has(first) && !ACTION_VERB_FORMS.has(firstWord) && !(prefixed && ACTION_VERB_FORMS.has(prefixed))) {
        findings.push(finding("warn", "bullet-no-action-verb", `Bullet starts with "${highlight.split(/\s+/)[0]}" instead of an action verb.`, { path, hint: "Start with what you did: Built, Reduced, Led, Migrated ..." }));
      }
      const words = wordCount(highlight);
      if (words > BULLET_MAX_WORDS) {
        findings.push(finding("warn", "bullet-too-long", `Bullet has ${words} words; keep it at or under ${BULLET_MAX_WORDS}.`, { path }));
      }
      if (FIRST_PERSON.test(highlight)) findings.push(finding("warn", "bullet-first-person", "Bullet uses first person.", { path }));
      const lowered = normalizeText(highlight);
      for (const phrase of WEAK_PHRASES) {
        if (lowered.includes(phrase)) findings.push(finding("warn", "bullet-weak-phrase", `Bullet uses "${phrase}", which hides the outcome.`, { path, hint: "Name the result and how you reached it." }));
      }
      const duplicateOf = seen.get(lowered);
      if (duplicateOf) findings.push(finding("warn", "duplicate-bullet", `Bullet repeats ${duplicateOf}.`, { path }));
      else seen.set(lowered, path);
    });

    const sourceId = work["x-cv"]?.sourceId;
    const source = sourceId ? canonicalById.get(sourceId) : undefined;
    if (source) {
      const canonicalHasMetric = (source.highlights ?? []).some(hasDigit) || hasDigit(source.summary);
      const printableHasMetric = (work.highlights ?? []).some(hasDigit) || hasDigit(work.summary);
      if (canonicalHasMetric && !printableHasMetric) {
        findings.push(finding("warn", "metric-dropped", `Canonical ${sourceId} has measurable results but none survived in the printable entry.`, { path: `work[${workIndex}]`, hint: "Keep at least one bullet with the number." }));
      }
    }
  });

  if (bullets) {
    findings.push(finding("info", "bullets-with-metrics", `${withNumbers}/${bullets} bullets (${percent(withNumbers, bullets)}%) carry a number.`));
  }
}

function analyzeEducation(resume: Resume, findings: AtsFinding[]): void {
  (resume.education ?? []).forEach((entry, index) => {
    if (!entry.studyType || DEGREE_WORDS.test(entry.studyType)) return;
    findings.push(finding("warn", "education-degree-unclear", `Degree "${entry.studyType}" has no degree word parsers recognise; Workday, Taleo, Lever and Greenhouse screeners may report no education.`, {
      path: `education[${index}].studyType`,
      hint: "Spell out the degree in the canonical data, e.g. \"Master of Science (MSc)\". Printable education is copied from canonical.",
    }));
  });
}

function analyzeProse(strings: RenderedString[], findings: AtsFinding[]): void {
  for (const entry of strings) {
    if (entry.kind !== "prose") continue;
    const local = new TokenIndex(entry.text);
    const hits = new Map<string, string>();
    for (const term of AI_TELL_WORDS) {
      const tokens = alnumTokens(term);
      const key = tokens.map(stem).join(" ");
      const exact = tokens.length === 1 ? local.hasToken(tokens[0]!) : local.containsPhrase(term);
      if (exact) hits.set(key, term);
      else if (local.containsPhrase(term) && !hits.has(key)) hits.set(key, term);
    }
    if (hits.size) {
      findings.push(finding("warn", "ai-tell-word", `Reads as generated text: ${[...hits.values()].join(", ")}.`, { path: entry.path, hint: "Use the plain verb or fact instead." }));
    }
  }
}

function analyzeTypography(strings: RenderedString[], findings: AtsFinding[]): void {
  for (const entry of strings) {
    if (SMART_TYPOGRAPHY.test(entry.text)) {
      findings.push(finding("warn", "typography", "Contains an em dash, smart quote or ellipsis character.", { path: entry.path, hint: "Use '-', straight quotes and '...'." }));
    } else if (EN_DASH.test(entry.text)) {
      findings.push(finding("info", "typography-en-dash", "Contains an en dash; some parsers normalise it, some drop it.", { path: entry.path }));
    }
  }
}

function analyzeKeywordCoverage(resume: Resume, canonical: Resume, index: TokenIndex, findings: AtsFinding[]): KeywordCoverage | undefined {
  const selected = new Set(resume.meta?.["x-cv"]?.selectedWorkIds ?? (resume.work ?? []).map((work) => work["x-cv"]?.sourceId).filter(Boolean) as string[]);
  const terms = uniqueTerms([
    ...(canonical.work ?? []).filter((work) => selected.size === 0 || selected.has(work["x-cv"]?.id ?? "")).flatMap((work) => work.keywords ?? []),
    ...(canonical.skills ?? []).flatMap((skill) => skill.keywords ?? []),
  ]);
  if (!terms.length) return undefined;
  const matched = terms.filter((term) => termMatches(index, term));
  const missing = terms.filter((term) => !matched.includes(term));
  const coverage: KeywordCoverage = { total: terms.length, covered: matched.length, percent: percent(matched.length, terms.length), matched, missing };
  const general = !resume.meta?.["x-cv"]?.targetJob;
  if (missing.length) {
    findings.push({
      level: general ? "warn" : "info",
      layer: "keywords",
      code: "keyword-coverage",
      message: `${coverage.covered}/${coverage.total} canonical skill terms covered (${coverage.percent}%); missing: ${missing.join(", ")}.`,
      hint: general ? "A general CV must show every skill of the selected roles. Add the missing terms to Skills groups or bullets." : "Add a missing term only when it fits the target job.",
    });
  } else {
    findings.push({ level: "info", layer: "keywords", code: "keyword-coverage", message: `All ${coverage.total} canonical skill terms of the selected roles appear in the CV.` });
  }
  return coverage;
}

function analyzeAcronyms(index: TokenIndex, findings: AtsFinding[]): void {
  const suggestions: string[] = [];
  for (const [acronym, expansion] of ACRONYMS) {
    if (!ACRONYM_SUGGEST.has(acronym)) continue;
    const hasAcronym = index.containsPhrase(acronym) || index.containsGlued(acronym);
    const hasExpansion = index.containsPhrase(expansion);
    if (hasAcronym && !hasExpansion) suggestions.push(`${acronym} without "${expansion}"`);
    else if (hasExpansion && !hasAcronym) suggestions.push(`"${expansion}" without ${acronym}`);
  }
  if (suggestions.length) {
    findings.push({ level: "info", layer: "keywords", code: "acronym-expansion", message: `Only one spelling present: ${suggestions.join("; ")}.`, hint: "Exact-match filters (Taleo, Lever) miss the other spelling; mention both once, e.g. 'Amazon Web Services (AWS)'." });
  }
}
