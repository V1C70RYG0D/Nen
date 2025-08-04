/** @type {import('jest').Config} */
module.exports = {
  displayName: 'Data Generator Tests',
  rootDir: '../',
  testMatch: ['<rootDir>/tests/integration/data-generator-*.test.{js,ts}'],
  testEnvironment: 'node',
  testTimeout: 60000, // 1 minute for data generation tests
  collectCoverageFrom: [
    'data-generators*.{js,ts}',
    '!data-generators*.d.ts',
    '!data-generators*test*'
  ],
  coverageDirectory: '<rootDir>/coverage/data-generators',
  verbose: true,
  // Module resolution
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node'],

  // Transform configuration
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest'
  },

  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/build/'
  ],

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true
};
