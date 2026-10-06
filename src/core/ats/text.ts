/** Text helpers shared by the content, parse and job layers. Deterministic, no locale surprises. */

const DASHES = /[‐‑‒–—―−]/g;
const SINGLE_QUOTES = /[‘’‚‛′]/g;
const DOUBLE_QUOTES = /[“”„‟″]/g;

export function normalizeText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/ /g, " ")
    .replace(DASHES, "-")
    .replace(SINGLE_QUOTES, "'")
    .replace(DOUBLE_QUOTES, '"')
    .replace(/…/g, "...")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Letters and digits only, lower-cased; "Node.js" → ["node", "js"], "CI/CD" → ["ci", "cd"]. */
export function alnumTokens(value: string): string[] {
  return normalizeText(value).match(/[\p{L}\p{N}]+/gu) ?? [];
}

export function wordCount(value: string): number {
  return normalizeText(value).split(" ").filter(Boolean).length;
}

/** Light suffix stripping so "optimized" matches "optimization" only loosely and "services" matches "service". */
export function stem(word: string): string {
  let result = word.toLowerCase();
  if (result.length <= 4) return result;
  if (result.endsWith("ies")) return `${result.slice(0, -3)}y`;
  if (result.endsWith("ing") && result.length > 5) result = result.slice(0, -3);
  else if (result.endsWith("ed") && result.length > 4) result = result.slice(0, -2);
  else if (/(ss|x|z|ch|sh)es$/.test(result)) result = result.slice(0, -2);
  else if (result.endsWith("s") && !result.endsWith("ss")) result = result.slice(0, -1);
  return result;
}

/** Pre-tokenised haystack for repeated phrase lookups. */
export class TokenIndex {
  readonly tokens: string[];
  readonly stems: string[];
  private readonly tokenSet: Set<string>;
  private readonly stemSet: Set<string>;
  /** Adjacent token pairs glued together ("node"+"js" → "nodejs") so "NodeJS" matches "Node.js" and back. */
  private readonly gluedSet: Set<string>;

  constructor(text: string) {
    this.tokens = alnumTokens(text);
    this.stems = this.tokens.map(stem);
    this.tokenSet = new Set(this.tokens);
    this.stemSet = new Set(this.stems);
    this.gluedSet = new Set(this.tokens.slice(1).map((token, index) => `${this.tokens[index]}${token}`));
  }

  /** "Node.js" ↔ "NodeJS", "Event-driven" ↔ "Eventdriven". */
  containsGlued(phrase: string): boolean {
    const needle = alnumTokens(phrase);
    if (needle.length === 1) return this.gluedSet.has(needle[0]!);
    if (needle.length === 2) return this.tokenSet.has(needle.join(""));
    return false;
  }

  hasToken(token: string): boolean {
    return this.tokenSet.has(token.toLowerCase());
  }

  /** True when the phrase's tokens occur contiguously; the last token may match by stem. */
  containsPhrase(phrase: string): boolean {
    const needle = alnumTokens(phrase);
    if (needle.length === 0) return false;
    if (needle.length === 1) {
      const [only] = needle;
      return this.tokenSet.has(only!) || (only!.length > 4 && this.stemSet.has(stem(only!)));
    }
    const lastStem = stem(needle[needle.length - 1]!);
    outer: for (let start = 0; start <= this.tokens.length - needle.length; start += 1) {
      for (let offset = 0; offset < needle.length - 1; offset += 1) {
        if (this.tokens[start + offset] !== needle[offset]) continue outer;
      }
      const lastIndex = start + needle.length - 1;
      if (this.tokens[lastIndex] === needle[needle.length - 1] || this.stems[lastIndex] === lastStem) return true;
    }
    return false;
  }
}

/** Convenience wrapper when one lookup is enough. */
export function containsPhrase(haystack: string, phrase: string): boolean {
  return new TokenIndex(haystack).containsPhrase(phrase);
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** Visible text of an HTML document: head and style removed, tags become spaces, entities decoded. */
export function htmlToText(html: string): string {
  return html
    .replace(/<head[\s\S]*?<\/head>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
      if (entity.startsWith("#x")) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
      if (entity.startsWith("#")) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
      return ENTITIES[entity.toLowerCase()] ?? match;
    })
    .replace(/\s+/g, " ")
    .trim();
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function percent(part: number, whole: number): number {
  return whole === 0 ? 100 : Math.round((part / whole) * 100);
}
