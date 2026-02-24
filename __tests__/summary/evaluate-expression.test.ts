import { evaluateExpression } from '../../src/summary/evaluate-expression';

describe('evaluateExpression', () => {
  it('evaluates boolean and comparison operators', () => {
    const result = evaluateExpression("'failed' == 'failed' && 120 > 100");

    expect(result).toBe(true);
  });

  it('supports grouping with parentheses', () => {
    const result = evaluateExpression("('failed' == 'success' || 1 > 0) && true");

    expect(result).toBe(true);
  });

  it('throws for invalid expressions', () => {
    expect(() => evaluateExpression('1 >')).toThrow('Unexpected end of expression');
  });
});
