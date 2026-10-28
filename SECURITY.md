# SECURITY SPECIFICATION & THREAT MODEL

## 1. Threat Model

BLACKVAULT protects sensitive personal credentials, documents, and records under the following threat model:

1. **Untrusted Host / Database Compromise:**
   - The PostgreSQL database and storage provider are considered untrusted storage mediums.
   - Attackers with full read access to database tables or object storage cannot read decrypted vault records, passwords, custom fields, or file contents.
2. **Eavesdropping / Network Interception:**
   - All network transit is protected via TLS/HTTPS.
   - Even if TLS termination is intercepted by an adversary, payloads transmitted over the wire are already encrypted using AES-256-GCM.
3. **Multi-Tenant / Unauthorized Access Attempts:**
   - Single-owner architecture strictly rejects anonymous access and multi-user registration.
   - PostgreSQL trigger `trg_single_owner` blocks any second registration attempt at the database layer.
   - Row Level Security (RLS) ensures that all queries verify `is_blackvault_owner()`.

---

## 2. Cryptographic Architecture

### Key Derivation: Argon2id
- **Function:** Argon2id via WebAssembly (`hash-wasm`).
- **Parameters:** Memory size: 64MB (`65536 KB`), 3 iterations, parallelism 1, 256-bit output.
- **Fallback:** PBKDF2-SHA256 with 600,000 iterations via W3C Web Cryptography API if WebAssembly is unavailable.
- **Master Salt:** Cryptographically generated 16-byte random salt stored in `owner_profiles.master_salt`. The salt is unique per owner and prevents pre-computed rainbow table attacks.

### Authenticated Encryption: AES-256-GCM
- **Algorithm:** AES-256-GCM (Galois/Counter Mode).
- **IV/Nonce:** 96-bit (12-byte) cryptographically secure random nonce generated fresh per encryption operation (`crypto.getRandomValues`). Nonces are never reused.
- **Tag:** 128-bit authentication tag verified by the cryptographic runtime upon decryption. Any byte alteration fails with an immediate authentication failure.
- **Container Format:**
  ```json
  {
    "v": 1,
    "alg": "AES-256-GCM",
    "iv": "<Base64 12 bytes>",
    "data": "<Base64 ciphertext + 16 bytes tag>"
  }
  ```

### Binary File Buffer Format
Binary files uploaded to `blackvault-encrypted` storage follow this payload layout:
```
[ 1 byte Version (0x01) ] [ 12 bytes Nonce (IV) ] [ Ciphertext + 16 bytes Tag ]
```

---

## 3. In-Memory Key Management & Scrubbing

- **Non-Extractable CryptoKey:** Keys are derived directly into non-extractable CryptoKey handles where browser engines support it.
- **No Persistent Plaintext Storage:** The master password and raw derived keys are **never** written to `localStorage`, `sessionStorage`, `IndexedDB`, or cookies.
- **Inactivity Scrubbing:** When 5 minutes of user inactivity elapses or the user clicks `LOCK VAULT`:
  - The in-memory `CryptoKey` reference is set to `null`.
  - All decrypted state arrays (`entries`, `files`, `notes`, `achievements`) are emptied.
  - All active `blob:` preview URLs are revoked with `URL.revokeObjectURL()`.
- **Visibility Change Watchdog:** Listening to `document.visibilitychange` ensures backgrounded or sleeping browser tabs lock immediately if elapsed time exceeded the threshold.

---

## 4. Inherent Browser Limitations

- **Garbage Collection:** JavaScript cannot guarantee deterministic memory wiping of strings previously allocated.
- **Compromised Endpoints:** Malware, malicious browser extensions with broad DOM permissions, or device keyloggers can capture plaintext before encryption. The owner should maintain a dedicated, clean browser profile free of untrusted extensions.
