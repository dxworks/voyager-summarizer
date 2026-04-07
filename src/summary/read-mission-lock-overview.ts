import yaml from 'js-yaml';
import { readTextFile } from '../io/read-files';

export interface MissionLockOverview {
  hasOverview: boolean;
  executedTools: Set<string>;
  toolDetailsByKey: Map<string, MissionLockToolDetails>;
  warnings: string[];
}

export interface MissionLockToolDetails {
  version: string;
  runningTime: string;
}

interface MissionLockFile {
  tools?: MissionLockTool[];
}

interface MissionLockTool {
  id?: unknown;
  name?: unknown;
  version?: unknown;
  runningTime?: unknown;
}

export async function readMissionLockOverview(
  expectedTools: string[],
  missionLockFilePath?: string
): Promise<MissionLockOverview> {
  const warnings: string[] = [];

  const normalizedExpectedTools = new Set(expectedTools.map(normalizeToolKey));
  if (normalizedExpectedTools.size === 0) {
    return {
      hasOverview: false,
      executedTools: new Set(),
      toolDetailsByKey: new Map(),
      warnings
    };
  }

  if (!missionLockFilePath) {
    return {
      hasOverview: false,
      executedTools: new Set(),
      toolDetailsByKey: new Map(),
      warnings
    };
  }

  try {
    const content = await readTextFile(missionLockFilePath);
    const parsedLock = yaml.load(content) as MissionLockFile;
    const parsed = parseMissionLockFile(parsedLock, normalizedExpectedTools);
    return {
      hasOverview: true,
      executedTools: parsed.executedTools,
      toolDetailsByKey: parsed.toolDetailsByKey,
      warnings
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    warnings.push(`Unable to read mission lock file from ${missionLockFilePath}: ${message}`);
  }

  return {
    hasOverview: false,
    executedTools: new Set(),
    toolDetailsByKey: new Map(),
    warnings
  };
}

function parseMissionLockFile(
  missionLockFile: MissionLockFile,
  expectedTools: Set<string>
): { executedTools: Set<string>; toolDetailsByKey: Map<string, MissionLockToolDetails> } {
  const executedTools = new Set<string>();
  const toolDetailsByKey = new Map<string, MissionLockToolDetails>();

  if (!Array.isArray(missionLockFile.tools)) {
    return { executedTools, toolDetailsByKey };
  }

  for (const tool of missionLockFile.tools) {
    const normalizedKeys = getNormalizedToolKeys(tool);
    if (normalizedKeys.length === 0) {
      continue;
    }

    const details: MissionLockToolDetails = {
      version: normalizeFieldValue(tool.version),
      runningTime: normalizeFieldValue(tool.runningTime)
    };

    for (const key of normalizedKeys) {
      if (!expectedTools.has(key)) {
        continue;
      }

      executedTools.add(key);
      if (!toolDetailsByKey.has(key)) {
        toolDetailsByKey.set(key, details);
      }
    }
  }

  return { executedTools, toolDetailsByKey };
}

function getNormalizedToolKeys(tool: MissionLockTool): string[] {
  const keys = [tool.id, tool.name]
    .filter((value): value is string => typeof value === 'string')
    .map((value) => normalizeToolKey(value))
    .filter((value) => value.length > 0);

  return [...new Set(keys)];
}

function normalizeFieldValue(value: unknown): string {
  if (typeof value !== 'string') {
    return 'unknown';
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    return 'unknown';
  }

  return normalized;
}

export function normalizeToolKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}
