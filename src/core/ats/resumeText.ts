import type { Resume } from "../../types.js";
import { formatRange } from "../dates.js";
import { contactItems, createViewModel, languageDisplayFluency } from "../model.js";
import { normalizeText } from "./text.js";

export type RenderedKind = "fact" | "prose" | "keyword";

export interface RenderedString {
  /** JSON path, e.g. `work[1].highlights[0]`. */
  path: string;
  text: string;
  kind: RenderedKind;
}

/**
 * Exactly the strings the single-column theme prints, in reading order.
 * The content layer lints `prose`, matches keywords against everything, and the
 * parse layer checks that every entry reached the PDF text layer.
 */
export function collectRenderedStrings(resume: Resume): RenderedString[] {
  const out: RenderedString[] = [];
  const push = (path: string, text: string | undefined, kind: RenderedKind) => {
    if (text && text.trim()) out.push({ path, text: text.trim(), kind });
  };
  const basics = resume.basics ?? {};
  const model = createViewModel(resume);

  push("basics.name", basics.name, "fact");
  push("basics.label", basics.label, "prose");
  contactItems(resume).forEach((item, index) => push(`basics.contact[${index}]`, item.text, "fact"));
  push("basics.summary", basics.summary, "prose");

  if (model.strengths.length) {
    model.strengths.forEach((strength, index) => {
      push(`x-cv.strengths[${index}].name`, strength.name, "prose");
      strength.keywords.forEach((keyword, keywordIndex) => push(`x-cv.strengths[${index}].keywords[${keywordIndex}]`, keyword, "keyword"));
    });
  } else {
    (resume.skills ?? []).forEach((skill, index) => {
      push(`skills[${index}].name`, skill.name, "prose");
      (skill.keywords ?? []).forEach((keyword, keywordIndex) => push(`skills[${index}].keywords[${keywordIndex}]`, keyword, "keyword"));
    });
  }

  (resume.work ?? []).forEach((work, index) => {
    push(`work[${index}].position`, work.position, "fact");
    push(`work[${index}].name`, work.name, "fact");
    push(`work[${index}].location`, work.location, "fact");
    push(`work[${index}].dates`, formatRange(work.startDate, work.endDate), "fact");
    push(`work[${index}].summary`, work.summary, "prose");
    (work.highlights ?? []).forEach((highlight, highlightIndex) => push(`work[${index}].highlights[${highlightIndex}]`, highlight, "prose"));
    (work.keywords ?? []).forEach((keyword, keywordIndex) => push(`work[${index}].keywords[${keywordIndex}]`, keyword, "keyword"));
  });

  const other = model.otherExperience;
  if (other) {
    push("x-cv.otherExperience.count", `${other.count} additional roles (${other.totalCareerEntries} career entries total)${other.dateRange ? `, ${other.dateRange}` : ""}.`, "fact");
    push("x-cv.otherExperience.summary", other.summary, "prose");
    other.highlightedNames.forEach((name, index) => push(`x-cv.otherExperience.highlightedNames[${index}]`, name, "fact"));
  }

  (resume.education ?? []).forEach((education, index) => {
    const degree = [education.studyType, education.area].filter(Boolean).join(" ");
    push(`education[${index}].degree`, degree, "fact");
    push(`education[${index}].institution`, education.institution, "fact");
    if (education.startDate) push(`education[${index}].dates`, formatRange(education.startDate, education.endDate), "fact");
  });

  (resume.certificates ?? []).forEach((certificate, index) => {
    push(`certificates[${index}].name`, certificate.name, "fact");
    push(`certificates[${index}].issuer`, certificate.issuer, "fact");
    push(`certificates[${index}].date`, certificate.date, "fact");
  });
  (resume.awards ?? []).forEach((award, index) => {
    push(`awards[${index}].title`, award.title, "fact");
    push(`awards[${index}].awarder`, award.awarder, "fact");
    push(`awards[${index}].date`, award.date, "fact");
    push(`awards[${index}].summary`, award.summary, "prose");
  });
  (resume.projects ?? []).forEach((project, index) => {
    push(`projects[${index}].name`, typeof project.name === "string" ? project.name : undefined, "fact");
    push(`projects[${index}].description`, typeof project.description === "string" ? project.description : undefined, "prose");
    if (Array.isArray(project.keywords)) (project.keywords as string[]).forEach((keyword, keywordIndex) => push(`projects[${index}].keywords[${keywordIndex}]`, keyword, "keyword"));
  });

  model.languages.forEach((language, index) => push(`languages[${index}]`, `${language.language}: ${languageDisplayFluency(language)}`, "fact"));
  return out;
}

/** Normalised text of everything the theme prints, one string per line. */
export function renderedText(resume: Resume): string {
  return normalizeText(collectRenderedStrings(resume).map((entry) => entry.text).join("\n"));
}
