import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { formatMonth, formatRange } from "../../src/core/dates.js";
import { createViewModel, languageDisplayFluency, locationText } from "../../src/core/model.js";
import { resumeLanguageCode } from "../../src/core/naming.js";
import type { EducationEntry, Resume, WorkEntry } from "../../src/types.js";
import type { PdfRenderOptions } from "../../src/renderers/pdf.js";
import { styles } from "./styles.js";

/** Europass look keeps its "Page X / Y" footer. */
export const pdf: PdfRenderOptions = { footer: true };

/** Ordered headings this theme prints for the given resume. */
export function sectionHeadings(resume: Resume): string[] {
  const headings = ["Personal information"];
  if (resume.basics?.summary) headings.push("Summary");
  if (resume["x-cv"]?.strengths?.length || resume.skills?.length) headings.push("Skills");
  if (resume.work?.length) headings.push("Work experience");
  if (resume["x-cv"]?.otherExperience) headings.push("Other experience");
  if (resume.education?.length) headings.push("Education");
  if (resume.languages?.length) headings.push("Languages");
  return headings;
}

function Section({ title, children, className = "" }: React.PropsWithChildren<{ title: string; className?: string }>) {
  return <section className={`section ${className}`.trim()}>
    <h2 className="section-title">{title}</h2>
    <div className="section-content">{children}</div>
  </section>;
}

function Keywords({ keywords }: { keywords: string[] }) {
  return <>{keywords.map((keyword, index) => <React.Fragment key={`${keyword}-${index}`}>
    {index > 0 ? ", " : ""}<span className="nowrap">{keyword}</span>
  </React.Fragment>)}</>;
}

function Work({ entry }: { entry: WorkEntry }) {
  return <article className="experience-entry">
    <div className="experience-date"><span className="nowrap">{formatMonth(entry.startDate)}</span> - <span className="nowrap">{entry.endDate ? formatMonth(entry.endDate) : "Present"}</span></div>
    <div>
      <header className="experience-heading">
        <div className="experience-company">{entry.url ? <a href={entry.url}>{entry.name}</a> : entry.name}</div>
        <div className="experience-position">{entry.position}{entry.location ? ` | ${entry.location}` : ""}</div>
      </header>
      {entry.summary ? <p className="experience-summary">{entry.summary}</p> : null}
      {entry.highlights?.length ? <ul className="highlights">{entry.highlights.map((highlight, index) => <li key={index}>{highlight}</li>)}</ul> : null}
    </div>
  </article>;
}

function Education({ entry }: { entry: EducationEntry }) {
  const degree = [entry.studyType, entry.area].filter(Boolean).join(" ");
  const dates = entry.startDate ? formatRange(entry.startDate, entry.endDate) : "";
  return <div className="education-entry">
    <div className="education-degree">{degree || entry.institution}</div>
    <div className="education-school">{entry.institution}{dates ? <> | <span className="nowrap">{dates}</span></> : null}</div>
  </div>;
}

function ResumeDocument({ resume }: { resume: Resume }) {
  const model = createViewModel(resume);
  const basics = resume.basics ?? {};
  const profile = basics.profiles?.[0];
  const contactLocation = locationText(basics.location);

  return <main className="resume">
    <h1 className="document-title">Curriculum Vitae - {basics.name ?? "Resume"}</h1>

    <Section title="Personal information">
      <p className="contact-line">{basics.name}</p>
      {basics.label ? <p className="contact-line">{basics.label}</p> : null}
      {contactLocation ? <p className="contact-line"><span className="contact-label">Location</span>{contactLocation}</p> : null}
      {basics.phone ? <p className="contact-line"><span className="contact-label">Telephone</span>{basics.phone}</p> : null}
      {basics.email ? <p className="contact-line"><span className="contact-label">Email</span><a href={`mailto:${basics.email}`}>{basics.email}</a></p> : null}
      {profile?.url ? <p className="contact-line"><span className="contact-label">Profile</span><a href={profile.url}>{profile.url}</a></p> : null}
    </Section>

    {basics.summary ? <Section title="Summary"><p className="summary">{basics.summary}</p></Section> : null}

    {model.strengths.length ? <Section title="Skills">
      {model.strengths.map((strength) => <p className="strength" key={strength.name}>
        <span className="strength-name">{strength.name}: </span><Keywords keywords={strength.keywords} />
      </p>)}
    </Section> : resume.skills?.length ? <Section title="Skills">
      <ul className="standard-skills">{resume.skills.map((skill) => <li key={skill.name}><strong>{skill.name}:</strong> <Keywords keywords={skill.keywords ?? []} /></li>)}</ul>
    </Section> : null}

    {resume.work?.length ? <section aria-labelledby="work-heading">
      <div className="section">
        <h2 id="work-heading" className="section-title">Work experience</h2><div />
      </div>
      {resume.work.map((entry, index) => <Work entry={entry} key={entry["x-cv"]?.sourceId ?? entry["x-cv"]?.id ?? index} />)}
    </section> : null}

    {model.otherExperience ? <Section title="Other experience" className="compact-entry">
      <p><strong>{model.otherExperience.count} additional roles ({model.otherExperience.totalCareerEntries} career entries total)</strong></p>
      <p>{model.otherExperience.summary}</p>
    </Section> : null}

    {resume.education?.length ? <Section title="Education">
      {resume.education.map((entry, index) => <Education entry={entry} key={entry["x-cv"]?.sourceId ?? entry["x-cv"]?.id ?? index} />)}
    </Section> : null}

    {model.languages.length ? <Section title="Languages">
      <ul className="languages" aria-label="Languages ordered by proficiency">
        {model.languages.map((language) => <li key={language["x-cv"]?.sourceId ?? language["x-cv"]?.id ?? language.language}>
          <span className="language-name">{language.language}</span>
          <span className="language-fluency">{languageDisplayFluency(language)}</span>
        </li>)}
      </ul>
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
