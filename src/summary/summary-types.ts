export type ToolStatus = 'success' | 'failed' | 'partial' | 'missing' | 'unknown';

export type DiagnosticSeverity = 'critical' | 'error' | 'warning' | 'info';

export interface RuleDefinition {
  id: string;
  severity: DiagnosticSeverity;
  message: string;
  when: string;
  variables: Record<string, string>;
  triggeredBy: string[];
  setStatus?: ToolStatus;
}

export interface ResolvedConditions {
  rules: RuleDefinition[];
}

export interface DiagnosticFinding {
  severity: DiagnosticSeverity;
  code: string;
  message: string;
  triggeredBy: string[];
}

export interface SummaryHealth {
  status: DiagnosticSeverity;
  criticalCount: number;
  errorCount: number;
  warningCount: number;
}
