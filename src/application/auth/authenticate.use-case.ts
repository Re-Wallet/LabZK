/**
 * application/auth/authenticate.use-case.ts
 *
 * Caso de uso: Autenticación sin fricción (zkLogin / Passkey).
 * Login social (Google/Apple) → smart wallet de Soroban sin seed phrase.
 */

import type { AuthPort } from '../../domain/ports/auth.port.js';

export interface AuthenticateInput {
  provider: 'google' | 'apple';
}

export interface AuthenticateOutput {
  address: string;
  session: { accessToken: string; expiresAt: number; provider: string };
}

export class AuthenticateUseCase {
  constructor(private readonly authPort: AuthPort) {}

  async execute(input: AuthenticateInput): Promise<AuthenticateOutput> {
    const { address, session } = await this.authPort.login(input.provider);
    return {
      address,
      session: {
        accessToken: session.accessToken,
        expiresAt: session.expiresAt,
        provider: session.provider,
      },
    };
  }
}
