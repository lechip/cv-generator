import { notoSansBold, notoSansRegular } from "../modern-europass/fonts.js";

const fontCss = notoSansRegular && notoSansBold ? `
@font-face {
  font-family: "Noto Sans";
  src: url(data:font/woff2;base64,${notoSansRegular}) format("woff2");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}
@font-face {
  font-family: "Noto Sans";
  src: url(data:font/woff2;base64,${notoSansBold}) format("woff2");
  font-style: normal;
  font-weight: 700;
  font-display: swap;
}` : "";

/*
 * Single-column layout for applicant tracking systems:
 * no grid, no tables, no columns, no icons, no header/footer text.
 * Every string is a plain text node so the PDF text layer reads top to bottom.
 * A bold label always starts a new PDF text item, and strict parsers drop the space item after it
 * unless the visual gap is wider than half the font size; .label-gap widens it.
 */
export const styles = `${fontCss}
:root {
  --text: #000;
  --rule: #000;
  --link: #000;
  font-family: "Noto Sans", Arial, Helvetica, sans-serif;
  font-size: 10pt;
  line-height: 1.25;
  color: var(--text);
  background: #f3f5f7;
}
* { box-sizing: border-box; }
body { margin: 0; background: inherit; -webkit-hyphens: none; hyphens: none; overflow-wrap: normal; }
a { color: var(--link); text-decoration: none; }
.resume {
  width: 210mm;
  min-height: 297mm;
  margin: 18px auto;
  padding: 13mm 15mm;
  background: #fff;
  box-shadow: 0 2px 18px rgba(0,0,0,.12);
}
h1, h2, h3, p, ul { margin: 0; }
.name { font-size: 15pt; font-weight: 700; line-height: 1.2; }
.label { font-size: 10.5pt; font-weight: 700; margin-top: .8mm; }
.contact { margin-top: 1.2mm; }
.contact-item { white-space: nowrap; }
.section { margin-top: 3.6mm; break-inside: auto; }
.section-title {
  font-size: 11.5pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .02em;
  white-space: nowrap;
  border-bottom: 1px solid var(--rule);
  padding-bottom: .5mm;
  margin-bottom: 1.6mm;
  break-after: avoid;
}
.summary { }
.skills { list-style: none; padding: 0; }
.skills li { margin-bottom: .5mm; }
.kw { white-space: nowrap; }
.role { margin-bottom: 2.6mm; break-inside: avoid; }
.role-title { font-size: 10pt; font-weight: 700; break-after: avoid; }
.role-meta { margin-top: .2mm; }
.dates { white-space: nowrap; }
.role-summary { margin-top: .6mm; }
.bullets { list-style: none; padding: 0; margin-top: .6mm; }
.bullets li { padding-left: 1.1em; text-indent: -1.1em; margin-bottom: .3mm; break-inside: avoid; }
.bullets li::before { content: "\\2022  "; }
.tech { margin-top: .5mm; }
.tech-label { font-weight: 700; }
.label-gap { margin-right: .3em; }
.other-experience p { margin-bottom: .6mm; }
.education-entry { margin-bottom: 1.8mm; break-inside: avoid; }
.education-degree { font-size: 10pt; font-weight: 700; }
.plain-list { list-style: none; padding: 0; }
.plain-list li { margin-bottom: .6mm; }
.languages { list-style: none; padding: 0; }
.languages li { margin-bottom: .4mm; }

@media (max-width: 760px) {
  :root { font-size: 11pt; }
  .resume { width: 100%; min-height: 0; margin: 0; padding: 24px 20px; box-shadow: none; }
}

@page { size: A4; margin: 13mm 15mm; }
@media print {
  :root { background: #fff; }
  .resume { width: auto; min-height: 0; margin: 0; padding: 0; box-shadow: none; }
}
`;
