import { bytesToBase64, base64ToBytes, generateRandomBytes, getCrypto } from './kdf';
import type { EncryptedContainer } from '../../types';

export const ENCRYPTION_VERSION = 1;

/**
 * Encrypts arbitrary UTF-8 text or serialized JSON using AES-256-GCM with a unique 96-bit IV.
 * Returns a serialized JSON string containing { v, alg, iv, data }.
 */
export async function encryptText(plainText: string, key: CryptoKey): Promise<string> {
  const crypto = getCrypto();
  const iv = generateRandomBytes(12);
  const encodedData = new TextEncoder().encode(plainText);

  const cipherBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource,
      tagLength: 128, // 128-bit authentication tag
    },
    key,
    encodedData
  );

  const container: EncryptedContainer = {
    v: ENCRYPTION_VERSION,
    alg: 'AES-256-GCM',
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(cipherBuffer)),
  };

  return JSON.stringify(container);
}

/**
 * Encrypts an object by serializing it to JSON first.
 */
export async function encryptPayload<T>(payload: T, key: CryptoKey): Promise<string> {
  const jsonStr = JSON.stringify(payload);
  return encryptText(jsonStr, key);
}

/**
 * Decrypts a serialized EncryptedContainer string and returns the decoded UTF-8 string.
 * Throws an explicit error if the authentication tag is invalid or wrong key is supplied.
 */
export async function decryptText(encryptedJsonStr: string, key: CryptoKey): Promise<string> {
  const crypto = getCrypto();
  let container: EncryptedContainer;
  try {
    container = JSON.parse(encryptedJsonStr);
  } catch {
    throw new Error('Malformed encrypted payload container');
  }

  if (container.v !== ENCRYPTION_VERSION || container.alg !== 'AES-256-GCM') {
    throw new Error(`Unsupported encryption version or algorithm: v${container.v} ${container.alg}`);
  }

  const iv = base64ToBytes(container.iv);
  const cipherBytes = base64ToBytes(container.data);

  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as BufferSource,
        tagLength: 128,
      },
      key,
      cipherBytes as BufferSource
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch {
    throw new Error('Decryption failed: Authentication tag verification failed or invalid key');
  }
}

/**
 * Decrypts an encrypted payload container and parses the JSON result.
 */
export async function decryptPayload<T>(encryptedJsonStr: string, key: CryptoKey): Promise<T> {
  const jsonStr = await decryptText(encryptedJsonStr, key);
  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    throw new Error('Decrypted content is not valid JSON');
  }
}

/**
 * Encrypts binary data (such as a file ArrayBuffer) using AES-256-GCM.
 * Prepends the 12-byte IV to the ciphertext output so the entire file can be saved as a single binary blob.
 * Format: [1 byte version (1)] [12 bytes IV] [Ciphertext + 16 bytes auth tag]
 */
export async function encryptFileBuffer(data: ArrayBuffer, key: CryptoKey): Promise<Uint8Array> {
  const crypto = getCrypto();
  const iv = generateRandomBytes(12);

  const cipherBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource,
      tagLength: 128,
    },
    key,
    data
  );

  const cipherArray = new Uint8Array(cipherBuffer);
  const totalLength = 1 + 12 + cipherArray.length;
  const result = new Uint8Array(totalLength);

  result[0] = ENCRYPTION_VERSION;
  result.set(iv, 1);
  result.set(cipherArray, 13);

  return result;
}

/**
 * Decrypts binary data previously encrypted with encryptFileBuffer.
 * Verifies version, extracts IV, and decrypts using AES-256-GCM.
 */
export async function decryptFileBuffer(encryptedData: ArrayBuffer, key: CryptoKey): Promise<ArrayBuffer> {
  const crypto = getCrypto();
  const bytes = new Uint8Array(encryptedData);
  if (bytes.length < 1 + 12 + 16) {
    throw new Error('Encrypted file buffer is too short to be valid');
  }

  const version = bytes[0];
  if (version !== ENCRYPTION_VERSION) {
    throw new Error(`Unsupported encrypted file version: ${version}`);
  }

  const iv = bytes.slice(1, 13);
  const cipherBytes = bytes.slice(13);

  try {
    return await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as BufferSource,
        tagLength: 128,
      },
      key,
      cipherBytes as BufferSource
    );
  } catch {
    throw new Error('File decryption failed: Invalid key or file ciphertext has been tampered with');
  }
}
