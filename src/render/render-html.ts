import { ParsedToolSummary } from '../parsers/parse-tool-summary-md';
import { SummaryOverview } from '../summary/build-overview';

export function renderHtmlSummary(overview: SummaryOverview, parsedTools: ParsedToolSummary[]): string {
  const overviewItems = overview.toolNames
    .map((toolName) => {
      const status = overview.toolStatuses[toolName] ?? 'unknown';
      return `<li class="overview-item"><span class="tool-name">${escapeHtml(toolName)}</span><span class="status-pill status-${status}">${escapeHtml(status)}</span></li>`;
    })
    .join('');
  const diagnosticsItems =
    overview.diagnostics.length === 0
      ? '<li class="diagnostic-item severity-info">No diagnostics triggered</li>'
      : overview.diagnostics
          .map(
            (item) =>
              `<li class="diagnostic-item severity-${item.severity}"><span class="diagnostic-severity">${escapeHtml(item.severity)}</span><span class="diagnostic-message">${escapeHtml(item.message)}</span></li>`
          )
          .join('');
  const toolSections = renderToolSections(parsedTools);

  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    '  <title>Voyager Summary</title>',
    '  <style>',
    '    :root {',
    '      --bg: #f4f8f8;',
    '      --panel: #ffffff;',
    '      --panel-muted: #eef5f4;',
    '      --line: #d3e2de;',
    '      --text-main: #14302a;',
    '      --text-muted: #45625c;',
    '      --accent: #1f7a6d;',
    '      --critical: #8f1d2c;',
    '      --error: #b23828;',
    '      --warning: #a36a1b;',
    '      --success: #1d7d48;',
    '      --unknown: #5f6c6a;',
    '      --shadow: 0 10px 28px rgba(13, 48, 43, 0.08);',
    '    }',
    '    * { box-sizing: border-box; }',
    '    body {',
    "      margin: 0;",
    "      font-family: 'IBM Plex Sans', 'Segoe UI', Tahoma, sans-serif;",
    '      color: var(--text-main);',
    '      background: linear-gradient(180deg, #e6f2ef 0%, var(--bg) 44%, #f8fbfb 100%);',
    '      line-height: 1.5;',
    '    }',
    '    .summary-shell {',
    '      max-width: 1080px;',
    '      margin: 0 auto;',
    '      padding: 28px 20px 40px;',
    '      display: grid;',
    '      gap: 16px;',
    '    }',
    '    .summary-header {',
    '      background: radial-gradient(circle at top right, #d5ebe7 0%, #edf6f4 45%, #f9fcfb 100%);',
    '      border: 1px solid var(--line);',
    '      border-radius: 16px;',
    '      box-shadow: var(--shadow);',
    '      padding: 22px 24px;',
    '    }',
    '    .summary-header h1 {',
    '      margin: 0 0 6px;',
    '      font-size: clamp(1.6rem, 1.1rem + 1.8vw, 2.2rem);',
    '      letter-spacing: 0.01em;',
    '    }',
    '    .summary-subtitle {',
    '      margin: 0;',
    '      color: var(--text-muted);',
    '      font-size: 0.95rem;',
    '    }',
    '    .summary-grid {',
    '      display: grid;',
    '      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));',
    '      gap: 14px;',
    '    }',
    '    .summary-card {',
    '      background: var(--panel);',
    '      border: 1px solid var(--line);',
    '      border-radius: 14px;',
    '      box-shadow: var(--shadow);',
    '      padding: 18px;',
    '    }',
    '    .summary-card h2 {',
    '      margin: 0 0 12px;',
    '      font-size: 1.12rem;',
    '    }',
    '    .overview-list, .diagnostics-list {',
    '      list-style: none;',
    '      margin: 0;',
    '      padding: 0;',
    '      display: grid;',
    '      gap: 8px;',
    '    }',
    '    .overview-item, .diagnostic-item {',
    '      background: var(--panel-muted);',
    '      border: 1px solid var(--line);',
    '      border-radius: 10px;',
    '      padding: 8px 10px;',
    '      display: flex;',
    '      justify-content: space-between;',
    '      align-items: center;',
    '      gap: 10px;',
    '    }',
    '    .tool-name {',
    '      font-weight: 600;',
    '      letter-spacing: 0.01em;',
    '    }',
    '    .status-pill {',
    '      text-transform: uppercase;',
    '      font-size: 0.72rem;',
    '      font-weight: 700;',
    '      letter-spacing: 0.08em;',
    '      border-radius: 999px;',
    '      border: 1px solid transparent;',
    '      padding: 4px 9px;',
    '    }',
    '    .status-success { color: var(--success); background: #dbf1e5; border-color: #a8d6bd; }',
    '    .status-failed { color: var(--error); background: #f9dfdf; border-color: #ecbbbb; }',
    '    .status-partial { color: var(--warning); background: #faebd5; border-color: #e8c998; }',
    '    .status-unknown { color: var(--unknown); background: #e8efee; border-color: #cad8d5; }',
    '    .health-metrics {',
    '      display: flex;',
    '      flex-wrap: wrap;',
    '      gap: 8px;',
    '      margin-top: 10px;',
    '    }',
    '    .metric-chip {',
    '      background: var(--panel-muted);',
    '      border: 1px solid var(--line);',
    '      border-radius: 999px;',
    '      padding: 5px 11px;',
    '      font-size: 0.84rem;',
    '      font-weight: 600;',
    '      color: var(--text-muted);',
    '    }',
    '    .health-status {',
    '      margin: 0;',
    '      font-size: 1rem;',
    '      font-weight: 600;',
    '    }',
    '    .health-status .status-pill { margin-left: 8px; }',
    '    .diagnostic-item {',
    '      justify-content: flex-start;',
    '      gap: 10px;',
    '      align-items: baseline;',
    '    }',
    '    .diagnostic-severity {',
    '      text-transform: uppercase;',
    '      font-size: 0.72rem;',
    '      letter-spacing: 0.08em;',
    '      font-weight: 700;',
    '      min-width: 64px;',
    '    }',
    '    .severity-critical { border-left: 4px solid var(--critical); }',
    '    .severity-error { border-left: 4px solid var(--error); }',
    '    .severity-warning { border-left: 4px solid var(--warning); }',
    '    .severity-info { border-left: 4px solid var(--accent); }',
    '    .tool-sections {',
    '      display: grid;',
    '      gap: 14px;',
    '    }',
    '    .category-group {',
    '      background: var(--panel);',
    '      border: 1px solid var(--line);',
    '      border-radius: 14px;',
    '      box-shadow: var(--shadow);',
    '      overflow: hidden;',
    '    }',
    '    .category-summary {',
    '      cursor: pointer;',
    '      list-style: none;',
    '      display: flex;',
    '      justify-content: space-between;',
    '      align-items: center;',
    '      gap: 8px;',
    '      padding: 14px 16px;',
    '      background: var(--panel-muted);',
    '      border-bottom: 1px solid var(--line);',
    '      font-weight: 600;',
    '    }',
    '    .category-summary::-webkit-details-marker { display: none; }',
    '    .category-title { font-size: 1rem; }',
    '    .category-count {',
    '      color: var(--text-muted);',
    '      font-size: 0.82rem;',
    '      font-weight: 600;',
    '    }',
    '    .category-tools {',
    '      display: grid;',
    '      gap: 12px;',
    '      padding: 12px;',
    '    }',
    '    .tool-card h2 {',
    '      border-bottom: 1px solid var(--line);',
    '      padding-bottom: 8px;',
    '      margin-bottom: 10px;',
    '    }',
    '    @media (max-width: 640px) {',
    '      .summary-shell { padding: 18px 12px 28px; }',
    '      .overview-item, .diagnostic-item { align-items: flex-start; flex-direction: column; }',
    '      .status-pill { align-self: flex-start; }',
    '      .summary-header { padding: 16px; }',
    '      .summary-card { padding: 14px; }',
    '    }',
    '  </style>',
    '</head>',
    '<body>',
    '  <main class="summary-shell">',
    '    <header class="summary-header">',
    '      <h1>Voyager Summary</h1>',
    '      <p class="summary-subtitle">Unified report generated from tool summaries</p>',
    '    </header>',
    '    <div class="summary-grid">',
    '      <section class="summary-card">',
    '        <h2>Overview</h2>',
    `        <ul class="overview-list">${overviewItems}</ul>`,
    '      </section>',
    '      <section class="summary-card">',
    '        <h2>Health</h2>',
    `        <p class="health-status">Status <span class="status-pill status-${overview.health.status}">${escapeHtml(overview.health.status)}</span></p>`,
    '        <div class="health-metrics">',
    `          <span class="metric-chip">Critical: ${overview.health.criticalCount}</span>`,
    `          <span class="metric-chip">Errors: ${overview.health.errorCount}</span>`,
    `          <span class="metric-chip">Warnings: ${overview.health.warningCount}</span>`,
    '        </div>',
    '      </section>',
    '    </div>',
    '    <section class="summary-card">',
    '      <h2>Diagnostics</h2>',
    `      <ul class="diagnostics-list">${diagnosticsItems}</ul>`,
    '    </section>',
    `    <div class="tool-sections">${toolSections}</div>`,
    '  </main>',
    '</body>',
    '</html>'
  ].join('\n');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderToolSections(parsedTools: ParsedToolSummary[]): string {
  const categorizedTools = new Map<string, ParsedToolSummary[]>();
  const uncategorizedTools: ParsedToolSummary[] = [];

  for (const tool of parsedTools) {
    if (!tool.htmlTemplateAvailable) {
      continue;
    }

    if (!tool.category) {
      uncategorizedTools.push(tool);
      continue;
    }

    if (!categorizedTools.has(tool.category)) {
      categorizedTools.set(tool.category, []);
    }

    categorizedTools.get(tool.category)!.push(tool);
  }

  const categorySections = Array.from(categorizedTools.entries())
    .map(([category, tools]) => {
      const categoryToolCards = tools.map((tool) => renderToolCard(tool)).join('');
      const countLabel = tools.length === 1 ? '1 tool' : `${tools.length} tools`;
      return `<details class="category-group"><summary class="category-summary"><span class="category-title">${escapeHtml(category)}</span><span class="category-count">${countLabel}</span></summary><div class="category-tools">${categoryToolCards}</div></details>`;
    })
    .join('');

  const uncategorizedSections = uncategorizedTools.map((tool) => renderToolCard(tool)).join('');

  return `${categorySections}${uncategorizedSections}`;
}

function renderToolCard(tool: ParsedToolSummary): string {
  return `<section class="summary-card tool-card"><h2>${escapeHtml(tool.tool)}</h2><div class="tool-content">${tool.htmlTemplateContent}</div></section>`;
}
