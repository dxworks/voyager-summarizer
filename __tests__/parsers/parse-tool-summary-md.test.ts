import { parseToolSummaryMarkdown } from '../../src/parsers/parse-tool-summary-md';

describe('parseToolSummaryMarkdown', () => {
  it('parses inline mode summary', () => {
    const content = [
      '---',
      'tool: insider',
      'title: Insider Results',
      'html-template: inline',
      'severity: medium',
      '---',
      '<section>Inline Template</section>',
      '---',
      '## Markdown Contribution',
      'Some details here.'
    ].join('\n');

    const result = parseToolSummaryMarkdown({
      tool: 'insider',
      filePath: '/tmp/insider.md',
      content
    });

    expect(result.tool).toBe('insider');
    expect(result.htmlTemplateMode).toBe('inline');
    expect(result.htmlTemplateContent).toBe('<section>Inline Template</section>');
    expect(result.markdownContent).toBe('## Markdown Contribution\nSome details here.');
    expect(result.metadata['severity']).toBe('medium');
    expect(result.metadata['title']).toBe('Insider Results');
  });

  it('parses reference mode summary', () => {
    const content = [
      '---',
      'tool: jafax',
      'html-template: reference',
      '---',
      '## Jafax Markdown',
      'Reference mode text'
    ].join('\n');

    const result = parseToolSummaryMarkdown({
      tool: 'jafax',
      filePath: '/tmp/jafax.md',
      content,
      htmlTemplateReferenceContent: '<article>External Template</article>'
    });

    expect(result.htmlTemplateMode).toBe('reference');
    expect(result.htmlTemplateContent).toBe('<article>External Template</article>');
    expect(result.markdownContent).toBe('## Jafax Markdown\nReference mode text');
  });

  it('throws when metadata section is missing', () => {
    expect(() =>
      parseToolSummaryMarkdown({
        tool: 'insider',
        filePath: '/tmp/insider.md',
        content: 'tool: insider\nhtml-template: inline'
      })
    ).toThrow('Missing metadata section in insider summary: /tmp/insider.md');
  });

  it('throws when html-template metadata key is missing', () => {
    const content = ['---', 'tool: insider', 'title: Insider', '---', '## Markdown only'].join('\n');

    expect(() =>
      parseToolSummaryMarkdown({
        tool: 'insider',
        filePath: '/tmp/insider.md',
        content
      })
    ).toThrow("Missing required metadata key 'html-template' in /tmp/insider.md");
  });

  it('throws when html-template value is invalid', () => {
    const content = ['---', 'tool: insider', 'html-template: embedded', '---', '## Markdown only'].join('\n');

    expect(() =>
      parseToolSummaryMarkdown({
        tool: 'insider',
        filePath: '/tmp/insider.md',
        content
      })
    ).toThrow(
      "Invalid html-template value 'embedded' in /tmp/insider.md. Expected 'inline' or 'reference'."
    );
  });

  it('throws when inline mode markdown section is missing', () => {
    const content = ['---', 'tool: insider', 'html-template: inline', '---', '<div>Inline html</div>'].join('\n');

    expect(() =>
      parseToolSummaryMarkdown({
        tool: 'insider',
        filePath: '/tmp/insider.md',
        content
      })
    ).toThrow('Missing markdown section for insider in /tmp/insider.md');
  });

  it('throws when reference mode markdown section is missing', () => {
    const content = ['---', 'tool: jafax', 'html-template: reference'].join('\n');

    expect(() =>
      parseToolSummaryMarkdown({
        tool: 'jafax',
        filePath: '/tmp/jafax.md',
        content,
        htmlTemplateReferenceContent: '<article>template</article>'
      })
    ).toThrow('Missing metadata section in jafax summary: /tmp/jafax.md');
  });

  it('throws when reference mode template content is missing', () => {
    const content = ['---', 'tool: jafax', 'html-template: reference', '---', '## Markdown'].join('\n');

    expect(() =>
      parseToolSummaryMarkdown({
        tool: 'jafax',
        filePath: '/tmp/jafax.md',
        content
      })
    ).toThrow('Missing --tool-html-template for jafax while summary declares html-template: reference');
  });

  it('throws for invalid metadata line format', () => {
    const content = ['---', 'tool insider', 'html-template: inline', '---', '<div>Template</div>', '---', '## Text'].join(
      '\n'
    );

    expect(() =>
      parseToolSummaryMarkdown({
        tool: 'insider',
        filePath: '/tmp/insider.md',
        content
      })
    ).toThrow("Invalid metadata line 'tool insider' in /tmp/insider.md");
  });

  it('preserves unknown metadata keys', () => {
    const content = [
      '---',
      'tool: lizard',
      'html-template: inline',
      'owner: team-a',
      'custom-flag: true',
      '---',
      '<div>Lizard template</div>',
      '---',
      '# Lizard markdown'
    ].join('\n');

    const result = parseToolSummaryMarkdown({
      tool: 'lizard',
      filePath: '/tmp/lizard.md',
      content
    });

    expect(result.metadata['owner']).toBe('team-a');
    expect(result.metadata['custom-flag']).toBe('true');
  });
});
