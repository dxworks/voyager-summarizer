interface Token {
  type: 'operator' | 'lparen' | 'rparen' | 'number' | 'boolean' | 'string';
  value: string;
}

interface ParserState {
  tokens: Token[];
  index: number;
}

export function evaluateExpression(expression: string): boolean {
  const tokens = tokenize(expression);
  const state: ParserState = { tokens, index: 0 };
  const result = parseOr(state);

  if (state.index < state.tokens.length) {
    throw new Error(`Unexpected token '${state.tokens[state.index].value}' in expression`);
  }

  return toBoolean(result);
}

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < expression.length) {
    const char = expression[index];

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    const twoChars = expression.slice(index, index + 2);
    if (twoChars === '&&' || twoChars === '||' || twoChars === '==' || twoChars === '!=' || twoChars === '>=' || twoChars === '<=') {
      tokens.push({ type: 'operator', value: twoChars });
      index += 2;
      continue;
    }

    if (char === '>' || char === '<' || char === '!') {
      tokens.push({ type: 'operator', value: char });
      index += 1;
      continue;
    }

    if (char === '(') {
      tokens.push({ type: 'lparen', value: char });
      index += 1;
      continue;
    }

    if (char === ')') {
      tokens.push({ type: 'rparen', value: char });
      index += 1;
      continue;
    }

    if (char === '\'' || char === '"') {
      const quote = char;
      index += 1;
      let value = '';

      while (index < expression.length && expression[index] !== quote) {
        if (expression[index] === '\\' && index + 1 < expression.length) {
          value += expression[index + 1];
          index += 2;
        } else {
          value += expression[index];
          index += 1;
        }
      }

      if (index >= expression.length) {
        throw new Error('Unterminated string literal in expression');
      }

      tokens.push({ type: 'string', value });
      index += 1;
      continue;
    }

    const numberMatch = expression.slice(index).match(/^-?\d+(\.\d+)?/);
    if (numberMatch) {
      tokens.push({ type: 'number', value: numberMatch[0] });
      index += numberMatch[0].length;
      continue;
    }

    const booleanMatch = expression.slice(index).match(/^(true|false)\b/);
    if (booleanMatch) {
      tokens.push({ type: 'boolean', value: booleanMatch[0] });
      index += booleanMatch[0].length;
      continue;
    }

    throw new Error(`Invalid token near '${expression.slice(index)}'`);
  }

  return tokens;
}

function parseOr(state: ParserState): unknown {
  let left = parseAnd(state);

  while (matchOperator(state, '||')) {
    const right = parseAnd(state);
    left = toBoolean(left) || toBoolean(right);
  }

  return left;
}

function parseAnd(state: ParserState): unknown {
  let left = parseUnary(state);

  while (matchOperator(state, '&&')) {
    const right = parseUnary(state);
    left = toBoolean(left) && toBoolean(right);
  }

  return left;
}

function parseUnary(state: ParserState): unknown {
  if (matchOperator(state, '!')) {
    return !toBoolean(parseUnary(state));
  }

  return parseComparison(state);
}

function parseComparison(state: ParserState): unknown {
  let left = parsePrimary(state);

  while (true) {
    const operator = matchAnyOperator(state, ['==', '!=', '>', '>=', '<', '<=']);

    if (!operator) {
      return left;
    }

    const right = parsePrimary(state);
    left = applyComparison(operator, left, right);
  }
}

function parsePrimary(state: ParserState): unknown {
  const token = state.tokens[state.index];

  if (!token) {
    throw new Error('Unexpected end of expression');
  }

  if (token.type === 'lparen') {
    state.index += 1;
    const value = parseOr(state);

    if (!state.tokens[state.index] || state.tokens[state.index].type !== 'rparen') {
      throw new Error('Missing closing parenthesis in expression');
    }

    state.index += 1;
    return value;
  }

  state.index += 1;

  if (token.type === 'number') {
    return Number(token.value);
  }

  if (token.type === 'boolean') {
    return token.value === 'true';
  }

  if (token.type === 'string') {
    return token.value;
  }

  throw new Error(`Unexpected token '${token.value}' in expression`);
}

function applyComparison(operator: string, left: unknown, right: unknown): boolean {
  if (operator === '==') {
    return left === right;
  }

  if (operator === '!=') {
    return left !== right;
  }

  if (typeof left !== 'number' || typeof right !== 'number') {
    throw new Error(`Operator '${operator}' requires numeric operands`);
  }

  if (operator === '>') {
    return left > right;
  }

  if (operator === '>=') {
    return left >= right;
  }

  if (operator === '<') {
    return left < right;
  }

  return left <= right;
}

function matchOperator(state: ParserState, expected: string): boolean {
  const token = state.tokens[state.index];

  if (!token || token.type !== 'operator' || token.value !== expected) {
    return false;
  }

  state.index += 1;
  return true;
}

function matchAnyOperator(state: ParserState, expectedValues: string[]): string | undefined {
  const token = state.tokens[state.index];

  if (!token || token.type !== 'operator') {
    return undefined;
  }

  if (!expectedValues.includes(token.value)) {
    return undefined;
  }

  state.index += 1;
  return token.value;
}

function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    return value.length > 0;
  }

  return Boolean(value);
}
