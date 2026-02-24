import { ParsedToolSummary } from '../../src/parsers/parse-tool-summary-md';
import { evaluateDiagnostics } from '../../src/summary/evaluate-diagnostics';
import { ResolvedConditions } from '../../src/summary/summary-types';

const DEFAULT_CONDITIONS: ResolvedConditions = {
  rules: [
    {
      id: 'inspector-git-failed',
      severity: 'critical',
      message: 'inspector-git failed',
      when: "${status} == 'failed'",
      variables: {
        status: 'tool.inspector-git.status'
      },
      triggeredBy: ['inspector-git']
    },
    {
      id: 'jafax-failed-significant-java',
      severity: 'error',
      message: 'jafax failed and Java appears significant in the scanned codebase',
      when: "${jafaxStatus} == 'failed' && ${javaFiles} > 100",
      variables: {
        jafaxStatus: 'tool.jafax.status',
        javaFiles: 'tool.insider.languages.java.files'
      },
      triggeredBy: ['jafax', 'insider']
    }
  ]
};

function makeParsedTool(tool: string, metadata: Record<string, string>): ParsedToolSummary {
  return {
    tool,
    metadata: {
      'html-template': 'inline',
      ...metadata
    },
    htmlTemplateMode: 'inline',
    htmlTemplateContent: `<div>${tool}</div>`,
    markdownContent: `# ${tool}`
  };
}

describe('evaluateDiagnostics', () => {
  it('returns critical finding when inspector-git failed', () => {
    const result = evaluateDiagnostics([makeParsedTool('inspector-git', { status: 'failed' })], DEFAULT_CONDITIONS);

    expect(result.findings.some((item) => item.code === 'inspector-git-failed' && item.severity === 'critical')).toBe(true);
  });

  it('does not trigger jafax relevance error when Java files are below threshold', () => {
    const result = evaluateDiagnostics(
      [
        makeParsedTool('jafax', { status: 'failed' }),
        makeParsedTool('insider', {
          status: 'success',
          'languages.java.files': '99'
        })
      ],
      DEFAULT_CONDITIONS
    );

    expect(result.findings.some((item) => item.code === 'jafax-failed-significant-java')).toBe(false);
  });

  it('triggers jafax relevance error when Java files are above threshold', () => {
    const result = evaluateDiagnostics(
      [
        makeParsedTool('jafax', { status: 'failed' }),
        makeParsedTool('insider', {
          status: 'success',
          'languages.java.files': '120'
        })
      ],
      DEFAULT_CONDITIONS
    );

    expect(result.findings.some((item) => item.code === 'jafax-failed-significant-java')).toBe(true);
  });

  it('skips rules with missing metadata and returns warning', () => {
    const conditions: ResolvedConditions = {
      rules: [
        {
          id: 'missing-data-rule',
          severity: 'warning',
          message: 'Missing data rule',
          when: "${javaFiles} > 100",
          variables: {
            javaFiles: 'tool.insider.languages.java.files'
          },
          triggeredBy: ['insider']
        }
      ]
    };

    const result = evaluateDiagnostics([makeParsedTool('jafax', { status: 'failed' })], conditions);

    expect(result.findings).toEqual([]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("Skipped rule 'missing-data-rule'");
  });
});
