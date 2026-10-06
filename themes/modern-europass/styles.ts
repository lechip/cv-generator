import { notoSansBold, notoSansRegular } from "./fonts.js";

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

export const styles = `${fontCss}
:root {
  --accent: #0066cc;
  --accent-secondary: #1593cb;
  --text: #111;
  --muted: #555;
  --label-column: 43mm;
  --column-gap: 6mm;
  font-family: "Noto Sans", Arial, sans-serif;
  color: var(--text);
  background: #f3f5f7;
  font-size: 10pt;
  line-height: 1.18;
  -webkit-hyphens: none;
  hyphens: none;
}
* { box-sizing: border-box; }
.nowrap { white-space: nowrap; }
body { margin: 0; background: inherit; }
a { color: var(--accent); text-decoration: none; }
.resume {
  width: 210mm;
  min-height: 297mm;
  margin: 18px auto;
  padding: 11mm 12mm 13mm 14mm;
  background: #fff;
  box-shadow: 0 2px 18px rgba(0,0,0,.12);
}
.document-title {
  color: var(--accent);
  text-align: right;
  font-size: 10pt;
  margin: 0 0 17mm;
  font-weight: 400;
}
.section {
  display: grid;
  grid-template-columns: var(--label-column) minmax(0, 1fr);
  column-gap: var(--column-gap);
  margin: 0 0 5mm;
}
.section-title {
  color: var(--accent);
  font-weight: 700;
  text-transform: uppercase;
  text-align: right;
  letter-spacing: .01em;
  margin: 0;
  font-size: 10pt;
}
.section-content { min-width: 0; }
.contact-line { margin: 0 0 2.5mm; }
.contact-label { color: var(--accent); font-weight: 700; margin-right: .35em; }
.summary { margin: 0; }
.strength { margin: 0 0 .7mm; }
.strength-name { font-weight: 700; }
.experience-entry {
  display: grid;
  grid-template-columns: var(--label-column) minmax(0, 1fr);
  column-gap: var(--column-gap);
  margin: 0 0 4.2mm;
  break-inside: avoid;
}
.experience-date { color: var(--accent); text-align: right; }
.experience-heading { break-after: avoid; }
.experience-company { color: var(--accent); font-weight: 700; }
.experience-position { color: var(--accent); margin-top: .2mm; }
.experience-summary { margin: .8mm 0 0; }
.highlights { margin: .7mm 0 0; padding: 0; list-style: none; }
.highlights li { margin: 0 0 .35mm; break-inside: avoid; }
.highlights li::before { content: "• "; }
.compact-entry { break-inside: avoid; }
.compact-entry p { margin: 0; }
.education-entry { margin: 0 0 4mm; break-inside: avoid; }
.education-degree { color: var(--accent); font-weight: 700; }
.education-school { color: var(--accent); margin-top: .5mm; }
.languages {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 7mm;
  row-gap: 1.4mm;
  margin: 0;
  padding: 0;
  list-style: none;
}
.languages li {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: 1.2mm;
  align-items: baseline;
}
.language-name { color: var(--accent); font-weight: 700; }
.language-fluency { color: var(--text); }
.standard-skills { margin: 0; padding-left: 1.1em; }
.standard-skills li { margin-bottom: .8mm; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }

@media (max-width: 760px) {
  :root { font-size: 11pt; }
  .resume { width: 100%; min-height: 0; margin: 0; padding: 24px 20px; box-shadow: none; }
  .document-title { text-align: left; margin-bottom: 32px; }
  .section, .experience-entry { grid-template-columns: 1fr; gap: 7px; }
  .section-title, .experience-date { text-align: left; }
  .section-title { border-bottom: 1px solid #cfe4fa; padding-bottom: 3px; }
  .languages { grid-template-columns: 1fr; }
}

@page { size: A4; margin: 11mm 12mm 14mm 14mm; }
@media print {
  :root { background: #fff; font-size: 10pt; line-height: 1.16; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  .resume { width: auto; min-height: 0; margin: 0; padding: 0; box-shadow: none; }
  .document-title { margin-bottom: 14mm; }
  .section { margin-bottom: 4.3mm; }
  .experience-entry { margin-bottom: 3.2mm; }
  a { color: var(--accent); }
}
`;
