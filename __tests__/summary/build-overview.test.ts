import { buildOverview } from '../../src/summary/build-overview';
import { ParsedToolSummary } from '../../src/parsers/parse-tool-summary-md';
import { ResolvedConditions } from '../../src/summary/summary-types';

const DEFAULT_CONDITIONS: ResolvedConditions = {
  rules: [
    {
      id: 'lizard-failed',
      severity: 'error',
      message: 'lizard failed',
      when: "${status} == 'failed'",
      variables: {
        status: 'tool.lizard.status'
      },
      triggeredBy: ['lizard']
    }
  ]
};

describe('buildOverview', () => {
  it('returns tool names in received order', () => {
    const parsedTools: ParsedToolSummary[] = [
      {
        tool: 'insider',
        metadata: { 'html-template': 'inline', status: 'success' },
        htmlTemplateMode: 'inline',
        htmlTemplateContent: '<div>insider</div>',
        markdownContent: '# insider'
      },
      {
        tool: 'lizard',
        metadata: { 'html-template': 'inline', status: 'failed' },
        htmlTemplateMode: 'inline',
        htmlTemplateContent: '<div>lizard</div>',
        markdownContent: '# lizard'
      }
    ];

    const overview = buildOverview(parsedTools, DEFAULT_CONDITIONS);

    expect(overview.toolNames).toEqual(['insider', 'lizard']);
    expect(overview.toolStatuses).toEqual({ insider: 'success', lizard: 'failed' });
    expect(overview.health.status).toBe('error');
    expect(overview.conditionWarnings).toEqual([]);
  });

  it('returns an empty overview for no parsed tools', () => {
    const overview = buildOverview([], DEFAULT_CONDITIONS);

    expect(overview.toolNames).toEqual([]);
    expect(overview.toolStatuses).toEqual({});
    expect(overview.health.status).toBe('info');
    expect(overview.conditionWarnings).toEqual([
      "Skipped rule 'lizard-failed' due to missing metadata values: status -> tool.lizard.status"
    ]);
  });
});
