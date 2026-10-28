import { describe, it, expect } from 'vitest';
import {
  deriveVaultKey,
  generateSalt,
  encryptPayload,
  decryptPayload,
  encryptText,
  decryptText,
  generateRandomBytes,
} from '../../src/lib/crypto';

describe('BlackVault Security Verification Suite', () => {
  it('SECURITY TEST: Plaintext password never appears in ciphertext payload', async () => {
    const salt = generateSalt();
    const key = await deriveVaultKey('MasterSecret!2026', salt);

    const sensitiveData = {
      title: 'Banking Portal',
      fields: [
        { id: '1', key: 'Account', value: '1234-5678-9012' },
        { id: '2', key: 'MasterPIN', value: 'SUPER_SECRET_PIN_8899' },
      ],
      keywords: ['finance', 'bank'],
    };

    const ciphertext = await encryptPayload(sensitiveData, key);

    // Verify plaintext string is mathematically absent from output container
    expect(ciphertext).not.toContain('SUPER_SECRET_PIN_8899');
    expect(ciphertext).not.toContain('1234-5678-9012');
    expect(ciphertext).not.toContain('Banking Portal');
  });

  it('SECURITY TEST: Every encryption invocation generates a unique unpredictable 96-bit nonce', async () => {
    const salt = generateSalt();
    const key = await deriveVaultKey('UniqueNonceKey', salt);
    const text = 'Identical plaintext text string';

    const enc1 = JSON.parse(await encryptText(text, key));
    const enc2 = JSON.parse(await encryptText(text, key));

    // IV/nonce must never repeat even for identical text and identical key
    expect(enc1.iv).not.toEqual(enc2.iv);
    // Resulting ciphertext must also be completely different
    expect(enc1.data).not.toEqual(enc2.data);
  });

  it('SECURITY TEST: Corrupted or tampered ciphertext fails authentication verification immediately', async () => {
    const salt = generateSalt();
    const key = await deriveVaultKey('AuthTagKey', salt);
    const text = 'Confidential memo for single owner';

    const rawContainer = await encryptText(text, key);
    const parsed = JSON.parse(rawContainer);

    // Tamper with data byte
    const binaryBytes = Buffer.from(parsed.data, 'base64');
    binaryBytes[0] ^= 0xFF; // Flip bits
    parsed.data = binaryBytes.toString('base64');

    await expect(decryptText(JSON.stringify(parsed), key)).rejects.toThrow(
      /Decryption failed|Authentication tag verification failed/
    );
  });

  it('SECURITY TEST: Key derivation with different salt produces isolated keys', async () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();

    const key1 = await deriveVaultKey('IdenticalPassword123!', salt1);
    const key2 = await deriveVaultKey('IdenticalPassword123!', salt2);

    const ciphertext = await encryptText('Encrypted with salt1', key1);

    // Cannot decrypt with key derived from salt2
    await expect(decryptText(ciphertext, key2)).rejects.toThrow();
  });
});
