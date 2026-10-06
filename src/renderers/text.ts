import type { Resume } from "../types.js";
import { formatRange } from "../core/dates.js";
import { contactItems, createViewModel, languageDisplayFluency } from "../core/model.js";

const CONTACT_LABELS = { location: "Location", phone: "Phone", email: "Email", profile: "Profile", url: "Website" } as const;

function profileLabel(network?: string): string {
  return network?.trim() || CONTACT_LABELS.profile;
}

/**
 * ATS plain text: one "Label: value" per line, uppercase section titles, "- " bullets.
 * Portal forms (Workday and similar) auto-fill most reliably from this shape.
 */
export function renderText(resume: Resume): string {
  const lines: string[] = [];
  const basics = resume.basics ?? {};
  const model = createViewModel(resume);
  const profiles = basics.profiles ?? [];

  lines.push(`Name: ${basics.name ?? "Resume"}`);
  if (basics.label) lines.push(`Title: ${basics.label}`);
  let profileIndex = 0;
  for (const item of contactItems(resume)) {
    if (item.kind === "profile") {
      lines.push(`${profileLabel(profiles[profileIndex]?.network)}: ${item.href ?? item.text}`);
      profileIndex += 1;
    } else if (item.kind === "url") {
      lines.push(`${CONTACT_LABELS.url}: ${item.href ?? item.text}`);
    } else {
      lines.push(`${CONTACT_LABELS[item.kind]}: ${item.text}`);
    }
  }

  if (basics.summary) lines.push("", "SUMMARY", basics.summary);

  if (model.strengths.length) {
    lines.push("", "SKILLS");
    for (const strength of model.strengths) lines.push(`${strength.name}: ${strength.keywords.join(", ")}`);
  } else if (resume.skills?.length) {
    lines.push("", "SKILLS");
    for (const skill of resume.skills) lines.push(`${skill.name}: ${(skill.keywords ?? []).join(", ")}`);
  }

  if (resume.work?.length) {
    lines.push("", "WORK EXPERIENCE");
    for (const [index, work] of resume.work.entries()) {
      if (index > 0) lines.push("");
      lines.push(`Position: ${work.position}`, `Company: ${work.name}`);
      if (work.location) lines.push(`Location: ${work.location}`);
      lines.push(`Dates: ${formatRange(work.startDate, work.endDate)}`);
      if (work.summary) lines.push(`Summary: ${work.summary}`);
      for (const highlight of work.highlights ?? []) lines.push(`- ${highlight}`);
      if (work.keywords?.length) lines.push(`Technologies: ${work.keywords.join(", ")}`);
    }
  }

  const other = model.otherExperience;
  if (other) {
    lines.push("", "OTHER EXPERIENCE");
    lines.push(`${other.count} additional roles (${other.totalCareerEntries} career entries total)${other.dateRange ? `, ${other.dateRange}` : ""}.`);
    lines.push(other.summary);
    if (other.highlightedNames.length) lines.push(`Employers: ${other.highlightedNames.join(", ")}`);
  }

  if (resume.education?.length) {
    lines.push("", "EDUCATION");
    for (const [index, education] of resume.education.entries()) {
      if (index > 0) lines.push("");
      const degree = [education.studyType, education.area].filter(Boolean).join(" ");
      if (degree) lines.push(`Degree: ${degree}`);
      lines.push(`Institution: ${education.institution}`);
      if (education.startDate) lines.push(`Dates: ${formatRange(education.startDate, education.endDate)}`);
    }
  }

  if (resume.certificates?.length) {
    lines.push("", "CERTIFICATIONS");
    for (const certificate of resume.certificates) {
      lines.push([certificate.name, certificate.issuer, certificate.date].filter(Boolean).join(" | "));
    }
  }

  if (resume.awards?.length) {
    lines.push("", "AWARDS");
    for (const award of resume.awards) {
      lines.push([award.title, award.awarder, award.date].filter(Boolean).join(" | "));
      if (award.summary) lines.push(award.summary);
    }
  }

  if (resume.projects?.length) {
    lines.push("", "PROJECTS");
    for (const project of resume.projects) {
      lines.push([project.name, project.description].filter(Boolean).map(String).join(" | "));
      if (Array.isArray(project.keywords) && project.keywords.length) lines.push(`Technologies: ${(project.keywords as string[]).join(", ")}`);
    }
  }

  if (model.languages.length) {
    lines.push("", "LANGUAGES");
    for (const language of model.languages) lines.push(`${language.language}: ${languageDisplayFluency(language)}`);
  }

  return `${lines.join("\n").trim()}\n`;
}
