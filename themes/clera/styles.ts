import { caladeaBold, caladeaRegular } from "./fonts.js";

const fontCss = caladeaRegular && caladeaBold ? `
@font-face {
  font-family: "Caladea";
  src: url(data:font/woff2;base64,${caladeaRegular}) format("woff2");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}
@font-face {
  font-family: "Caladea";
  src: url(data:font/woff2;base64,${caladeaBold}) format("woff2");
  font-style: normal;
  font-weight: 700;
  font-display: swap;
}` : "";

/*
 * Visual copy of Clera_Resume_Template.docx: Caladea (the embedded, metric-compatible open clone of Cambria),
 * centred name and contact line over a rule, bold underlined headings, bold employer line with the
 * dates right-aligned, bold position below, indented bullets. Sizes and margins follow the template.
 * Single column, no tables, no footer, so the PDF text layer reads top to bottom.
 */
export const styles = `${fontCss}
:root {
  --text: #000;
  --link: #0000ff;
  font-family: "Caladea", Cambria, Georgia, serif;
  font-size: 10.5pt;
  line-height: 1.17;
  color: var(--text);
  background: #f3f5f7;
}
* { box-sizing: border-box; }
body { margin: 0; background: inherit; -webkit-hyphens: none; hyphens: none; overflow-wrap: normal; }
a { color: inherit; text-decoration: none; }
.resume {
  width: 210mm;
  min-height: 297mm;
  margin: 18px auto;
  padding: 12.5mm 12mm 17mm 12.75mm;
  background: #fff;
  box-shadow: 0 2px 18px rgba(0,0,0,.12);
}
h1, h2, p, ul { margin: 0; }
.identity { text-align: center; border-bottom: 1px solid #000; padding-bottom: 1.5mm; }
.name { font-size: 16pt; font-weight: 700; line-height: 1.2; }
.label { font-size: 11pt; margin-top: .5mm; }
.contact { font-size: 10pt; margin-top: .3mm; }
.contact a { color: var(--link); text-decoration: underline; }
.contact-item { white-space: nowrap; }
.section { margin-top: 4.5mm; }
.section-title { font-size: 12pt; font-weight: 700; text-decoration: underline; white-space: nowrap; break-after: avoid; }
.entry { margin-top: 4.4mm; break-inside: avoid; }
.entry-plain { margin-top: 1.5mm; break-inside: auto; }
.entry-head { display: flex; justify-content: space-between; gap: 6mm; break-after: avoid; }
.dates { white-space: nowrap; }
.bullets { list-style: none; padding: 0; margin-top: .5mm; }
.bullets li { padding-left: 12.7mm; text-indent: -6.35mm; break-inside: avoid; }
.bullets li::before { content: "\\2022"; display: inline-block; width: 6.35mm; text-indent: 0; }

@media (max-width: 760px) {
  :root { font-size: 11pt; }
  .resume { width: 100%; min-height: 0; margin: 0; padding: 24px 20px; box-shadow: none; }
}

@page { size: A4; margin: 12.5mm 12mm 17mm 12.75mm; }
@media print {
  :root { background: #fff; }
  .resume { width: auto; min-height: 0; margin: 0; padding: 0; box-shadow: none; }
}
`;
