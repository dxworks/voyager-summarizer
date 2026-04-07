import { readTextFile } from '../../src/io/read-files';
import { normalizeToolKey, readMissionLockOverview } from '../../src/summary/read-mission-lock-overview';

jest.mock('../../src/io/read-files', () => ({
  readTextFile: jest.fn(),
  writeTextFile: jest.fn(),
  fileExists: jest.fn()
}));

const readTextFileMock = jest.mocked(readTextFile);

describe('readMissionLockOverview', () => {
  beforeEach(() => {
    readTextFileMock.mockReset();
  });

  it('reads executed tools and metadata from voyager.lock.yml', async () => {
    readTextFileMock.mockResolvedValue([
      'mission: test-mission',
      'runningTime: 1.2s',
      'tools:',
      '  - id: inspector-git',
      '    name: Inspector Git',
      '    version: 1.0.0',
      '    runningTime: 0.8s',
      '  - id: jafax',
      '    name: JaFaX',
      '    version: 2.3.4',
      '    runningTime: 0.4s'
    ].join('\n'));

    const result = await readMissionLockOverview(['inspector-git', 'jafax', 'honeydew'], '/tmp/voyager.lock.yml');

    expect(result.hasOverview).toBe(true);
    expect(result.executedTools).toEqual(new Set([
      normalizeToolKey('inspector-git'),
      normalizeToolKey('jafax')
    ]));
    expect(result.toolDetailsByKey.get(normalizeToolKey('inspector-git'))).toEqual({
      version: '1.0.0',
      runningTime: '0.8s'
    });
    expect(result.toolDetailsByKey.get(normalizeToolKey('jafax'))).toEqual({
      version: '2.3.4',
      runningTime: '0.4s'
    });
    expect(result.warnings).toEqual([]);
  });

  it('returns no overview when lock path is not provided', async () => {
    const result = await readMissionLockOverview(['inspector-git', 'jafax']);

    expect(result.hasOverview).toBe(false);
    expect(result.executedTools).toEqual(new Set());
    expect(result.toolDetailsByKey).toEqual(new Map());
    expect(result.warnings).toEqual([]);
  });

  it('returns warning and no overview when lock file cannot be read', async () => {
    readTextFileMock.mockRejectedValueOnce(new Error('not found'));

    const result = await readMissionLockOverview(['inspector-git', 'jafax'], '/tmp/voyager.lock.yml');

    expect(result.hasOverview).toBe(false);
    expect(result.executedTools).toEqual(new Set());
    expect(result.toolDetailsByKey).toEqual(new Map());
    expect(result.warnings).toEqual([
      'Unable to read mission lock file from /tmp/voyager.lock.yml: not found'
    ]);
  });

  it('matches tool by name when expected key is not id', async () => {
    readTextFileMock.mockResolvedValue([
      'tools:',
      '  - id: tool-id',
      '    name: JaFaX',
      '    version: 2.3.4',
      '    runningTime: 0.4s'
    ].join('\n'));

    const result = await readMissionLockOverview(['jafax'], '/tmp/voyager.lock.yml');

    expect(result.hasOverview).toBe(true);
    expect(result.executedTools).toEqual(new Set([normalizeToolKey('jafax')]));
    expect(result.toolDetailsByKey.get(normalizeToolKey('jafax'))).toEqual({
      version: '2.3.4',
      runningTime: '0.4s'
    });
  });
});
