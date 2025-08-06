module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  },
  roots: ['<rootDir>/src', '<rootDir>/tests', '<rootDir>/tests/setup'],
  testMatch: [
    '**/__tests__*.test.(ts|js)',
    '**/__tests__*.spec.(ts|js)',
    '**/*.(test|spec).(ts|js)',
    '**/tests*.test.(ts|js)',
    '**/tests*.spec.(ts|js)'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/src/__tests__/setup.ts',
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/',
    '<rootDir>/tests/fixtures/'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  collectCoverageFrom: [
    'src*.(ts|js)',
    '!src*.d.ts',
    '!src/__tests__*',
    '!srcindex.ts',
    '!src*.interface.ts',
    '!src*.type.ts',
    '!src*.enum.ts',
    '!src*.constant.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json',
    'clover'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/services/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/middleware/': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },
  testTimeout: 10000,
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  errorOnDeprecated: true,
  maxWorkers: '50%',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.ts']
};
