import { readTextFile } from '../../src/io/read-files';
import { resolveToolOrder } from '../../src/summary/resolve-tool-order';

jest.mock('../../src/io/read-files', () => ({
  readTextFile: jest.fn(),
  writeTextFile: jest.fn(),
  fileExists: jest.fn()
}));

const readTextFileMock = jest.mocked(readTextFile);

describe('resolveToolOrder', () => {
  beforeEach(() => {
    readTextFileMock.mockReset();
  });

  it('returns default order when no override file is provided', async () => {
    const result = await resolveToolOrder(undefined);

    expect(result).toEqual({
      categoryOrder: {
        'Git History': 10,
        'Technology Breakdown': 20,
        'Structural Relationship': 30
      },
      toolOrder: {}
    });
  });

  it('merges override file with defaults', async () => {
    readTextFileMock.mockResolvedValue(JSON.stringify({
      categoryOrder: { 'Technology Breakdown': 5, 'Git History': 10 },
      toolOrder: { insider: 5, jafax: 12, lizard: 55 }
    }));

    const result = await resolveToolOrder('/in/tool-order.json');

    expect(result).toEqual({
      categoryOrder: {
        'Git History': 10,
        'Technology Breakdown': 5,
        'Structural Relationship': 30
      },
      toolOrder: {
        insider: 5,
        jafax: 12,
        lizard: 55
      }
    });
  });

  it('throws on invalid root content', async () => {
    readTextFileMock.mockResolvedValue('[]');

    await expect(resolveToolOrder('/in/tool-order.json')).rejects.toThrow(
      'Invalid tool order file content: expected JSON object'
    );
  });

  it('throws on invalid categoryOrder type', async () => {
    readTextFileMock.mockResolvedValue(JSON.stringify({ categoryOrder: ['Git History'] }));

    await expect(resolveToolOrder('/in/tool-order.json')).rejects.toThrow(
      "Invalid tool order file content: 'categoryOrder' must be an object"
    );
  });

  it('throws on non-numeric tool order value', async () => {
    readTextFileMock.mockResolvedValue(JSON.stringify({
      toolOrder: { jafax: 'first' }
    }));

    await expect(resolveToolOrder('/in/tool-order.json')).rejects.toThrow(
      "Invalid tool order file content: 'toolOrder.jafax' must be numeric"
    );
  });
});
