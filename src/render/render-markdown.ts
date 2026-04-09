import { ParsedToolSummary } from '../parsers/parse-tool-summary-md';
import { SummaryOverview } from '../summary/build-overview';

export function renderMarkdownSummary(overview: SummaryOverview, parsedTools: ParsedToolSummary[]): string {
  const metadataByTool = buildToolMetadataByName(parsedTools);
  const lines: string[] = ['# Voyager Summary', '', '## Overall Status', `- ${overview.overallStatus.title}: ${overview.overallStatus.message}`, '', '## Overview'];

  for (const toolName of overview.toolNames) {
    const toolMetadata = metadataByTool.get(toolName) ?? { version: 'unknown', runningTime: 'unknown', finishedAt: 'unknown' };
    const metadataParts: string[] = [];

    if (toolMetadata.version !== 'unknown') {
      metadataParts.push(`v${toolMetadata.version}`);
    }

    if (toolMetadata.runningTime !== 'unknown') {
      metadataParts.push(`Elapsed: ${toolMetadata.runningTime}`);
    }

    if (toolMetadata.finishedAt !== 'unknown') {
      metadataParts.push(`Finished: ${toolMetadata.finishedAt}`);
    }

    const metadataLabel = metadataParts.length > 0 ? ` - ${metadataParts.join(' - ')}` : '';
    lines.push(`- ${toolName} (${overview.toolStatuses[toolName] ?? 'unknown'})${metadataLabel}`);
  }

  lines.push('');
  lines.push('## Health');
  lines.push(`- Status: ${overview.health.status}`);
  lines.push(`- Critical: ${overview.health.criticalCount}`);
  lines.push(`- Errors: ${overview.health.errorCount}`);
  lines.push(`- Warnings: ${overview.health.warningCount}`);

  lines.push('');
  lines.push('## Diagnostics');

  if (overview.diagnostics.length === 0) {
    lines.push('- No diagnostics triggered');
  } else {
    for (const diagnostic of overview.diagnostics) {
      lines.push(`- [${diagnostic.severity}] ${diagnostic.message}`);
    }
  }

  if (parsedTools.length > 0) {
    lines.push('');
    lines.push('## Tool Summaries');
    lines.push('');

    const categorizedTools = new Map<string, ParsedToolSummary[]>();
    const uncategorizedTools: ParsedToolSummary[] = [];

    for (const tool of parsedTools) {
      if (!tool.category) {
        uncategorizedTools.push(tool);
        continue;
      }

      if (!categorizedTools.has(tool.category)) {
        categorizedTools.set(tool.category, []);
      }

      categorizedTools.get(tool.category)!.push(tool);
    }

    for (const [category, tools] of categorizedTools.entries()) {
      lines.push(`### ${category}`);
      lines.push('');
      appendTools(lines, tools, overview.toolStatuses, metadataByTool);
    }

    if (uncategorizedTools.length > 0) {
      lines.push('### Other');
      lines.push('');
      appendTools(lines, uncategorizedTools, overview.toolStatuses, metadataByTool);
    }
  }

  return lines.join('\n').trim();
}

function appendTools(
  lines: string[],
  tools: ParsedToolSummary[],
  toolStatuses: SummaryOverview['toolStatuses'],
  metadataByTool: Map<string, ToolMetadata>
): void {
  for (const tool of tools) {
    const toolMetadata = metadataByTool.get(tool.tool) ?? { version: 'unknown', runningTime: 'unknown', finishedAt: 'unknown' };
    lines.push(`#### ${tool.tool}`);
    lines.push(`- Consolidated status: ${toolStatuses[tool.tool] ?? 'unknown'}`);

    if (toolMetadata.version !== 'unknown') {
      lines.push(`- Version: ${toolMetadata.version}`);
    }

    if (toolMetadata.runningTime !== 'unknown') {
      lines.push(`- Elapsed time: ${toolMetadata.runningTime}`);
    }

    if (toolMetadata.finishedAt !== 'unknown') {
      lines.push(`- Finished at: ${toolMetadata.finishedAt}`);
    }

    lines.push('');
    lines.push(tool.markdownContent);
    lines.push('');
  }
}

interface ToolMetadata {
  version: string;
  runningTime: string;
  finishedAt: string;
}

function buildToolMetadataByName(parsedTools: ParsedToolSummary[]): Map<string, ToolMetadata> {
  return new Map<string, ToolMetadata>(
    parsedTools.map((tool) => [
      tool.tool,
      {
        version: tool.metadata.version ?? 'unknown',
        runningTime: tool.metadata.runningTime ?? 'unknown',
        finishedAt: tool.metadata.finishedAt ?? 'unknown'
      }
    ])
  );
}
