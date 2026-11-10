# LabZK — Pasos pendientes para completar la integración Soroban

Este documento resume qué se ha completado y qué queda pendiente, junto con
las instrucciones exactas para cada paso.

## ✅ Completado

| Tarea | Estado |
|-------|--------|
| Arquitectura hexagonal completa | ✅ |
| PoC ZK Groth16/BN254 (modo simulado) | ✅ |
| 80 tests pasando (20 suites) | ✅ |
| TypeScript limpio (0 errores) | ✅ |
| SDKs reales instalados (@neylanxyz/piilo, @stellar-zklogin/sdk) | ✅ |
| Adaptadores actualizados con APIs oficiales | ✅ |
| Base de datos Neon (rama pruebas-zk, aislada de main) | ✅ |
| API Fastify con 8 endpoints ZK | ✅ |
| Estructura Soroban (tipos + clientes placeholder) | ✅ |

## ⏳ Pendiente — Paso 2: Compilar circom para verification_key.json

### Problema
Circom 0.5.46 tiene un bug en el parser que ignora newlines tras `pragma`, y
cmake no está disponible en este entorno para compilar circom desde fuente.

### Solución
En un entorno con cmake disponible:

```bash
# 1. Instalar cmake (depende del SO)
# Ubuntu/Debian:
sudo apt-get install cmake

# 2. Compilar circom desde fuente (si es necesario) o usar binario precompilado

# 3. Compilar el circuito
cd /datos/lordbitcoin/Projects/Projects\ Web3/ReWallet/LabZK
npm run setup:circuits

# 4. Esto generará:
#    - circuits/proof-of-knowledge.r1cs
#    - circuits/proof-of-knowledge_wasm/proof-of-knowledge.wasm
#    - circuits/proof-of-knowledge.sym
#    - circuits/proof-of-knowledge_0000.zkey
#    - circuits/verification_key.json
```

### Qué se necesita del verification_key.json
El archivo `verification_key.json` se usa para:
- Verificar pruebas Groth16 off-chain (backend)
- Obtener el `verificationKeyHash` para configurar el contrato Soroban

## ⏳ Pendiente — Paso 3: Desplegar contrato Soroban en testnet

### Prerrequisitos que el usuario debe proporcionar

1. **Credenciales de Soroban testnet**:
   - `SOROBAN_SECRET_KEY`: Clave secreta de la cuenta Stellar testnet (empieza con `SC...`)
   - `SOROBAN_RPC_URL`: `https://soroban-testnet.stellar.org` (o tu RPC privado)
   - `SOROBAN_NETWORK_PASSPHRASE`: `Testnet SDF Network ; September 2015`

2. **stellar-cli instalado**:
   ```bash
   curl -sL https://github.com/stellar/stellar-cli/releases/latest/download/stellar-cli-$(uname -s)-$(uname -m).tar.gz | tar -xz
   sudo mv stellar-cli /usr/local/bin/
   stellar-cli --version
   ```

3. **Cuenta con fondos en testnet**:
   Usar el friendbot para obtener XLM de prueba:
   ```bash
   curl https://friendbot.stellar.org?addr=<TU_DIRECCION_PUBLICA>
   ```

### Pasos para desplegar (una vez se tengan las credenciales)

```bash
# 1. Configurar .env con las credenciales Soroban
cp .env.example .env
# Editar .env con SOROBAN_SECRET_KEY, SOROBAN_RPC_URL, etc.

# 2. Compilar circom (paso 2) para obtener verification_key.json

# 3. Desplegar contratos Soroban
npx tsx scripts/deploy-soroban.ts

# 4. Los contractIds se guardan en .env:
#    SOROBAN_VERIFIER_CONTRACT_ID=CA...
#    SOROBAN_KYC_REGISTRY_CONTRACT_ID=CA...

# 5. Conectar Groth16VerifierClient y KycRegistryClient en src/di/container.ts
```

### Archivos preparados para el despliegue

- `src/infrastructure/soroban/types.ts` — Tipos de Groth16 y configuración
- `src/infrastructure/soroban/groth16-verifier-client.ts` — Cliente verificador (listo para conectar)
- `src/infrastructure/soroban/kyc-registry-client.ts` — Cliente KYC registry (listo para conectar)
- `scripts/deploy-soroban.ts` — Script de despliegue (plantilla)
- `.env.example` — Plantilla de variables de entorno

## ⏳ Pendiente — Paso 4: Contract tests con fixtures de testnet

### Prerrequisitos
- Paso 3 completado (contratos desplegados en testnet)
- `verification_key.json` generado (paso 2)

### Qué se probará

| Contrato | Prueba | Fixture necesario |
|----------|--------|-------------------|
| Groth16 Verifier | Verificación de prueba válida | Prueba Groth16 real generada por circom |
| Groth16 Verifier | Verificación de prueba inválida | Prueba manipulada |
| Kyc Registry | Registro de nullifier | Nullifier + prueba válida |
| Kyc Registry | Anti-replay | Mismo nullifier dos veces |
| Kyc Registry | Consulta nullifier | Nullifier existente |

### Archivo de tests preparado
`tests/contract/` — Lista para agregar tests de integración contra testnet.

## 🛠️ Cómo reanudar cuando se tengan las credenciales

```bash
# 1. Clonar el repositorio
git clone https://github.com/Re-Wallet/LabZK.git
cd LabZK

# 2. Instalar dependencias
npm install

# 3. Configurar .env con credenciales Soroban
cp .env.example .env
# Editar .env con SOROBAN_SECRET_KEY, SOROBAN_RPC_URL, etc.

# 4. Compilar circom (requiere cmake)
# Instalar cmake, luego:
npm run setup:circuits

# 5. Desplegar contratos Soroban
npx tsx scripts/deploy-soroban.ts

# 6. Actualizar .env con los contractIds desplegados

# 7. Ejecutar todos los tests
npm test

# 8. Ejecutar contract tests contra testnet
# (pendiente de crear una vez desplegados los contratos)
```

## 📞 Soporte

Si encuentras problemas con cualquiera de estos pasos, los archivos están preparados
y documentados. Los contracts clients en `src/infrastructure/soroban/` están listos
para conectarse una vez se disponga de los contractIds desplegados.
