import { readTextFile } from '../io/read-files';
import defaultConditionsFile from '../config/default-conditions.json';
import { DiagnosticSeverity, ResolvedConditions, RuleDefinition } from './summary-types';

const DEFAULT_CONDITIONS: ResolvedConditions = loadDefaultConditions();

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

function loadDefaultConditions(): ResolvedConditions {
  const defaults: ResolvedConditions = { rules: [] };
  mergeConditionsFile(defaults, defaultConditionsFile);
  return defaults;
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
