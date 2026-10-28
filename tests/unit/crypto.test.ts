import { describe, it, expect } from 'vitest';
import {
  deriveVaultKey,
  generateSalt,
  encryptText,
  decryptText,
  encryptPayload,
  decryptPayload,
  encryptFileBuffer,
  decryptFileBuffer,
  generateRecoveryKey,
  generatePassword,
} from '../../src/lib/crypto';

describe('BlackVault Cryptographic Engine', () => {
  it('should derive a valid CryptoKey from a master password and salt', async () => {
    const salt = generateSalt();
    expect(salt).toBeDefined();
    expect(typeof salt).toBe('string');

    const key = await deriveVaultKey('TestMasterPassword123!', salt);
    expect(key).toBeDefined();
    expect(key.algorithm.name).toBe('AES-GCM');
  });

  it('should encrypt and decrypt a string payload correctly', async () => {
    const salt = generateSalt();
    const key = await deriveVaultKey('SecretPasswordVault', salt);

    const secretText = 'CONFIDENTIAL_VAULT_ITEM_DATA_9988';
    const encrypted = await encryptText(secretText, key);

    expect(encrypted).not.toContain(secretText);
    expect(encrypted).toContain('"alg":"AES-256-GCM"');
    expect(encrypted).toContain('"v":1');

    const decrypted = await decryptText(encrypted, key);
    expect(decrypted).toBe(secretText);
  });

  it('should encrypt and decrypt structured JSON payloads', async () => {
    const salt = generateSalt();
    const key = await deriveVaultKey('MasterKeyAlpha', salt);

    const originalPayload = {
      title: 'GitHub Owner Vault',
      category: 'Development',
      fields: [
        { id: '1', key: 'username', value: 'lead-architect', isSensitive: false },
        { id: '2', key: 'password', value: 's3cur3_v4ult_t0k3n!', isSensitive: true },
      ],
      keywords: ['github', 'git', 'ssh'],
    };

    const encrypted = await encryptPayload(originalPayload, key);
    expect(encrypted).not.toContain('s3cur3_v4ult_t0k3n!');

    const decrypted = await decryptPayload<typeof originalPayload>(encrypted, key);
    expect(decrypted).toEqual(originalPayload);
  });

  it('should reject decryption when an incorrect master key is used', async () => {
    const salt = generateSalt();
    const key1 = await deriveVaultKey('CorrectPassword1', salt);
    const key2 = await deriveVaultKey('WrongPassword2', salt);

    const secret = 'Private note entry';
    const encrypted = await encryptText(secret, key1);

    await expect(decryptText(encrypted, key2)).rejects.toThrow(
      /Decryption failed|Authentication tag verification failed/
    );
  });

  it('should reject decryption if ciphertext data has been tampered with', async () => {
    const salt = generateSalt();
    const key = await deriveVaultKey('TamperCheckKey', salt);

    const secret = 'Important financial document record';
    const encrypted = await encryptText(secret, key);

    const parsed = JSON.parse(encrypted);
    // Tamper with one base64 character in data
    const tamperedData = parsed.data.slice(0, -4) + 'AAAA';
    parsed.data = tamperedData;
    const tamperedJson = JSON.stringify(parsed);

    await expect(decryptText(tamperedJson, key)).rejects.toThrow(
      /Decryption failed|Authentication tag verification failed/
    );
  });

  it('should encrypt and decrypt binary file buffers with version and IV headers', async () => {
    const salt = generateSalt();
    const key = await deriveVaultKey('BinaryMasterKey', salt);

    // Simulate an uploaded 1KB document/image file
    const sampleBytes = new Uint8Array(1024);
    for (let i = 0; i < sampleBytes.length; i++) {
      sampleBytes[i] = (i * 37) % 256;
    }

    const encryptedBytes = await encryptFileBuffer(sampleBytes.buffer, key);
    expect(encryptedBytes.length).toBeGreaterThan(sampleBytes.length);
    expect(encryptedBytes[0]).toBe(1); // Version byte 1

    const decryptedBuffer = await decryptFileBuffer(encryptedBytes.buffer, key);
    const decryptedBytes = new Uint8Array(decryptedBuffer);

    expect(decryptedBytes.length).toBe(sampleBytes.length);
    expect(decryptedBytes).toEqual(sampleBytes);
  });

  it('should generate valid recovery keys with the BV prefix', () => {
    const recoveryKey = generateRecoveryKey();
    expect(recoveryKey.startsWith('BV-')).toBe(true);
    const parts = recoveryKey.split('-');
    expect(parts.length).toBeGreaterThanOrEqual(4);
  });

  it('should generate strong passwords respecting options', () => {
    const pw = generatePassword({
      length: 24,
      includeUppercase: true,
      includeLowercase: true,
      includeNumbers: true,
      includeSymbols: true,
      excludeAmbiguous: true,
    });

    expect(pw.length).toBe(24);
    expect(/[A-Z]/.test(pw)).toBe(true);
    expect(/[a-z]/.test(pw)).toBe(true);
    expect(/[0-9]/.test(pw)).toBe(true);
    expect(/[^A-Za-z0-9]/.test(pw)).toBe(true);
  });
});
