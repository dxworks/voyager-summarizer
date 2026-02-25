import { renderHtmlSummary } from '../../src/render/render-html';
import { ParsedToolSummary } from '../../src/parsers/parse-tool-summary-md';
import { SummaryOverview } from '../../src/summary/build-overview';

function makeParsedTool(
  tool: string,
  htmlTemplateContent: string,
  markdownContent = `# ${tool}`,
  htmlTemplateAvailable = true
): ParsedToolSummary {
  return {
    tool,
    metadata: { 'html-template': 'inline' },
    htmlTemplateMode: 'inline',
    htmlTemplateContent,
    htmlTemplateAvailable,
    markdownContent
  };
}

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
      }
    };
    const parsedTools: ParsedToolSummary[] = [makeParsedTool('insider', '<article>insider-template</article>')];

    const output = renderHtmlSummary(overview, parsedTools);

    expect(output).toContain('<!doctype html>');
    expect(output).toContain('<html lang="en">');
    expect(output).toContain('<h2>Overview</h2>');
    expect(output).toContain('<ul><li>insider (success)</li><li>jafax (failed)</li></ul>');
    expect(output).toContain('<h2>Diagnostics</h2>');
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
      }
    };
    const parsedTools: ParsedToolSummary[] = [
      makeParsedTool('insider', '<div id="insider">insider</div>'),
      makeParsedTool('lizard', '<div id="lizard">lizard</div>')
    ];

    const output = renderHtmlSummary(overview, parsedTools);

    const insiderPos = output.indexOf('<section><h2>insider</h2><div id="insider">insider</div></section>');
    const lizardPos = output.indexOf('<section><h2>lizard</h2><div id="lizard">lizard</div></section>');

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
      }
    };

    const output = renderHtmlSummary(overview, []);

    expect(output).toContain('<ul><li>insider (unknown)</li></ul>');
    expect(output).not.toContain('<section><h2>insider</h2>');
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
      }
    };

    const parsedTools: ParsedToolSummary[] = [
      makeParsedTool('jafax', '<div id="jafax">jafax</div>'),
      makeParsedTool('lizard', '', '# lizard', false),
      makeParsedTool('insider', '<div id="insider">insider</div>')
    ];

    const output = renderHtmlSummary(overview, parsedTools);

    expect(output).toContain('<section><h2>jafax</h2><div id="jafax">jafax</div></section>');
    expect(output).toContain('<section><h2>insider</h2><div id="insider">insider</div></section>');
    expect(output).not.toContain('<section><h2>lizard</h2>');
  });
});
