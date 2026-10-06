import type { AtsFinding, AtsLevel, AtsReport } from "./types.js";

const ORDER: AtsLevel[] = ["error", "warn", "info"];
const LABEL: Record<AtsLevel, string> = { error: "ERROR", warn: "WARN ", info: "INFO " };

export function countFindings(findings: AtsFinding[]): Record<AtsLevel, number> {
  const counts: Record<AtsLevel, number> = { error: 0, warn: 0, info: 0 };
  for (const item of findings) counts[item.level] += 1;
  return counts;
}

export function formatReport(report: AtsReport): string {
  const lines: string[] = [];
  const pages = report.pdf ? `, ${report.pdf.pages} page${report.pdf.pages === 1 ? "" : "s"}` : "";
  lines.push(`ATS check: ${report.resumePath} (${report.kind}, theme ${report.theme}${pages})`);
  for (const level of ORDER) {
    const items = report.findings.filter((item) => item.level === level);
    if (!items.length) continue;
    lines.push("");
    for (const item of items) {
      lines.push(`${LABEL[level]} ${item.layer.padEnd(8)} ${item.code.padEnd(24)} ${item.message}${item.path ? `  [${item.path}]` : ""}`);
      if (item.hint) lines.push(`${" ".repeat(40)}hint: ${item.hint}`);
    }
  }
  lines.push("");
  if (report.keywordCoverage) {
    const coverage = report.keywordCoverage;
    lines.push(`Keyword coverage: ${coverage.covered}/${coverage.total} (${coverage.percent}%)${coverage.missing.length ? ` missing: ${coverage.missing.join(", ")}` : ""}`);
  }
  if (report.jobMatch) {
    const job = report.jobMatch;
    lines.push(`Job match: ${job.covered}/${job.total} (${job.percent}%); title aligned: ${job.titleAligned ? "yes" : "no"}${job.missing.length ? `; missing: ${job.missing.join(", ")}` : ""}`);
  }
  lines.push(`Result: ${report.ok ? "PASS" : "FAIL"} (${report.counts.error} error${report.counts.error === 1 ? "" : "s"}, ${report.counts.warn} warning${report.counts.warn === 1 ? "" : "s"}, ${report.counts.info} info)`);
  return `${lines.join("\n")}\n`;
}
