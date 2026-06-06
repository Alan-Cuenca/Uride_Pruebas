/**
 * Jest Configuration for U-Ride Backend
 * 
 * Configuración de pruebas unitarias e integración
 * - Test runner: Jest
 * - HTTP testing: SuperTest
 * - Coverage: c8
 */

module.exports = {
  testEnvironment: 'node',
  
  // Directorio raíz donde Jest busca archivos de prueba
  rootDir: './',
  modulePaths: [
    '<rootDir>/node_modules',
  ],
  roots: [
    '<rootDir>/tests',
  ],
  
  // Patrones de archivos de prueba
  testMatch: [
    '**/*.test.js',
  ],
  
  // Archivos que se ignoran en la búsqueda de tests
  testPathIgnorePatterns: [
    '/node_modules/',
    '/uploads/',
  ],
  
  // Configuración de cobertura
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/config/cronJobs.js',
    '!src/sockets/**',
  ],
  
  coverageDirectory: './coverage',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
  ],
  
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Timeout para tests (útil para operaciones asincrónicas)
  testTimeout: 10000,
  
  // Mostrar tests lentos
  slowTestThreshold: 5,
  
  // Setup files para configuración global
  setupFilesAfterEnv: ['<rootDir>/tests/config/setupTests.js'],
  
  // Verbose output para mejor debugging
  verbose: true,
  
  // Mostrar coverageReport si coverage < 80%
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};

