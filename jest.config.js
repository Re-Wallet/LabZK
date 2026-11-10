/** Configuración de Jest enfocada en pruebas ZK (Groth16 / BN254). */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  // Las pruebas ZK (snarkjs) pueden ser lentas
  testTimeout: 120000,
};
