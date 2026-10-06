import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { formatRange } from "../../src/core/dates.js";
import { contactItems, createViewModel, languageDisplayFluency } from "../../src/core/model.js";
import { resumeLanguageCode } from "../../src/core/naming.js";
import type { EducationEntry, Resume, WorkEntry } from "../../src/types.js";
import type { PdfRenderOptions } from "../../src/renderers/pdf.js";
import { styles } from "./styles.js";

/**
 * No page-number footer: footer text would land inside the extracted reading flow.
 * Untagged: a tagged PDF splits every span into its own text item and strict parsers glue the words.
 */
export const pdf: PdfRenderOptions = { footer: false, tagged: false };

export const HEADINGS = {
  summary: "Summary",
  skills: "Skills",
  work: "Work Experience",
  otherExperience: "Other Experience",
  education: "Education",
  certificates: "Certifications",
  awards: "Awards",
  projects: "Projects",
  languages: "Languages",
} as const;

function hasStrengthsOrSkills(resume: Resume): boolean {
  return Boolean(resume["x-cv"]?.strengths?.length || resume.skills?.length);
}

/** Ordered headings this theme prints for the given resume. `ats-check` expects each on its own line. */
export function sectionHeadings(resume: Resume): string[] {
  const headings: string[] = [];
  if (resume.basics?.summary) headings.push(HEADINGS.summary);
  if (hasStrengthsOrSkills(resume)) headings.push(HEADINGS.skills);
  if (resume.work?.length) headings.push(HEADINGS.work);
  if (resume["x-cv"]?.otherExperience) headings.push(HEADINGS.otherExperience);
  if (resume.education?.length) headings.push(HEADINGS.education);
  if (resume.certificates?.length) headings.push(HEADINGS.certificates);
  if (resume.awards?.length) headings.push(HEADINGS.awards);
  if (resume.projects?.length) headings.push(HEADINGS.projects);
  if (resume.languages?.length) headings.push(HEADINGS.languages);
  return headings;
}

function Section({ title, children, className = "" }: React.PropsWithChildren<{ title: string; className?: string }>) {
  return <section className={`section ${className}`.trim()}>
    <h2 className="section-title">{title}</h2>
    {children}
  </section>;
}

function Keywords({ keywords }: { keywords: string[] }) {
  return <>{keywords.map((keyword, index) => <React.Fragment key={`${keyword}-${index}`}>
    {index > 0 ? ", " : ""}<span className="kw">{keyword}</span>
  </React.Fragment>)}</>;
}

function Work({ entry }: { entry: WorkEntry }) {
  return <article className="role">
    <h3 className="role-title">{entry.position}</h3>
    <p className="role-meta">
      <span className="company">{entry.url ? <a href={entry.url}>{entry.name}</a> : entry.name}</span>
      {entry.location ? <> | <span className="role-location">{entry.location}</span></> : null}
      {" | "}<span className="dates">{formatRange(entry.startDate, entry.endDate)}</span>
    </p>
    {entry.summary ? <p className="role-summary">{entry.summary}</p> : null}
    {entry.highlights?.length ? <ul className="bullets">{entry.highlights.map((highlight, index) => <li key={index}>{highlight}</li>)}</ul> : null}
    {entry.keywords?.length ? <p className="tech"><span className="tech-label label-gap">Technologies:</span> {entry.keywords.join(", ")}</p> : null}
  </article>;
}

function Education({ entry }: { entry: EducationEntry }) {
  const degree = [entry.studyType, entry.area].filter(Boolean).join(", ");
  const dates = entry.startDate ? formatRange(entry.startDate, entry.endDate) : "";
  return <div className="education-entry">
    <h3 className="education-degree">{degree || entry.institution}</h3>
    <p className="education-school">{degree ? entry.institution : null}{degree && dates ? " | " : ""}{dates ? <span className="dates">{dates}</span> : null}</p>
  </div>;
}

function ResumeDocument({ resume }: { resume: Resume }) {
  const model = createViewModel(resume);
  const basics = resume.basics ?? {};
  const contacts = contactItems(resume);

  return <main className="resume">
    <header className="identity">
      <h1 className="name">{basics.name ?? "Resume"}</h1>
      {basics.label ? <p className="label">{basics.label}</p> : null}
      {contacts.length ? <p className="contact">{contacts.map((item, index) => <React.Fragment key={`${item.kind}-${index}`}>
        {index > 0 ? " | " : ""}
        <span className="contact-item">{item.href ? <a href={item.href}>{item.text}</a> : item.text}</span>
      </React.Fragment>)}</p> : null}
    </header>

    {basics.summary ? <Section title={HEADINGS.summary}><p className="summary">{basics.summary}</p></Section> : null}

    {model.strengths.length ? <Section title={HEADINGS.skills}>
      <ul className="skills">{model.strengths.map((strength) => <li key={strength.name}>
        <strong className="label-gap">{strength.name}:</strong> <Keywords keywords={strength.keywords} />
      </li>)}</ul>
    </Section> : resume.skills?.length ? <Section title={HEADINGS.skills}>
      <ul className="skills">{resume.skills.map((skill) => <li key={skill.name}>
        <strong className="label-gap">{skill.name}:</strong> <Keywords keywords={skill.keywords ?? []} />
      </li>)}</ul>
    </Section> : null}

    {resume.work?.length ? <Section title={HEADINGS.work}>
      {resume.work.map((entry, index) => <Work entry={entry} key={entry["x-cv"]?.sourceId ?? entry["x-cv"]?.id ?? index} />)}
    </Section> : null}

    {model.otherExperience ? <Section title={HEADINGS.otherExperience} className="other-experience">
      <p><strong>{model.otherExperience.count} additional roles ({model.otherExperience.totalCareerEntries} career entries total){model.otherExperience.dateRange ? `, ${model.otherExperience.dateRange}` : ""}.</strong></p>
      <p>{model.otherExperience.summary}</p>
      {model.otherExperience.highlightedNames.length ? <p>Employers: {model.otherExperience.highlightedNames.join(", ")}</p> : null}
    </Section> : null}

    {resume.education?.length ? <Section title={HEADINGS.education}>
      {resume.education.map((entry, index) => <Education entry={entry} key={entry["x-cv"]?.sourceId ?? entry["x-cv"]?.id ?? index} />)}
    </Section> : null}

    {resume.certificates?.length ? <Section title={HEADINGS.certificates}>
      <ul className="plain-list">{resume.certificates.map((certificate, index) => <li key={index}>
        <strong className="label-gap">{certificate.name}</strong>{certificate.issuer ? ` | ${certificate.issuer}` : ""}{certificate.date ? <> | <span className="dates">{certificate.date}</span></> : null}
      </li>)}</ul>
    </Section> : null}

    {resume.awards?.length ? <Section title={HEADINGS.awards}>
      <ul className="plain-list">{resume.awards.map((award, index) => <li key={index}>
        <strong className="label-gap">{award.title}</strong>{award.awarder ? ` | ${award.awarder}` : ""}{award.date ? <> | <span className="dates">{award.date}</span></> : null}
        {award.summary ? <> {award.summary}</> : null}
      </li>)}</ul>
    </Section> : null}

    {resume.projects?.length ? <Section title={HEADINGS.projects}>
      <ul className="plain-list">{resume.projects.map((project, index) => <li key={index}>
        <strong className="label-gap">{String(project.name ?? "")}</strong>{project.description ? ` | ${String(project.description)}` : ""}
        {Array.isArray(project.keywords) && project.keywords.length ? <> Technologies: {(project.keywords as string[]).join(", ")}</> : null}
      </li>)}</ul>
    </Section> : null}

    {model.languages.length ? <Section title={HEADINGS.languages}>
      <ul className="languages">{model.languages.map((language) => <li key={language["x-cv"]?.sourceId ?? language["x-cv"]?.id ?? language.language}>
        {language.language}: {languageDisplayFluency(language)}
      </li>)}</ul>
    </Section> : null}
  </main>;
}

export function render(resume: Resume): string {
  const title = resume.basics?.name ? `${resume.basics.name} - CV` : "Curriculum Vitae";
  const language = resumeLanguageCode(resume);
  const escapedTitle = title.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const markup = renderToStaticMarkup(<ResumeDocument resume={resume} />);
  return `<!doctype html><html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${escapedTitle}"><title>${escapedTitle}</title><style>${styles}</style></head><body>${markup}</body></html>`;
}

export default { render, pdf, sectionHeadings };
