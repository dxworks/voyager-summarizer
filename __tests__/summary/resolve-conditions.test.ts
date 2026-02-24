import { readTextFile } from '../../src/io/read-files';
import { resolveConditions } from '../../src/summary/resolve-conditions';

jest.mock('../../src/io/read-files', () => ({
  readTextFile: jest.fn()
}));

const readTextFileMock = jest.mocked(readTextFile);

describe('resolveConditions', () => {
  beforeEach(() => {
    readTextFileMock.mockReset();
  });

  it('returns built-in rules when no file or overrides are provided', async () => {
    const result = await resolveConditions(undefined, []);

    expect(result.rules.length).toBeGreaterThan(0);
    expect(result.rules.some((rule) => rule.id === 'jafax-failed-significant-java')).toBe(true);
  });

  it('applies file rules and then cli overrides by rule id', async () => {
    readTextFileMock.mockResolvedValue(
      JSON.stringify({
        rules: [
          {
            id: 'custom-jafax',
            severity: 'error',
            message: 'custom message',
            when: "${jafaxStatus} == 'failed' && ${javaFiles} > 100",
            variables: {
              jafaxStatus: 'tool.jafax.status',
              javaFiles: 'tool.insider.languages.java.files'
            },
            triggeredBy: ['jafax', 'insider']
          }
        ]
      })
    );

    const result = await resolveConditions('/tmp/conditions.json', [
      ['rules.custom-jafax.when', "${jafaxStatus} == 'failed' && ${javaFiles} > 120"],
      ['rules.custom-jafax.severity', 'critical']
    ]);

    const customRule = result.rules.find((rule) => rule.id === 'custom-jafax');

    expect(customRule).toBeDefined();
    expect(customRule?.when).toBe("${jafaxStatus} == 'failed' && ${javaFiles} > 120");
    expect(customRule?.severity).toBe('critical');
  });

  it('throws when conditions file uses deprecated onMissing', async () => {
    readTextFileMock.mockResolvedValue(
      JSON.stringify({
        rules: [
          {
            id: 'custom-jafax',
            when: "${jafaxStatus} == 'failed'",
            onMissing: 'skip'
          }
        ]
      })
    );

    await expect(resolveConditions('/tmp/conditions.json', [])).rejects.toThrow(
      "Invalid rule definition 'custom-jafax': 'onMissing' is no longer supported"
    );
  });
});
