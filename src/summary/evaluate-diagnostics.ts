import { ParsedToolSummary } from '../parsers/parse-tool-summary-md';
import { evaluateExpression } from './evaluate-expression';
import { DiagnosticFinding, ResolvedConditions, RuleDefinition, ToolStatus } from './summary-types';

export interface DiagnosticsEvaluationResult {
  findings: DiagnosticFinding[];
  warnings: string[];
  overriddenToolStatuses: Record<string, ToolStatus>;
}

export function evaluateDiagnostics(
  parsedTools: ParsedToolSummary[],
  conditions: ResolvedConditions
): DiagnosticsEvaluationResult {
  const findings: DiagnosticFinding[] = [];
  const warnings: string[] = [];
  const overriddenToolStatuses: Record<string, ToolStatus> = {};
  const context = buildRuleContext(parsedTools);

  for (const rule of conditions.rules) {
    const evaluation = evaluateRule(rule, context);

    warnings.push(...evaluation.warnings);

    if (evaluation.triggered) {
      findings.push({
        severity: rule.severity,
        code: rule.id,
        message: rule.message,
        triggeredBy: rule.triggeredBy
      });

      if (rule.setStatus) {
        for (const toolName of rule.triggeredBy) {
          overriddenToolStatuses[toolName] = rule.setStatus;
        }
      }
    }
  }

  return {
    findings,
    warnings,
    overriddenToolStatuses
  };
}

interface RuleEvaluationResult {
  triggered: boolean;
  warnings: string[];
}

function evaluateRule(rule: RuleDefinition, context: Record<string, unknown>): RuleEvaluationResult {
  const placeholders = extractPlaceholders(rule.when);
  const warnings: string[] = [];
  const replacements = new Map<string, unknown>();
  const missingPlaceholders: string[] = [];

  for (const placeholder of placeholders) {
    const metadataPath = rule.variables[placeholder] ?? placeholder;
    const resolvedValue = context[metadataPath];

    if (resolvedValue === undefined) {
      missingPlaceholders.push(`${placeholder} -> ${metadataPath}`);
      continue;
    }

    replacements.set(placeholder, resolvedValue);
  }

  if (missingPlaceholders.length > 0) {
    warnings.push(`Skipped rule '${rule.id}' due to missing metadata values: ${missingPlaceholders.join(', ')}`);

    return {
      triggered: false,
      warnings
    };
  }

  const expression = buildEvaluableExpression(rule.when, replacements);

  try {
    return {
      triggered: evaluateExpression(expression),
      warnings
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    warnings.push(`Failed to evaluate rule '${rule.id}': ${message}`);

    return {
      triggered: false,
      warnings
    };
  }
}

function extractPlaceholders(expression: string): string[] {
  const matches = expression.matchAll(/\$\{([^}]+)\}/g);
  const placeholders = new Set<string>();

  for (const match of matches) {
    placeholders.add(match[1].trim());
  }

  return [...placeholders];
}

function buildEvaluableExpression(expression: string, replacements: Map<string, unknown>): string {
  return expression.replace(/\$\{([^}]+)\}/g, (_, rawPlaceholder: string) => {
    const placeholder = rawPlaceholder.trim();
    const value = replacements.get(placeholder);
    return serializeExpressionLiteral(value);
  });
}

function serializeExpressionLiteral(value: unknown): string {
  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  const asString = String(value);
  return `'${asString.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function buildRuleContext(parsedTools: ParsedToolSummary[]): Record<string, unknown> {
  const context: Record<string, unknown> = {};

  for (const parsedTool of parsedTools) {
    context[`tool.${parsedTool.tool}.status`] = normalizeToolStatus(parsedTool.metadata['status']);

    for (const [key, value] of Object.entries(parsedTool.metadata)) {
      context[`tool.${parsedTool.tool}.${key}`] = parseMetadataValue(value);
    }
  }

  return context;
}

function parseMetadataValue(rawValue: string): unknown {
  if (rawValue === 'true') {
    return true;
  }

  if (rawValue === 'false') {
    return false;
  }

  const asNumber = Number(rawValue);
  if (!Number.isNaN(asNumber)) {
    return asNumber;
  }

  return rawValue;
}

function normalizeToolStatus(rawStatus: string | undefined): ToolStatus {
  if (rawStatus === 'success' || rawStatus === 'failed' || rawStatus === 'partial' || rawStatus === 'unknown') {
    return rawStatus;
  }

  return 'unknown';
}
