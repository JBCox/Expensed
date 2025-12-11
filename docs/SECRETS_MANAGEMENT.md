# Secrets Management - Expensed Security Architecture

**Last Updated:** December 6, 2025
**Version:** 1.0
**Classification:** Internal - Engineering Team

---

## Overview

Expensed uses enterprise-grade encryption to protect customer Stripe API keys. Each organization that uses Expensed can enter their own Stripe API key to process employee reimbursements directly through their Stripe account.

This document describes the security architecture, encryption implementation, and operational procedures for managing these secrets.

---

## Security Architecture

### Encryption Model: Envelope Encryption with AES-256-GCM

```
┌─────────────────────────────────────────────────────────────────────┐
│                      ENCRYPTION FLOW                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Customer Stripe Key (plaintext)                                    │
│          │                                                          │
│          ▼                                                          │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │  PBKDF2 Key Derivation                                   │       │
│  │  - Master Key (from environment) + Organization ID       │       │
│  │  - 16-byte random salt                                   │       │
│  │  - 100,000 iterations                                    │       │
│  │  - SHA-256 hash                                          │       │
│  └─────────────────────────────────────────────────────────┘       │
│          │                                                          │
│          ▼                                                          │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │  AES-256-GCM Encryption                                  │       │
│  │  - 256-bit derived key                                   │       │
│  │  - 12-byte random IV                                     │       │
│  │  - Authenticated encryption (tamper-proof)               │       │
│  └─────────────────────────────────────────────────────────┘       │
│          │                                                          │
│          ▼                                                          │
│  Ciphertext + IV + Salt + Hash (stored in database)                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| Master Encryption Key (MEK) | Edge Function environment variable | Root key for all encryption |
| Data Encryption Key (DEK) | Derived per-request | Actually encrypts the Stripe key |
| Encrypted Stripe Key | `organization_secrets` table | Customer's Stripe API key (encrypted) |
| IV (Initialization Vector) | `organization_secrets` table | Ensures unique ciphertext |
| Salt | `organization_secrets` table | Randomizes key derivation |
| Key Hash | `organization_secrets` table | SHA-256 for integrity verification |

### Why This Design?

1. **Master Key Never Touches Database**: The MEK only exists in the Edge Function runtime
2. **Per-Organization Isolation**: Each org's key is derived differently (MEK + orgId + salt)
3. **Authenticated Encryption**: AES-GCM prevents tampering - modified ciphertext fails decryption
4. **Hash Verification**: Additional integrity check after decryption
5. **Key Rotation Ready**: Can rotate MEK without re-encrypting all data (via versioning)

---

## Database Schema

### organization_secrets

```sql
CREATE TABLE organization_secrets (
  id UUID PRIMARY KEY,
  organization_id UUID UNIQUE NOT NULL,

  -- Encrypted data (all base64 encoded)
  encrypted_stripe_key TEXT,      -- AES-256-GCM ciphertext
  encryption_iv TEXT,              -- 12-byte IV
  encryption_salt TEXT,            -- 16-byte salt
  encryption_version INTEGER,      -- Algorithm version (1 = AES-256-GCM)

  -- Metadata (safe to store unencrypted)
  key_last_four TEXT,              -- "xxxx" for display
  key_mode TEXT,                   -- "test" or "live"
  key_hash TEXT,                   -- SHA-256 for integrity

  -- Lifecycle
  set_by UUID,
  set_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  access_count INTEGER,

  -- Rotation support
  previous_encrypted_key TEXT,
  previous_iv TEXT,
  previous_salt TEXT,
  rotated_at TIMESTAMPTZ
);
```

### secret_access_log (Audit Trail)

```sql
CREATE TABLE secret_access_log (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  operation TEXT NOT NULL,         -- 'key_set', 'key_get', 'key_delete', etc.
  performed_by UUID,
  performed_at TIMESTAMPTZ,
  success BOOLEAN NOT NULL,
  failure_reason TEXT,
  metadata JSONB
);
```

### secret_rate_limits (Brute-Force Protection)

```sql
CREATE TABLE secret_rate_limits (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  operation TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  attempt_count INTEGER DEFAULT 1
);
```

---

## Rate Limits

| Operation | Limit | Window | Purpose |
|-----------|-------|--------|---------|
| `key_set` | 3 attempts | 1 hour | Prevent key flooding |
| `key_test` | 5 attempts | 1 hour | Prevent Stripe API abuse |
| `key_get` | 100 attempts | 1 hour | Allow legitimate payout operations |
| `key_rotate` | 3 attempts | 1 hour | Prevent rotation abuse |

Rate limiting is enforced at the database level via the `check_secret_rate_limit()` SECURITY DEFINER function.

---

## Security Controls

### Access Control

| Who | Can Do |
|-----|--------|
| **Organization Admin** | Set, test, remove Stripe key |
| **Finance/Admin** | Trigger payouts (uses key internally) |
| **Regular Members** | Cannot access key operations |
| **Service Role** | Execute SECURITY DEFINER functions |
| **Anonymous** | Nothing |

### RLS Policies

```sql
-- organization_secrets: NO direct access
CREATE POLICY "No direct access to secrets"
  ON organization_secrets FOR ALL
  USING (false);

-- All operations go through SECURITY DEFINER functions
```

### SECURITY DEFINER Functions

| Function | Purpose | Access Level |
|----------|---------|--------------|
| `set_org_stripe_key()` | Store encrypted key | Admin via Edge Function |
| `get_org_stripe_key()` | Retrieve encrypted key | Finance/Admin via Edge Function |
| `get_org_stripe_status()` | Get metadata (not key) | Any org member |
| `remove_org_stripe_key()` | Delete key | Admin via Edge Function |
| `check_secret_rate_limit()` | Enforce rate limits | System |
| `log_secret_access()` | Create audit entry | System |

---

## Environment Configuration

### Required Environment Variables

```bash
# Supabase Edge Function Secrets
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Never expose to client!

# Encryption Master Key (CRITICAL)
ENCRYPTION_MASTER_KEY=your-32-plus-character-secret-key
```

### Setting the Master Key

**Production (Supabase):**
```bash
supabase secrets set ENCRYPTION_MASTER_KEY="your-very-long-secret-key-min-32-chars"
```

**Local Development:**
```bash
# In supabase/.env.local
ENCRYPTION_MASTER_KEY=dev-secret-key-for-local-testing-only-32chars
```

### Master Key Requirements

- **Minimum length:** 32 characters
- **Recommended:** 64+ characters of random alphanumeric
- **Generate:** `openssl rand -base64 48`
- **Never commit:** Add to `.gitignore` and secrets manager

---

## Encryption Algorithm Details

### AES-256-GCM

- **Algorithm:** AES (Advanced Encryption Standard)
- **Key Size:** 256 bits
- **Mode:** GCM (Galois/Counter Mode)
- **IV Size:** 96 bits (12 bytes) - NIST recommended for GCM
- **Auth Tag:** 128 bits (included in ciphertext)

### PBKDF2 Key Derivation

- **Algorithm:** PBKDF2
- **Hash:** SHA-256
- **Iterations:** 100,000
- **Salt Size:** 128 bits (16 bytes)
- **Output:** 256-bit key

### Implementation (Deno/Web Crypto API)

```typescript
// Key derivation
const derivedKey = await crypto.subtle.deriveKey(
  {
    name: "PBKDF2",
    salt: salt,
    iterations: 100000,
    hash: "SHA-256"
  },
  baseKey,
  { name: "AES-GCM", length: 256 },
  false,
  ["encrypt", "decrypt"]
);

// Encryption
const ciphertext = await crypto.subtle.encrypt(
  { name: "AES-GCM", iv: iv },
  derivedKey,
  plaintext
);
```

---

## Operational Procedures

### Adding a New Stripe Key (Admin)

1. Admin navigates to Settings > Payout Settings
2. Enters Stripe API key (sk_test_... or sk_live_...)
3. System tests key against Stripe API (GET /v1/balance)
4. If valid, key is encrypted and stored
5. Audit log entry created
6. Organization's payout_method set to "stripe"

### Rotating a Stripe Key

1. Admin enters new key in payout settings
2. System archives old encrypted key (previous_encrypted_key columns)
3. New key encrypted and stored
4. `rotated_at` timestamp set
5. Audit log entry: "key_rotate"

### Removing a Stripe Key

1. Admin clicks "Remove Stripe Key"
2. System clears encrypted key data
3. Previous key archived for audit
4. `rotation_reason` set to "key_removed"
5. Organization's payout_method reverts to "manual"

### Investigating Security Incidents

1. Check `secret_access_log` for the organization:
   ```sql
   SELECT * FROM secret_access_log
   WHERE organization_id = 'xxx'
   ORDER BY performed_at DESC;
   ```

2. Look for:
   - Multiple failed attempts (`success = false`)
   - Unusual access patterns
   - Rate limit violations (`operation = 'rate_limited'`)

3. Check rate limit history:
   ```sql
   SELECT * FROM secret_rate_limits
   WHERE organization_id = 'xxx'
   ORDER BY window_start DESC;
   ```

---

## Compliance Considerations

### SOC 2 Type II

- **CC6.1 (Logical Access):** RLS policies prevent unauthorized access
- **CC6.6 (Encryption):** AES-256-GCM encryption at rest
- **CC7.1 (Change Management):** Audit log tracks all changes
- **CC7.2 (Incident Response):** Audit trail for investigation

### PCI DSS (if applicable)

- **Requirement 3:** Encrypted storage of sensitive authentication data
- **Requirement 8:** Access control via admin role
- **Requirement 10:** Audit trail of all access

### GDPR

- **Article 32:** Appropriate technical measures (encryption)
- **Article 33:** Audit log supports breach notification

---

## Disaster Recovery

### Key Backup Strategy

1. **Master Key:** Stored in secrets manager (not database)
   - Back up to secure vault (1Password, AWS Secrets Manager, etc.)
   - Document recovery procedure

2. **Encrypted Keys:** Part of regular database backups
   - Useless without master key
   - Can be restored from any backup

### Master Key Rotation

**Procedure:**

1. Generate new master key
2. Deploy new Edge Function version with new key
3. Run migration script to re-encrypt all keys:
   ```typescript
   // For each organization:
   // 1. Decrypt with old key
   // 2. Re-encrypt with new key
   // 3. Update database
   // 4. Increment encryption_version
   ```
4. Retire old master key

---

## Security Checklist

### Deployment

- [ ] Master key set in production secrets
- [ ] Master key meets minimum length (32+ chars)
- [ ] Master key backed up securely
- [ ] Edge Function deployed with new code
- [ ] Database migration applied
- [ ] RLS policies verified

### Monitoring

- [ ] Alert on multiple failed key access attempts
- [ ] Alert on rate limit violations
- [ ] Regular audit log review
- [ ] Access count monitoring for anomalies

### Testing

- [ ] Encryption/decryption round-trip works
- [ ] Rate limiting enforced correctly
- [ ] Audit logs created for all operations
- [ ] Admin-only access verified
- [ ] Key rotation preserves previous key

---

## Contact

**Security Issues:** Report to security@expensed.app
**Engineering Questions:** Create issue in GitHub repository

---

*This document contains sensitive security information. Handle accordingly.*
