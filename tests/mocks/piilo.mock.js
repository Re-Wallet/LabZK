/**
 * Mock de @neylanxyz/piilo para pruebas unitarias.
 * Este módulo se usa porque @neylanxyz/piilo es ESM-only y Jest
 * no puede cargar módulos ESM directamente con require().
 *
 * Rastrea todas las instancias creadas para que los tests puedan
 * verificar las llamadas a los métodos del SDK.
 */

let instances = [];

class Piilo {
  constructor(config) {
    this.config = config;
    this.deposit = jest.fn().mockResolvedValue(undefined);
    this.transfer = jest.fn().mockResolvedValue(undefined);
    this.settleIfPending = jest.fn().mockResolvedValue({ received: '0' });
    this.withdraw = jest.fn().mockResolvedValue(undefined);
    this.getBalance = jest.fn().mockResolvedValue('50000000');
    this.getAccount = jest.fn().mockResolvedValue({});
    this.exportBackup = jest.fn().mockReturnValue('mock-backup');
    this.importBackup = jest.fn();
    instances.push(this);
  }

  static get instances() {
    return instances;
  }

  static clearInstances() {
    instances = [];
  }
}

module.exports = { Piilo };
