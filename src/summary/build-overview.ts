import { ParsedToolSummary } from '../parsers/parse-tool-summary-md';

export interface SummaryOverview {
  toolNames: string[];
}

export function buildOverview(parsedTools: ParsedToolSummary[]): SummaryOverview {
  return {
    toolNames: parsedTools.map((tool) => tool.tool)
  };
}
