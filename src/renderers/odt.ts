import { access, copyFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function run(command: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}: ${stderr.trim()}`)));
  });
}

async function commandAvailable(command: string): Promise<boolean> {
  try {
    await run(command, ["--version"]);
    return true;
  } catch {
    return false;
  }
}

export async function renderOdt(markdown: string, html: string, outputPath: string, themeDirectory: string, languageCode = "en"): Promise<"pandoc" | "libreoffice"> {
  const scratch = await mkdtemp(path.join(tmpdir(), "cv-generator-odt-"));
  try {
    if (await commandAvailable("pandoc")) {
      const markdownPath = path.join(scratch, "resume.md");
      const astPath = path.join(scratch, "resume.pandoc.json");
      await writeFile(markdownPath, markdown, "utf8");
      await run("pandoc", [markdownPath, "--from=gfm", "--to=json", "--output", astPath]);
      const referencePath = path.join(themeDirectory, "reference.odt");
      const args = [astPath, "--from=json", "--to=odt", "--standalone", `--metadata=lang:${languageCode}`, "--output", outputPath];
      if (await exists(referencePath)) args.splice(args.length - 2, 0, "--reference-doc", referencePath);
      await run("pandoc", args);
      return "pandoc";
    }

    const soffice = process.env.SOFFICE ?? "soffice";
    if (!(await commandAvailable(soffice))) {
      throw new Error("ODT generation requires pandoc or LibreOffice (soffice). Use the Docker image or install one of them.");
    }
    const htmlPath = path.join(scratch, "resume.html");
    await writeFile(htmlPath, html, "utf8");
    await run(soffice, [
      `-env:UserInstallation=file://${path.join(scratch, "lo-profile")}`,
      "--headless",
      "--convert-to", "odt",
      "--outdir", scratch,
      htmlPath,
    ]);
    const generated = path.join(scratch, "resume.odt");
    if (!(await exists(generated))) throw new Error("LibreOffice did not produce an ODT file");
    await copyFile(generated, outputPath);
    return "libreoffice";
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}
