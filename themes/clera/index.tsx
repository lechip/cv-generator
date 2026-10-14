import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { resumeLanguageCode } from "../../src/core/naming.js";
import type { Resume } from "../../src/types.js";
import type { PdfRenderOptions } from "../../src/renderers/pdf.js";
import { buildLayout, sectionHeadings, type Entry, type Run } from "./layout.js";
import { styles } from "./styles.js";

export { buildLayout, sectionHeadings } from "./layout.js";

/** Same print contract as `ats`: no footer text in the reading flow, untagged so strict parsers keep spaces. */
export const pdf: PdfRenderOptions = { footer: false, tagged: false };

function Runs({ runs }: { runs: Run[] }) {
  return <>{runs.map((run, index) => {
    const content = run.href ? <a href={run.href}>{run.text}</a> : run.text;
    return run.bold ? <strong key={index}>{content}</strong> : <React.Fragment key={index}>{content}</React.Fragment>;
  })}</>;
}

function EntryBlock({ entry }: { entry: Entry }) {
  return <div className={entry.head ? "entry" : "entry entry-plain"}>
    {entry.head ? <p className="entry-head">
      <span className="entry-left"><Runs runs={entry.head.left} /></span>
      {entry.head.dates ? <strong className="dates">{entry.head.dates}</strong> : null}
    </p> : null}
    {entry.lines.map((line, index) => <p className="line" key={index}><Runs runs={line} /></p>)}
    {entry.bullets.length ? <ul className="bullets">{entry.bullets.map((bullet, index) => <li key={index}><Runs runs={bullet} /></li>)}</ul> : null}
    {entry.after.map((line, index) => <p className="line" key={index}><Runs runs={line} /></p>)}
  </div>;
}

function ResumeDocument({ resume }: { resume: Resume }) {
  const layout = buildLayout(resume);
  return <main className="resume">
    <header className="identity">
      <h1 className="name">{layout.name}</h1>
      {layout.label ? <p className="label">{layout.label}</p> : null}
      {layout.contacts.length ? <p className="contact">{layout.contacts.map((item, index) => <React.Fragment key={index}>
        {index > 0 ? " • " : ""}
        <span className="contact-item">{item.href ? <a href={item.href}>{item.text}</a> : item.text}</span>
      </React.Fragment>)}</p> : null}
    </header>
    {layout.sections.map((section) => <section className="section" key={section.title}>
      <h2 className="section-title">{section.title}</h2>
      {section.entries.map((entry, index) => <EntryBlock entry={entry} key={index} />)}
    </section>)}
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
