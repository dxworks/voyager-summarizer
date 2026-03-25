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
    expect(output).toContain('<ul class="overview-list"><li class="overview-item"><span class="tool-name">insider</span><span class="status-pill status-success">success</span></li><li class="overview-item"><span class="tool-name">jafax</span><span class="status-pill status-failed">failed</span></li></ul>');
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

    const insiderPos = output.indexOf('<section class="summary-card tool-card"><h2>insider</h2><div class="tool-content"><div id="insider">insider</div></div></section>');
    const lizardPos = output.indexOf('<section class="summary-card tool-card"><h2>lizard</h2><div class="tool-content"><div id="lizard">lizard</div></div></section>');

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

    expect(output).toContain('<span class="tool-name">insider</span><span class="status-pill status-unknown">unknown</span>');
    expect(output).not.toContain('<section class="summary-card tool-card"><h2>insider</h2>');
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

    expect(output).toContain('<section class="summary-card tool-card"><h2>jafax</h2><div class="tool-content"><div id="jafax">jafax</div></div></section>');
    expect(output).toContain('<section class="summary-card tool-card"><h2>insider</h2><div class="tool-content"><div id="insider">insider</div></div></section>');
    expect(output).not.toContain('<section class="summary-card tool-card"><h2>lizard</h2>');
  });

  it('groups categorized tools in collapsible sections and appends uncategorized tools', () => {
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

    const architecturePos = output.indexOf('<details class="category-group"><summary class="category-summary"><span class="category-title">Architecture</span><span class="category-count">2 tools</span></summary>');
    const jafaxPos = output.indexOf('<section class="summary-card tool-card"><h2>jafax</h2><div class="tool-content"><div id="jafax">jafax</div></div></section>');
    expect(architecturePos).toBeGreaterThan(-1);
    expect(jafaxPos).toBeGreaterThan(-1);
    expect(architecturePos).toBeLessThan(jafaxPos);
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

    expect(output).toContain('<span class="tool-name">jafax</span><span class="status-pill status-missing">missing</span>');
  });
});
