---
name: tailor-cv
description: Condense a complete canonical JSON Resume into a factual, self-contained printable JSON Resume tailored to a job or use case, or into a general CV that passes applicant tracking systems. Use when creating or revising an application CV, choosing recent or relevant experience, producing a balanced two-page variant, clearing ats-check findings, or fixing a printable variant that fails validation or exceeds two A4 pages.
---

# Tailor CV

Create the printable JSON. Treat the CLI and theme as deterministic validators/renderers; never delegate editorial selection to them. `pnpm cv ats-check` is read-only feedback: it reports, you revise the JSON.

## Inputs

Obtain these from the request or use the defaults:

- Canonical JSON path: the path given in the request, or the sole `profiles/<person>/canonical-career.json` when exactly one profile directory exists.
- Job description: pasted text or file; optional for a general CV. Save pasted text to a file so `ats-check --job <file>` can read it.
- Use-case notes: optional.
- Focus: `recent`, `relevant`, or `balanced`; default `balanced`.
- Theme: the CLI default `ats` (single column) for every portal upload. Use `modern-europass` only when a person explicitly asks for the Europass look.
- Printable JSON path: default to `printable-career.json` beside the canonical file. Replace that file on every tailoring run; it is a disposable working derivative, not a variant archive. Use another path only when the user explicitly requests one.
- Rendered document directory: default `output/`.

Read [contracts.md](references/contracts.md) before creating or revising a printable file.

## Workflow

1. Run `pnpm cv validate <canonical>` and stop if canonical data is invalid.
2. Read every canonical section and the job/use-case material. Build an evidence map linking requirements to canonical work IDs, highlights, skills, education, and languages. For each work ID, also list every number the canonical entry states (percentages, currency amounts, durations, counts of users, customers, requests, team members, countries, or services) and the claim each number belongs to. Without a job description, follow [General CV](#general-cv-no-job-description).
3. Select detailed roles according to focus:
   - `recent`: favor chronology while retaining directly relevant older evidence.
   - `relevant`: favor strongest evidence even when older.
   - `balanced`: combine recent continuity with the strongest target-specific evidence.
4. Write a concise targeted summary, `basics.label`, strengths, selected work entries, other-experience text, education, and languages, following [ATS and AI-screening rules](#ats-and-ai-screening-rules). Replace the configured printable JSON rather than creating a new variant directory. Materialize all immutable facts and add `x-cv.sourceId` links. Copy each language's raw `fluency` and complete `x-cv.proficiency` object without translating or rewriting either value.
5. Copy the canonical relative path and current SHA-256 into `meta.x-cv`. Populate selected and omitted work IDs. Compute `otherExperience.count`, total, highlighted IDs, highlighted names, date range, and summary from the complete canonical list.
6. Run `pnpm cv validate <printable>`. Correct all stale hashes, ID/count mismatches, or immutable-field differences.
7. Run `pnpm cv ats-check <printable>`; add `--job <file>` when a job description exists. Fix every ERROR and WARN by editing printable JSON only; never change theme files. Accept a WARN only when canonical evidence cannot support the change, and say so in the report. `education-degree-unclear` comes from canonical education data, which printable JSON copies unchanged: report it as a canonical fix (for example "MSc" to "Master of Science (MSc)"). `words-glued` is a theme defect: report it and do not try to fix it in JSON.
8. Run `pnpm cv build <printable> --formats pdf`. This uses the default `output/` directory and the default `ats` theme. Add `--out <rendered-document-directory>` only when the user supplied a different directory.
9. If the build reports more than two pages, revise JSON only, in order:
   1. Remove lower-priority highlights.
   2. Tighten summary and strength wording.
   3. Condense detailed-role prose.
   4. Reduce detailed roles and update selected/omitted metadata.
10. Repeat steps 6-9 until validation passes, `ats-check` reports no ERROR or WARN, and the PDF is at most two pages. If responsible condensation cannot meet the limit, stop and explain what prevents it.
11. Report the printable JSON path, target/focus, detailed and omitted counts, the `ats-check` result (errors, warnings, keyword coverage, job match when a job description was given), and the generated PDF path.

## General CV (no job description)

A general CV is uploaded to portals and profile databases that screen with parsers and language models before any human reads it. It must parse perfectly and show every skill the selected roles contain.

- Set `basics.label` to the market-standard title the person searches for (for example `Senior Software Engineer`), supported by canonical positions. Do not copy a LinkedIn headline with company names or slogans.
- Set `meta.x-cv.targetJob` to `null` and describe the audience in `useCase`.
- Select detailed roles by `focus` over the whole career; prefer `balanced`.
- Cover the union of canonical `work[].keywords` of the selected roles plus `skills[].keywords`, grouped into 3-5 Skills groups by domain. `ats-check` reports every missing term as a WARN for a general CV.
- Keep `work[].keywords` on each detailed role; the `ats` theme prints them as a "Technologies" line.

## ATS and AI-screening rules

Employers run two machines before a person reads the CV: a parser with a keyword filter, then a language model that ranks candidates. The theme owns layout and section names; these rules cover the words.

- Fill `basics.label`, `basics.email`, and a LinkedIn profile; add `basics.phone` when the canonical file has one.
- Write each highlight as one factual sentence that starts with an action verb, names the result, carries the canonical number when one exists, and states how. Keep each highlight at or under 30 words. Follow [Bullet writing](#bullet-writing).
- No first person. No "responsible for", "duties included", "worked on", or similar duty phrasing.
- Name each key skill with the exact term used in the market; mention both the acronym and the spelled-out form once each where both are common (for example "Amazon Web Services (AWS)").
- Avoid vocabulary that reads as generated text: spearheaded, leveraged, passionate, results-driven, cutting-edge, synergy, seamless, robust, dynamic, delve, utilize, innovative, holistic, empower, foster, meticulous, proactive, pivotal, best-in-class, world-class. Avoid em dashes, smart quotes, and three-item rhetorical lists.
- Mirror the wording of a job description only where canonical evidence supports it. Never add a skill to improve a score.
- When a job description is given, align `basics.label` with its title only when canonical positions support that title.

## Bullet writing

### Concrete numbers

- Put a number in every highlight that has canonical data for one. Use the evidence map from step 2.
- Prefer, in this order: business result (currency amount, revenue, cost saved), percent change, scale (users, customers, requests, data volume, countries, services, team size), then time (delivery time, latency, release frequency).
- Copy each number exactly as canonical data states it, with its unit and currency. Keep "about", "over", or "up to" qualifiers.
- Move a number from a role's `summary` into a highlight of the same role when it belongs to that highlight's claim.
- Derive a percent only from a canonical before and after value of the same metric, rounded down to a whole number (for example 40 min to 10 min becomes "75%").
- When canonical data has no number for a claim, write the claim without one. Never estimate, round up, or add a number to fill a gap. Never move a number to a different claim, role, or period.
- Keep at least one numbered highlight for each detailed role whose canonical entry has a number; `ats-check` reports `metric-dropped` otherwise.
- When a page-budget cut removes highlights, remove unnumbered ones first, if relevance is equal.

### Strong action verbs

- Open every highlight with a past-tense action verb that names what the person did. Use present tense only for the current role when the work is ongoing. Keep one tense within a role.
- Do not open with a noun, an adjective, a number, a gerund ("Building ..."), or a passive form ("Was tasked with ...", "Was promoted ..."). Rewrite the sentence so the person is the actor.
- Swap weak openers for the specific verb that canonical evidence supports:

  | Weak opener | Stronger choice (pick the one the evidence supports) |
  | --- | --- |
  | Helped, Assisted, Supported, Contributed to | Built, Implemented, Delivered, Co-designed |
  | Worked on, Was involved in, Participated in | Built, Developed, Migrated, Tested |
  | Was responsible for, In charge of, Handled | Led, Owned, Ran, Managed |
  | Made, Did, Performed | Built, Ran, Executed, Shipped |
  | Used, Utilized, Leveraged | Built with, Implemented in, Adopted |
  | Improved, Enhanced (alone) | Reduced, Cut, Increased, Sped up (with the number) |
  | Was promoted to | Earned promotion to |
  | Was tasked with, Was asked to | the verb for the task itself |

- Pick a verb that is true to canonical scope. Use "Led" or "Owned" only when canonical data shows ownership or leadership. Use "Co-designed" or "Co-led" when the work was shared.
- Vary verbs: do not open two highlights in the same role with the same verb.
- Do not use the AI-tell words in [ATS and AI-screening rules](#ats-and-ai-screening-rules) as verbs, even though some are action verbs ("Spearheaded", "Leveraged", "Utilized", "Fostered").
- `ats-check` reports `bullet-no-action-verb` and `bullet-weak-phrase`. It accepts some weak verbs ("Supported", "Handled", "Contributed"). Swap them anyway when a stronger true verb exists.

## Factual Guardrails

- Use only canonical evidence. Never invent or infer technologies, metrics, scope, responsibilities, employers, dates, qualifications, language levels, or outcomes.
- Rephrase and combine canonical evidence without strengthening its meaning. A stronger verb must stay true to canonical scope; a derived percent must follow [Concrete numbers](#concrete-numbers).
- Preserve employer, position, location, URL, dates, contact data, education, and language facts exactly. For languages, preserve both `fluency` and the structured CEFR `x-cv.proficiency` object; validation enforces them.
- Keep claims traceable to a canonical entry or highlight.
- Do not modify theme files, typography, spacing, or page size to satisfy the page budget or an `ats-check` finding.
- Do not modify canonical data while tailoring. Report suspected canonical errors separately.

## Editorial Targets

- Aim for a 60-90 word summary and 3-5 strength groups.
- Start with 4-6 detailed roles; use fewer when relevance or page budget requires it.
- Prefer 3-5 high-value highlights for the newest or most relevant role and 2-4 for other detailed roles.
- State the exact count of omitted roles and highlight only omitted employers.
- Retain languages and the education most useful to the target unless the user requests otherwise.
