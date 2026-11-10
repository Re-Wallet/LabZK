/** Configuración de Jest enfocada en pruebas ZK (Groth16 / BN254). */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'mjs', 'json'],
  // Las pruebas ZK (snarkjs) pueden ser lentas
  testTimeout: 120000,
  // ts-jest para TypeScript, esbuild-jest para módulos ESM de node_modules
  transform: {
    '^.+\\.ts$': ['ts-jest', { isolatedModules: true }],
    '^.+\\.(js|mjs)$': ['esbuild-jest', { target: 'node20', format: 'cjs' }],
  },
  transformIgnorePatterns: [
    '<rootDir>/node_modules/(?!(@stellar/stellar-sdk|uint8array-extras|@exodus/bytes|@noble/ed25519))',
  ],
  moduleNameMapper: {
    '^@neylanxyz/piilo$': '<rootDir>/tests/mocks/piilo.mock.js',
  },
};
