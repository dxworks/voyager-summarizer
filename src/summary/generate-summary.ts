import { readTextFile, writeTextFile } from '../io/read-files';
import { parseToolSummaryMarkdown, ParsedToolSummary } from '../parsers/parse-tool-summary-md';

const DEFAULT_OUT_HTML = 'summary.html';
const DEFAULT_OUT_MD = 'summary.md';

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
  const content = buildReportContent(parsedTools);
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
  const markdown = parsedTools.map((tool) => tool.markdownContent).join('\n\n');
  const html = parsedTools.map((tool) => tool.htmlTemplateContent).join('\n');

  return {
    html: html || undefined,
    markdown: markdown || undefined
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
