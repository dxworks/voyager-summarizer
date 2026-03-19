import { ParsedToolSummary } from '../parsers/parse-tool-summary-md';
import { SummaryOverview } from '../summary/build-overview';
import defaultSummaryTemplate from './templates/default-summary-template.html';
import defaultSummaryStyles from './templates/default-summary-styles.css';

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

  return applyTemplate(defaultSummaryTemplate, {
    STYLES: defaultSummaryStyles,
    OVERVIEW_ITEMS: overviewItems,
    HEALTH_STATUS_CLASS: overview.health.status,
    HEALTH_STATUS_LABEL: escapeHtml(overview.health.status),
    HEALTH_CRITICAL: String(overview.health.criticalCount),
    HEALTH_ERRORS: String(overview.health.errorCount),
    HEALTH_WARNINGS: String(overview.health.warningCount),
    DIAGNOSTICS_ITEMS: diagnosticsItems,
    TOOL_SECTIONS: toolSections
  });
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

function applyTemplate(template: string, replacements: Record<string, string>): string {
  let rendered = template;

  for (const [key, value] of Object.entries(replacements)) {
    rendered = rendered.split(`{{${key}}}`).join(value);
  }

  return rendered;
}
