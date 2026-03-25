import { readTextFile } from '../io/read-files';
import defaultOrderFile from '../config/default-order.json';

export interface ResolvedToolOrder {
  categoryOrder: Record<string, number>;
  toolOrder: Record<string, number>;
}

interface ToolOrderFileInput {
  categoryOrder?: unknown;
  toolOrder?: unknown;
}

const DEFAULT_TOOL_ORDER: ResolvedToolOrder = loadDefaultToolOrder();

export async function resolveToolOrder(toolOrderFile: string | undefined): Promise<ResolvedToolOrder> {
  const resolved = cloneToolOrder(DEFAULT_TOOL_ORDER);

  if (!toolOrderFile) {
    return resolved;
  }

  const rawOrder = await readTextFile(toolOrderFile);
  const parsed = JSON.parse(rawOrder) as unknown;
  mergeToolOrderFile(resolved, parsed);

  return resolved;
}

function loadDefaultToolOrder(): ResolvedToolOrder {
  return parseToolOrderFile(defaultOrderFile);
}

function cloneToolOrder(source: ResolvedToolOrder): ResolvedToolOrder {
  return {
    categoryOrder: { ...source.categoryOrder },
    toolOrder: { ...source.toolOrder }
  };
}

function mergeToolOrderFile(target: ResolvedToolOrder, source: unknown): void {
  const asToolOrder = parseToolOrderFileInput(source);

  if (asToolOrder.categoryOrder !== undefined) {
    target.categoryOrder = {
      ...target.categoryOrder,
      ...parseOrderMap(asToolOrder.categoryOrder, 'categoryOrder')
    };
  }

  if (asToolOrder.toolOrder !== undefined) {
    target.toolOrder = {
      ...target.toolOrder,
      ...parseOrderMap(asToolOrder.toolOrder, 'toolOrder')
    };
  }
}

function parseToolOrderFile(source: unknown): ResolvedToolOrder {
  const asToolOrder = parseToolOrderFileInput(source);

  return {
    categoryOrder: asToolOrder.categoryOrder !== undefined
      ? parseOrderMap(asToolOrder.categoryOrder, 'categoryOrder')
      : {},
    toolOrder: asToolOrder.toolOrder !== undefined
      ? parseOrderMap(asToolOrder.toolOrder, 'toolOrder')
      : {}
  };
}

function parseToolOrderFileInput(source: unknown): ToolOrderFileInput {
  if (!isRecord(source)) {
    throw new Error('Invalid tool order file content: expected JSON object');
  }

  return source as ToolOrderFileInput;
}

function parseOrderMap(value: unknown, field: string): Record<string, number> {
  if (!isRecord(value)) {
    throw new Error(`Invalid tool order file content: '${field}' must be an object`);
  }

  const parsed: Record<string, number> = {};

  for (const [key, rawOrder] of Object.entries(value)) {
    if (!key.trim()) {
      throw new Error("Invalid tool order file content: category name cannot be empty");
    }

    if (typeof rawOrder !== 'number' || !Number.isFinite(rawOrder)) {
      throw new Error(`Invalid tool order file content: '${field}.${key}' must be numeric`);
    }

    parsed[key] = rawOrder;
  }

  return parsed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
