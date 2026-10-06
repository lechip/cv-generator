// Rewrites every renderer snapshot under tests/snapshots from tests/fixtures/standard.json.
// Run after an intentional markup change: pnpm snapshots:update
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { readResume } from "../src/core/files.js";
import { renderHtml, themeNames } from "../src/renderers/html.js";
import { renderMarkdown } from "../src/renderers/markdown.js";
import { renderText } from "../src/renderers/text.js";

const root = process.cwd();
const resume = await readResume(path.join(root, "tests/fixtures/standard.json"));
const snapshots = path.join(root, "tests/snapshots");

function maskCss(html: string): string {
  return html.replace(/<style>[\s\S]*<\/style>/, "<style>[theme-css]</style>");
}

await writeFile(path.join(snapshots, "standard.md"), renderMarkdown(resume), "utf8");
await writeFile(path.join(snapshots, "standard.txt"), renderText(resume), "utf8");
for (const theme of themeNames()) {
  const file = theme === "modern-europass" ? "standard.html" : `standard.${theme}.html`;
  await writeFile(path.join(snapshots, file), `${maskCss(renderHtml(resume, theme))}\n`, "utf8");
  console.log(`snapshot: ${file}`);
}
console.log("snapshot: standard.md, standard.txt");
