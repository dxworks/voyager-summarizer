import { readTextFile, writeTextFile } from '../io/read-files';
import { parseToolSummaryMarkdown, ParsedToolSummary } from '../parsers/parse-tool-summary-md';
import { renderMarkdownSummary } from '../render/render-markdown';
import { renderHtmlSummary } from '../render/render-html';
import { buildOverview } from './build-overview';
import { resolveConditions } from './resolve-conditions';
import { resolveToolOrder, ResolvedToolOrder } from './resolve-tool-order';
import { ResolvedConditions, ToolStatus } from './summary-types';
import {
  MissionLockOverview,
  normalizeToolKey,
  readMissionLockOverview
} from './read-mission-lock-overview';

const DEFAULT_OUT_HTML = 'summary.html';
const DEFAULT_OUT_MD = 'summary.md';

export interface GenerateSummaryInput {
  toolMd: Array<[string, string]>;
  toolHtml: Array<[string, string]>;
  toolCategory?: Array<[string, string]>;
  conditionsFile?: string;
  conditions: Array<[string, string]>;
  toolOrderFile?: string;
  missionLockFilePath?: string;
  outHtml?: string;
  outMd?: string;
}

export interface GenerateSummaryResult {
  parsedToolsCount: number;
  parseWarnings: string[];
  writtenHtmlPath?: string;
  writtenMdPath?: string;
}

export async function generateSummary(input: GenerateSummaryInput): Promise<GenerateSummaryResult> {
  const conditions = await resolveConditions(input.conditionsFile, input.conditions);
  const toolOrder = await resolveToolOrder(input.toolOrderFile);
  const lockOverview = await readMissionLockOverview(
    input.toolMd.map(([tool]) => tool),
    input.missionLockFilePath
  );
  const parsed = await parseToolSummaries(input.toolMd, input.toolHtml, input.toolCategory ?? [], lockOverview);
  const parsedTools = parsed.parsedTools;
  const ordering = orderTools(parsedTools, toolOrder);
  const content = buildReportContent(ordering.orderedTools, conditions);
  const resolvedOutHtml = input.outHtml ?? DEFAULT_OUT_HTML;
  const resolvedOutMd = input.outMd ?? DEFAULT_OUT_MD;
  const writtenPaths = await persistOutputs(content, resolvedOutHtml, resolvedOutMd);

  return {
    parsedToolsCount: parsedTools.length,
    parseWarnings: [...lockOverview.warnings, ...parsed.warnings, ...ordering.warnings, ...content.overviewWarnings],
    writtenHtmlPath: writtenPaths.writtenHtmlPath,
    writtenMdPath: writtenPaths.writtenMdPath
  };
}

interface ReportContent {
  overviewWarnings: string[];
  html?: string;
  markdown?: string;
}

interface PersistedOutputPaths {
  writtenHtmlPath?: string;
  writtenMdPath?: string;
}

interface ParsedToolSummariesResult {
  parsedTools: ParsedToolSummary[];
  warnings: string[];
}

interface OrderToolsResult {
  orderedTools: ParsedToolSummary[];
  warnings: string[];
}

async function parseToolSummaries(
  toolMd: Array<[string, string]>,
  toolHtml: Array<[string, string]>,
  toolCategory: Array<[string, string]>,
  lockOverview: MissionLockOverview
): Promise<ParsedToolSummariesResult> {
  const htmlByTool = new Map<string, string>(
    toolHtml
      .map(([tool, filePath]) => [tool, normalizeOptionalPath(filePath)] as [string, string])
      .filter(([, filePath]) => filePath.length > 0)
  );
  const parsedTools: ParsedToolSummary[] = [];
  const warnings: string[] = [];
  const categoryByTool = new Map<string, string>(
    toolCategory.map(([tool, category]) => [tool, category])
  );

  for (const [tool, mdPath] of toolMd) {
    try {
      const markdownRaw = await readTextFile(mdPath);

      const htmlReferencePath = htmlByTool.get(tool);
      const htmlTemplateReferenceContent = htmlReferencePath ? await readTextFile(htmlReferencePath) : undefined;

      const parsedTool = parseToolSummaryMarkdown({
        tool,
        filePath: mdPath,
        content: markdownRaw,
        htmlTemplateReferenceContent
      });

      const toolMetadataWithLock = applyMissionLockMetadata(parsedTool.metadata, tool, lockOverview);

      parsedTools.push({
        ...parsedTool,
        metadata: toolMetadataWithLock,
        category: normalizeOptionalCategory(categoryByTool.get(tool))
      });

      if (parsedTool.htmlTemplateMode === 'reference' && !parsedTool.htmlTemplateAvailable) {
        warnings.push(
          `Missing HTML template reference for ${tool}; skipping this tool section from the HTML report`
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warnings.push(`Unable to parse ${tool} summary from ${mdPath}: ${message}`);
      parsedTools.push(buildFallbackParsedTool(tool, categoryByTool.get(tool), lockOverview, message));
    }
  }

  return {
    parsedTools,
    warnings
  };
}

function buildFallbackParsedTool(
  tool: string,
  category: string | undefined,
  lockOverview: MissionLockOverview,
  parseError: string
): ParsedToolSummary {
  const normalizedTool = normalizeToolKey(tool);
  const status: ToolStatus = lockOverview.hasOverview
    ? lockOverview.executedTools.has(normalizedTool)
      ? 'missing'
      : 'not-run'
    : 'unknown';
  const lockMetadata = getToolLockMetadata(normalizedTool, lockOverview);

  const message = status === 'not-run'
    ? 'No tool summary was produced because the tool was not run in the mission lock overview.'
    : 'The tool appears to have run, but the summary output is missing or unreadable.';

  return {
    tool,
    category: normalizeOptionalCategory(category),
    metadata: {
      status,
      'html-template': 'inline',
      version: lockMetadata.version,
      runningTime: lockMetadata.runningTime
    },
    htmlTemplateMode: 'inline',
    htmlTemplateContent: `<div class="missing-summary"><p>${escapeHtml(message)}</p><p>Details: ${escapeHtml(parseError)}</p></div>`,
    htmlTemplateAvailable: true,
    markdownContent: [
      message,
      '',
      `Details: ${parseError}`
    ].join('\n')
  };
}

function applyMissionLockMetadata(
  metadata: Record<string, string>,
  tool: string,
  lockOverview: MissionLockOverview
): Record<string, string> {
  const lockMetadata = getToolLockMetadata(normalizeToolKey(tool), lockOverview);
  const overriddenVersion = resolveToolVersion(metadata, lockMetadata.version);

  return {
    ...metadata,
    version: overriddenVersion,
    runningTime: lockMetadata.runningTime
  };
}

function resolveToolVersion(metadata: Record<string, string>, lockVersion: string): string {
  const rawOverride = metadata['tool-version'];
  if (!rawOverride) {
    return lockVersion;
  }

  const normalizedOverride = rawOverride.trim();
  if (normalizedOverride.length === 0) {
    return lockVersion;
  }

  if (normalizedOverride.toLowerCase() === 'unknown') {
    return lockVersion;
  }

  return normalizedOverride;
}

function getToolLockMetadata(toolKey: string, lockOverview: MissionLockOverview): { version: string; runningTime: string } {
  const toolDetails = lockOverview.toolDetailsByKey.get(toolKey);
  if (!toolDetails) {
    return {
      version: 'unknown',
      runningTime: 'unknown'
    };
  }

  return toolDetails;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeOptionalPath(filePath: string): string {
  const normalized = filePath.trim();

  if (normalized.length === 0) {
    return '';
  }

  const lowerCased = normalized.toLowerCase();
  if (lowerCased === 'null' || lowerCased === 'undefined') {
    return '';
  }

  return normalized;
}

function normalizeOptionalCategory(category: string | undefined): string | undefined {
  if (!category) {
    return undefined;
  }

  const normalized = category.trim();
  if (normalized.length === 0) {
    return undefined;
  }

  const lowerCased = normalized.toLowerCase();
  if (lowerCased === 'null' || lowerCased === 'undefined') {
    return undefined;
  }

  return normalized;
}

function buildReportContent(
  parsedTools: ParsedToolSummary[],
  conditions: ResolvedConditions
): ReportContent {
  const overview = buildOverview(parsedTools, conditions);

  const markdown = renderMarkdownSummary(overview, parsedTools);
  const html = renderHtmlSummary(overview, parsedTools);

  return {
    overviewWarnings: overview.conditionWarnings,
    html: html || undefined,
    markdown: markdown || undefined
  };
}

function orderTools(parsedTools: ParsedToolSummary[], toolOrder: ResolvedToolOrder): OrderToolsResult {
  const toolsByCategory = new Map<string, ParsedToolSummary[]>();

  for (const tool of parsedTools) {
    const category = tool.category ?? 'Other';

    if (!toolsByCategory.has(category)) {
      toolsByCategory.set(category, []);
    }

    toolsByCategory.get(category)!.push(tool);
  }

  const existingCategories = [...toolsByCategory.keys()];
  const orderedCategories = [...existingCategories].sort((left, right) => {
    const leftOrder = toolOrder.categoryOrder[left];
    const rightOrder = toolOrder.categoryOrder[right];

    if (leftOrder !== undefined && rightOrder !== undefined) {
      if (leftOrder === rightOrder) {
        return left.localeCompare(right);
      }

      return leftOrder - rightOrder;
    }

    if (leftOrder !== undefined) {
      return -1;
    }

    if (rightOrder !== undefined) {
      return 1;
    }

    return left.localeCompare(right);
  });

  const orderedTools: ParsedToolSummary[] = [];

  for (const category of orderedCategories) {
    const categoryTools = toolsByCategory.get(category) ?? [];
    const sortedCategoryTools = [...categoryTools].sort((left, right) => {
      const leftConfiguredOrder = toolOrder.toolOrder[left.tool];
      const rightConfiguredOrder = toolOrder.toolOrder[right.tool];

      if (leftConfiguredOrder !== undefined && rightConfiguredOrder !== undefined) {
        if (leftConfiguredOrder === rightConfiguredOrder) {
          return left.tool.localeCompare(right.tool);
        }

        return leftConfiguredOrder - rightConfiguredOrder;
      }

      if (leftConfiguredOrder !== undefined) {
        return -1;
      }

      if (rightConfiguredOrder !== undefined) {
        return 1;
      }

      return left.tool.localeCompare(right.tool);
    });

    orderedTools.push(...sortedCategoryTools);
  }

  return {
    orderedTools,
    warnings: []
  };
}

async function persistOutputs(
  content: ReportContent,
  outHtml: string,
  outMd: string
): Promise<PersistedOutputPaths> {
  let writtenHtmlPath: string | undefined;
  let writtenMdPath: string | undefined;

  if (content.html) {
    await writeTextFile(outHtml, content.html);
    writtenHtmlPath = outHtml;
  }

  if (content.markdown) {
    await writeTextFile(outMd, content.markdown);
    writtenMdPath = outMd;
  }

  return {
    writtenHtmlPath,
    writtenMdPath
  };
}
