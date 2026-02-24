import { ParsedToolSummary } from '../parsers/parse-tool-summary-md';
import { SummaryOverview } from '../summary/build-overview';

export function renderMarkdownSummary(overview: SummaryOverview, parsedTools: ParsedToolSummary[]): string {
  const lines: string[] = ['# Voyager Summary', '', '## Overview'];

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
  }

  for (const tool of parsedTools) {
    lines.push(`## ${tool.tool}`);
    lines.push(tool.markdownContent);
    lines.push('');
  }

  return lines.join('\n').trim();
}
