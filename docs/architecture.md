# Architecture

## Boundaries

The generator has three explicit layers:

1. `src/core` loads files, identifies profile kind, formats dates, constructs deterministic output filenames, derives CEFR language labels and ordering, validates JSON Resume, verifies canonical hashes, and compares immutable facts.
2. `src/renderers` orchestrates output engines but contains no selection, ranking, summarisation, truncation, or content-fit heuristics.
3. `themes/<name>` owns React components, CSS, tokens, fonts, and office reference styles. A theme exports a pure `render(resume)` function.

Editorial transformation exists only in `.agents/skills/tailor-cv`. Its output is ordinary, self-contained JSON Resume data, so rendering remains repeatable and reviewable in version control.

## Profile lifecycle

Every person directory contains exactly two JSON documents:

```text
profiles/<person>/
├── canonical-career.json
└── printable-career.json
```

`canonical-career.json` is the only maintained career dataset. `tailor-cv` overwrites `printable-career.json`; no persistent variants directory is part of the architecture. The printable file is retained only as an inspectable, reproducible render input and can be regenerated whenever the canonical data, job target, or use case changes. Rendered documents live under `output/`, outside the profile data lifecycle.

## Canonical and printable invariants

Canonical entries use stable `x-cv.id` values. Printable entries refer to them with `x-cv.sourceId`. The sibling printable metadata records `canonicalPath: "canonical-career.json"`, the canonical SHA-256, use case, optional target job, focus, selected IDs, and omitted IDs.

Validation independently enforces:

- canonical hash freshness;
- exact contact, employer, role, date, education, and language facts;
- agreement between `languages[].fluency` and the structured `languages[].x-cv.proficiency` CEFR level;
- a one-to-one match between detailed work and selected IDs;
- omitted IDs equal every canonical work ID not selected;
- counted and highlighted other experience matches omitted canonical entries.

Summaries and highlights may be condensed by the skill, but the skill must be able to trace each assertion to canonical evidence.

## Adding a theme

Create `themes/<name>` with an `index.tsx` exporting `render(resume)`, then register the theme in `src/renderers/html.ts`. Keep all data decisions outside the theme. Add semantic HTML and visual PDF snapshots before distribution.

## Adding an output format

Add an engine under `src/renderers`, register it in the CLI, and test that every supplied section is reproduced. Output engines may transform representation, not meaning.

Language presentation is the explicit deterministic formatting exception. Canonical and printable profiles store `framework: "CEFR"`, the A1-C2 level, and optional `native` or `bilingual` status under `languages[].x-cv.proficiency`; `fluency` repeats the raw CEFR level for JSON Resume compatibility. All renderers use the same core mapping and order by CEFR level, native/bilingual status, then language name. Ordinary JSON Resume files without this extension retain their supplied fluency text.

## Two-page contract

The CLI reports the actual PDF page count. For printable profiles it fails above two pages and instructs the caller to revise printable JSON. The `tailor-cv` skill owns that revision loop. Office suites may paginate ODT slightly differently, but the pinned Docker/LibreOffice result is the reference and should remain within two pages.
