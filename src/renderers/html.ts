import type { Resume } from "../types.js";
import * as ats from "../../themes/ats/index.js";
import * as modernEuropass from "../../themes/modern-europass/index.js";
import type { PdfRenderOptions } from "./pdf.js";

export interface Theme {
  /** Pure presentation: JSON Resume in, self-contained HTML document out. */
  render(resume: Resume): string;
  /** Theme-owned PDF printing options (footer on or off). */
  pdf: PdfRenderOptions;
  /** Ordered section headings the theme emits for this resume. `ats-check` expects each on its own line. */
  sectionHeadings(resume: Resume): string[];
}

/** Single-column theme that parses cleanly on applicant tracking systems. */
export const DEFAULT_THEME = "ats";

const themes: Record<string, Theme> = {
  ats: { render: ats.render, pdf: ats.pdf, sectionHeadings: ats.sectionHeadings },
  "modern-europass": { render: modernEuropass.render, pdf: modernEuropass.pdf, sectionHeadings: modernEuropass.sectionHeadings },
};

export function themeNames(): string[] {
  return Object.keys(themes);
}

export function getTheme(name: string): Theme {
  const theme = themes[name];
  if (!theme) throw new Error(`Unknown theme: ${name}`);
  return theme;
}

export function renderHtml(resume: Resume, theme: string): string {
  return getTheme(theme).render(resume);
}
