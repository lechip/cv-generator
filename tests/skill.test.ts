import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

test("tailor-cv skill exposes all focus scenarios and the JSON-only page-budget loop", async () => {
  const skill = await readFile(path.join(process.cwd(), ".agents/skills/tailor-cv/SKILL.md"), "utf8");
  for (const focus of ["recent", "relevant", "balanced"]) assert.match(skill, new RegExp(`\\b${focus}\\b`));
  assert.match(skill, /default `balanced`/);
  assert.match(skill, /Rendered document directory: default `output\/`/);
  assert.match(skill, /uses the default `output\/` directory/);
  assert.match(skill, /sole `profiles\/<person>\/canonical-career\.json`/);
  assert.match(skill, /Replace that file on every tailoring run/);
  assert.match(skill, /revise JSON only/);
  assert.match(skill, /Never invent or infer technologies, metrics/);
  assert.match(skill, /Do not modify theme files/);
  const removal = skill.indexOf("Remove lower-priority highlights");
  const summary = skill.indexOf("Tighten summary and strength wording");
  const prose = skill.indexOf("Condense detailed-role prose");
  const roles = skill.indexOf("Reduce detailed roles");
  assert.ok(removal < summary && summary < prose && prose < roles, "page-budget revisions must remain ordered");
});

test("tailor-cv skill runs ats-check between validation and build and documents the ATS rules", async () => {
  const skill = await readFile(path.join(process.cwd(), ".agents/skills/tailor-cv/SKILL.md"), "utf8");
  assert.match(skill, /pnpm cv ats-check <printable>/);
  assert.match(skill, /## General CV/);
  assert.match(skill, /## ATS and AI-screening rules/);
  assert.match(skill, /action verb/);
  assert.match(skill, /30 words/);
  assert.match(skill, /basics\.label/);
  assert.match(skill, /## Bullet writing/);
  assert.match(skill, /### Concrete numbers/);
  assert.match(skill, /Never estimate, round up, or add a number/);
  assert.match(skill, /### Strong action verbs/);
  assert.match(skill, /Swap weak openers/);
  const validate = skill.indexOf("pnpm cv validate <printable>");
  const atsCheck = skill.indexOf("pnpm cv ats-check <printable>");
  const build = skill.indexOf("pnpm cv build <printable>");
  assert.ok(validate < atsCheck && atsCheck < build, "ats-check must run after validation and before the build");
});
