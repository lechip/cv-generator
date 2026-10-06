export type AtsLevel = "error" | "warn" | "info";
export type AtsLayer = "parse" | "content" | "keywords" | "job";

export interface AtsFinding {
  level: AtsLevel;
  layer: AtsLayer;
  /** Stable kebab-case identifier, e.g. `heading-not-isolated`. */
  code: string;
  message: string;
  /** What the skill or user can change in the JSON to clear the finding. */
  hint?: string;
  /** JSON path of the offending field, e.g. `work[1].highlights[0]`. */
  path?: string;
  page?: number;
  line?: number;
}

export interface KeywordCoverage {
  total: number;
  covered: number;
  /** 0-100, rounded. */
  percent: number;
  matched: string[];
  missing: string[];
}

export interface JobMatch extends KeywordCoverage {
  jobTitle?: string;
  label?: string;
  titleAligned: boolean;
}

export interface PdfStructure {
  pages: number;
  title?: string;
  fonts: Array<{ name: string; embedded: boolean }>;
  images: number;
}

export interface PdfLine {
  text: string;
  /** The line as a strict parser reads it; words glue where the PDF stores the space as its own item. */
  strictText?: string;
  /** PDF user-space y of the baseline (larger is higher on the page). */
  y: number;
  x: number;
  /** Horizontal gaps (pt) between consecutive text items on the line; large gaps suggest columns. */
  gaps: number[];
}

export interface PdfPage {
  page: number;
  lines: PdfLine[];
}

export interface AtsReport {
  resumePath: string;
  kind: "canonical" | "printable" | "standard";
  theme: string;
  pdf?: PdfStructure & { path?: string };
  findings: AtsFinding[];
  keywordCoverage?: KeywordCoverage;
  jobMatch?: JobMatch;
  counts: Record<AtsLevel, number>;
  /** True when no finding has level `error`. */
  ok: boolean;
}
