import type { ExportedBackupContainer } from '../../types';
import { vaultApi } from '../../lib/storage/vaultStore';
import { getCrypto } from '../../lib/crypto';

/**
 * Computes SHA-256 checksum string for a serialized payload
 */
export async function computeChecksum(content: string): Promise<string> {
  const crypto = getCrypto();
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates an encrypted backup archive containing all encrypted vault records
 */
export async function exportEncryptedBackup(ownerId: string): Promise<ExportedBackupContainer> {
  const [entries, files, notes, achievements, settings] = await Promise.all([
    vaultApi.getEntries(ownerId),
    vaultApi.getFiles(ownerId),
    vaultApi.getNotes(ownerId),
    vaultApi.getAchievements(ownerId),
    vaultApi.getSettings(ownerId),
  ]);

  const rawContainer: Omit<ExportedBackupContainer, 'checksum'> = {
    version: 1,
    exportedAt: new Date().toISOString(),
    entries,
    files,
    notes,
    achievements,
    settings: settings || undefined,
  };

  const serializedWithoutChecksum = JSON.stringify(rawContainer);
  const checksum = await computeChecksum(serializedWithoutChecksum);

  return {
    ...rawContainer,
    checksum,
  };
}

/**
 * Validates and restores an imported backup archive
 */
export async function validateAndImportBackup(
  backupJson: string,
  ownerId: string,
  mode: 'merge' | 'replace' = 'merge'
): Promise<{ importedCount: number; errors: string[] }> {
  let container: ExportedBackupContainer;
  const errors: string[] = [];

  try {
    container = JSON.parse(backupJson);
  } catch {
    throw new Error('Invalid JSON format in backup file');
  }

  if (container.version !== 1) {
    throw new Error(`Unsupported backup format version: ${container.version}`);
  }

  // Verify Checksum
  const { checksum, ...rest } = container;
  const computed = await computeChecksum(JSON.stringify(rest));
  if (computed !== checksum) {
    throw new Error('Backup integrity validation failed: SHA-256 checksum mismatch. File may be corrupted or tampered with.');
  }

  let count = 0;

  // If replace mode, clear existing entries
  if (mode === 'replace') {
    const [existingEntries, existingNotes, existingAchievements] = await Promise.all([
      vaultApi.getEntries(ownerId),
      vaultApi.getNotes(ownerId),
      vaultApi.getAchievements(ownerId),
    ]);

    for (const e of existingEntries) await vaultApi.deleteEntry(e.id);
    for (const n of existingNotes) await vaultApi.deleteNote(n.id);
    for (const a of existingAchievements) await vaultApi.deleteAchievement(a.id);
  }

  // Import entries
  for (const entry of container.entries || []) {
    try {
      await vaultApi.createEntry({
        owner_id: ownerId,
        encrypted_payload: entry.encrypted_payload,
        encryption_version: entry.encryption_version || 1,
      });
      count++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Failed to import password entry: ${msg}`);
    }
  }

  // Import notes
  for (const note of container.notes || []) {
    try {
      await vaultApi.createNote({
        owner_id: ownerId,
        encrypted_payload: note.encrypted_payload,
        encryption_version: note.encryption_version || 1,
      });
      count++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Failed to import note: ${msg}`);
    }
  }

  // Import achievements
  for (const ach of container.achievements || []) {
    try {
      await vaultApi.createAchievement({
        owner_id: ownerId,
        encrypted_payload: ach.encrypted_payload,
        encryption_version: ach.encryption_version || 1,
      });
      count++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Failed to import achievement: ${msg}`);
    }
  }

  return { importedCount: count, errors };
}
