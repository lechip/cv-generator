import type { Resume } from "../types.js";
import { formatRange } from "../core/dates.js";
import { languageDisplayFluency, locationText, sortLanguages } from "../core/model.js";

export function renderMarkdown(resume: Resume): string {
  const lines: string[] = [];
  const basics = resume.basics ?? {};
  lines.push(`# ${basics.name ?? "Curriculum Vitae"}`, "");
  if (basics.label) lines.push(basics.label, "");
  const contact = [basics.email, basics.url, locationText(basics.location)].filter(Boolean);
  if (contact.length) lines.push(contact.join(" · "), "");
  if (basics.summary) lines.push("## Summary", "", basics.summary, "");

  const strengths = resume["x-cv"]?.strengths;
  if (strengths?.length) {
    lines.push("## Skills", "");
    for (const strength of strengths) lines.push(`- **${strength.name}:** ${strength.keywords.join(", ")}`);
    lines.push("");
  } else if (resume.skills?.length) {
    lines.push("## Skills", "");
    for (const skill of resume.skills) lines.push(`- **${skill.name}:** ${(skill.keywords ?? []).join(", ")}`);
    lines.push("");
  }

  if (resume.work?.length) {
    lines.push("## Work Experience", "");
    for (const work of resume.work) {
      lines.push(`### ${work.position} — ${work.name}`, "", `*${formatRange(work.startDate, work.endDate)}${work.location ? ` · ${work.location}` : ""}*`, "");
      if (work.summary) lines.push(work.summary, "");
      for (const highlight of work.highlights ?? []) lines.push(`- ${highlight}`);
      lines.push("");
    }
  }

  const other = resume["x-cv"]?.otherExperience;
  if (other) lines.push("## Other Experience", "", `**${other.count} additional roles (${other.totalCareerEntries} career entries total).** ${other.summary}`, "");

  if (resume.education?.length) {
    lines.push("## Education", "");
    for (const education of resume.education) {
      const degree = [education.studyType, education.area].filter(Boolean).join(" ");
      lines.push(`- **${degree || education.institution}** — ${education.institution}`);
    }
    lines.push("");
  }

  if (resume.languages?.length) {
    lines.push("## Languages", "");
    for (const language of sortLanguages(resume.languages)) lines.push(`- ${language.language}: ${languageDisplayFluency(language)}`);
    lines.push("");
  }

  return `${lines.join("\n").trim()}\n`;
}
