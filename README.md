# PROJECT BLACKVAULT

> **A minimal, zero-knowledge, single-owner personal digital vault with client-side authenticated encryption.**

BLACKVAULT is designed exclusively for a single owner. It provides sovereign personal infrastructure for storing credentials, encrypted files, private notes, and achievement records without third-party surveillance, telemetry, or multi-tenant risk.

---

## Key Features

- **Single-Owner Enclave:** Restricted to one explicitly configured owner. No public registration, invite systems, or multi-user accounts.
- **Client-Side Authenticated Encryption:** Sensitive data (passwords, custom fields, notes, achievement records, and files) are encrypted in the browser with **AES-256-GCM** using **Argon2id** key derivation before transmission. Plaintext never touches the server or database.
- **Custom Password Manager:** Flexible key-value entries with unlimited arbitrary fields, sensitive masking, one-click copy, and a cryptographically secure random password generator.
- **Encrypted Document Vault:** Client-side binary encryption before upload to private object storage. In-memory decryption for previewing and downloading.
- **Private Notes & Portfolio:** Markdown-capable encrypted memoranda and career/education achievement records with document attachment references.
- **5-Minute Inactivity Auto-Lock:** Strict 5-minute inactivity timer that clears decrypted state, wipes non-extractable keys, and revokes temporary blob URLs.
- **Cryptographic Backups:** Export and restore AES-256 encrypted JSON archives protected by SHA-256 integrity checksums.
- **Minimalist Aesthetic:** High-contrast developer-oriented dark theme (`#000000`, `#080808`, `#0C0C0C`, `#101010`, `#242424`) with restrained emerald accents (`#00D68F`).

---

## Technology Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, React Router 7.
- **Cryptography:** Web Cryptography API (`crypto.subtle`) for AES-256-GCM, `hash-wasm` for WebAssembly Argon2id, and standard cryptographically secure PRNG.
- **Backend & Database:** Supabase PostgreSQL with strict Row Level Security (RLS) policies and private Supabase Storage buckets.
- **Testing:** Vitest with unit, integration, and security verification suites.

---

## Getting Started

### Prerequisites

- Node.js `v20+` or `v24+`
- npm `v10+`
- Supabase account (or run locally in standalone mode)

### 1. Installation

Clone and install dependencies:

```bash
git clone https://github.com/your-username/blackvault.git
cd blackvault
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Set your Supabase credentials:

```ini
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

*(Note: If no Supabase credentials are provided, BLACKVAULT automatically runs in **Offline Standalone Mode**, where data is encrypted in-memory/locally for development and testing).*

### 3. Apply Database Migration

1. In the Supabase Dashboard, open the **SQL Editor**.
2. Run the migration script located at:
   [`supabase/migrations/20261029000000_blackvault_schema.sql`](supabase/migrations/20261029000000_blackvault_schema.sql)
3. This creates:
   - `public.owner_profiles` (with trigger enforcing exactly 1 owner)
   - `public.vault_entries`
   - `public.vault_files`
   - `public.vault_notes`
   - `public.vault_achievements`
   - `public.vault_settings`
   - Row-Level Security policies on every table
   - Private storage bucket `blackvault-encrypted`

### 4. Running Locally

```bash
npm run dev
```

Open `http://localhost:5173` to access BLACKVAULT.

---

## Initial Owner Onboarding

1. Launch BLACKVAULT in your browser.
2. Click **SETUP OWNER** on the unlock screen.
3. Enter your owner email and choose a strong master password.
4. BLACKVAULT generates a random 16-byte cryptographic salt, derives your vault key using Argon2id, and registers your single-owner profile.
5. In your Supabase Dashboard under Authentication -> MFA, enroll your authenticator app (TOTP) to enforce mandatory second-factor authentication.

---

## Security Commands & Testing

Run all unit, integration, and security test suites:

```bash
npx vitest run
```

Run production build validation:

```bash
npm run build
```

---

## License

Private & Proprietary. All rights reserved.
