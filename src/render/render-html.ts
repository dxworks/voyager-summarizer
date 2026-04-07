import { ParsedToolSummary } from '../parsers/parse-tool-summary-md';
import { SummaryOverview } from '../summary/build-overview';
import defaultSummaryTemplate from './templates/default-summary-template.html';
import defaultSummaryStyles from './templates/default-summary-styles.css';

export function renderHtmlSummary(overview: SummaryOverview, parsedTools: ParsedToolSummary[]): string {
  const metadataByTool = buildToolMetadataByName(parsedTools);
  const overviewItems = overview.toolNames
    .map((toolName) => {
      const status = overview.toolStatuses[toolName] ?? 'unknown';
      const toolMetadata = metadataByTool.get(toolName) ?? { version: 'unknown', runningTime: 'unknown' };
      return `<li class="overview-item"><span class="tool-name">${escapeHtml(toolName)}</span>${renderToolMetaChips(toolMetadata, status, 'overview-item-meta')}</li>`;
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
  const toolSections = renderToolSections(parsedTools, overview.toolStatuses, metadataByTool);
  const overallStatusTools = overview.overallStatus.affectedTools.length > 0
    ? `<p class="overall-status-tools">Affected tools: ${escapeHtml(overview.overallStatus.affectedTools.join(', '))}</p>`
    : '';

  return applyTemplate(defaultSummaryTemplate, {
    STYLES: defaultSummaryStyles,
    OVERALL_STATUS_CLASS: overview.overallStatus.level,
    OVERALL_STATUS_TITLE: escapeHtml(overview.overallStatus.title),
    OVERALL_STATUS_MESSAGE: escapeHtml(overview.overallStatus.message),
    OVERALL_STATUS_TOOLS: overallStatusTools,
    OVERVIEW_ITEMS: overviewItems,
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

function renderToolSections(
  parsedTools: ParsedToolSummary[],
  toolStatuses: SummaryOverview['toolStatuses'],
  metadataByTool: Map<string, ToolMetadata>
): string {
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
      const categoryToolCards = tools.map((tool) => renderToolCard(tool, toolStatuses[tool.tool] ?? 'unknown', metadataByTool.get(tool.tool) ?? { version: 'unknown', runningTime: 'unknown' })).join('');
      const countLabel = tools.length === 1 ? '1 tool' : `${tools.length} tools`;
      return `<details class="category-group"><summary class="category-summary"><span class="category-title">${escapeHtml(category)}</span><span class="category-count">${countLabel}</span></summary><div class="category-tools">${categoryToolCards}</div></details>`;
    })
    .join('');

  const otherCategorySection = uncategorizedTools.length > 0
    ? (() => {
        const otherToolCards = uncategorizedTools
          .map((tool) => renderToolCard(tool, toolStatuses[tool.tool] ?? 'unknown', metadataByTool.get(tool.tool) ?? { version: 'unknown', runningTime: 'unknown' }))
          .join('');
        const countLabel = uncategorizedTools.length === 1 ? '1 tool' : `${uncategorizedTools.length} tools`;
        return `<details class="category-group"><summary class="category-summary"><span class="category-title">Other</span><span class="category-count">${countLabel}</span></summary><div class="category-tools">${otherToolCards}</div></details>`;
      })()
    : '';

  return `${categorySections}${otherCategorySection}`;
}

function renderToolCard(tool: ParsedToolSummary, status: string, toolMetadata: ToolMetadata): string {
  return `<details class="summary-card tool-card tool-card-status-${escapeHtml(status)}" open><summary class="tool-card-header"><h2>${escapeHtml(tool.tool)}</h2>${renderToolMetaChips(toolMetadata, status, 'tool-card-header-meta')}</summary><div class="tool-content">${tool.htmlTemplateContent}</div></details>`;
}

interface ToolMetadata {
  version: string;
  runningTime: string;
}

function buildToolMetadataByName(parsedTools: ParsedToolSummary[]): Map<string, ToolMetadata> {
  return new Map<string, ToolMetadata>(
    parsedTools.map((tool) => [
      tool.tool,
      {
        version: tool.metadata.version ?? 'unknown',
        runningTime: tool.metadata.runningTime ?? 'unknown'
      }
    ])
  );
}

function renderToolMetaChips(toolMetadata: ToolMetadata, status: string, wrapperClass: string): string {
  const chips: string[] = [];

  if (toolMetadata.version !== 'unknown') {
    chips.push(`<span class="meta-pill">v${escapeHtml(toolMetadata.version)}</span>`);
  }

  if (toolMetadata.runningTime !== 'unknown') {
    chips.push(`<span class="meta-pill">Elapsed: ${escapeHtml(toolMetadata.runningTime)}</span>`);
  }

  chips.push(`<span class="status-pill status-${escapeHtml(status)}">${escapeHtml(status)}</span>`);
  return `<span class="${wrapperClass}">${chips.join('')}</span>`;
}

function applyTemplate(template: string, replacements: Record<string, string>): string {
  let rendered = template;

  for (const [key, value] of Object.entries(replacements)) {
    rendered = rendered.split(`{{${key}}}`).join(value);
  }

  return rendered;
}
