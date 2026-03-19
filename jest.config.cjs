/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'html', 'css'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
    '^.+\\.(html|css)$': '<rootDir>/scripts/jest-raw-transformer.cjs'
  }
};
