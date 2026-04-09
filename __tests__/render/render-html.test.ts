import { renderHtmlSummary } from '../../src/render/render-html';
import { ParsedToolSummary } from '../../src/parsers/parse-tool-summary-md';
import { SummaryOverview } from '../../src/summary/build-overview';

function makeParsedTool(
  tool: string,
  htmlTemplateContent: string,
  markdownContent = `# ${tool}`,
  htmlTemplateAvailable = true,
  category?: string
): ParsedToolSummary {
  return {
    tool,
    category,
    metadata: { 'html-template': 'inline' },
    htmlTemplateMode: 'inline',
    htmlTemplateContent,
    htmlTemplateAvailable,
    markdownContent
  };
}

const DEFAULT_OK_STATUS = {
  level: 'ok' as const,
  title: 'Ready for Analysis',
  message: 'All required data was extracted successfully. You can proceed.',
  affectedTools: []
};

describe('renderHtmlSummary', () => {
  it('renders document shell and overview list', () => {
    const overview: SummaryOverview = {
      toolNames: ['insider', 'jafax'],
      toolStatuses: { insider: 'success', jafax: 'failed' },
      diagnostics: [
        {
          severity: 'error',
          code: 'jafax-failed',
          message: 'jafax failed',
          triggeredBy: ['jafax']
        }
      ],
      conditionWarnings: [],
      health: {
        status: 'error',
        criticalCount: 0,
        errorCount: 1,
        warningCount: 0
      },
      overallStatus: {
        level: 'error',
        title: 'Proceed with Caution',
        message: 'Analysis can start, but some required outputs are missing for: jafax. See diagnostics below.',
        affectedTools: ['jafax']
      }
    };
    const parsedTools: ParsedToolSummary[] = [makeParsedTool('insider', '<article>insider-template</article>')];

    const output = renderHtmlSummary(overview, parsedTools);

    expect(output).toContain('<!doctype html>');
    expect(output).toContain('<html lang="en">');
    expect(output).toContain('<style>');
    expect(output).toContain('<section class="overall-status overall-status-error">');
    expect(output).toContain('<h2>Proceed with Caution</h2>');
    expect(output).toContain('<p>Analysis can start, but some required outputs are missing for: jafax. See diagnostics below.</p>');
    expect(output).toContain('<h2>Overview</h2>');
    expect(output).not.toContain('<h2>Health</h2>');
    expect(output).toContain('<span class="metric-chip">Critical: 0</span>');
    expect(output).toContain('<span class="metric-chip">Errors: 1</span>');
    expect(output).toContain('<span class="metric-chip">Warnings: 0</span>');
    expect(output).toContain('<ul class="overview-list"><li class="overview-item"><span class="tool-name">insider</span><span class="overview-item-meta"><span class="status-pill status-success">success</span></span></li><li class="overview-item"><span class="tool-name">jafax</span><span class="overview-item-meta"><span class="status-pill status-failed">failed</span></span></li></ul>');
    expect(output).toContain('<h2>Diagnostics</h2>');
    expect(output).toContain('<span class="diagnostic-severity">error</span>');
  });

  it('renders tool sections in received order with html content', () => {
    const overview: SummaryOverview = {
      toolNames: ['insider', 'lizard'],
      toolStatuses: { insider: 'success', lizard: 'success' },
      diagnostics: [],
      conditionWarnings: [],
      health: {
        status: 'info',
        criticalCount: 0,
        errorCount: 0,
        warningCount: 0
      },
      overallStatus: DEFAULT_OK_STATUS
    };
    const parsedTools: ParsedToolSummary[] = [
      makeParsedTool('insider', '<div id="insider">insider</div>'),
      makeParsedTool('lizard', '<div id="lizard">lizard</div>')
    ];

    const output = renderHtmlSummary(overview, parsedTools);

    const insiderPos = output.indexOf('<details class="summary-card tool-card tool-card-status-success" open><summary class="tool-card-header"><h2>insider</h2><span class="tool-card-header-meta"><span class="status-pill status-success">success</span></span></summary><div class="tool-content"><div id="insider">insider</div></div></details>');
    const lizardPos = output.indexOf('<details class="summary-card tool-card tool-card-status-success" open><summary class="tool-card-header"><h2>lizard</h2><span class="tool-card-header-meta"><span class="status-pill status-success">success</span></span></summary><div class="tool-content"><div id="lizard">lizard</div></div></details>');

    expect(insiderPos).toBeGreaterThan(-1);
    expect(lizardPos).toBeGreaterThan(-1);
    expect(insiderPos).toBeLessThan(lizardPos);
  });

  it('renders empty tool section area when no parsed tools are provided', () => {
    const overview: SummaryOverview = {
      toolNames: ['insider'],
      toolStatuses: { insider: 'unknown' },
      diagnostics: [],
      conditionWarnings: [],
      health: {
        status: 'info',
        criticalCount: 0,
        errorCount: 0,
        warningCount: 0
      },
      overallStatus: DEFAULT_OK_STATUS
    };

    const output = renderHtmlSummary(overview, []);

    expect(output).toContain('<span class="tool-name">insider</span><span class="overview-item-meta"><span class="status-pill status-unknown">unknown</span></span>');
    expect(output).not.toContain('<details class="summary-card tool-card tool-card-status-unknown" open><summary class="tool-card-header"><h2>insider</h2>');
  });

  it('skips tools with unavailable html templates', () => {
    const overview: SummaryOverview = {
      toolNames: ['jafax', 'lizard', 'insider'],
      toolStatuses: { jafax: 'success', lizard: 'success', insider: 'success' },
      diagnostics: [],
      conditionWarnings: [],
      health: {
        status: 'info',
        criticalCount: 0,
        errorCount: 0,
        warningCount: 0
      },
      overallStatus: DEFAULT_OK_STATUS
    };

    const parsedTools: ParsedToolSummary[] = [
      makeParsedTool('jafax', '<div id="jafax">jafax</div>'),
      makeParsedTool('lizard', '', '# lizard', false),
      makeParsedTool('insider', '<div id="insider">insider</div>')
    ];

    const output = renderHtmlSummary(overview, parsedTools);

    expect(output).toContain('<details class="summary-card tool-card tool-card-status-success" open><summary class="tool-card-header"><h2>jafax</h2><span class="tool-card-header-meta"><span class="status-pill status-success">success</span></span></summary><div class="tool-content"><div id="jafax">jafax</div></div></details>');
    expect(output).toContain('<details class="summary-card tool-card tool-card-status-success" open><summary class="tool-card-header"><h2>insider</h2><span class="tool-card-header-meta"><span class="status-pill status-success">success</span></span></summary><div class="tool-content"><div id="insider">insider</div></div></details>');
    expect(output).not.toContain('<details class="summary-card tool-card tool-card-status-success" open><summary class="tool-card-header"><h2>lizard</h2>');
  });

  it('groups categorized tools in collapsible sections and places uncategorized tools in Other', () => {
    const overview: SummaryOverview = {
      toolNames: ['depminer', 'dude', 'jafax'],
      toolStatuses: { depminer: 'success', dude: 'success', jafax: 'success' },
      diagnostics: [],
      conditionWarnings: [],
      health: {
        status: 'info',
        criticalCount: 0,
        errorCount: 0,
        warningCount: 0
      },
      overallStatus: DEFAULT_OK_STATUS
    };

    const parsedTools: ParsedToolSummary[] = [
      makeParsedTool('depminer', '<div id="depminer">depminer</div>', '# depminer', true, 'Architecture'),
      makeParsedTool('dude', '<div id="dude">dude</div>', '# dude', true, 'Architecture'),
      makeParsedTool('jafax', '<div id="jafax">jafax</div>')
    ];

    const output = renderHtmlSummary(overview, parsedTools);

    expect(output).toContain('<details class="category-group"><summary class="category-summary"><span class="category-title">Architecture</span><span class="category-count">2 tools</span></summary>');
    expect(output).toContain('<details class="category-group"><summary class="category-summary"><span class="category-title">Other</span><span class="category-count">1 tool</span></summary>');

    const architecturePos = output.indexOf('<details class="category-group"><summary class="category-summary"><span class="category-title">Architecture</span><span class="category-count">2 tools</span></summary>');
    const otherPos = output.indexOf('<details class="category-group"><summary class="category-summary"><span class="category-title">Other</span><span class="category-count">1 tool</span></summary>');
    expect(architecturePos).toBeGreaterThan(-1);
    expect(otherPos).toBeGreaterThan(-1);
    expect(architecturePos).toBeLessThan(otherPos);
  });

  it('renders missing status with dedicated class', () => {
    const overview: SummaryOverview = {
      toolNames: ['jafax'],
      toolStatuses: { jafax: 'missing' },
      diagnostics: [],
      conditionWarnings: [],
      health: {
        status: 'info',
        criticalCount: 0,
        errorCount: 0,
        warningCount: 0
      },
      overallStatus: DEFAULT_OK_STATUS
    };

    const output = renderHtmlSummary(overview, [makeParsedTool('jafax', '<div>jafax</div>')]);

    expect(output).toContain('<span class="tool-name">jafax</span><span class="overview-item-meta"><span class="status-pill status-missing">missing</span></span>');
    expect(output).toContain('<details class="summary-card tool-card tool-card-status-missing" open><summary class="tool-card-header"><h2>jafax</h2><span class="tool-card-header-meta"><span class="status-pill status-missing">missing</span></span></summary>');
  });

  it('renders tool card status from overview status overrides', () => {
    const overview: SummaryOverview = {
      toolNames: ['jafax'],
      toolStatuses: { jafax: 'failed' },
      diagnostics: [],
      conditionWarnings: [],
      health: {
        status: 'error',
        criticalCount: 0,
        errorCount: 1,
        warningCount: 0
      },
      overallStatus: {
        level: 'error',
        title: 'Proceed with Caution',
        message: 'Analysis can start, but some required outputs are missing for: jafax. See diagnostics below.',
        affectedTools: ['jafax']
      }
    };

    const output = renderHtmlSummary(overview, [makeParsedTool('jafax', '<section class="jafax-summary status-success">inner</section>')]);

    expect(output).toContain('<details class="summary-card tool-card tool-card-status-failed" open><summary class="tool-card-header"><h2>jafax</h2><span class="tool-card-header-meta"><span class="status-pill status-failed">failed</span></span></summary>');
  });

  it('renders version and elapsed chips before status when metadata is present', () => {
    const overview: SummaryOverview = {
      toolNames: ['jafax'],
      toolStatuses: { jafax: 'success' },
      diagnostics: [],
      conditionWarnings: [],
      health: {
        status: 'info',
        criticalCount: 0,
        errorCount: 0,
        warningCount: 0
      },
      overallStatus: DEFAULT_OK_STATUS
    };

    const parsedTools: ParsedToolSummary[] = [
      {
        tool: 'jafax',
        metadata: { 'html-template': 'inline', version: '1.2.5', runningTime: '0.7s', finishedAt: '09.04.2026 17:40' },
        htmlTemplateMode: 'inline',
        htmlTemplateContent: '<div>jafax</div>',
        htmlTemplateAvailable: true,
        markdownContent: '# jafax'
      }
    ];

    const output = renderHtmlSummary(overview, parsedTools);

    expect(output).toContain('<span class="overview-item-meta"><span class="meta-pill">v1.2.5</span><span class="meta-pill">Elapsed: 0.7s</span><span class="meta-pill">Finished: 09.04.2026 17:40</span><span class="status-pill status-success">success</span></span>');
    expect(output).toContain('<span class="tool-card-header-meta"><span class="meta-pill">v1.2.5</span><span class="meta-pill">Elapsed: 0.7s</span><span class="meta-pill">Finished: 09.04.2026 17:40</span><span class="status-pill status-success">success</span></span>');
  });
});
