/** @type {import('jest').Config} */
module.exports = {
  // Project configuration for monorepo setup (GI #8 - Extensive Testing)
  projects: [
    {
      displayName: 'Backend Tests',
      testMatch: ['<rootDir>/backend*.test.{js,ts}'],
      testEnvironment: 'node',
      preset: 'ts-jest',
      setupFilesAfterEnv: ['<rootDir>/backend/src/test/setup.ts'],
      collectCoverageFrom: [
        'backend/src*.{js,ts}',
        '!backend/src*.d.ts',
        '!backend/src/test/**',
        '!backend/src*.test.{js,ts}'
      ],
      coverageDirectory: '<rootDir>/coverage/backend',
      coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
      coverageThreshold: {
        global: {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100
        }
      }
    },
    {
      displayName: 'Frontend Tests',
      testMatch: ['<rootDir>/frontend*.test.{js,ts,tsx}'],
      testEnvironment: 'jsdom',
      preset: 'ts-jest',
      setupFilesAfterEnv: ['<rootDir>/frontend/src/test/setup.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/frontend/src/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/frontend/__mocks__/fileMock.js'
      },
      collectCoverageFrom: [
        'frontend/src*.{js,ts,tsx}',
        '!frontend/src*.d.ts',
        '!frontend/src/test/**',
        '!frontend/src*.test.{js,ts,tsx}',
        '!frontend/src*.stories.{js,ts,tsx}'
      ],
      coverageDirectory: '<rootDir>/coverage/frontend',
      coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
      coverageThreshold: {
        global: {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100
        }
      }
    },
    {
      displayName: 'Integration Tests',
      testMatch: ['<rootDir>/infrastructure/testing/integration*.test.{js,ts}'],
      testEnvironment: 'node',
      preset: 'ts-jest',
      setupFilesAfterEnv: ['<rootDir>/infrastructure/testing/integration/setup.ts'],
      testTimeout: 30000,
      collectCoverageFrom: [
        'infrastructure/testing/integration*.{js,ts}',
        '!infrastructure/testing/integration*.d.ts'
      ],
      coverageDirectory: '<rootDir>/coverage/integration'
    },
    {
      displayName: 'End-to-End Tests',
      testMatch: ['<rootDir>/infrastructure/testing/e2e*.test.{js,ts}'],
      testEnvironment: 'node',
      preset: 'ts-jest',
      setupFilesAfterEnv: ['<rootDir>/infrastructure/testing/e2e/setup.ts'],
      testTimeout: 60000,
      collectCoverageFrom: [
        'infrastructure/testing/e2e*.{js,ts}',
        '!infrastructure/testing/e2e*.d.ts'
      ],
      coverageDirectory: '<rootDir>/coverage/e2e'
    },
    {
      displayName: 'Performance Tests',
      testMatch: ['<rootDir>/tests/performance*.test.{js,ts}'],
      testEnvironment: 'node',
      preset: 'ts-jest',
      setupFilesAfterEnv: ['<rootDir>/tests/global-setup.ts'],
      testTimeout: 120000, // 2 minutes for performance tests
      collectCoverageFrom: [
        'tests/performance*.{js,ts}',
        '!tests/performance*.d.ts'
      ],
      coverageDirectory: '<rootDir>/coverage/performance',
      maxWorkers: 1, // Run performance tests serially
      verbose: true
    },
    {
      displayName: 'Data Generator Tests',
      testMatch: ['<rootDir>/data-generators*.test.{js,ts}', '<rootDir>/tests/integration/data-generator-*.test.{js,ts}'],
      testEnvironment: 'node',
      preset: 'ts-jest',
      setupFilesAfterEnv: ['<rootDir>/tests/global-setup.ts'],
      testTimeout: 60000, // 1 minute for data generation tests
      collectCoverageFrom: [
        'data-generators*.{js,ts,py}',
        '!data-generators*.d.ts',
        '!data-generators*test*.py'
      ],
      coverageDirectory: '<rootDir>/coverage/data-generators',
      verbose: true
    }
  ],

  // Global configuration
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary', 'clover'],

  // Combined coverage thresholds (GI #8 - 100% test coverage)
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  },

  // Global setup and teardown
  // globalSetup: '<rootDir>/../infrastructure/testing/global-setup.js',
  // globalTeardown: '<rootDir>/../infrastructure/testing/global-teardown.js',

  // Test result processing
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './coverage/html-report',
      filename: 'test-report.html',
      expand: true,
      hideIcon: false,
      pageTitle: 'Nen Platform Test Report'
    }],
    ['jest-junit', {
      outputDirectory: './coverage',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ],

  // Error handling and debugging
  verbose: true,
  bail: 0, // Continue running tests even if some fail
  errorOnDeprecated: true,

  // Watch mode configuration
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],

  // Module resolution
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node'],

  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest'
  },

  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/build/',
    '<rootDir>/.next/',
    '<rootDir>/target/',
    '<rootDir>/smart-contracts/target/'
  ],

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Maximum worker processes (GI #21 - Performance optimization)
  maxWorkers: '50%',

  // Test environment variables
  setupFiles: ['<rootDir>/../infrastructure/testing/jest.env.js']
};
