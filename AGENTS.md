# AGENTS.md

This file provides guidance for AI coding agents operating in the **voyager-summarizer** repository.

## Project Overview

Part of the **Voyager** software-analysis platform by DX Works. After Voyager runs a suite of code-quality and architecture tools (dependency mining, duplication detection, complexity measurement, security scanning, etc.), each tool produces its own summary file. **voyager-summarizer** collects those individual outputs and merges them into a single, reader-friendly report -- available as both HTML and Markdown -- so that engineering teams get one consolidated view of their codebase health instead of juggling reports from seven different tools.

Technically: a Node.js 24+ CLI built with TypeScript and Commander.js. It parses per-tool Markdown summaries (with YAML-style frontmatter), orders them by a canonical tool list, renders combined HTML and Markdown reports, and writes them to disk.

## Build / Lint / Test Commands

```bash
# Install dependencies
npm install

# Build (clean + compile TypeScript)
npm run build

# Lint source files
npm run lint
npm run lint:fix          # auto-fix

# Run all tests
npm test

# Run tests in watch mode
npm run test:dev

# Run a single test file
npx jest __tests__/parsers/parse-tool-summary-md.test.ts

# Run tests matching a name pattern
npx jest -t "parses inline mode"

# Run a single test file with a name filter
npx jest __tests__/summary/generate-summary.test.ts -t "uses default output paths"
```

### After Every Change

1. `npm run lint` -- no lint errors
2. `npm test` -- all tests pass
3. `npm run build` -- compilation succeeds

## Project Structure

```
src/
  summarizer.ts                        # CLI entry point (Commander setup)
  io/read-files.ts                     # File I/O helpers
  parsers/parse-tool-summary-md.ts     # Parse tool summary markdown with frontmatter
  render/render-html.ts                # HTML report renderer
  render/render-markdown.ts            # Markdown report renderer
  summary/build-overview.ts            # Build overview data from parsed tools
  summary/generate-summary.ts          # Orchestration: parse, order, render, persist
__tests__/                             # Mirrors src/ structure exactly
  io/read-files.test.ts
  parsers/parse-tool-summary-md.test.ts
  render/render-html.test.ts
  render/render-markdown.test.ts
  summary/build-overview.test.ts
  summary/generate-summary.test.ts
```

## Tech Stack

- **Language**: TypeScript 5.x with strict mode
- **Runtime**: Node.js 24+ (see `engines` in package.json)
- **Modules**: CommonJS (`module: "CommonJS"` in tsconfig)
- **Target**: ES2020
- **CLI**: Commander.js
- **Testing**: Jest 30 with ts-jest preset
- **Linting**: ESLint 9 flat config + typescript-eslint

## Code Style Guidelines

### File Naming

- **kebab-case** for all file names: `parse-tool-summary-md.ts`, `read-files.ts`, `build-overview.ts`
- Test files use the same name with `.test.ts` suffix in the mirrored `__tests__/` directory

### Naming Conventions

- **Functions**: camelCase with descriptive verb prefixes -- `parseToolSummaryMarkdown`, `buildOverview`, `renderHtmlSummary`, `generateSummary`
- **Interfaces**: PascalCase, no `I` prefix -- `ParsedToolSummary`, `GenerateSummaryInput`, `SummaryOverview`
- **Type aliases**: PascalCase -- `HtmlTemplateMode`
- **Module-level constants**: UPPER_SNAKE_CASE -- `TOOL_ORDER`, `DEFAULT_OUT_HTML`
- **Local variables**: camelCase -- `parsedTools`, `htmlByTool`

### Imports

- Node.js built-ins use the `node:` prefix: `import { readFile } from 'node:fs/promises'`
- Relative imports with explicit paths; no barrel/index re-exports
- Named exports only; no default exports
- Group order: (1) node built-ins, (2) third-party packages, (3) relative imports

### Formatting

- 2-space indentation
- Single quotes for strings
- Semicolons required
- Arrow functions for callbacks: `.map((tool) => tool.tool)`
- Object/array literals on multiple lines when they have several entries
- Opening braces on the same line as the statement

### Types

- TypeScript strict mode is enabled (all strict checks active)
- Explicit type annotations on all exported function signatures (parameters and return types)
- Type inference is acceptable for local variables and internal helpers
- Prefer `interface` for object shapes; use `type` for unions and aliases
- Use `Record<K, V>` for dictionary/map types
- `@typescript-eslint/no-explicit-any` is turned off -- `any` is allowed but discouraged

### Error Handling

- Throw `new Error(message)` with descriptive messages that include context (file path, tool name, invalid value)
- Use try/catch for expected failures like file access checks
- async/await throughout; no raw `.then()` chains
- Catch clauses may use bare `catch` (no variable) when the error is irrelevant

### Testing Conventions

- Test files live in `__tests__/` mirroring the `src/` directory structure
- Use `describe` / `it` blocks (not `test()`)
- Mock I/O dependencies with `jest.mock()` at the top of the file
- Access typed mocks via `jest.mocked(fn)`
- Define helper factory functions (e.g. `makeParsedTool`) at the top of test files for reusable test data
- Reset mocks in `beforeEach` blocks
- Test both success paths and error/edge cases (throw expectations use `expect(() => fn()).toThrow(...)`)

### Adding New Functionality

1. Create the source file in the appropriate `src/` subdirectory using kebab-case naming
2. Export functions and interfaces with explicit type annotations
3. Create a corresponding test file in `__tests__/` with the same relative path
4. Use `jest.mock()` for any I/O or external dependencies in tests
5. Run `npm run lint && npm test && npm run build` to verify

## ESLint Configuration

The project uses ESLint 9 flat config (`eslint.config.mjs`):

- Extends `@eslint/js` recommended + `typescript-eslint` recommended
- `@typescript-eslint/no-explicit-any` is explicitly turned **off**
- Ignores: `dist/`, `bin/`, `node_modules/`, `*.tsbuildinfo`

## TypeScript Configuration

- `strict: true` -- all strict checks enabled
- `composite: true` -- project references support
- `declaration: true` and `sourceMap: true`
- `esModuleInterop: true` and `forceConsistentCasingInFileNames: true`
- `skipLibCheck: false` -- full .d.ts checking
- Build config (`tsconfig.build.json`) excludes `__tests__/` from compilation output
