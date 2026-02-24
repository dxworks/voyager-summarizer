import { readTextFile, writeTextFile } from '../io/read-files';
import { parseToolSummaryMarkdown, ParsedToolSummary } from '../parsers/parse-tool-summary-md';
import { renderMarkdownSummary } from '../render/render-markdown';
import { renderHtmlSummary } from '../render/render-html';
import { buildOverview } from './build-overview';
import { resolveConditions } from './resolve-conditions';
import { readToolOrder } from './read-tool-order';
import { ResolvedConditions } from './summary-types';

const DEFAULT_OUT_HTML = 'summary.html';
const DEFAULT_OUT_MD = 'summary.md';
const DEFAULT_TOOL_ORDER = ['depminer', 'dude', 'honeydew', 'insider', 'inspector-git', 'jafax', 'lizard'];

export interface GenerateSummaryInput {
  inputDir?: string;
  toolMd: Array<[string, string]>;
  toolHtml: Array<[string, string]>;
  conditionsFile?: string;
  conditions: Array<[string, string]>;
  toolOrderFile?: string;
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
  const parsed = await parseToolSummaries(input.toolMd, input.toolHtml);
  const parsedTools = parsed.parsedTools;
  const toolOrder = input.toolOrderFile ? await readToolOrder(input.toolOrderFile) : DEFAULT_TOOL_ORDER;
  const ordering = orderTools(parsedTools, toolOrder);
  const content = buildReportContent(ordering.orderedTools, conditions);
  const resolvedOutHtml = input.outHtml ?? DEFAULT_OUT_HTML;
  const resolvedOutMd = input.outMd ?? DEFAULT_OUT_MD;
  const writtenPaths = await persistOutputs(content, resolvedOutHtml, resolvedOutMd);

  return {
    parsedToolsCount: parsedTools.length,
    parseWarnings: [...parsed.warnings, ...ordering.warnings, ...content.overviewWarnings],
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
  toolHtml: Array<[string, string]>
): Promise<ParsedToolSummariesResult> {
  const htmlByTool = new Map<string, string>(toolHtml);
  const parsedTools: ParsedToolSummary[] = [];
  const warnings: string[] = [];

  for (const [tool, mdPath] of toolMd) {
    try {
      const markdownRaw = await readTextFile(mdPath);

      const htmlReferencePath = htmlByTool.get(tool);
      const htmlTemplateReferenceContent = htmlReferencePath ? await readTextFile(htmlReferencePath) : undefined;

      parsedTools.push(
        parseToolSummaryMarkdown({
          tool,
          filePath: mdPath,
          content: markdownRaw,
          htmlTemplateReferenceContent
        })
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warnings.push(`Unable to parse ${tool} summary from ${mdPath}: ${message}`);
    }
  }

  return {
    parsedTools,
    warnings
  };
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

function orderTools(parsedTools: ParsedToolSummary[], toolOrder: string[]): OrderToolsResult {
  const toolsByName = new Map(parsedTools.map((tool) => [tool.tool, tool]));
  const ordered: ParsedToolSummary[] = [];
  const includedTools = new Set<string>();
  const appendedTools: string[] = [];

  for (const toolName of toolOrder) {
    const tool = toolsByName.get(toolName);

    if (tool) {
      ordered.push(tool);
      includedTools.add(tool.tool);
    }
  }

  for (const parsedTool of parsedTools) {
    if (!includedTools.has(parsedTool.tool)) {
      ordered.push(parsedTool);
      appendedTools.push(parsedTool.tool);
      includedTools.add(parsedTool.tool);
    }
  }

  const warnings: string[] = [];
  if (appendedTools.length > 0) {
    warnings.push(`Appended tools not present in ordering list: ${appendedTools.join(', ')}`);
  }

  return {
    orderedTools: ordered,
    warnings
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
