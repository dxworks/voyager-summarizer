# voyager-summarizer

Node.js + TypeScript starter template.

## Requirements

- Node.js 24+

## Setup

```bash
npm install
```

## Usage

```bash
npx voyager-summarizer "TypeScript improves JavaScript maintainability with static typing" --max-words 6
```

## Scripts

- `npm run build` - Clean and compile TypeScript to `dist/`
- `npm run build:bundle` - Build and bundle CLI into one CommonJS file for SEA
- `npm run build:sea` - Produce a standalone executable in `dist/sea/`
- `npm run create:sea` - Lint + test + bundle + build SEA executable
- `npm run test` - Run Jest tests
- `npm run lint` - Lint source files with ESLint

## Standalone executable (Node SEA)

Build a local executable that runs without Node.js installed on the target machine:

```bash
npm run build:sea
```

This writes:

- bundled entry: `dist/sea/summarizer.bundle.cjs`
- SEA config: `dist/sea/sea-config.json`
- executable: `dist/sea/voyager-summarizer-<os>-<arch>[.exe]`

Examples:

- Windows x64: `dist/sea/voyager-summarizer-win-x64.exe`
- Linux x64: `dist/sea/voyager-summarizer-linux-x64`
- macOS arm64: `dist/sea/voyager-summarizer-macos-arm64`

Notes:

- You need one executable per OS/architecture.
- Use Node.js 25.5+ for `node --build-sea`.

## Project Structure

- `src/summarizer.ts` - Main entry point and library module
- `dist/` - Compiled output (generated)
