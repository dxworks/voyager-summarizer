import { ParsedToolSummary } from '../parsers/parse-tool-summary-md';
import { SummaryOverview } from '../summary/build-overview';

export function renderMarkdownSummary(overview: SummaryOverview, parsedTools: ParsedToolSummary[]): string {
  const lines: string[] = ['# Voyager Summary', '', '## Overview'];

  for (const toolName of overview.toolNames) {
    lines.push(`- ${toolName}`);
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
