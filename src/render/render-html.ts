import { ParsedToolSummary } from '../parsers/parse-tool-summary-md';
import { SummaryOverview } from '../summary/build-overview';

export function renderHtmlSummary(overview: SummaryOverview, parsedTools: ParsedToolSummary[]): string {
  const overviewItems = overview.toolNames
    .map((toolName) => `<li>${toolName} (${overview.toolStatuses[toolName] ?? 'unknown'})</li>`)
    .join('');
  const diagnosticsItems =
    overview.diagnostics.length === 0
      ? '<li>No diagnostics triggered</li>'
      : overview.diagnostics.map((item) => `<li>[${item.severity}] ${item.message}</li>`).join('');
  const toolSections = parsedTools
    .map((tool) => `<section><h2>${tool.tool}</h2>${tool.htmlTemplateContent}</section>`)
    .join('');

  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8">',
    '  <title>Voyager Summary</title>',
    '</head>',
    '<body>',
    '  <h1>Voyager Summary</h1>',
    '  <section>',
    '    <h2>Overview</h2>',
    `    <ul>${overviewItems}</ul>`,
    '  </section>',
    '  <section>',
    '    <h2>Health</h2>',
    `    <p>Status: ${overview.health.status}</p>`,
    `    <p>Critical: ${overview.health.criticalCount}, Errors: ${overview.health.errorCount}, Warnings: ${overview.health.warningCount}</p>`,
    '  </section>',
    '  <section>',
    '    <h2>Diagnostics</h2>',
    `    <ul>${diagnosticsItems}</ul>`,
    '  </section>',
    `  ${toolSections}`,
    '</body>',
    '</html>'
  ].join('\n');
}
