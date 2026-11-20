#!/usr/bin/env bash
# Build and test, for the shared dxworks release gate (dxworks/pipelines release-gate.yml)
set -euo pipefail
npm ci
npm run lint
npm test
npm run build
