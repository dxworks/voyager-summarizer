# voyager-summarizer

`voyager-summarizer` generates one consolidated HTML + Markdown report from multiple tool summaries.

## Requirements

- Node.js `>=24.13.0 <26`

## Setup

```bash
npm install
```

## Command

The CLI command is:

```bash
npx voyager-summarizer summary [options]
```

### Options

| Option | Repeatable | Description |
| --- | --- | --- |
| `--tool-md <name=path>` | yes | Tool id to Markdown summary mapping. |
| `--tool-html <name=path>` | yes | Tool id to HTML template mapping (used when `html-template: reference` in the markdown metadata). |
| `--tool-category <name=category>` | yes | Tool id to category name mapping for grouped output sections. |
| `--tool-order-file <path>` | no | Path to file that defines tool order with `<tool-id>: <priority>` lines. |
| `--conditions-file <path>` | no | Path to JSON file containing rule definitions. |
| `--condition <rules.<id>.<field>=value>` | yes | Inline override for one rule field. |
| `--out-html <path>` | no | HTML output file path. Default: `summary.html`. |
| `--out-md <path>` | no | Markdown output file path. Default: `summary.md`. |

## Examples

Minimal:

```bash
npx voyager-summarizer summary \
  --tool-md insider=./insider/results/summary.md
```

Multiple tools + explicit outputs:

```bash
npx voyager-summarizer summary \
  --tool-md insider=./insider/results/summary.md \
  --tool-md inspector-git=./inspector-git/results/summary.md \
  --tool-html inspector-git=./inspector-git/results/summary.html \
  --tool-category insider=Code \
  --tool-category inspector-git=Code \
  --out-html ./results/mission-summary.html \
  --out-md ./results/mission-summary.md
```

Use an external conditions file:

```bash
npx voyager-summarizer summary \
  --tool-md insider=./insider/results/summary.md \
  --conditions-file ./conditions.json
```

Override rules inline from CLI:

```bash
npx voyager-summarizer summary \
  --tool-md insider=./insider/results/summary.md \
  --condition "rules.insider-failed.severity=critical" \
  --condition "rules.insider-failed.message=Insider is mandatory for this mission"
```

Combine conditions file + CLI overrides:

```bash
npx voyager-summarizer summary \
  --tool-md insider=./insider/results/summary.md \
  --conditions-file ./conditions.json \
  --condition "rules.custom-rule.when=\${status} == 'failed'" \
  --condition "rules.custom-rule.variables.status=tool.insider.status"
```

## Conditions and Rules

Conditions are evaluated as boolean expressions. A rule triggers a diagnostic finding when its `when` expression evaluates to `true`.

### Rule shape

```json
{
  "id": "insider-failed",
  "severity": "error",
  "message": "insider failed",
  "when": "${status} == 'failed'",
  "variables": {
    "status": "tool.insider.status"
  },
  "triggeredBy": ["insider"],
  "setStatus": "failed"
}
```

Fields:

- `id` (required): unique rule id.
- `severity` (optional): `critical`, `error`, `warning`, `info`. Default is `warning`.
- `message` (optional): diagnostic text. Default is the rule id.
- `when` (required): expression to evaluate.
- `variables` (optional): placeholder-to-metadata-path mapping.
- `triggeredBy` (optional): list of tool ids associated with the finding.
- `setStatus` (optional): override status for each tool in `triggeredBy` (`success`, `failed`, `partial`, `missing`, `unknown`).

`onMissing` is deprecated and rejected.

### Expression syntax

Supported operators:

- `&&`, `||`, `!`
- `==`, `!=`
- `>`, `>=`, `<`, `<=` (numeric only)

Supported literals:

- strings (`'value'` or `"value"`)
- booleans (`true`, `false`)
- numbers (`10`, `3.14`)

Placeholders use `${name}`.

If `variables` does not define `name`, the engine uses `name` directly as metadata path.

Example:

```json
{
  "when": "${dotnetPercent} > 5 && ${status} == 'failed'",
  "variables": {
    "dotnetPercent": "tool.insider.languages.dotnet.percent",
    "status": "tool.honeydew.status"
  }
}
```

### CLI override key format

CLI overrides use:

`rules.<rule-id>.<field>=value`

Supported fields:

- `severity`
- `message`
- `when`
- `variables.<name>`
- `triggeredBy` (comma-separated, e.g. `honeydew,insider`)
- `setStatus`

If `rules.<rule-id>` does not exist, it is created with defaults:

- `severity: warning`
- `message: <rule-id>`
- `when: false`
- `variables: {}`
- `triggeredBy: []`

## Rule Precedence (Override Order)

Rules are resolved in this order:

1. built-in defaults (`src/config/default-conditions.json`)
2. `--conditions-file` rules
3. `--condition` CLI overrides (applied in argument order)

Details:

- if a file rule has the same `id` as an existing rule, it replaces that rule;
- new file rule ids are appended;
- if the same CLI key is passed multiple times, the last value wins.

## Default Rules

Built-in rule ids:

- `inspector-git-failed` (critical)
- `insider-failed` (error)
- `lizard-failed` (error)
- `honeydew-failed-significant-dotnet` (error)
- `jafax-failed-significant-java` (error)

Source of truth: `src/config/default-conditions.json`.

## Tool Order

If `--tool-order-file` is not provided, default order is:

1. `depminer`
2. `dude`
3. `honeydew`
4. `insider`
5. `inspector-git`
6. `jafax`
7. `lizard`

Tool order file format:

```text
# comments allowed
insider: 10
jafax: 20
lizard: 30
```

- lower numeric priority comes first;
- equal priorities keep file order;
- tools present in input but missing from the order list are appended at the end.

## Scripts

- `npm run build` - clean and compile TypeScript to `dist/`
- `npm run build:bundle` - build and bundle CLI into one CommonJS file for SEA
- `npm run build:sea` - produce a standalone executable in `dist/sea/`
- `npm run create` - build + test
- `npm run create:sea` - lint + test + bundle + SEA build
- `npm run test` - run Jest tests
- `npm run lint` - lint source files with ESLint
