/** @type {import('jest').Config} */
module.exports = {
  // Root directory relative to the project root
  rootDir: '..',

  // Main test configuration for user stories and integration tests
  testMatch: [
    '<rootDir>/tests/**/*.test.{js,ts}',
    '<rootDir>/__tests__/**/*.test.{js,ts}'
  ],
  
  testEnvironment: 'node',
  
  // Module resolution
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node'],

  // Transform configuration
  transform: {
    '^.+\\.js$': 'babel-jest'
  },

  // Coverage configuration
  collectCoverageFrom: [
    '<rootDir>/tests/**/*.{js,ts}',
    '<rootDir>/*.{js,ts}',
    '!<rootDir>/**/*.test.{js,ts}',
    '!<rootDir>/*.d.ts',
    '!<rootDir>/node_modules/**/*',
    '!<rootDir>/coverage/**/*'
  ],
  
  coverageDirectory: '<rootDir>/coverage',

  // Test result processing
  reporters: [
    'default'
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/build/',
    '<rootDir>/.next/',
    '<rootDir>/target/',
    '<rootDir>/smart-contracts/target/',
    '<rootDir>/backend/dist/',
    '<rootDir>/frontend/dist/',
    '<rootDir>/coverage/',
    '\\.d\\.ts$'
  ],

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Maximum worker processes (GI #21 - Performance optimization)
  maxWorkers: '50%',

  // Setup files
  setupFilesAfterEnv: [],

  // Timeout
  testTimeout: 30000
};
