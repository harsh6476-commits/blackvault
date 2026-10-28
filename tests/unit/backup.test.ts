import { describe, it, expect } from 'vitest';
import { computeChecksum, validateAndImportBackup } from '../../src/features/backup/backupService';
import type { ExportedBackupContainer } from '../../src/types';

describe('Backup and Integrity Verification Engine', () => {
  it('should compute consistent SHA-256 checksums', async () => {
    const data = JSON.stringify({ test: 'blackvault-vault-export-v1' });
    const hash1 = await computeChecksum(data);
    const hash2 = await computeChecksum(data);

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // 64 hex characters = 256 bits
  });

  it('should detect altered payload checksums and reject corrupted backups', async () => {
    const rawBackup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      entries: [],
      files: [],
      notes: [],
      achievements: [],
    };
    const validChecksum = await computeChecksum(JSON.stringify(rawBackup));

    const validContainer: ExportedBackupContainer = {
      ...rawBackup,
      version: 1,
      checksum: validChecksum,
    };

    // Valid backup should pass validation
    const result = await validateAndImportBackup(JSON.stringify(validContainer), 'test-owner');
    expect(result.errors.length).toBe(0);

    // Tampered backup with altered checksum should throw integrity error
    const corruptedContainer = {
      ...validContainer,
      checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', // fake hash
    };

    await expect(
      validateAndImportBackup(JSON.stringify(corruptedContainer), 'test-owner')
    ).rejects.toThrow(/Backup integrity validation failed/);
  });
});
