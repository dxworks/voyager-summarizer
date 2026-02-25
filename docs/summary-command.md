# `summary` Command

The `summary` command ingests tool summaries, evaluates expression-based
conditions, and generates consolidated HTML and Markdown reports.

## Usage

```bash
voyager-summarizer summary []
```

If using compiled output directly:

```bash
node dist/src/summarizer.js summary [options]
```

## Inputs

- `--tool-md <tool>=<path>`: map a tool to a Markdown summary file (repeatable)
- `--tool-html <tool>=<path>`: map a tool to an HTML summary file (repeatable)
- `--tool-order-file <path>`: file defining tool order as `<tool>: <priority>`
- `--conditions-file <path>`: JSON file containing condition rules
- `--condition <rules.<id>.<field>=value>`: CLI rule override (repeatable)

## Outputs

- `--out-html <path>`: output path for the final HTML report
- `--out-md <path>`: output path for the final Markdown report

## Conditions File Format

Conditions are expression rules evaluated against metadata variables.

```json
{
  "rules": [
    {
      "id": "jafax-failed-significant-java",
      "severity": "error",
      "message": "jafax failed and Java appears significant in the scanned codebase",
      "when": "${jafaxStatus} == 'failed' && ${javaFiles} > 100",
      "variables": {
        "jafaxStatus": "tool.jafax.status",
        "javaFiles": "tool.insider.languages.java.files"
      },
      "triggeredBy": ["jafax", "insider"]
    }
  ]
}
```

Supported `severity` values:

- `critical`
- `error`
- `warning`
- `info`

If any variable cannot be resolved, the rule is skipped and a warning is emitted.

## Tool Order File Format

Tool order can be configured at runtime with `--tool-order-file`.

```text
# lower number means earlier in the report
insider: 10
jafax: 20
lizard: 30
```

Rules:

- blank lines and lines starting with `#` are ignored
- tool ids must be unique
- priority must be numeric

Ordering behavior:

- tools present in the order file are rendered first by ascending priority
- tools missing from the order file are still kept and appended afterward in arrival order
- without `--tool-order-file`, built-in default order is used first, then unknown tools are appended

## Variable Resolution

The summarizer builds a context using tool metadata:

- `tool.<tool-name>.status`
- `tool.<tool-name>.<metadata-key>`

Example metadata key:

- `languages.java.files` from `insider` becomes `tool.insider.languages.java.files`

## CLI Override Examples

Override a rule expression:

```bash
voyager-summarizer summary \
  --conditions-file ./config/conditions.json \
  --condition 'rules.jafax-failed-significant-java.when=${jafaxStatus} == "failed" && ${javaFiles} > 120'
```

## Full Example

```bash
voyager-summarizer summary \
  --tool-md insider=./examples/test-summaries/insider-java-heavy-test-summary.md \
  --tool-md jafax=./examples/test-summaries/jafax-test-summary.md \
  --tool-order-file ./examples/tool-order.txt \
  --out-html ./examples/out/summary-jafax-test.html \
  --out-md ./examples/out/summary-jafax-test.md
```

Repository example file:

- `examples/tool-order.txt`
