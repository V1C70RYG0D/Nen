const nextJest = require('next/jest')
const path = require('path')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/config/testing/jest.setup.js'],
  setupFiles: ['<rootDir>/jest.polyfills.ts'],
  moduleNameMapper: {
    // Handle module aliases (this will be automatically configured for you based on your tsconfig.json paths)
    '^@/(.*)$': '<rootDir>/$1',
    // Mock CSS modules
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
    // Mock framer-motion
    '^framer-motion$': '<rootDir>/__mocks__/framer-motion.js',
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      configFile: path.resolve(__dirname, '../build-configs/babel.config.json')
    }],
  },
  testEnvironment: 'jsdom',
  collectCoverageFrom: [
    'components*.{ts,tsx}',
    'hooks*.{ts,tsx}',
    'pages*.{ts,tsx}',
    'utils*.{ts,tsx}'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  testMatch: [
    '<rootDir>/__tests__*.{js,jsx,ts,tsx}',
    '<rootDir>?(*.)+(spec|test).{js,jsx,ts,tsx}',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(@solana-mobile|@solana|@walletconnect|@coral-xyz|@project-serum)/)'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testTimeout: 30000,
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
