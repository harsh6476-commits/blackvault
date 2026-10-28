// Domain types for BlackVault

export interface CustomField {
  id: string;
  key: string;
  value: string;
  isSensitive: boolean;
}

export interface PasswordEntryPayload {
  title: string;
  category: string;
  websiteUrl?: string;
  isFavorite?: boolean;
  fields: CustomField[];
  keywords: string[];
  notes?: string;
}

export interface DecryptedPasswordEntry {
  id: string;
  owner_id: string;
  payload: PasswordEntryPayload;
  encryption_version: number;
  created_at: string;
  updated_at: string;
}

export interface EncryptedVaultEntry {
  id: string;
  owner_id: string;
  encrypted_payload: string; // Base64 ciphertext containing IV + ciphertext + tag + salt
  encryption_version: number;
  created_at: string;
  updated_at: string;
}

export interface FileMetadataPayload {
  originalFilename: string;
  mimeType: string;
  category?: string;
  tags?: string[];
  description?: string;
}

export interface DecryptedVaultFile {
  id: string;
  owner_id: string;
  storage_object_id: string;
  file_size: number;
  encryption_version: number;
  metadata: FileMetadataPayload;
  created_at: string;
  updated_at: string;
}

export interface EncryptedVaultFile {
  id: string;
  owner_id: string;
  encrypted_filename: string;
  encrypted_metadata: string;
  storage_object_id: string;
  file_size: number;
  mime_type?: string;
  encryption_version: number;
  created_at: string;
  updated_at: string;
}

export interface NotePayload {
  title: string;
  body: string;
  category?: string;
  keywords?: string[];
  isFavorite?: boolean;
}

export interface DecryptedVaultNote {
  id: string;
  owner_id: string;
  payload: NotePayload;
  encryption_version: number;
  created_at: string;
  updated_at: string;
}

export interface EncryptedVaultNote {
  id: string;
  owner_id: string;
  encrypted_payload: string;
  encryption_version: number;
  created_at: string;
  updated_at: string;
}

export interface AchievementPayload {
  title: string;
  organization: string;
  date: string;
  description: string;
  category: string;
  tags: string[];
  attachmentFileId?: string;
}

export interface DecryptedVaultAchievement {
  id: string;
  owner_id: string;
  payload: AchievementPayload;
  encryption_version: number;
  created_at: string;
  updated_at: string;
}

export interface EncryptedVaultAchievement {
  id: string;
  owner_id: string;
  encrypted_payload: string;
  encryption_version: number;
  created_at: string;
  updated_at: string;
}

export interface VaultSettings {
  inactivityTimeoutMinutes: number;
  autoClearClipboard: boolean;
  clipboardTimeoutSeconds: number;
  lastBackupExportAt?: string;
}

export interface EncryptedVaultSettings {
  id: string;
  owner_id: string;
  encrypted_settings: string;
  created_at: string;
  updated_at: string;
}

// Cryptography structures
export interface EncryptedContainer {
  v: number; // encryption version
  alg: 'AES-256-GCM';
  iv: string; // Base64 12-byte IV/nonce
  data: string; // Base64 ciphertext + tag
  salt?: string; // Optional salt if derived independently
}

export interface ExportedBackupContainer {
  version: 1;
  exportedAt: string;
  checksum: string;
  entries: EncryptedVaultEntry[];
  files: EncryptedVaultFile[];
  notes: EncryptedVaultNote[];
  achievements: EncryptedVaultAchievement[];
  settings?: EncryptedVaultSettings;
}
