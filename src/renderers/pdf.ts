import { readFile, writeFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { chromium } from "playwright";

export interface PdfRenderOptions {
  /** Print a "Page X / Y" footer. Single-column ATS themes disable it so no footer text lands in the extracted flow. */
  footer?: boolean;
  /**
   * Emit a tagged (accessible) PDF; default true. Chromium splits tagged text at every element
   * boundary and writes the joining space as a separate empty item, which strict parsers drop
   * ("Berlin, Germany|+49 ..."). ATS themes turn it off so each line stays one text run.
   */
  tagged?: boolean;
}

export async function renderPdfBytes(html: string, options: PdfRenderOptions = {}): Promise<Uint8Array> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const footer = options.footer !== false;
    return await page.pdf({
      format: "A4",
      preferCSSPageSize: true,
      printBackground: true,
      tagged: options.tagged !== false,
      outline: true,
      displayHeaderFooter: footer,
      ...(footer
        ? {
            headerTemplate: "<span></span>",
            footerTemplate: `<div style="width:100%;padding:0 12mm 3mm 0;text-align:right;font-family:Arial,sans-serif;font-size:7px;color:#1593cb">Page <span class="pageNumber"></span> / <span class="totalPages"></span></div>`,
          }
        : {}),
    });
  } finally {
    await browser.close();
  }
}

export async function renderPdf(html: string, outputPath: string, options: PdfRenderOptions = {}): Promise<number> {
  const pdf = await renderPdfBytes(html, options);
  await writeFile(outputPath, pdf);
  return countPdfPages(outputPath);
}

export async function countPdfPages(filePath: string): Promise<number> {
  const bytes = await readFile(filePath);
  const document = await PDFDocument.load(bytes);
  return document.getPageCount();
}
