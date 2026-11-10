-- ============================================================
-- LabZK — Migración de capa ZK (002_zk_layer.sql)
-- Sobre el DDL 001_init.sql de LabKYC
-- Base de datos: PostgreSQL 15+ (Neon compatible)
-- IDEMPOTENTE: se puede ejecutar múltiples veces sin error
-- ============================================================

-- ============================================================
-- NUEVA TABLA: zk_nullifiers
-- Identificadores únicos no vinculables a la identidad (Kakusho).
-- ============================================================
CREATE TABLE IF NOT EXISTS zk_nullifiers (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nullifier      TEXT NOT NULL UNIQUE,
    integrator_id  TEXT NOT NULL DEFAULT 'kakusho',
    user_id        UUID REFERENCES users(id) ON DELETE SET NULL,
    is_valid       BOOLEAN NOT NULL DEFAULT true,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    used_at        TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS zk_nullifiers_nullifier_uq ON zk_nullifiers(nullifier);
CREATE INDEX IF NOT EXISTS zk_nullifiers_user_idx ON zk_nullifiers(user_id);
CREATE INDEX IF NOT EXISTS zk_nullifiers_valid_idx ON zk_nullifiers(is_valid);

-- ============================================================
-- USERS — eliminar columnas PII y añadir referencia a nullifier
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email') THEN
    ALTER TABLE users DROP COLUMN email;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='phone_number') THEN
    ALTER TABLE users DROP COLUMN phone_number;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='full_name') THEN
    ALTER TABLE users DROP COLUMN full_name;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='date_of_birth') THEN
    ALTER TABLE users DROP COLUMN date_of_birth;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='document_type') THEN
    ALTER TABLE users DROP COLUMN document_type;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='document_number') THEN
    ALTER TABLE users DROP COLUMN document_number;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='document_expiry') THEN
    ALTER TABLE users DROP COLUMN document_expiry;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='nationality') THEN
    ALTER TABLE users DROP COLUMN nationality;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='kyc_verified_at') THEN
    ALTER TABLE users DROP COLUMN kyc_verified_at;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='kyc_expires_at') THEN
    ALTER TABLE users DROP COLUMN kyc_expires_at;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='nullifier_id') THEN
    ALTER TABLE users ADD COLUMN nullifier_id UUID REFERENCES zk_nullifiers(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='zk_kyc_approved') THEN
    ALTER TABLE users ADD COLUMN zk_kyc_approved BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

DROP INDEX IF EXISTS users_email_lower_uq;

-- ============================================================
-- KYC_VERIFICATIONS — eliminar datos Didit, usar nullifier
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kyc_verifications' AND column_name='didit_session_id') THEN
    ALTER TABLE kyc_verifications DROP COLUMN didit_session_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kyc_verifications' AND column_name='workflow_id') THEN
    ALTER TABLE kyc_verifications DROP COLUMN workflow_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kyc_verifications' AND column_name='session_url') THEN
    ALTER TABLE kyc_verifications DROP COLUMN session_url;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kyc_verifications' AND column_name='decision_payload') THEN
    ALTER TABLE kyc_verifications DROP COLUMN decision_payload;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kyc_verifications' AND column_name='decline_reason') THEN
    ALTER TABLE kyc_verifications DROP COLUMN decline_reason;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kyc_verifications' AND column_name='session_created_at') THEN
    ALTER TABLE kyc_verifications DROP COLUMN session_created_at;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kyc_verifications' AND column_name='resolved_at') THEN
    ALTER TABLE kyc_verifications DROP COLUMN resolved_at;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kyc_verifications' AND column_name='nullifier') THEN
    ALTER TABLE kyc_verifications ADD COLUMN nullifier TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kyc_verifications' AND column_name='zk_proof_hash') THEN
    ALTER TABLE kyc_verifications ADD COLUMN zk_proof_hash TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kyc_verifications' AND column_name='kyc_status_z') THEN
    ALTER TABLE kyc_verifications ADD COLUMN kyc_status_z kyc_status NOT NULL DEFAULT 'not_started';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS kyc_nullifier_uq ON kyc_verifications(nullifier);
CREATE INDEX IF NOT EXISTS kyc_z_status_idx ON kyc_verifications(kyc_status_z);

-- ============================================================
-- CLAIMS — añadir zk_rule_hash (regla ZK opcional, Atreus)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='claims' AND column_name='zk_rule_hash') THEN
    ALTER TABLE claims ADD COLUMN zk_rule_hash TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS claims_zk_rule_hash_idx ON claims(zk_rule_hash);

-- ============================================================
-- NUEVA TABLA: commitments (Piilo, compromisos de Pedersen)
-- ============================================================
CREATE TABLE IF NOT EXISTS commitments (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commitment     TEXT NOT NULL UNIQUE,
    owner_address  TEXT NOT NULL,
    asset          TEXT NOT NULL,
    amount_encrypted TEXT NOT NULL,
    blinding_factor_hash TEXT NOT NULL,
    is_spent       BOOLEAN NOT NULL DEFAULT false,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    spent_at       TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS commitments_commitment_uq ON commitments(commitment);
CREATE INDEX IF NOT EXISTS commitments_owner_idx ON commitments(owner_address);
CREATE INDEX IF NOT EXISTS commitments_asset_idx ON commitments(asset);
CREATE INDEX IF NOT EXISTS commitments_spent_idx ON commitments(is_spent);

-- ============================================================
-- NUEVA TABLA: ramp_operations (off-ramps/on-ramps fiat)
-- ============================================================
CREATE TABLE IF NOT EXISTS ramp_operations (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    anchor         TEXT NOT NULL,
    operation_type operation_type_enum NOT NULL,
    amount_usdc    NUMERIC(20,8) NOT NULL,
    amount_ars     NUMERIC(20,8),
    cbu_cvu        TEXT,
    status         TEXT NOT NULL DEFAULT 'pending',
    kyc_nullifier  TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ramp_operations_user_idx ON ramp_operations(user_id);
CREATE INDEX IF NOT EXISTS ramp_operations_status_idx ON ramp_operations(status);
CREATE INDEX IF NOT EXISTS ramp_operations_anchor_idx ON ramp_operations(anchor);

-- ============================================================
-- NUEVA TABLA: path_payments (conversiones atómicas ARS→USDC)
-- ============================================================
CREATE TABLE IF NOT EXISTS path_payments (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    send_asset     TEXT NOT NULL,
    send_amount    NUMERIC(20,8) NOT NULL,
    dest_asset     TEXT NOT NULL,
    dest_min       NUMERIC(20,8) NOT NULL,
    destination    TEXT NOT NULL,
    tx_hash        TEXT,
    route          TEXT[],
    status         TEXT NOT NULL DEFAULT 'pending',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS path_payments_user_idx ON path_payments(user_id);
CREATE INDEX IF NOT EXISTS path_payments_status_idx ON path_payments(status);

-- ============================================================
-- Comentarios
-- ============================================================
COMMENT ON TABLE zk_nullifiers IS 'Nullifiers ZK no vinculables a identidad (Kakusho). Nunca PII.';
COMMENT ON TABLE commitments IS 'Compromisos de Pedersen de Piilo (montos ocultos, direcciones públicas).';
COMMENT ON TABLE ramp_operations IS 'Historial de off-ramps/on-ramps fiat vía anchors.';
COMMENT ON TABLE path_payments IS 'Registro de conversiones atómicas ARS→USDC (Path Payment).';
COMMENT ON COLUMN claims.zk_rule_hash IS 'Hash de regla ZK opcional (Atreus) para claims condicionales.';
COMMENT ON COLUMN users.zk_kyc_approved IS 'Derivado del nullifier de Kakusho verificado.';
COMMENT ON COLUMN kyc_verifications.nullifier IS 'Nullifier emitido por Kakusho. No vinculable a identidad.';
