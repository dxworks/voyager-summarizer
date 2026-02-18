import { buildOverview } from '../../src/summary/build-overview';
import { ParsedToolSummary } from '../../src/parsers/parse-tool-summary-md';

describe('buildOverview', () => {
  it('returns tool names in received order', () => {
    const parsedTools: ParsedToolSummary[] = [
      {
        tool: 'insider',
        metadata: { 'html-template': 'inline' },
        htmlTemplateMode: 'inline',
        htmlTemplateContent: '<div>insider</div>',
        markdownContent: '# insider'
      },
      {
        tool: 'lizard',
        metadata: { 'html-template': 'inline' },
        htmlTemplateMode: 'inline',
        htmlTemplateContent: '<div>lizard</div>',
        markdownContent: '# lizard'
      }
    ];

    const overview = buildOverview(parsedTools);

    expect(overview.toolNames).toEqual(['insider', 'lizard']);
  });

  it('returns an empty overview for no parsed tools', () => {
    const overview = buildOverview([]);

    expect(overview.toolNames).toEqual([]);
  });
});
