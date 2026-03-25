import { ParsedToolSummary } from '../parsers/parse-tool-summary-md';
import { SummaryOverview } from '../summary/build-overview';

export function renderMarkdownSummary(overview: SummaryOverview, parsedTools: ParsedToolSummary[]): string {
  const lines: string[] = ['# Voyager Summary', '', '## Overall Status', `- ${overview.overallStatus.title}: ${overview.overallStatus.message}`, '', '## Overview'];

  for (const toolName of overview.toolNames) {
    lines.push(`- ${toolName} (${overview.toolStatuses[toolName] ?? 'unknown'})`);
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
      appendTools(lines, tools, overview.toolStatuses);
    }

    if (uncategorizedTools.length > 0) {
      lines.push('### Other');
      lines.push('');
      appendTools(lines, uncategorizedTools, overview.toolStatuses);
    }
  }

  return lines.join('\n').trim();
}

function appendTools(
  lines: string[],
  tools: ParsedToolSummary[],
  toolStatuses: SummaryOverview['toolStatuses']
): void {
  for (const tool of tools) {
    lines.push(`#### ${tool.tool}`);
    lines.push(`- Consolidated status: ${toolStatuses[tool.tool] ?? 'unknown'}`);
    lines.push('');
    lines.push(tool.markdownContent);
    lines.push('');
  }
}
