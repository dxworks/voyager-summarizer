# `summary` Command

The `summary` command ingests tool outputs, applies optional rules/conditions, and generates consolidated reports.

For now, the command prints:

```text
summarized
```

The summary logic will be implemented next.

## Usage

```bash
voyager-summarizer summary [options]
```

If using compiled output directly:

```bash
node dist/src/summarizer.js summary [options]
```

---

## Input Options

### Tool summaries

Repeatable options are used to map each tool to its input file:

- `--tool-md <tool>=<path>`: map a tool to a Markdown summary file (repeatable)
- `--tool-html <tool>=<path>`: map a tool to an HTML summary file (repeatable)

Examples:

```bash
voyager-summarizer summary \
  --tool-md insider=./summaries/insider.md \
  --tool-md jafax=./summaries/jafax.md \
  --tool-html dude=./summaries/dude.html
```

You can also provide:

- `--input-dir <path>`: folder-based ingestion (optional alternative/extra source)

---

## Conditions (Rules) Inputs

Conditions can be provided from multiple sources.

### 1) Conditions file (recommended for team/shared config)

```bash
voyager-summarizer summary --conditions-file ./config/conditions.json
```

### 2) Repeatable CLI overrides (recommended for local ad-hoc runs)

```bash
voyager-summarizer summary \
  --condition jafax.maxJavaFiles=100 \
  --condition dude.enabled=true
```

### 3) Single JSON environment variable (recommended for CI)

```bash
VOYAGER_CONDITIONS_JSON='{"jafax":{"maxJavaFiles":100}}' voyager-summarizer summary
```

### 4) Granular environment variables

Format:

- `VOYAGER_CONDITION_<TOOL>_<RULE>=<value>`

Example:

```bash
VOYAGER_CONDITION_JAFAX_MAXJAVAFILES=100 voyager-summarizer summary
```

---

## Conditions Precedence

When the same condition is defined in multiple places, apply:

1. CLI `--condition`
2. Environment variables (`VOYAGER_CONDITION_*`, `VOYAGER_CONDITIONS_JSON`)
3. `--conditions-file`
4. Internal defaults

This keeps local overrides explicit and predictable.

---

## Output Options

- `--out-html <path>`: where to write final HTML summary
- `--out-md <path>`: where to write final Markdown summary

Example:

```bash
voyager-summarizer summary \
  --tool-md insider=./summaries/insider.md \
  --conditions-file ./config/conditions.json \
  --out-html ./out/summary.html \
  --out-md ./out/summary.md
```

---

## Full Example

```bash
VOYAGER_CONDITION_JAFAX_MAXJAVAFILES=100 \
voyager-summarizer summary \
  --input-dir ./summaries \
  --tool-md insider=./summaries/insider.md \
  --tool-md jafax=./summaries/jafax.md \
  --tool-html dude=./summaries/dude.html \
  --condition jafax.maxJavaFiles=120 \
  --out-html ./out/summary.html \
  --out-md ./out/summary.md
```

In this example, CLI `--condition` wins over env values for the same key.

---

## Notes

- Tool names in mappings should match supported tool IDs (`depminer`, `dude`, `honeydew`, `insider`, `inspector-git`, `jafax`, `lizard`).
- Current implementation behavior is placeholder-only (`summarized`), while this document defines the intended command contract for upcoming implementation.
