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
        htmlTemplateAvailable: true,
        markdownContent: '# insider'
      },
      {
        tool: 'lizard',
        metadata: { 'html-template': 'inline', status: 'failed' },
        htmlTemplateMode: 'inline',
        htmlTemplateContent: '<div>lizard</div>',
        htmlTemplateAvailable: true,
        markdownContent: '# lizard'
      }
    ];

    const overview = buildOverview(parsedTools, DEFAULT_CONDITIONS);

    expect(overview.toolNames).toEqual(['insider', 'lizard']);
    expect(overview.toolStatuses).toEqual({ insider: 'success', lizard: 'failed' });
    expect(overview.health.status).toBe('error');
    expect(overview.conditionWarnings).toEqual([]);
    expect(overview.overallStatus).toEqual({
      level: 'error',
      title: 'Proceed with Caution',
      message: 'Analysis can start, but some required outputs are missing for: lizard. See diagnostics below.',
      affectedTools: ['lizard']
    });
  });

  it('returns an empty overview for no parsed tools', () => {
    const overview = buildOverview([], DEFAULT_CONDITIONS);

    expect(overview.toolNames).toEqual([]);
    expect(overview.toolStatuses).toEqual({});
    expect(overview.health.status).toBe('info');
    expect(overview.conditionWarnings).toEqual([
      "Skipped rule 'lizard-failed' due to missing metadata values: status -> tool.lizard.status"
    ]);
    expect(overview.overallStatus).toEqual({
      level: 'ok',
      title: 'Ready for Analysis',
      message: 'All required data was extracted successfully. You can proceed.',
      affectedTools: []
    });
  });

  it('overrides tool status from triggered rule setStatus', () => {
    const parsedTools: ParsedToolSummary[] = [
      {
        tool: 'jafax',
        metadata: { 'html-template': 'inline', status: 'success' },
        htmlTemplateMode: 'inline',
        htmlTemplateContent: '<div>jafax</div>',
        htmlTemplateAvailable: true,
        markdownContent: '# jafax'
      }
    ];

    const conditions: ResolvedConditions = {
      rules: [
        {
          id: 'force-jafax-failed',
          severity: 'error',
          message: 'Force jafax as failed',
          when: "${status} == 'success'",
          variables: { status: 'tool.jafax.status' },
          triggeredBy: ['jafax'],
          setStatus: 'failed'
        }
      ]
    };

    const overview = buildOverview(parsedTools, conditions);

    expect(overview.toolStatuses).toEqual({ jafax: 'failed' });
  });

  it('keeps missing status when provided by tool metadata', () => {
    const parsedTools: ParsedToolSummary[] = [
      {
        tool: 'honeydew',
        metadata: { 'html-template': 'inline', status: 'missing' },
        htmlTemplateMode: 'inline',
        htmlTemplateContent: '<div>honeydew</div>',
        htmlTemplateAvailable: true,
        markdownContent: '# honeydew'
      }
    ];

    const overview = buildOverview(parsedTools, DEFAULT_CONDITIONS);

    expect(overview.toolStatuses).toEqual({ honeydew: 'missing' });
    expect(overview.overallStatus.level).toBe('error');
  });

  it('returns critical overall status when critical diagnostics exist', () => {
    const parsedTools: ParsedToolSummary[] = [
      {
        tool: 'inspector-git',
        metadata: { 'html-template': 'inline', status: 'failed' },
        htmlTemplateMode: 'inline',
        htmlTemplateContent: '<div>inspector-git</div>',
        htmlTemplateAvailable: true,
        markdownContent: '# inspector-git'
      }
    ];
    const conditions: ResolvedConditions = {
      rules: [
        {
          id: 'ig-critical',
          severity: 'critical',
          message: 'inspector-git failed',
          when: "${status} == 'failed'",
          variables: { status: 'tool.inspector-git.status' },
          triggeredBy: ['inspector-git']
        }
      ]
    };

    const overview = buildOverview(parsedTools, conditions);

    expect(overview.overallStatus).toEqual({
      level: 'critical',
      title: 'Action Required',
      message: 'Critical extraction issues were detected. Rerun the mission before starting analysis.',
      affectedTools: ['inspector-git']
    });
  });

  it('returns warning overall status when warning diagnostics exist', () => {
    const parsedTools: ParsedToolSummary[] = [
      {
        tool: 'honeydew',
        metadata: { 'html-template': 'inline', status: 'partial' },
        htmlTemplateMode: 'inline',
        htmlTemplateContent: '<div>honeydew</div>',
        htmlTemplateAvailable: true,
        markdownContent: '# honeydew'
      }
    ];
    const conditions: ResolvedConditions = {
      rules: [
        {
          id: 'honeydew-partial',
          severity: 'warning',
          message: 'honeydew partial',
          when: "${status} == 'partial'",
          variables: { status: 'tool.honeydew.status' },
          triggeredBy: ['honeydew']
        }
      ]
    };

    const overview = buildOverview(parsedTools, conditions);

    expect(overview.overallStatus).toEqual({
      level: 'warning',
      title: 'Partial Coverage',
      message: 'Extraction completed, but some optional data may be incomplete.',
      affectedTools: ['honeydew']
    });
  });
});
