import { formatRange } from "../../src/core/dates.js";
import { contactItems, createViewModel, languageDisplayFluency } from "../../src/core/model.js";
import type { Resume } from "../../src/types.js";

/**
 * Layout of the Clera resume template (Clera_Resume_Template.docx), shared by the HTML/PDF render
 * and the DOCX writer so both formats print the same text in the same order.
 * Template order: Work Experience, Education, Skills. Languages join the Skills bullets as in the template.
 * Sections the template lacks (Summary, Other Experience, Certifications, Awards, Projects) use the same styles.
 */

export interface Run {
  text: string;
  bold?: boolean;
  href?: string;
}

export interface Entry {
  /** Bold first line with the dates right-aligned: "Employer, Location ........ Oct 2020 - Present". */
  head?: { left: Run[]; dates?: string };
  lines: Run[][];
  bullets: Run[][];
  /** Lines printed after the bullets. */
  after: Run[][];
}

export interface Section {
  title: string;
  entries: Entry[];
}

export interface CleraLayout {
  name: string;
  label?: string;
  contacts: Run[];
  sections: Section[];
}

export const HEADINGS = {
  summary: "Summary",
  work: "Work Experience",
  otherExperience: "Other Experience",
  education: "Education",
  certificates: "Certifications",
  awards: "Awards",
  projects: "Projects",
  skills: "Skills",
} as const;

const entry = (partial: Partial<Entry>): Entry => ({ lines: [], bullets: [], after: [], ...partial });
const text = (value: string): Run[] => [{ text: value }];
const joined = (parts: Array<string | undefined>): string => parts.filter(Boolean).join(" | ");

export function buildLayout(resume: Resume): CleraLayout {
  const model = createViewModel(resume);
  const basics = resume.basics ?? {};
  const sections: Section[] = [];

  if (basics.summary) sections.push({ title: HEADINGS.summary, entries: [entry({ lines: [text(basics.summary)] })] });

  if (resume.work?.length) {
    sections.push({
      title: HEADINGS.work,
      entries: resume.work.map((work) => entry({
        head: {
          left: [{ text: work.name, bold: true, href: work.url }, ...(work.location ? [{ text: `, ${work.location}` }] : [])],
          dates: formatRange(work.startDate, work.endDate),
        },
        lines: [[{ text: work.position, bold: true }], ...(work.summary ? [text(work.summary)] : [])],
        bullets: (work.highlights ?? []).map(text),
        after: work.keywords?.length ? [text(`Technologies: ${work.keywords.join(", ")}`)] : [],
      })),
    });
  }

  const other = model.otherExperience;
  if (other) {
    sections.push({
      title: HEADINGS.otherExperience,
      entries: [entry({
        lines: [
          [{ text: `${other.count} additional roles (${other.totalCareerEntries} career entries total)${other.dateRange ? `, ${other.dateRange}` : ""}.`, bold: true }],
          text(other.summary),
          ...(other.highlightedNames.length ? [text(`Employers: ${other.highlightedNames.join(", ")}`)] : []),
        ],
      })],
    });
  }

  if (resume.education?.length) {
    sections.push({
      title: HEADINGS.education,
      entries: resume.education.map((education) => {
        const degree = [education.studyType, education.area].filter(Boolean).join(", ");
        return entry({
          head: { left: [{ text: education.institution, bold: true, href: education.url }], dates: formatRange(education.startDate, education.endDate) || undefined },
          lines: [...(degree ? [text(degree)] : []), ...(education.score ? [text(`GPA: ${education.score}`)] : [])],
        });
      }),
    });
  }

  if (resume.certificates?.length) {
    sections.push({ title: HEADINGS.certificates, entries: [entry({ bullets: resume.certificates.map((item) => text(joined([item.name, item.issuer, item.date]))) })] });
  }
  if (resume.awards?.length) {
    sections.push({ title: HEADINGS.awards, entries: [entry({ bullets: resume.awards.map((item) => text(`${joined([item.title, item.awarder, item.date])}${item.summary ? ` ${item.summary}` : ""}`)) })] });
  }
  if (resume.projects?.length) {
    sections.push({
      title: HEADINGS.projects,
      entries: [entry({
        bullets: resume.projects.map((project) => {
          const keywords = Array.isArray(project.keywords) && project.keywords.length ? ` Technologies: ${(project.keywords as string[]).join(", ")}` : "";
          return text(`${joined([String(project.name ?? ""), project.description ? String(project.description) : undefined])}${keywords}`);
        }),
      })],
    });
  }

  const skillLines = model.strengths.length
    ? model.strengths.map((strength) => `${strength.name}: ${strength.keywords.join(", ")}`)
    : (resume.skills ?? []).map((skill) => `${skill.name}: ${(skill.keywords ?? []).join(", ")}`);
  if (model.languages.length) skillLines.push(`Languages: ${model.languages.map((language) => `${language.language} - ${languageDisplayFluency(language)}`).join(", ")}`);
  if (skillLines.length) sections.push({ title: HEADINGS.skills, entries: [entry({ bullets: skillLines.map(text) })] });

  return {
    name: basics.name ?? "Resume",
    label: basics.label,
    contacts: contactItems(resume).map((item) => ({ text: item.text, href: item.href })),
    sections,
  };
}

/** Ordered headings this theme prints for the given resume. `ats-check` expects each on its own line. */
export function sectionHeadings(resume: Resume): string[] {
  return buildLayout(resume).sections.map((section) => section.title);
}
