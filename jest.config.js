/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)(\\.js)?$': '$1',
  },
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        // Override TypeScript configuration for tests
        target: 'ES2022',
        module: 'ESNext',
      }
    }],
  },
  transformIgnorePatterns: [
    // Allow ESM modules to be processed
    'node_modules/(?!(@modelcontextprotocol)/)'
  ],
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/index.ts",
    "!src/cli.ts",
    "!src/setupConfig.ts",
  ],
  testMatch: ["**/__tests__/**/*.ts", "**/?(*.)+(spec|test).ts"],
  testPathIgnorePatterns: [
    "node_modules/",
    "dist/",
    "__mocks__/",
    "\\.d\\.ts$"
  ],
  setupFilesAfterEnv: ["./__tests__/jest.setup.ts"],
  injectGlobals: true,
  globals: {
    "ts-jest": {
      diagnostics: {
        ignoreCodes: [2339, 2345, 2349] // Ignore property does not exist, etc.
      }
    }
  }
}