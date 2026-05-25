export default {
  testEnvironment: "node",

  // Excluir Playwright E2E, worktrees de Claude Code y cobertura generada
  testPathIgnorePatterns: ["/node_modules/", "/.claude/worktrees/", "/coverage/", "/e2e/"],

  // Archivos fuente sobre los que se mide cobertura
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/server.js",      // entrypoint — no tiene lógica testeable
    "!src/config/db.js",   // infraestructura Oracle — siempre mockeada
    "!src/tests/**",       // los tests mismos no se miden
  ],

  coverageDirectory: "coverage",

  coverageReporters: ["text", "lcov", "html"],

  // Falla el run si no se alcanzan los umbrales
  coverageThreshold: {
    global: {
      statements: 100,
      branches:   100,
      functions:  100,
      lines:      100,
    },
  },

  // Soporte TypeScript para tests del frontend
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: false,
        diagnostics: false,
        tsconfig: {
          allowJs: true,
          esModuleInterop: true,
          types: ["jest"],
          paths: { "@/*": ["./frontend/*"] },
          baseUrl: ".",
        },
      },
    ],
  },

  // Alias @/ → frontend/
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/frontend/$1",
  },
};