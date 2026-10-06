import { PDFArray, PDFDict, PDFDocument, PDFName, PDFRef } from "pdf-lib";
import { getDocumentProxy } from "unpdf";
import type { PdfLine, PdfPage, PdfStructure } from "./types.js";

interface TextItem {
  str: string;
  transform: number[];
  width: number;
  height?: number;
}

const LINE_TOLERANCE_PT = 2;
const WORD_GAP_PT = 1;
/** Strict parsers (pdf.js-based screeners) drop whitespace-only items and add a space only past half the font size. */
const STRICT_GAP_RATIO = 0.5;

/**
 * Rebuild reading lines from pdf.js text items the way a simple parser does:
 * group by baseline y, order by x, join with a space when items are apart.
 */
export async function extractPdfPages(bytes: Uint8Array): Promise<PdfPage[]> {
  // pdf.js takes ownership of (and may detach) the buffer it receives; hand it a copy so callers can reuse `bytes`.
  const document = await getDocumentProxy(new Uint8Array(bytes));
  const pages: PdfPage[] = [];
  try {
    for (let number = 1; number <= document.numPages; number += 1) {
      const page = await document.getPage(number);
      const content = await page.getTextContent();
      const items = (content.items as TextItem[]).filter((item) => typeof item.str === "string" && item.str.trim() !== "");
      pages.push({ page: number, lines: groupIntoLines(items) });
    }
  } finally {
    await (document as { destroy?: () => Promise<void> }).destroy?.();
  }
  return pages;
}

function groupIntoLines(items: TextItem[]): PdfLine[] {
  const rows: Array<{ y: number; items: TextItem[] }> = [];
  for (const item of items) {
    const y = item.transform[5] ?? 0;
    const row = rows.find((candidate) => Math.abs(candidate.y - y) <= LINE_TOLERANCE_PT);
    if (row) row.items.push(item);
    else rows.push({ y, items: [item] });
  }
  rows.sort((left, right) => right.y - left.y);
  return rows.map((row) => {
    const ordered = [...row.items].sort((left, right) => (left.transform[4] ?? 0) - (right.transform[4] ?? 0));
    let text = "";
    const gaps: number[] = [];
    let previousEnd: number | undefined;
    for (const item of ordered) {
      const x = item.transform[4] ?? 0;
      if (previousEnd !== undefined) {
        const gap = x - previousEnd;
        gaps.push(gap);
        if (gap > WORD_GAP_PT && !text.endsWith(" ") && !item.str.startsWith(" ")) text += " ";
      }
      text += item.str;
      previousEnd = x + (item.width ?? 0);
    }
    return { text: text.replace(/\s+/g, " ").trim(), strictText: strictLine(ordered), y: row.y, x: ordered[0]?.transform[4] ?? 0, gaps };
  }).filter((line) => line.text !== "");
}

/** The same row as a strict parser rebuilds it: whitespace-only items vanish and only wide gaps become spaces. */
function strictLine(ordered: TextItem[]): string {
  const visible = ordered.filter((item) => item.str.trim() !== "");
  let text = "";
  let previous: TextItem | undefined;
  for (const item of visible) {
    if (previous) {
      const gap = (item.transform[4] ?? 0) - ((previous.transform[4] ?? 0) + (previous.width ?? 0));
      if (gap > (item.height ?? 0) * STRICT_GAP_RATIO) text += " ";
    }
    text += item.str;
    previous = item;
  }
  return text.replace(/\s+/g, " ").trim();
}

/** Page count, title metadata, font embedding and raster images via pdf-lib. */
export async function inspectPdfStructure(bytes: Uint8Array): Promise<PdfStructure> {
  const document = await PDFDocument.load(bytes, { updateMetadata: false });
  const fonts = new Map<string, boolean>();
  let images = 0;
  for (const page of document.getPages()) {
    const resources = page.node.Resources();
    const fontDict = resources?.lookupMaybe(PDFName.of("Font"), PDFDict);
    if (fontDict) {
      for (const [, value] of fontDict.entries()) {
        const font = value instanceof PDFRef ? document.context.lookup(value, PDFDict) : value instanceof PDFDict ? value : undefined;
        if (!font) continue;
        const name = font.lookupMaybe(PDFName.of("BaseFont"), PDFName)?.decodeText() ?? "unknown";
        fonts.set(name, fonts.get(name) || isEmbedded(document, font));
      }
    }
    const xobjects = resources?.lookupMaybe(PDFName.of("XObject"), PDFDict);
    if (xobjects) {
      for (const [, value] of xobjects.entries()) {
        const xobject = value instanceof PDFRef ? document.context.lookup(value) : value;
        const subtype = xobject instanceof PDFDict ? xobject.lookupMaybe(PDFName.of("Subtype"), PDFName)?.decodeText() : undefined;
        if (subtype === "Image") images += 1;
      }
    }
  }
  return {
    pages: document.getPageCount(),
    title: document.getTitle() || undefined,
    fonts: [...fonts.entries()].map(([name, embedded]) => ({ name, embedded })),
    images,
  };
}

function isEmbedded(document: PDFDocument, font: PDFDict): boolean {
  let descriptor = font.lookupMaybe(PDFName.of("FontDescriptor"), PDFDict);
  if (!descriptor) {
    // Composite (Type0) fonts keep the descriptor on their first descendant font.
    const descendants = font.lookupMaybe(PDFName.of("DescendantFonts"), PDFArray);
    const first = descendants?.size() ? descendants.get(0) : undefined;
    const descendant = first instanceof PDFRef ? document.context.lookup(first, PDFDict) : first instanceof PDFDict ? first : undefined;
    descriptor = descendant?.lookupMaybe(PDFName.of("FontDescriptor"), PDFDict);
  }
  if (!descriptor) return false;
  const found = descriptor;
  return ["FontFile", "FontFile2", "FontFile3"].some((key) => found.has(PDFName.of(key)));
}
