import { readTextFile } from '../io/read-files';

interface ToolOrderEntry {
  toolId: string;
  priority: number;
  index: number;
}

export async function readToolOrder(filePath: string): Promise<string[]> {
  const content = await readTextFile(filePath);
  return parseToolOrderContent(content);
}

function parseToolOrderContent(content: string): string[] {
  const lines = content.split(/\r?\n/);
  const entries: ToolOrderEntry[] = [];
  const seenToolIds = new Set<string>();

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.trim();
    const lineNumber = index + 1;

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf(':');
    if (separatorIndex <= 0) {
      throw new Error(`Invalid tool order line ${lineNumber}: expected format <tool-id>: <priority>`);
    }

    const toolId = line.slice(0, separatorIndex).trim();
    const priorityRaw = line.slice(separatorIndex + 1).trim();

    if (!toolId) {
      throw new Error(`Invalid tool order line ${lineNumber}: tool id cannot be empty`);
    }

    if (!priorityRaw) {
      throw new Error(`Invalid tool order line ${lineNumber}: priority is required`);
    }

    const priority = Number(priorityRaw);
    if (!Number.isFinite(priority)) {
      throw new Error(`Invalid tool order line ${lineNumber}: priority must be numeric`);
    }

    if (seenToolIds.has(toolId)) {
      throw new Error(`Invalid tool order file: duplicate tool id '${toolId}'`);
    }

    seenToolIds.add(toolId);
    entries.push({ toolId, priority, index });
  }

  entries.sort((left, right) => {
    if (left.priority === right.priority) {
      return left.index - right.index;
    }

    return left.priority - right.priority;
  });

  return entries.map((entry) => entry.toolId);
}
