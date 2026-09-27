---
name: tailor-cv
description: Condense a complete canonical JSON Resume into a factual, self-contained printable JSON Resume tailored to a job or use case. Use when creating or revising an application CV, choosing recent or relevant experience, producing a balanced two-page variant, or fixing a printable variant that fails validation or exceeds two A4 pages.
---

# Tailor CV

Create the printable JSON. Treat the CLI and theme as deterministic validators/renderers; never delegate editorial selection to them.

## Inputs

Obtain these from the request or use the defaults:

- Canonical JSON path: the path given in the request, or the sole `profiles/<person>/canonical-career.json` when exactly one profile directory exists.
- Job description: pasted text or file; optional for a general CV.
- Use-case notes: optional.
- Focus: `recent`, `relevant`, or `balanced`; default `balanced`.
- Printable JSON path: default to `printable-career.json` beside the canonical file. Replace that file on every tailoring run; it is a disposable working derivative, not a variant archive. Use another path only when the user explicitly requests one.
- Rendered document directory: default `output/`.

Read [contracts.md](references/contracts.md) before creating or revising a printable file.

## Workflow

1. Run `pnpm cv validate <canonical>` and stop if canonical data is invalid.
2. Read every canonical section and the job/use-case material. Build an evidence map linking requirements to canonical work IDs, highlights, skills, education, and languages.
3. Select detailed roles according to focus:
   - `recent`: favor chronology while retaining directly relevant older evidence.
   - `relevant`: favor strongest evidence even when older.
   - `balanced`: combine recent continuity with the strongest target-specific evidence.
4. Write a concise targeted summary, strengths, selected work entries, other-experience text, education, and languages. Replace the configured printable JSON rather than creating a new variant directory. Materialize all immutable facts and add `x-cv.sourceId` links. Copy each language's raw `fluency` and complete `x-cv.proficiency` object without translating or rewriting either value.
5. Copy the canonical relative path and current SHA-256 into `meta.x-cv`. Populate selected and omitted work IDs. Compute `otherExperience.count`, total, highlighted IDs, highlighted names, date range, and summary from the complete canonical list.
6. Run `pnpm cv validate <printable>`. Correct all stale hashes, ID/count mismatches, or immutable-field differences.
7. Run `pnpm cv build <printable> --formats pdf --theme modern-europass`. This uses the default `output/` directory. Add `--out <rendered-document-directory>` only when the user supplied a different directory.
8. If the build reports more than two pages, revise JSON only, in order:
   1. Remove lower-priority highlights.
   2. Tighten summary and strength wording.
   3. Condense detailed-role prose.
   4. Reduce detailed roles and update selected/omitted metadata.
9. Repeat validation and rendering until the PDF is at most two pages. If responsible condensation cannot meet the limit, stop and explain what prevents it.
10. Report the printable JSON path, target/focus, detailed and omitted counts, and generated PDF path.

## Factual Guardrails

- Use only canonical evidence. Never invent or infer technologies, metrics, scope, responsibilities, employers, dates, qualifications, language levels, or outcomes.
- Rephrase and combine canonical evidence without strengthening its meaning.
- Preserve employer, position, location, URL, dates, contact data, education, and language facts exactly. For languages, preserve both `fluency` and the structured CEFR `x-cv.proficiency` object; validation enforces them.
- Keep claims traceable to a canonical entry or highlight.
- Do not modify theme files, typography, spacing, or page size to satisfy the page budget.
- Do not modify canonical data while tailoring. Report suspected canonical errors separately.

## Editorial Targets

- Aim for a 60-90 word summary and 3-5 strength groups.
- Start with 4-6 detailed roles; use fewer when relevance or page budget requires it.
- Prefer 3-5 high-value highlights for the newest or most relevant role and 2-4 for other detailed roles.
- State the exact count of omitted roles and highlight only omitted employers.
- Retain languages and the education most useful to the target unless the user requests otherwise.
