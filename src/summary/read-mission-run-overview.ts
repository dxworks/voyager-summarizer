import { readTextFile } from '../io/read-files';

export interface MissionRunOverview {
  hasOverview: boolean;
  executedTools: Set<string>;
  warnings: string[];
}

const MISSION_SUMMARY_HEADER = '------------------- Mission Summary -------------------';
const MISSION_SUMMARY_FOOTER = '_______________________container_______________________';

export async function readMissionRunOverview(
  expectedTools: string[],
  missionReportLogPath?: string
): Promise<MissionRunOverview> {
  const warnings: string[] = [];

  const normalizedExpectedTools = new Set(expectedTools.map(normalizeToolKey));
  if (normalizedExpectedTools.size === 0) {
    return { hasOverview: false, executedTools: new Set(), warnings };
  }

  if (missionReportLogPath) {
    try {
      const content = await readTextFile(missionReportLogPath);
      const parsed = parseMissionReportLog(content, normalizedExpectedTools);
      return {
        hasOverview: true,
        executedTools: parsed,
        warnings
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warnings.push(`Unable to read mission report log from ${missionReportLogPath}: ${message}`);
    }
  }

  return {
    hasOverview: false,
    executedTools: new Set(),
    warnings
  };
}

function parseMissionReportLog(content: string, expectedTools: Set<string>): Set<string> {
  const summaryText = extractSummaryText(content);
  const instrumentHeaderRegex = /-{8}\s*(.*?)\s*-{8}/g;
  const executedTools = new Set<string>();

  let match: RegExpExecArray | null;
  while ((match = instrumentHeaderRegex.exec(summaryText)) !== null) {
    const toolKey = normalizeToolKey(match[1]);
    if (expectedTools.has(toolKey)) {
      executedTools.add(toolKey);
    }
  }

  return executedTools;
}

function extractSummaryText(fileContent: string): string {
  const parts = fileContent.split(MISSION_SUMMARY_HEADER);
  if (parts.length < 2) {
    throw new Error('Mission summary header not found in mission report log');
  }

  const summaryText = parts[parts.length - 1].split(MISSION_SUMMARY_FOOTER)[0];
  if (!summaryText) {
    throw new Error('Mission summary section not found in mission report log');
  }

  return summaryText;
}

export function normalizeToolKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}
