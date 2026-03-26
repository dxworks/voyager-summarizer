import { readTextFile } from '../../src/io/read-files';
import { normalizeToolKey, readMissionRunOverview } from '../../src/summary/read-mission-run-overview';

jest.mock('../../src/io/read-files', () => ({
  readTextFile: jest.fn(),
  writeTextFile: jest.fn(),
  fileExists: jest.fn()
}));

const readTextFileMock = jest.mocked(readTextFile);

describe('readMissionRunOverview', () => {
  beforeEach(() => {
    readTextFileMock.mockReset();
  });

  it('reads executed tools from mission-report.log', async () => {
    readTextFileMock.mockResolvedValue([
      'before',
      '------------------- Mission Summary -------------------',
      '-------- inspector-git --------',
      'extract ... SUCCESS [ 0.1 s ]',
      '-------- JaFaX --------',
      'extract ... SUCCESS [ 0.1 s ]',
      '_______________________container_______________________'
    ].join('\n'));

    const result = await readMissionRunOverview(['inspector-git', 'jafax', 'honeydew'], '/tmp/mission-report.log');

    expect(result.hasOverview).toBe(true);
    expect(result.executedTools).toEqual(new Set([normalizeToolKey('inspector-git'), normalizeToolKey('jafax')]));
    expect(result.warnings).toEqual([]);
  });

  it('returns no overview when log is not provided', async () => {
    const result = await readMissionRunOverview(['inspector-git', 'jafax']);

    expect(result.hasOverview).toBe(false);
    expect(result.executedTools).toEqual(new Set());
    expect(result.warnings).toEqual([]);
  });

  it('returns warning and no overview when log cannot be read', async () => {
    readTextFileMock.mockRejectedValueOnce(new Error('not found'));

    const result = await readMissionRunOverview(['inspector-git', 'jafax'], '/tmp/mission-report.log');

    expect(result.hasOverview).toBe(false);
    expect(result.executedTools).toEqual(new Set());
    expect(result.warnings).toEqual([
      'Unable to read mission report log from /tmp/mission-report.log: not found'
    ]);
  });
});
