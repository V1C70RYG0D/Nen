/** @type {import('jest').Config} */
module.exports = {
  // Root directory relative to the config file
  rootDir: '..',

  // Project configuration for monorepo setup (GI #8 - Extensive Testing)
  projects: [
    {
      displayName: 'Main Tests',
      testMatch: ['<rootDir>/__tests__/**/*.test.{js,ts}'],
      testEnvironment: 'node',
      preset: 'ts-jest/presets/js-with-ts',
      moduleFileExtensions: ['ts', 'js', 'json'],
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          tsconfig: '<rootDir>/tsconfig.json',
          useESM: false
        }],
        '^.+\\.js$': 'babel-jest'
      },
      collectCoverageFrom: [
        '<rootDir>/*.{js,ts}',
        '!<rootDir>/*.d.ts',
        '!<rootDir>/*.test.{js,ts}'
      ],
      coverageDirectory: '<rootDir>/coverage/main'
    },
    {
      displayName: 'Backend Tests',
      testMatch: [
        '<rootDir>/backend/src/**/*.test.{js,ts}',
        '<rootDir>/backend/tests/**/*.test.{js,ts}',
        '<rootDir>/backend/**/*.test.{js,ts}'
      ],
      testEnvironment: 'node',
      preset: 'ts-jest/presets/js-with-ts',
      moduleFileExtensions: ['ts', 'js', 'json'],
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          tsconfig: '<rootDir>/backend/tsconfig.json',
          useESM: false
        }],
        '^.+\\.js$': 'babel-jest'
      },
      collectCoverageFrom: [
        '<rootDir>/backend/src/**/*.{js,ts}',
        '!<rootDir>/backend/src/**/*.d.ts',
        '!<rootDir>/backend/src/**/*.test.{js,ts}',
        '!<rootDir>/backend/dist/**/*'
      ],
      coverageDirectory: '<rootDir>/coverage/backend'
    },
    {
      displayName: 'Smart Contract Tests',
      testMatch: ['<rootDir>/smart-contracts/tests/**/*.test.{js,ts}'],
      testEnvironment: 'node',
      preset: 'ts-jest/presets/js-with-ts',
      moduleFileExtensions: ['ts', 'js', 'json'],
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          tsconfig: '<rootDir>/smart-contracts/tsconfig.json',
          useESM: false
        }],
        '^.+\\.js$': 'babel-jest'
      },
      collectCoverageFrom: [
        '<rootDir>/smart-contracts/programs/**/*.{js,ts}',
        '!<rootDir>/smart-contracts/**/*.d.ts',
        '!<rootDir>/smart-contracts/**/*.test.{js,ts}',
        '!<rootDir>/smart-contracts/target/**/*'
      ],
      coverageDirectory: '<rootDir>/coverage/smart-contracts'
    },
    {
      displayName: 'Tools Tests',
      testMatch: ['<rootDir>/tools/**/*.test.{js,ts}'],
      testEnvironment: 'node',
      preset: 'ts-jest/presets/js-with-ts',
      moduleFileExtensions: ['ts', 'js', 'json'],
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          tsconfig: '<rootDir>/tsconfig.json',
          useESM: false
        }],
        '^.+\\.js$': 'babel-jest'
      },
      collectCoverageFrom: [
        '<rootDir>/tools/**/*.{js,ts}',
        '!<rootDir>/tools/**/*.d.ts',
        '!<rootDir>/tools/**/*.test.{js,ts}'
      ],
      coverageDirectory: '<rootDir>/coverage/tools'
    }
  ],

  // Global configuration
  collectCoverage: false, // Disable by default for faster testing
  coverageDirectory: '<rootDir>/coverage',

  // Test result processing
  reporters: [
    'default'
  ],

  // Module resolution
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node'],

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
  maxWorkers: '50%'
};
