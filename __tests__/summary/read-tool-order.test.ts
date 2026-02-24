import { readTextFile } from '../../src/io/read-files';
import { readToolOrder } from '../../src/summary/read-tool-order';

jest.mock('../../src/io/read-files', () => ({
  readTextFile: jest.fn(),
  writeTextFile: jest.fn(),
  fileExists: jest.fn()
}));

const readTextFileMock = jest.mocked(readTextFile);

describe('readToolOrder', () => {
  beforeEach(() => {
    readTextFileMock.mockReset();
  });

  it('parses and sorts tool priorities ascending', async () => {
    readTextFileMock.mockResolvedValue(['jafax: 20', 'insider: 10', 'lizard: 30'].join('\n'));

    const result = await readToolOrder('/in/tool-order.txt');

    expect(result).toEqual(['insider', 'jafax', 'lizard']);
  });

  it('ignores blank and comment lines', async () => {
    readTextFileMock.mockResolvedValue(['# primary', '', 'insider: 10', '', '# optional', 'jafax: 20'].join('\n'));

    const result = await readToolOrder('/in/tool-order.txt');

    expect(result).toEqual(['insider', 'jafax']);
  });

  it('keeps file order when priorities are equal', async () => {
    readTextFileMock.mockResolvedValue(['insider: 10', 'jafax: 10', 'lizard: 10'].join('\n'));

    const result = await readToolOrder('/in/tool-order.txt');

    expect(result).toEqual(['insider', 'jafax', 'lizard']);
  });

  it('throws on invalid priority value', async () => {
    readTextFileMock.mockResolvedValue('insider: high');

    await expect(readToolOrder('/in/tool-order.txt')).rejects.toThrow(
      'Invalid tool order line 1: priority must be numeric'
    );
  });

  it('throws on duplicate tool id', async () => {
    readTextFileMock.mockResolvedValue(['insider: 10', 'insider: 20'].join('\n'));

    await expect(readToolOrder('/in/tool-order.txt')).rejects.toThrow(
      "Invalid tool order file: duplicate tool id 'insider'"
    );
  });
});
