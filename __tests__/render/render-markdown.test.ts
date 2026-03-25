import { renderMarkdownSummary } from '../../src/render/render-markdown';
import { ParsedToolSummary } from '../../src/parsers/parse-tool-summary-md';
import { SummaryOverview } from '../../src/summary/build-overview';

function makeParsedTool(
  tool: string,
  markdownContent: string,
  htmlTemplateContent = `<div>${tool}</div>`,
  category?: string
): ParsedToolSummary {
  return {
    tool,
    category,
    metadata: { 'html-template': 'inline' },
    htmlTemplateMode: 'inline',
    htmlTemplateContent,
    htmlTemplateAvailable: true,
    markdownContent
  };
}

const DEFAULT_OK_STATUS = {
  level: 'ok' as const,
  title: 'Ready for Analysis',
  message: 'All required data was extracted successfully. You can proceed.',
  affectedTools: []
};

describe('renderMarkdownSummary', () => {
  it('renders title and overview tool list', () => {
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
    const parsedTools: ParsedToolSummary[] = [makeParsedTool('insider', '# Insider MD')];

    const output = renderMarkdownSummary(overview, parsedTools);

    expect(output).toContain('# Voyager Summary');
    expect(output).toContain('## Overall Status');
    expect(output).toContain('- Proceed with Caution: Analysis can start, but some required outputs are missing for: jafax. See diagnostics below.');
    expect(output).toContain('## Overview');
    expect(output).toContain('- insider (success)');
    expect(output).toContain('- jafax (failed)');
    expect(output).toContain('## Diagnostics');
  });

  it('renders tool sections in Other category in received order with markdown content', () => {
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
      makeParsedTool('insider', '## insider markdown'),
      makeParsedTool('lizard', '## lizard markdown')
    ];

    const output = renderMarkdownSummary(overview, parsedTools);

    const insiderPos = output.indexOf('### Other\n\n#### insider\n- Consolidated status: success\n\n## insider markdown');
    const lizardPos = output.indexOf('#### lizard\n- Consolidated status: success\n\n## lizard markdown');

    expect(insiderPos).toBeGreaterThan(-1);
    expect(lizardPos).toBeGreaterThan(-1);
    expect(insiderPos).toBeLessThan(lizardPos);
  });

  it('groups tool sections by explicit category and puts missing categories in Other', () => {
    const overview: SummaryOverview = {
      toolNames: ['depminer', 'jafax'],
      toolStatuses: { depminer: 'success', jafax: 'failed' },
      diagnostics: [],
      conditionWarnings: [],
      health: {
        status: 'warning',
        criticalCount: 0,
        errorCount: 0,
        warningCount: 1
      },
      overallStatus: DEFAULT_OK_STATUS
    };
    const parsedTools: ParsedToolSummary[] = [
      makeParsedTool('depminer', 'depminer md', '<div>depminer</div>', 'Architecture'),
      makeParsedTool('jafax', 'jafax md')
    ];

    const output = renderMarkdownSummary(overview, parsedTools);

    expect(output).toContain('## Tool Summaries');
    expect(output).toContain('### Architecture');
    expect(output).toContain('#### depminer');
    expect(output).toContain('### Other');
    expect(output).toContain('#### jafax');

    const architecturePos = output.indexOf('### Architecture');
    const otherPos = output.indexOf('### Other');
    expect(architecturePos).toBeGreaterThan(-1);
    expect(otherPos).toBeGreaterThan(-1);
    expect(architecturePos).toBeLessThan(otherPos);
  });

  it('renders overview only when no parsed tools are provided', () => {
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

    const output = renderMarkdownSummary(overview, []);

    expect(output).toContain('## Overview');
    expect(output).toContain('- insider (unknown)');
    expect(output).not.toContain('## Tool Summaries');
    expect(output).not.toContain('#### insider\n');
  });
});
