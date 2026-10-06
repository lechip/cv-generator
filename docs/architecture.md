# Architecture

## Boundaries

The generator has three explicit layers:

1. `src/core` loads files, identifies profile kind, formats dates, constructs deterministic output filenames, derives CEFR language labels and ordering, validates JSON Resume, verifies canonical hashes, and compares immutable facts.
2. `src/renderers` orchestrates output engines but contains no selection, ranking, summarisation, truncation, or content-fit heuristics.
3. `themes/<name>` owns React components, CSS, tokens, fonts, and office reference styles. A theme exports a pure `render(resume)` function, its PDF printing options (`pdf.footer`), and `sectionHeadings(resume)`, the ordered headings it prints, so diagnostics can verify the PDF against the theme's own contract.

`src/core/ats` is a fourth, read-only layer: it renders nothing new and edits nothing. It reads the PDF text back the way an applicant tracking system does and reports findings. Like the page budget, every finding is feedback for the skill to act on in JSON.

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

## Themes

`ats` is the default. It is a single-column document: name on the first line, title line, contact line, then the standard headings Summary, Skills, Work Experience, Other Experience, Education, Certifications, Awards, Projects, Languages. It prints no page footer, no icons, no tables and no grid, so the PDF text layer reads top to bottom on strict parsers (Workday, Taleo, SAP SuccessFactors) as well as forgiving ones (Greenhouse, Lever).

`modern-europass` keeps the two-column Europass look for people. Its label column merges with the content column in extracted text, so `ats-check` fails it by design; use it for human readers, not portal uploads.

## Adding a theme

Create `themes/<name>` with an `index.tsx` exporting `render(resume)`, `pdf` and `sectionHeadings(resume)`, then register the theme in `src/renderers/html.ts`. Keep all data decisions outside the theme. Add semantic HTML and visual PDF snapshots before distribution (`pnpm snapshots:update` rewrites the fixture snapshots).

## ATS diagnostics

`cv ats-check <resume> [--job <file>] [--theme <theme>] [--pdf <file>] [--json]` validates the resume, renders it with the theme, prints a temporary PDF and runs three analysers from `src/core/ats`:

- parse (`parse.ts`): text layer present, name on line one, contact block in the first lines, each theme heading on its own line and in order, position/employer/date range within three lines, dates unbroken, no hyphen line breaks, no footer text in the flow, no multi-column line merges, page count, title metadata, embedded fonts, no images or tables.
- content (`content.ts`): `basics.label` present, summary length, bullets start with an action verb and stay under 30 words, no first person or duty phrasing, no duplicate bullets, canonical metrics not dropped, no generated-sounding vocabulary or smart typography, canonical keyword coverage (WARN for a general CV, INFO for a tailored one), acronym and expansion both present.
- job (`job.ts`, only with `--job`): deterministic term extraction from the posting (skill lexicon, capitalised names, repeated phrases), coverage against the rendered text with acronym equivalence, and title alignment with `basics.label`.

PDF text comes from `unpdf` (pdf.js) grouped into lines by baseline; structure comes from `pdf-lib`. No network, no model. ERROR findings set exit code 1.

## Adding an output format

Add an engine under `src/renderers`, register it in the CLI, and test that every supplied section is reproduced. Output engines may transform representation, not meaning. The `txt` engine (`src/renderers/text.ts`) emits one `Label: value` per line for portal forms that auto-fill from pasted text.

Language presentation is the explicit deterministic formatting exception. Canonical and printable profiles store `framework: "CEFR"`, the A1-C2 level, and optional `native` or `bilingual` status under `languages[].x-cv.proficiency`; `fluency` repeats the raw CEFR level for JSON Resume compatibility. All renderers use the same core mapping and order by CEFR level, native/bilingual status, then language name. Ordinary JSON Resume files without this extension retain their supplied fluency text.

## Two-page contract

The CLI reports the actual PDF page count. For printable profiles it fails above two pages and instructs the caller to revise printable JSON. The `tailor-cv` skill owns that revision loop. Office suites may paginate ODT slightly differently, but the pinned Docker/LibreOffice result is the reference and should remain within two pages.
