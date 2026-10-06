import { ACRONYMS } from "./lexicon.js";
import { TokenIndex, normalizeText } from "./text.js";

const equivalents = new Map<string, Set<string>>();
for (const [acronym, expansion] of ACRONYMS) {
  const left = normalizeText(acronym);
  const right = normalizeText(expansion);
  if (!equivalents.has(left)) equivalents.set(left, new Set());
  if (!equivalents.has(right)) equivalents.set(right, new Set());
  equivalents.get(left)!.add(expansion);
  equivalents.get(right)!.add(acronym);
}

export function equivalentsOf(term: string): string[] {
  return [...(equivalents.get(normalizeText(term)) ?? [])];
}

/** Phrase match with acronym/expansion equivalence (AWS ↔ Amazon Web Services) and glued forms (Node.js ↔ NodeJS). */
export function termMatches(index: TokenIndex, term: string): boolean {
  if (index.containsPhrase(term)) return true;
  if (index.containsGlued(term)) return true;
  return equivalentsOf(term).some((alternative) => index.containsPhrase(alternative) || index.containsGlued(alternative));
}

export function uniqueTerms(terms: Iterable<string>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const term of terms) {
    const key = normalizeText(term);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(term.trim());
  }
  return result;
}
