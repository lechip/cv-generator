# Canonical and Printable Contracts

## Canonical JSON

- Use `profiles/<person>/canonical-career.json` as the maintained source of truth.
- Follow JSON Resume and set `meta.x-cv.kind` to `canonical`.
- Give every work, education, and language entry a stable `x-cv.id`.
- Store language proficiency as `fluency: "<A1-C2>"` plus `x-cv.proficiency` containing `framework: "CEFR"`, the same `level`, and optional `status: "native" | "bilingual"`. A status is valid only at C2.
- Treat this file as the factual source of truth. Do not tailor its prose for a job.

## Printable JSON

- Use the sibling `profiles/<person>/printable-career.json` as the single replaceable derivative. Do not create persistent variant directories unless the user explicitly requests archival copies.
- Follow JSON Resume and set `meta.x-cv.kind` to `printable`.
- Make the file self-contained: include all content the renderer must show.
- Set `meta.x-cv.canonicalPath` relative to the printable file.
- Set `meta.x-cv.canonicalSha256` to the canonical file's exact SHA-256.
- Set `focus`, `useCase`, `targetJob`, `selectedWorkIds`, and `omittedWorkIds`.
- Include only detailed jobs in `work`; give each one `x-cv.sourceId`.
- Copy immutable work fields exactly: `name`, `location`, `position`, `url`, `startDate`, and `endDate`. Tailor only `summary`, `highlights`, and `keywords`.
- Give retained education and languages their canonical `x-cv.sourceId`; copy their factual fields exactly. For every language, copy `fluency` and the complete `x-cv.proficiency` object unchanged. Do not write human display labels into JSON; renderers derive those deterministically.
- Put editorial strength groups in root `x-cv.strengths`.
- Put the skill-written condensed section in root `x-cv.otherExperience` with:
  - `count`: omitted work ID count.
  - `totalCareerEntries`: canonical work count.
  - `dateRange`: range covered by omitted roles.
  - `highlightedWorkIds`: omitted canonical IDs only.
  - `highlightedNames`: exact canonical names in the same order.
  - `summary`: concise prose that clearly describes the remaining experience.

## Renderer Boundary

The renderer may format dates and sections. It must not rank, select, omit, shorten, rewrite, or synthesize resume content. A page-budget failure is feedback to revise printable JSON.
