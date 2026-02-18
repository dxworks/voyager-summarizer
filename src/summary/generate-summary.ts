import { readTextFile, writeTextFile } from '../io/read-files';
import { parseToolSummaryMarkdown, ParsedToolSummary } from '../parsers/parse-tool-summary-md';
import { renderMarkdownSummary } from '../render/render-markdown';
import { renderHtmlSummary } from '../render/render-html';
import { buildOverview } from './build-overview';

const DEFAULT_OUT_HTML = 'summary.html';
const DEFAULT_OUT_MD = 'summary.md';
const TOOL_ORDER = ['depminer', 'dude', 'honeydew', 'insider', 'inspector-git', 'jafax', 'lizard'];

export interface GenerateSummaryInput {
  inputDir?: string;
  toolMd: Array<[string, string]>;
  toolHtml: Array<[string, string]>;
  conditionsFile?: string;
  conditions: Array<[string, string]>;
  outHtml?: string;
  outMd?: string;
}

export interface GenerateSummaryResult {
  parsedToolsCount: number;
  writtenHtmlPath?: string;
  writtenMdPath?: string;
}

export async function generateSummary(input: GenerateSummaryInput): Promise<GenerateSummaryResult> {
  const parsedTools = await parseToolSummaries(input.toolMd, input.toolHtml);
  const orderedTools = orderTools(parsedTools);
  const content = buildReportContent(orderedTools);
  const resolvedOutHtml = input.outHtml ?? DEFAULT_OUT_HTML;
  const resolvedOutMd = input.outMd ?? DEFAULT_OUT_MD;
  const writtenPaths = await persistOutputs(content, resolvedOutHtml, resolvedOutMd);

  return {
    parsedToolsCount: parsedTools.length,
    writtenHtmlPath: writtenPaths.writtenHtmlPath,
    writtenMdPath: writtenPaths.writtenMdPath
  };
}

interface ReportContent {
  html?: string;
  markdown?: string;
}

interface PersistedOutputPaths {
  writtenHtmlPath?: string;
  writtenMdPath?: string;
}

async function parseToolSummaries(
  toolMd: Array<[string, string]>,
  toolHtml: Array<[string, string]>
): Promise<ParsedToolSummary[]> {
  const htmlByTool = new Map<string, string>(toolHtml);
  const parsedTools: ParsedToolSummary[] = [];

  for (const [tool, mdPath] of toolMd) {
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
  }

  return parsedTools;
}

function buildReportContent(parsedTools: ParsedToolSummary[]): ReportContent {
  const overview = buildOverview(parsedTools);

  const markdown = renderMarkdownSummary(overview, parsedTools);
  const html = renderHtmlSummary(overview, parsedTools);

  return {
    html: html || undefined,
    markdown: markdown || undefined
  };
}

function orderTools(parsedTools: ParsedToolSummary[]): ParsedToolSummary[] {
  const toolsByName = new Map(parsedTools.map((tool) => [tool.tool, tool]));
  const ordered: ParsedToolSummary[] = [];

  for (const toolName of TOOL_ORDER) {
    const tool = toolsByName.get(toolName);

    if (tool) {
      ordered.push(tool);
    }
  }

  return ordered;
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
