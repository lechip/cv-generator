import { readFile, writeFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { chromium } from "playwright";

export async function renderPdf(html: string, outputPath: string): Promise<number> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const pdf = await page.pdf({
      format: "A4",
      preferCSSPageSize: true,
      printBackground: true,
      tagged: true,
      outline: true,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: `<div style="width:100%;padding:0 12mm 3mm 0;text-align:right;font-family:Arial,sans-serif;font-size:7px;color:#1593cb">Page <span class="pageNumber"></span> / <span class="totalPages"></span></div>`,
    });
    await writeFile(outputPath, pdf);
    return countPdfPages(outputPath);
  } finally {
    await browser.close();
  }
}

export async function countPdfPages(filePath: string): Promise<number> {
  const bytes = await readFile(filePath);
  const document = await PDFDocument.load(bytes);
  return document.getPageCount();
}
