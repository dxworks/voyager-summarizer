import { renderHtmlSummary } from '../../src/render/render-html';
import { ParsedToolSummary } from '../../src/parsers/parse-tool-summary-md';
import { SummaryOverview } from '../../src/summary/build-overview';

function makeParsedTool(tool: string, htmlTemplateContent: string, markdownContent = `# ${tool}`): ParsedToolSummary {
  return {
    tool,
    metadata: { 'html-template': 'inline' },
    htmlTemplateMode: 'inline',
    htmlTemplateContent,
    markdownContent
  };
}

describe('renderHtmlSummary', () => {
  it('renders document shell and overview list', () => {
    const overview: SummaryOverview = { toolNames: ['insider', 'jafax'] };
    const parsedTools: ParsedToolSummary[] = [makeParsedTool('insider', '<article>insider-template</article>')];

    const output = renderHtmlSummary(overview, parsedTools);

    expect(output).toContain('<!doctype html>');
    expect(output).toContain('<html lang="en">');
    expect(output).toContain('<h2>Overview</h2>');
    expect(output).toContain('<ul><li>insider</li><li>jafax</li></ul>');
  });

  it('renders tool sections in received order with html content', () => {
    const overview: SummaryOverview = { toolNames: ['insider', 'lizard'] };
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
    const overview: SummaryOverview = { toolNames: ['insider'] };

    const output = renderHtmlSummary(overview, []);

    expect(output).toContain('<ul><li>insider</li></ul>');
    expect(output).not.toContain('<section><h2>insider</h2>');
  });
});
