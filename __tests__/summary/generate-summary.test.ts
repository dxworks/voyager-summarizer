import { generateSummary } from '../../src/summary/generate-summary';
import { readTextFile, writeTextFile } from '../../src/io/read-files';

jest.mock('../../src/io/read-files', () => ({
  readTextFile: jest.fn(),
  writeTextFile: jest.fn(),
  fileExists: jest.fn()
}));

const readTextFileMock = jest.mocked(readTextFile);
const writeTextFileMock = jest.mocked(writeTextFile);

describe('generateSummary', () => {
  beforeEach(() => {
    readTextFileMock.mockReset();
    writeTextFileMock.mockReset();
    writeTextFileMock.mockResolvedValue(undefined);
  });

  it('uses default output paths when none are provided', async () => {
    readTextFileMock.mockResolvedValue([
      '---',
      'tool: insider',
      'html-template: inline',
      '---',
      '<div>insider-template</div>',
      '---',
      '# insider markdown'
    ].join('\n'));

    const result = await generateSummary({
      toolMd: [['insider', '/in/insider.md']],
      toolHtml: [],
      conditions: []
    });

    expect(writeTextFileMock).toHaveBeenCalledWith('summary.html', '<div>insider-template</div>');
    expect(writeTextFileMock).toHaveBeenCalledWith('summary.md', '# insider markdown');
    expect(result.parsedToolsCount).toBe(1);
    expect(result.writtenHtmlPath).toBe('summary.html');
    expect(result.writtenMdPath).toBe('summary.md');
  });

  it('uses explicit output paths when provided', async () => {
    readTextFileMock.mockImplementation(async (filePath: string) => {
      if (filePath === '/in/jafax.md') {
        return ['---', 'tool: jafax', 'html-template: reference', '---', '## jafax markdown'].join('\n');
      }

      if (filePath === '/in/jafax.html') {
        return '<article>jafax-template</article>';
      }

      throw new Error(`Unexpected file path: ${filePath}`);
    });

    const result = await generateSummary({
      toolMd: [['jafax', '/in/jafax.md']],
      toolHtml: [['jafax', '/in/jafax.html']],
      conditions: [],
      outHtml: '/out/custom-summary.html',
      outMd: '/out/custom-summary.md'
    });

    expect(writeTextFileMock).toHaveBeenCalledWith('/out/custom-summary.html', '<article>jafax-template</article>');
    expect(writeTextFileMock).toHaveBeenCalledWith('/out/custom-summary.md', '## jafax markdown');
    expect(result.writtenHtmlPath).toBe('/out/custom-summary.html');
    expect(result.writtenMdPath).toBe('/out/custom-summary.md');
  });

  it('returns parsedToolsCount for multiple parsed summaries', async () => {
    readTextFileMock.mockImplementation(async (filePath: string) => {
      if (filePath === '/in/insider.md') {
        return ['---', 'tool: insider', 'html-template: inline', '---', '<div>insider</div>', '---', '# insider'].join(
          '\n'
        );
      }

      if (filePath === '/in/lizard.md') {
        return ['---', 'tool: lizard', 'html-template: inline', '---', '<div>lizard</div>', '---', '# lizard'].join('\n');
      }

      throw new Error(`Unexpected file path: ${filePath}`);
    });

    const result = await generateSummary({
      toolMd: [
        ['insider', '/in/insider.md'],
        ['lizard', '/in/lizard.md']
      ],
      toolHtml: [],
      conditions: []
    });

    expect(result.parsedToolsCount).toBe(2);
    expect(writeTextFileMock).toHaveBeenCalledWith('summary.html', '<div>insider</div>\n<div>lizard</div>');
    expect(writeTextFileMock).toHaveBeenCalledWith('summary.md', '# insider\n\n# lizard');
  });
});
