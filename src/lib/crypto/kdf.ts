import { argon2id } from 'hash-wasm';

const ARGON2_CONFIG = {
  memorySize: 65536, // 64 MB
  iterations: 3,
  parallelism: 1,
  hashLength: 32, // 256 bits for AES-256
  outputType: 'binary' as const,
};

/**
 * Returns Web Crypto instance across browser and Node environments
 */
export function getCrypto(): Crypto {
  if (typeof globalThis.crypto !== 'undefined') {
    return globalThis.crypto;
  }
  throw new Error('Web Cryptography API is not supported in this environment');
}

/**
 * Generates cryptographically secure random bytes
 */
export function generateRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  getCrypto().getRandomValues(bytes);
  return bytes;
}

/**
 * Converts Uint8Array to Base64 string
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return globalThis.btoa(binary);
}

/**
 * Converts Base64 string to Uint8Array
 */
export function base64ToBytes(base64: string): Uint8Array {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generates a random 16-byte salt, encoded as Base64
 */
export function generateSalt(): string {
  return bytesToBase64(generateRandomBytes(16));
}

/**
 * Derives a 256-bit AES-GCM CryptoKey using Argon2id with memory-hard parameters.
 * Falls back to PBKDF2-SHA256 (600,000 iterations) if Argon2id WASM is unavailable.
 */
export async function deriveVaultKey(masterPassword: string, saltBase64: string): Promise<CryptoKey> {
  const saltBytes = base64ToBytes(saltBase64);
  const crypto = getCrypto();

  let rawKeyBytes: Uint8Array;

  try {
    rawKeyBytes = await argon2id({
      password: masterPassword,
      salt: saltBytes,
      parallelism: ARGON2_CONFIG.parallelism,
      iterations: ARGON2_CONFIG.iterations,
      memorySize: ARGON2_CONFIG.memorySize,
      hashLength: ARGON2_CONFIG.hashLength,
      outputType: 'binary',
    });
  } catch (err) {
    console.warn('Argon2id derivation failed or unsupported, using PBKDF2-SHA256 fallback:', err);
    // PBKDF2 fallback with 600,000 iterations
    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(masterPassword),
      'PBKDF2',
      false,
      ['deriveKey', 'deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBytes as BufferSource,
        iterations: 600000,
        hash: 'SHA-256',
      },
      passwordKey,
      256
    );
    rawKeyBytes = new Uint8Array(derivedBits);
  }

  // Import raw key as non-extractable AES-GCM CryptoKey
  return crypto.subtle.importKey(
    'raw',
    rawKeyBytes as BufferSource,
    { name: 'AES-GCM' },
    false, // non-extractable from memory where browser supports
    ['encrypt', 'decrypt']
  );
}

/**
 * Generates a high-entropy recovery key formatted in chunks
 * e.g. BV-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
 */
export function generateRecoveryKey(): string {
  const bytes = generateRandomBytes(24);
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // base32 Crockford without ambiguous chars 0,1,I,O
  let result = 'BV';
  for (let i = 0; i < bytes.length; i++) {
    if (i % 4 === 0) result += '-';
    result += chars[bytes[i] % chars.length];
  }
  return result;
}
