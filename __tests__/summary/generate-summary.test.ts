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
      'status: success',
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

    expect(writeTextFileMock).toHaveBeenCalledWith(
      'summary.html',
      expect.stringContaining('<h2>Overview</h2>\n    <ul><li>insider (success)</li></ul>')
    );
    expect(writeTextFileMock).toHaveBeenCalledWith(
      'summary.md',
      expect.stringContaining('# Voyager Summary\n\n## Overview\n- insider (success)')
    );
    expect(result.parsedToolsCount).toBe(1);
    expect(result.parseWarnings).toEqual(
      expect.arrayContaining([expect.stringContaining("Skipped rule 'lizard-failed' due to missing metadata values")])
    );
    expect(result.writtenHtmlPath).toBe('summary.html');
    expect(result.writtenMdPath).toBe('summary.md');
  });

  it('uses explicit output paths when provided', async () => {
    readTextFileMock.mockImplementation(async (filePath: string) => {
      if (filePath === '/in/jafax.md') {
        return ['---', 'tool: jafax', 'html-template: reference', 'status: success', '---', '## jafax markdown'].join('\n');
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

    expect(writeTextFileMock).toHaveBeenCalledWith(
      '/out/custom-summary.html',
      expect.stringContaining('<h2>Overview</h2>\n    <ul><li>jafax (success)</li></ul>')
    );
    expect(writeTextFileMock).toHaveBeenCalledWith(
      '/out/custom-summary.md',
      expect.stringContaining('## Overview\n- jafax (success)')
    );
    expect(result.writtenHtmlPath).toBe('/out/custom-summary.html');
    expect(result.writtenMdPath).toBe('/out/custom-summary.md');
  });

  it('returns parsedToolsCount for multiple parsed summaries', async () => {
    readTextFileMock.mockImplementation(async (filePath: string) => {
      if (filePath === '/in/insider.md') {
        return ['---', 'tool: insider', 'html-template: inline', 'status: success', '---', '<div>insider</div>', '---', '# insider'].join(
          '\n'
        );
      }

      if (filePath === '/in/lizard.md') {
        return ['---', 'tool: lizard', 'html-template: inline', 'status: success', '---', '<div>lizard</div>', '---', '# lizard'].join('\n');
      }

      throw new Error(`Unexpected file path: ${filePath}`);
    });

    const result = await generateSummary({
      toolMd: [
        ['lizard', '/in/lizard.md'],
        ['insider', '/in/insider.md']
      ],
      toolHtml: [],
      conditions: []
    });

    expect(result.parsedToolsCount).toBe(2);
    expect(writeTextFileMock).toHaveBeenCalledWith(
      'summary.html',
      expect.stringContaining('<h2>Overview</h2>\n    <ul><li>insider (success)</li><li>lizard (success)</li></ul>')
    );
    expect(writeTextFileMock).toHaveBeenCalledWith(
      'summary.md',
      expect.stringContaining('## Overview\n- insider (success)\n- lizard (success)')
    );
  });

  it('applies external tool order and appends tools missing from file order', async () => {
    readTextFileMock.mockImplementation(async (filePath: string) => {
      if (filePath === '/in/tool-order.txt') {
        return ['jafax: 10', 'insider: 20'].join('\n');
      }

      if (filePath === '/in/jafax.md') {
        return ['---', 'tool: jafax', 'html-template: inline', 'status: success', '---', '<div>jafax</div>', '---', '# jafax'].join(
          '\n'
        );
      }

      if (filePath === '/in/insider.md') {
        return ['---', 'tool: insider', 'html-template: inline', 'status: success', '---', '<div>insider</div>', '---', '# insider'].join(
          '\n'
        );
      }

      if (filePath === '/in/lizard.md') {
        return ['---', 'tool: lizard', 'html-template: inline', 'status: success', '---', '<div>lizard</div>', '---', '# lizard'].join(
          '\n'
        );
      }

      throw new Error(`Unexpected file path: ${filePath}`);
    });

    const result = await generateSummary({
      toolMd: [
        ['lizard', '/in/lizard.md'],
        ['insider', '/in/insider.md'],
        ['jafax', '/in/jafax.md']
      ],
      toolHtml: [],
      toolOrderFile: '/in/tool-order.txt',
      conditions: []
    });

    expect(writeTextFileMock).toHaveBeenCalledWith(
      'summary.md',
      expect.stringContaining('## Overview\n- jafax (success)\n- insider (success)\n- lizard (success)')
    );
    expect(result.parseWarnings).toEqual(
      expect.arrayContaining([expect.stringContaining('Appended tools not present in ordering list: lizard')])
    );
  });

  it('appends tools missing from default order', async () => {
    readTextFileMock.mockImplementation(async (filePath: string) => {
      if (filePath === '/in/insider.md') {
        return ['---', 'tool: insider', 'html-template: inline', 'status: success', '---', '<div>insider</div>', '---', '# insider'].join(
          '\n'
        );
      }

      if (filePath === '/in/new-tool.md') {
        return ['---', 'tool: new-tool', 'html-template: inline', 'status: success', '---', '<div>new-tool</div>', '---', '# new-tool'].join(
          '\n'
        );
      }

      throw new Error(`Unexpected file path: ${filePath}`);
    });

    const result = await generateSummary({
      toolMd: [
        ['new-tool', '/in/new-tool.md'],
        ['insider', '/in/insider.md']
      ],
      toolHtml: [],
      conditions: []
    });

    expect(writeTextFileMock).toHaveBeenCalledWith(
      'summary.md',
      expect.stringContaining('## Overview\n- insider (success)\n- new-tool (success)')
    );
    expect(result.parseWarnings).toEqual(
      expect.arrayContaining([expect.stringContaining('Appended tools not present in ordering list: new-tool')])
    );
  });

  it('continues when a tool summary cannot be parsed', async () => {
    readTextFileMock.mockImplementation(async (filePath: string) => {
      if (filePath === '/in/insider.md') {
        return ['---', 'tool: insider', 'html-template: inline', 'status: success', '---', '<div>insider</div>', '---', '# insider'].join(
          '\n'
        );
      }

      if (filePath === '/in/bad.md') {
        return 'invalid-content';
      }

      throw new Error(`Unexpected file path: ${filePath}`);
    });

    const result = await generateSummary({
      toolMd: [
        ['insider', '/in/insider.md'],
        ['jafax', '/in/bad.md']
      ],
      toolHtml: [],
      conditions: []
    });

    expect(result.parsedToolsCount).toBe(1);
    expect(result.parseWarnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Unable to parse jafax summary from /in/bad.md'),
        expect.stringContaining("Skipped rule 'lizard-failed' due to missing metadata values")
      ])
    );
  });

  it('skips html section for reference mode when html template is missing', async () => {
    readTextFileMock.mockImplementation(async (filePath: string) => {
      if (filePath === '/in/jafax.md') {
        return ['---', 'tool: jafax', 'html-template: inline', 'status: success', '---', '<div>jafax</div>', '---', '# jafax'].join(
          '\n'
        );
      }

      if (filePath === '/in/lizard.md') {
        return ['---', 'tool: lizard', 'html-template: reference', 'status: success', '---', '# lizard'].join('\n');
      }

      if (filePath === '/in/insider.md') {
        return ['---', 'tool: insider', 'html-template: inline', 'status: success', '---', '<div>insider</div>', '---', '# insider'].join(
          '\n'
        );
      }

      throw new Error(`Unexpected file path: ${filePath}`);
    });

    const result = await generateSummary({
      toolMd: [
        ['jafax', '/in/jafax.md'],
        ['lizard', '/in/lizard.md'],
        ['insider', '/in/insider.md']
      ],
      toolHtml: [['lizard', 'null']],
      conditions: []
    });

    expect(writeTextFileMock).toHaveBeenCalledWith(
      'summary.html',
      expect.stringContaining('<section><h2>jafax</h2><div>jafax</div></section>')
    );
    expect(writeTextFileMock).toHaveBeenCalledWith(
      'summary.html',
      expect.stringContaining('<section><h2>insider</h2><div>insider</div></section>')
    );
    expect(writeTextFileMock).toHaveBeenCalledWith('summary.html', expect.not.stringContaining('<section><h2>lizard</h2>'));
    expect(result.parseWarnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Missing HTML template reference for lizard; skipping this tool section from the HTML report')
      ])
    );
  });
});
