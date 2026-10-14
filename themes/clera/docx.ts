import type { Resume } from "../../src/types.js";
import { resumeLanguageCode } from "../../src/core/naming.js";
import { buildLayout, type Run } from "./layout.js";

/**
 * WordprocessingML parts that reproduce Clera_Resume_Template.docx: A4, the template margins,
 * Cambria, the same sizes and spacing. Section titles use the built-in Heading 1 style restyled to
 * the template look, so parsers that read paragraph styles still find the sections.
 * Output is deterministic: no timestamps, revision IDs or random values.
 */

// Template measures in twentieths of a point (twips) and half-points.
const PAGE = { width: 11906, height: 16838, top: 706, right: 678, bottom: 984, left: 723 };
const RIGHT_TAB = PAGE.width - PAGE.left - PAGE.right;
const SIZE = { name: 32, label: 22, contact: 20, heading: 24, body: 21 };
const SPACE = { heading: 255, entry: 248, plain: 85, bullets: 16 };

const NS_W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const NS_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

interface RunStyle { bold?: boolean; size?: number; link?: boolean }

class Builder {
  private readonly links: string[] = [];
  readonly body: string[] = [];

  /** Relationship entries for every hyperlink, in first-use order. */
  get relationships(): string {
    return this.links.map((target, index) => `<Relationship Id="rIdLink${index + 1}" Type="${NS_R}/hyperlink" Target="${escapeXml(target)}" TargetMode="External"/>`).join("");
  }

  run(text: string, style: RunStyle = {}): string {
    const props = [
      style.bold ? "<w:b/><w:bCs/>" : "",
      style.link ? '<w:color w:val="0000FF"/><w:u w:val="single"/>' : "",
      style.size ? `<w:sz w:val="${style.size}"/><w:szCs w:val="${style.size}"/>` : "",
    ].join("");
    return `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ""}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
  }

  runs(runs: Run[], style: RunStyle = {}, linkStyle = false): string {
    return runs.map((item) => {
      const run = this.run(item.text, { ...style, bold: item.bold ?? style.bold, link: linkStyle && Boolean(item.href) });
      if (!item.href) return run;
      let index = this.links.indexOf(item.href);
      if (index < 0) index = this.links.push(item.href) - 1;
      return `<w:hyperlink r:id="rIdLink${index + 1}">${run}</w:hyperlink>`;
    }).join("");
  }

  paragraph(content: string, props = ""): void {
    this.body.push(`<w:p>${props ? `<w:pPr>${props}</w:pPr>` : ""}${content}</w:p>`);
  }
}

const spacing = (before: number) => `<w:spacing w:before="${before}" w:after="0"/>`;

function documentXml(resume: Resume, builder: Builder): string {
  const layout = buildLayout(resume);

  builder.paragraph(builder.run(layout.name, { bold: true, size: SIZE.name }), '<w:jc w:val="center"/>');
  if (layout.label) builder.paragraph(builder.run(layout.label, { size: SIZE.label }), '<w:jc w:val="center"/>');
  if (layout.contacts.length) {
    const parts = layout.contacts.map((item, index) => `${index > 0 ? builder.run(" • ", { size: SIZE.contact }) : ""}${builder.runs([item], { size: SIZE.contact }, true)}`);
    builder.paragraph(parts.join(""), `<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="4" w:color="000000"/></w:pBdr>${spacing(7)}<w:jc w:val="center"/>`);
  }

  for (const section of layout.sections) {
    builder.paragraph(builder.run(section.title), '<w:pStyle w:val="Heading1"/>');
    for (const entry of section.entries) {
      const hasHead = Boolean(entry.head);
      const keep = "<w:keepNext/><w:keepLines/>";
      if (entry.head) {
        const dates = entry.head.dates ? `<w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:tab/><w:t xml:space="preserve">${escapeXml(entry.head.dates)}</w:t></w:r>` : "";
        builder.paragraph(`${builder.runs(entry.head.left)}${dates}`, `${keep}<w:tabs><w:tab w:val="right" w:pos="${RIGHT_TAB}"/></w:tabs>${spacing(SPACE.entry)}`);
      }
      entry.lines.forEach((line, index) => {
        const before = !hasHead && index === 0 ? SPACE.plain : 0;
        builder.paragraph(builder.runs(line), `${hasHead && index === 0 ? keep : ""}${before ? spacing(before) : ""}`);
      });
      entry.bullets.forEach((bullet, index) => {
        const before = index === 0 ? (hasHead || entry.lines.length ? SPACE.bullets : SPACE.plain) : 0;
        builder.paragraph(builder.runs(bullet), `<w:pStyle w:val="ListBullet"/>${before ? spacing(before) : ""}`);
      });
      for (const line of entry.after) builder.paragraph(builder.runs(line));
    }
  }

  const section = `<w:sectPr><w:pgSz w:w="${PAGE.width}" w:h="${PAGE.height}"/><w:pgMar w:top="${PAGE.top}" w:right="${PAGE.right}" w:bottom="${PAGE.bottom}" w:left="${PAGE.left}" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>`;
  return `${XML_HEAD}<w:document xmlns:w="${NS_W}" xmlns:r="${NS_R}"><w:body>${builder.body.join("")}${section}</w:body></w:document>`;
}

function stylesXml(language: string): string {
  const font = '<w:rFonts w:ascii="Cambria" w:hAnsi="Cambria" w:eastAsia="Cambria" w:cs="Cambria"/>';
  return `${XML_HEAD}<w:styles xmlns:w="${NS_W}">`
    + `<w:docDefaults><w:rPrDefault><w:rPr>${font}<w:color w:val="000000"/><w:sz w:val="${SIZE.body}"/><w:szCs w:val="${SIZE.body}"/><w:lang w:val="${language}"/></w:rPr></w:rPrDefault>`
    + '<w:pPrDefault><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>'
    + '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>'
    + '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>'
    + `<w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="${SPACE.heading}" w:after="0"/><w:outlineLvl w:val="0"/></w:pPr>`
    + `<w:rPr><w:b/><w:bCs/><w:u w:val="single"/><w:sz w:val="${SIZE.heading}"/><w:szCs w:val="${SIZE.heading}"/></w:rPr></w:style>`
    + '<w:style w:type="paragraph" w:styleId="ListBullet"><w:name w:val="List Bullet"/><w:basedOn w:val="Normal"/>'
    + '<w:pPr><w:keepLines/><w:numPr><w:numId w:val="1"/></w:numPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:style>'
    + "</w:styles>";
}

function numberingXml(): string {
  return `${XML_HEAD}<w:numbering xmlns:w="${NS_W}"><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="singleLevel"/>`
    + '<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/>'
    + '<w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>';
}

/** Every part of the .docx package, keyed by its path inside the zip, in a stable order. */
export function renderDocx(resume: Resume): Array<[string, string]> {
  const builder = new Builder();
  const document = documentXml(resume, builder);
  const language = resumeLanguageCode(resume);
  const name = resume.basics?.name;
  const title = name ? `${name} - CV` : "Curriculum Vitae";
  const ct = "application/vnd.openxmlformats-officedocument";
  return [
    ["[Content_Types].xml", `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
      + `<Override PartName="/word/document.xml" ContentType="${ct}.wordprocessingml.document.main+xml"/>`
      + `<Override PartName="/word/styles.xml" ContentType="${ct}.wordprocessingml.styles+xml"/>`
      + `<Override PartName="/word/numbering.xml" ContentType="${ct}.wordprocessingml.numbering+xml"/>`
      + '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>'],
    ["_rels/.rels", `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
      + `<Relationship Id="rId1" Type="${NS_R}/officeDocument" Target="word/document.xml"/>`
      + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>'],
    ["docProps/core.xml", `${XML_HEAD}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/">`
      + `<dc:title>${escapeXml(title)}</dc:title>${name ? `<dc:creator>${escapeXml(name)}</dc:creator>` : ""}<dc:language>${language}</dc:language></cp:coreProperties>`],
    ["word/document.xml", document],
    ["word/styles.xml", stylesXml(language)],
    ["word/numbering.xml", numberingXml()],
    ["word/_rels/document.xml.rels", `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
      + `<Relationship Id="rIdStyles" Type="${NS_R}/styles" Target="styles.xml"/><Relationship Id="rIdNumbering" Type="${NS_R}/numbering" Target="numbering.xml"/>`
      + `${builder.relationships}</Relationships>`],
  ];
}
