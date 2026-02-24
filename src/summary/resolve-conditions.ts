import { readTextFile } from '../io/read-files';
import { DiagnosticSeverity, ResolvedConditions, RuleDefinition } from './summary-types';

const DEFAULT_CONDITIONS: ResolvedConditions = {
  rules: [
    {
      id: 'inspector-git-failed',
      severity: 'critical',
      message: 'inspector-git failed',
      when: "${status} == 'failed'",
      variables: { status: 'tool.inspector-git.status' },
      triggeredBy: ['inspector-git']
    },
    {
      id: 'voyager-failed',
      severity: 'critical',
      message: 'voyager failed',
      when: "${status} == 'failed'",
      variables: { status: 'tool.voyager.status' },
      triggeredBy: ['voyager']
    },
    {
      id: 'insider-failed',
      severity: 'error',
      message: 'insider failed',
      when: "${status} == 'failed'",
      variables: { status: 'tool.insider.status' },
      triggeredBy: ['insider']
    },
    {
      id: 'dude-failed',
      severity: 'error',
      message: 'dude failed',
      when: "${status} == 'failed'",
      variables: { status: 'tool.dude.status' },
      triggeredBy: ['dude']
    },
    {
      id: 'lizard-failed',
      severity: 'error',
      message: 'lizard failed',
      when: "${status} == 'failed'",
      variables: { status: 'tool.lizard.status' },
      triggeredBy: ['lizard']
    },
    {
      id: 'honeydew-failed-significant-dotnet',
      severity: 'error',
      message: 'honeydew failed and .NET appears significant in the scanned codebase',
      when: "${honeydewStatus} == 'failed' && (${dotnetPercent} > 5 || ${dotnetFiles} > 50)",
      variables: {
        honeydewStatus: 'tool.honeydew.status',
        dotnetPercent: 'tool.insider.languages.dotnet.percent',
        dotnetFiles: 'tool.insider.languages.dotnet.files'
      },
      triggeredBy: ['honeydew', 'insider']
    },
    {
      id: 'jafax-failed-significant-java',
      severity: 'error',
      message: 'jafax failed and Java appears significant in the scanned codebase',
      when: "${jafaxStatus} == 'failed' && ${javaFiles} > 100",
      variables: {
        jafaxStatus: 'tool.jafax.status',
        javaFiles: 'tool.insider.languages.java.files'
      },
      triggeredBy: ['jafax', 'insider']
    },
    {
      id: 'depminer-failed',
      severity: 'warning',
      message: 'depminer failed',
      when: "${status} == 'failed'",
      variables: { status: 'tool.depminer.status' },
      triggeredBy: ['depminer']
    },
    {
      id: 'codeframe-failed',
      severity: 'warning',
      message: 'codeframe failed',
      when: "${status} == 'failed'",
      variables: { status: 'tool.codeframe.status' },
      triggeredBy: ['codeframe']
    }
  ]
};

interface ConditionsFileInput {
  rules?: RuleDefinitionInput[];
}

interface RuleDefinitionInput {
  id?: unknown;
  severity?: unknown;
  message?: unknown;
  when?: unknown;
  variables?: unknown;
  triggeredBy?: unknown;
}

export async function resolveConditions(
  conditionsFile: string | undefined,
  conditions: Array<[string, string]>
): Promise<ResolvedConditions> {
  const resolved = cloneConditions(DEFAULT_CONDITIONS);

  if (conditionsFile) {
    const rawConditions = await readTextFile(conditionsFile);
    const parsed = JSON.parse(rawConditions) as unknown;
    mergeConditionsFile(resolved, parsed);
  }

  for (const [rawKey, rawValue] of conditions) {
    applyCliOverride(resolved, rawKey.trim(), rawValue.trim());
  }

  return resolved;
}

function cloneConditions(source: ResolvedConditions): ResolvedConditions {
  return {
    rules: source.rules.map((rule) => ({
      ...rule,
      variables: { ...rule.variables },
      triggeredBy: [...rule.triggeredBy]
    }))
  };
}

function mergeConditionsFile(target: ResolvedConditions, source: unknown): void {
  if (!isRecord(source)) {
    throw new Error('Invalid conditions file content: expected JSON object');
  }

  const asConditions = source as ConditionsFileInput;

  if (!asConditions.rules) {
    return;
  }

  if (!Array.isArray(asConditions.rules)) {
    throw new Error("Invalid conditions file content: 'rules' must be an array");
  }

  for (const ruleInput of asConditions.rules) {
    const rule = normalizeRuleDefinition(ruleInput);
    upsertRule(target, rule);
  }
}

function normalizeRuleDefinition(input: RuleDefinitionInput): RuleDefinition {
  if (typeof input.id !== 'string' || !input.id.trim()) {
    throw new Error("Invalid rule definition: 'id' is required");
  }

  if (typeof input.when !== 'string' || !input.when.trim()) {
    throw new Error(`Invalid rule definition '${input.id}': 'when' is required`);
  }

  if ('onMissing' in input) {
    throw new Error(`Invalid rule definition '${input.id}': 'onMissing' is no longer supported`);
  }

  const severity = parseSeverity(input.severity, input.id);
  const variables = parseVariables(input.variables, input.id);
  const triggeredBy = parseStringArray(input.triggeredBy, input.id, 'triggeredBy');

  return {
    id: input.id,
    severity,
    message: typeof input.message === 'string' && input.message.trim() ? input.message.trim() : input.id,
    when: input.when,
    variables,
    triggeredBy
  };
}

function parseSeverity(value: unknown, ruleId: string): DiagnosticSeverity {
  if (value === 'critical' || value === 'error' || value === 'warning' || value === 'info') {
    return value;
  }

  if (value === undefined) {
    return 'warning';
  }

  throw new Error(`Invalid severity for rule '${ruleId}': ${String(value)}`);
}

function parseVariables(value: unknown, ruleId: string): Record<string, string> {
  if (value === undefined) {
    return {};
  }

  if (!isRecord(value)) {
    throw new Error(`Invalid variables for rule '${ruleId}': expected object`);
  }

  const variables: Record<string, string> = {};

  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry !== 'string') {
      throw new Error(`Invalid variable '${key}' for rule '${ruleId}': expected string path`);
    }

    variables[key] = entry;
  }

  return variables;
}

function parseStringArray(value: unknown, ruleId: string, fieldName: string): string[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`Invalid ${fieldName} for rule '${ruleId}': expected string array`);
  }

  return [...value];
}

function upsertRule(target: ResolvedConditions, rule: RuleDefinition): void {
  const existingIndex = target.rules.findIndex((item) => item.id === rule.id);

  if (existingIndex >= 0) {
    target.rules[existingIndex] = rule;
    return;
  }

  target.rules.push(rule);
}

function applyCliOverride(target: ResolvedConditions, key: string, value: string): void {
  if (!key) {
    throw new Error('Invalid --condition key: key cannot be empty');
  }

  const parts = key.split('.');
  if (parts.length < 3 || parts[0] !== 'rules') {
    throw new Error(`Invalid --condition key '${key}'. Expected format: rules.<rule-id>.<field>`);
  }

  const ruleId = parts[1];
  const field = parts[2];
  const rest = parts.slice(3);
  const rule = ensureRule(target, ruleId);

  if (field === 'severity') {
    rule.severity = parseSeverity(value, ruleId);
    return;
  }

  if (field === 'message') {
    rule.message = value;
    return;
  }

  if (field === 'when') {
    rule.when = value;
    return;
  }

  if (field === 'variables') {
    if (rest.length !== 1) {
      throw new Error(`Invalid --condition key '${key}'. Expected format: rules.<rule-id>.variables.<name>`);
    }

    rule.variables[rest[0]] = value;
    return;
  }

  if (field === 'triggeredBy') {
    rule.triggeredBy = value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    return;
  }

  throw new Error(`Unsupported --condition field in key '${key}'`);
}

function ensureRule(target: ResolvedConditions, ruleId: string): RuleDefinition {
  let rule = target.rules.find((item) => item.id === ruleId);

  if (!rule) {
    rule = {
      id: ruleId,
      severity: 'warning',
      message: ruleId,
      when: 'false',
      variables: {},
      triggeredBy: []
    };
    target.rules.push(rule);
  }

  return rule;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
