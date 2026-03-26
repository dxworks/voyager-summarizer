import { ParsedToolSummary } from '../parsers/parse-tool-summary-md';
import { evaluateDiagnostics } from './evaluate-diagnostics';
import { DiagnosticFinding, OverallStatus, ResolvedConditions, SummaryHealth, ToolStatus } from './summary-types';

export interface SummaryOverview {
  toolNames: string[];
  toolStatuses: Record<string, ToolStatus>;
  diagnostics: DiagnosticFinding[];
  conditionWarnings: string[];
  health: SummaryHealth;
  overallStatus: OverallStatus;
}

export function buildOverview(parsedTools: ParsedToolSummary[], conditions: ResolvedConditions): SummaryOverview {
  const diagnosticsResult = evaluateDiagnostics(parsedTools, conditions);
  const toolStatuses = buildToolStatuses(parsedTools);
  applyStatusOverrides(toolStatuses, diagnosticsResult.overriddenToolStatuses);
  const inferredDiagnostics = buildInferredDiagnostics(parsedTools.map((tool) => tool.tool), toolStatuses);
  const diagnostics = [...diagnosticsResult.findings, ...inferredDiagnostics];

  return {
    toolNames: parsedTools.map((tool) => tool.tool),
    toolStatuses,
    diagnostics,
    conditionWarnings: diagnosticsResult.warnings,
    health: buildHealth(diagnostics),
    overallStatus: buildOverallStatus(parsedTools.map((tool) => tool.tool), diagnostics)
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
  if (status === 'success' || status === 'failed' || status === 'partial' || status === 'missing' || status === 'not-run' || status === 'unknown') {
    return status;
  }

  return 'unknown';
}

function buildInferredDiagnostics(
  toolNames: string[],
  toolStatuses: Record<string, ToolStatus>
): DiagnosticFinding[] {
  const diagnostics: DiagnosticFinding[] = [];

  for (const toolName of toolNames) {
    const status = toolStatuses[toolName] ?? 'unknown';
    if (status === 'missing') {
      diagnostics.push({
        severity: 'error',
        code: `${toolName}-summary-missing`,
        message: `${toolName} summary output is missing although the tool appears to have been executed.`,
        triggeredBy: [toolName]
      });
      continue;
    }

    if (status === 'not-run') {
      diagnostics.push({
        severity: 'warning',
        code: `${toolName}-not-run`,
        message: `${toolName} did not run in the mission execution overview.`,
        triggeredBy: [toolName]
      });
    }
  }

  return diagnostics;
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

function buildOverallStatus(toolNames: string[], diagnostics: DiagnosticFinding[]): OverallStatus {
  const criticalDiagnostics = diagnostics.filter((item) => item.severity === 'critical');
  if (criticalDiagnostics.length > 0) {
    return {
      level: 'critical',
      title: 'Action Required',
      message: 'Critical extraction issues were detected. Rerun the mission before starting analysis.',
      affectedTools: getAffectedTools(toolNames, criticalDiagnostics)
    };
  }

  const errorDiagnostics = diagnostics.filter((item) => item.severity === 'error');
  if (errorDiagnostics.length > 0) {
    const affectedTools = getAffectedTools(toolNames, errorDiagnostics);
    const toolsLabel = affectedTools.join(', ');
    const message = toolsLabel.length > 0
      ? `Analysis can start, but some required outputs are missing for: ${toolsLabel}. See diagnostics below.`
      : 'Analysis can start, but some required outputs are missing. See diagnostics below.';

    return {
      level: 'error',
      title: 'Proceed with Caution',
      message,
      affectedTools
    };
  }

  const warningDiagnostics = diagnostics.filter((item) => item.severity === 'warning');
  if (warningDiagnostics.length > 0) {
    return {
      level: 'warning',
      title: 'Partial Coverage',
      message: 'Extraction completed, but some optional data may be incomplete.',
      affectedTools: getAffectedTools(toolNames, warningDiagnostics)
    };
  }

  return {
    level: 'ok',
    title: 'Ready for Analysis',
    message: 'All required data was extracted successfully. You can proceed.',
    affectedTools: []
  };
}

function getAffectedTools(toolNames: string[], diagnostics: DiagnosticFinding[]): string[] {
  const affectedToolsSet = new Set<string>();

  for (const diagnostic of diagnostics) {
    for (const toolName of diagnostic.triggeredBy) {
      affectedToolsSet.add(toolName);
    }
  }

  const toolNameOrder = new Map<string, number>();
  toolNames.forEach((toolName, index) => {
    toolNameOrder.set(toolName, index);
  });

  return [...affectedToolsSet].sort((left, right) => {
    const leftOrder = toolNameOrder.get(left);
    const rightOrder = toolNameOrder.get(right);

    if (leftOrder === undefined && rightOrder === undefined) {
      return left.localeCompare(right);
    }

    if (leftOrder === undefined) {
      return 1;
    }

    if (rightOrder === undefined) {
      return -1;
    }

    return leftOrder - rightOrder;
  });
}
