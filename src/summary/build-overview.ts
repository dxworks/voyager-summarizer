import { ParsedToolSummary } from '../parsers/parse-tool-summary-md';
import { evaluateDiagnostics } from './evaluate-diagnostics';
import { DiagnosticFinding, ResolvedConditions, SummaryHealth, ToolStatus } from './summary-types';

export interface SummaryOverview {
  toolNames: string[];
  toolStatuses: Record<string, ToolStatus>;
  diagnostics: DiagnosticFinding[];
  conditionWarnings: string[];
  health: SummaryHealth;
}

export function buildOverview(parsedTools: ParsedToolSummary[], conditions: ResolvedConditions): SummaryOverview {
  const diagnosticsResult = evaluateDiagnostics(parsedTools, conditions);
  const toolStatuses = buildToolStatuses(parsedTools);
  applyStatusOverrides(toolStatuses, diagnosticsResult.overriddenToolStatuses);

  return {
    toolNames: parsedTools.map((tool) => tool.tool),
    toolStatuses,
    diagnostics: diagnosticsResult.findings,
    conditionWarnings: diagnosticsResult.warnings,
    health: buildHealth(diagnosticsResult.findings)
  };
}

function applyStatusOverrides(
  toolStatuses: Record<string, ToolStatus>,
  overrides: Record<string, ToolStatus>
): void {
  for (const [toolName, status] of Object.entries(overrides)) {
    toolStatuses[toolName] = normalizeToolStatus(status);
  }
}

function buildToolStatuses(parsedTools: ParsedToolSummary[]): Record<string, ToolStatus> {
  const toolStatuses: Record<string, ToolStatus> = {};

  for (const tool of parsedTools) {
    toolStatuses[tool.tool] = normalizeToolStatus(tool.metadata['status']);
  }

  return toolStatuses;
}

function normalizeToolStatus(status: string | undefined): ToolStatus {
  if (status === 'success' || status === 'failed' || status === 'partial' || status === 'unknown') {
    return status;
  }

  return 'unknown';
}

function buildHealth(diagnostics: DiagnosticFinding[]): SummaryHealth {
  const criticalCount = diagnostics.filter((item) => item.severity === 'critical').length;
  const errorCount = diagnostics.filter((item) => item.severity === 'error').length;
  const warningCount = diagnostics.filter((item) => item.severity === 'warning').length;

  if (criticalCount > 0) {
    return { status: 'critical', criticalCount, errorCount, warningCount };
  }

  if (errorCount > 0) {
    return { status: 'error', criticalCount, errorCount, warningCount };
  }

  if (warningCount > 0) {
    return { status: 'warning', criticalCount, errorCount, warningCount };
  }

  return { status: 'info', criticalCount, errorCount, warningCount };
}
