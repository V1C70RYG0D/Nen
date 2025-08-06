const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Test files
  testMatch: [
    '**/tests/websocket-*.test.ts',
    '**/tests/websocket-*-tests.ts',
    '**/src/**/*.websocket.test.ts'
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/src/test/setup.ts'
  ],
  
  // Module resolution
  moduleNameMapping: pathsToModuleNameMapper(compilerOptions.paths || {}, {
    prefix: '<rootDir>/'
  }),
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      isolatedModules: true,
      useESM: false
    }]
  },
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/routes/websocket.ts',
    'src/websockets/**/*.ts',
    'src/utils/websocket-*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/test/**/*'
  ],
  coverageDirectory: 'coverage/websocket',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Test timeout for WebSocket tests (longer due to network operations)
  testTimeout: 30000,
  
  // Global setup and teardown
  globalSetup: '<rootDir>/tests/websocket-global-setup.js',
  globalTeardown: '<rootDir>/tests/websocket-global-teardown.js',
  
  // Error handling
  errorOnDeprecated: true,
  verbose: true,
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/'
  ],
  
  // Environment variables
  testEnvironmentOptions: {
    NODE_ENV: 'test',
    WEBSOCKET_HOST: 'localhost',
    WEBSOCKET_PORT: '3003',
    REDIS_URI: 'redis://localhost:6379'
  },
  
  // Reporter configuration
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'results/websocket',
      outputName: 'websocket-test-results.xml'
    }],
    ['jest-html-reporters', {
      publicPath: './results/websocket',
      filename: 'websocket-test-report.html',
      expand: true
    }]
  ],
  
  // Retry configuration for flaky WebSocket tests
  retry: 2,
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true
};
