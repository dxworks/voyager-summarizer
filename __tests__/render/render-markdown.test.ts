import { renderMarkdownSummary } from '../../src/render/render-markdown';
import { ParsedToolSummary } from '../../src/parsers/parse-tool-summary-md';
import { SummaryOverview } from '../../src/summary/build-overview';

function makeParsedTool(tool: string, markdownContent: string, htmlTemplateContent = `<div>${tool}</div>`): ParsedToolSummary {
  return {
    tool,
    metadata: { 'html-template': 'inline' },
    htmlTemplateMode: 'inline',
    htmlTemplateContent,
    markdownContent
  };
}

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
      }
    };
    const parsedTools: ParsedToolSummary[] = [makeParsedTool('insider', '# Insider MD')];

    const output = renderMarkdownSummary(overview, parsedTools);

    expect(output).toContain('# Voyager Summary');
    expect(output).toContain('## Overview');
    expect(output).toContain('- insider (success)');
    expect(output).toContain('- jafax (failed)');
    expect(output).toContain('## Diagnostics');
  });

  it('renders tool sections in received order with markdown content', () => {
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
      }
    };
    const parsedTools: ParsedToolSummary[] = [
      makeParsedTool('insider', '## insider markdown'),
      makeParsedTool('lizard', '## lizard markdown')
    ];

    const output = renderMarkdownSummary(overview, parsedTools);

    const insiderPos = output.indexOf('## insider\n## insider markdown');
    const lizardPos = output.indexOf('## lizard\n## lizard markdown');

    expect(insiderPos).toBeGreaterThan(-1);
    expect(lizardPos).toBeGreaterThan(-1);
    expect(insiderPos).toBeLessThan(lizardPos);
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
      }
    };

    const output = renderMarkdownSummary(overview, []);

    expect(output).toContain('## Overview');
    expect(output).toContain('- insider (unknown)');
    expect(output).not.toContain('## insider\n');
  });
});
