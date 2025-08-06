// Simple ESLint configuration for basic syntax checking
module.exports = [
  {
    files: ["src/**/*.{ts,js}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly",
        global: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        // Jest globals
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        beforeAll: "readonly",
        afterEach: "readonly",
        afterAll: "readonly",
        jest: "readonly",
        // Browser/Performance globals
        performance: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { 
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_" 
      }],
      "prefer-const": "off", // Too many issues, disabled for now
      "no-var": "error",
      "camelcase": "off", // Disabled to avoid conflicts with external APIs
      "no-console": "off", // Allow console statements
      "no-undef": "off", // TypeScript handles this better
    },
  },
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "coverage/**",
      "*.d.ts",
      "**/*.test.ts",
      "**/*.spec.ts",
    ],
  },
];
