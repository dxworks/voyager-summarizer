export type HtmlTemplateMode = 'inline' | 'reference';

export interface ParsedToolSummary {
  tool: string;
  metadata: Record<string, string>;
  htmlTemplateMode: HtmlTemplateMode;
  htmlTemplateContent: string;
  markdownContent: string;
}

export interface ParseToolSummaryMarkdownInput {
  tool: string;
  filePath: string;
  content: string;
  htmlTemplateReferenceContent?: string;
}

export function parseToolSummaryMarkdown(input: ParseToolSummaryMarkdownInput): ParsedToolSummary {
  const sections = splitSections(input.content);

  if (sections.length < 2) {
    throw new Error(`Missing metadata section in ${input.tool} summary: ${input.filePath}`);
  }

  const metadata = parseMetadata(sections[0], input.filePath);
  const htmlTemplateValue = metadata['html-template'];

  if (!htmlTemplateValue) {
    throw new Error(`Missing required metadata key 'html-template' in ${input.filePath}`);
  }

  if (htmlTemplateValue !== 'inline' && htmlTemplateValue !== 'reference') {
    throw new Error(
      `Invalid html-template value '${htmlTemplateValue}' in ${input.filePath}. Expected 'inline' or 'reference'.`
    );
  }

  if (htmlTemplateValue === 'inline') {
    if (!sections[1]) {
      throw new Error(`Missing inline HTML template section for ${input.tool} in ${input.filePath}`);
    }

    if (!sections[2]) {
      throw new Error(`Missing markdown section for ${input.tool} in ${input.filePath}`);
    }

    return {
      tool: input.tool,
      metadata,
      htmlTemplateMode: 'inline',
      htmlTemplateContent: sections[1],
      markdownContent: sections[2]
    };
  }

  if (!sections[1]) {
    throw new Error(`Missing markdown section for ${input.tool} in ${input.filePath}`);
  }

  if (!input.htmlTemplateReferenceContent) {
    throw new Error(
      `Missing --tool-html-template for ${input.tool} while summary declares html-template: reference`
    );
  }

  return {
    tool: input.tool,
    metadata,
    htmlTemplateMode: 'reference',
    htmlTemplateContent: input.htmlTemplateReferenceContent,
    markdownContent: sections[1]
  };
}

function splitSections(content: string): string[] {
  const lines = content.split(/\r?\n/);
  const sections: string[] = [];
  let current: string[] = [];
  let started = false;

  for (const line of lines) {
    if (line.trim() === '---') {
      if (started) {
        sections.push(current.join('\n').trim());
        current = [];
      } else {
        started = true;
      }

      continue;
    }

    if (started) {
      current.push(line);
    }
  }

  if (started && current.length > 0) {
    sections.push(current.join('\n').trim());
  }

  return sections.filter((section) => section.length > 0);
}

function parseMetadata(raw: string, filePath: string): Record<string, string> {
  const metadata: Record<string, string> = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf(':');
    if (separatorIndex <= 0) {
      throw new Error(`Invalid metadata line '${trimmedLine}' in ${filePath}`);
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    metadata[key] = trimmedLine.slice(separatorIndex + 1).trim();
  }

  return metadata;
}
