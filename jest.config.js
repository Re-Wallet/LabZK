/** Configuración de Jest enfocada en pruebas ZK (Groth16 / BN254). */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  // Las pruebas ZK (snarkjs) pueden ser lentas
  testTimeout: 120000,
  // @neylanxyz/piilo es ESM-only ("type": "module"), Jest no puede requerirlo directamente
  transformIgnorePatterns: ['<rootDir>/node_modules/(?!@neylanxyz/piilo)'],
  moduleNameMapper: {
    '^@neylanxyz/piilo$': '<rootDir>/tests/mocks/piilo.mock.js',
  },
};
