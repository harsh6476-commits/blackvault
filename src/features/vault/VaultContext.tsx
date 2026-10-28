import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase, isConfigured } from '../../lib/supabase';
import {
  deriveVaultKey,
  decryptPayload,
  encryptPayload,
  generateSalt,
} from '../../lib/crypto';
import { vaultApi } from '../../lib/storage/vaultStore';
import type {
  DecryptedPasswordEntry,
  DecryptedVaultFile,
  DecryptedVaultNote,
  DecryptedVaultAchievement,
  VaultSettings,
  FileMetadataPayload,
} from '../../types';

interface VaultContextType {
  // Auth & Session
  isAuthenticated: boolean;
  isVaultUnlocked: boolean;
  isMfaRequired: boolean;
  ownerId: string | null;
  ownerEmail: string | null;
  needsInitialSetup: boolean;

  // Unlocked in-memory decrypted records
  entries: DecryptedPasswordEntry[];
  files: DecryptedVaultFile[];
  notes: DecryptedVaultNote[];
  achievements: DecryptedVaultAchievement[];
  settings: VaultSettings;

  // Actions
  unlockVault: (masterPassword: string) => Promise<boolean>;
  lockVault: () => void;
  logout: () => Promise<void>;
  initializeOwner: (email: string, masterPassword: string) => Promise<void>;

  // Data mutations (always encrypted before writing to backend/storage)
  savePasswordEntry: (payload: DecryptedPasswordEntry['payload'], id?: string) => Promise<void>;
  deletePasswordEntry: (id: string) => Promise<void>;
  
  uploadVaultFile: (file: File, category?: string, tags?: string[]) => Promise<void>;
  updateFileMetadata: (id: string, metadata: FileMetadataPayload) => Promise<void>;
  deleteVaultFile: (id: string) => Promise<void>;
  downloadVaultFile: (file: DecryptedVaultFile) => Promise<Blob>;
  previewVaultFile: (file: DecryptedVaultFile) => Promise<string>; // Returns temporary Blob URL

  saveVaultNote: (payload: DecryptedVaultNote['payload'], id?: string) => Promise<void>;
  deleteVaultNote: (id: string) => Promise<void>;

  saveVaultAchievement: (payload: DecryptedVaultAchievement['payload'], id?: string) => Promise<void>;
  deleteVaultAchievement: (id: string) => Promise<void>;

  updateSettings: (newSettings: Partial<VaultSettings>) => Promise<void>;

  // Activity tracking
  touchActivity: () => void;
  lockdownCountdown: number; // seconds remaining until inactivity lock
  activePreviewUrls: string[];
}

const DEFAULT_SETTINGS: VaultSettings = {
  inactivityTimeoutMinutes: 5,
  autoClearClipboard: true,
  clipboardTimeoutSeconds: 30,
};

const VaultContext = createContext<VaultContextType | null>(null);

export const VaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!isConfigured); // In standalone/dev mode, auth starts verified
  const [isVaultUnlocked, setIsVaultUnlocked] = useState<boolean>(false);
  const [isMfaRequired, setIsMfaRequired] = useState<boolean>(false);
  const [ownerId, setOwnerId] = useState<string | null>(!isConfigured ? 'local-owner' : null);
  const [ownerEmail, setOwnerEmail] = useState<string | null>(!isConfigured ? 'owner@blackvault.local' : null);
  const [needsInitialSetup, setNeedsInitialSetup] = useState<boolean>(false);

  // IN-MEMORY CRYPTO KEY - Never saved to localStorage, sessionStorage, or IndexedDB
  const vaultKeyRef = useRef<CryptoKey | null>(null);
  const masterSaltRef = useRef<string | null>(!isConfigured ? 'BLACKVAULT_LOCAL_SALT_1234567890==' : null);

  // Decrypted in-memory state
  const [entries, setEntries] = useState<DecryptedPasswordEntry[]>([]);
  const [files, setFiles] = useState<DecryptedVaultFile[]>([]);
  const [notes, setNotes] = useState<DecryptedVaultNote[]>([]);
  const [achievements, setAchievements] = useState<DecryptedVaultAchievement[]>([]);
  const [settings, setSettings] = useState<VaultSettings>(DEFAULT_SETTINGS);

  // Track created temporary Blob URLs to revoke on lock or unmount
  const previewUrlsRef = useRef<Set<string>>(new Set());

  // Inactivity tracking
  const [secondsRemaining, setSecondsRemaining] = useState<number>(300);
  const lastActivityRef = useRef<number>(Date.now());

  // Revoke all preview blob URLs
  const revokeAllPreviews = useCallback(() => {
    previewUrlsRef.current.forEach(url => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // Ignore
      }
    });
    previewUrlsRef.current.clear();
  }, []);

  // Securely lock the vault and scrub decrypted data from memory
  const lockVault = useCallback(() => {
    setIsVaultUnlocked(false);
    vaultKeyRef.current = null;
    setEntries([]);
    setFiles([]);
    setNotes([]);
    setAchievements([]);
    revokeAllPreviews();
  }, [revokeAllPreviews]);

  // Touch activity
  const touchActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setSecondsRemaining(settings.inactivityTimeoutMinutes * 60);
  }, [settings.inactivityTimeoutMinutes]);

  // Inactivity timer effect
  useEffect(() => {
    if (!isVaultUnlocked) return;

    const interval = window.setInterval(() => {
      const now = Date.now();
      const timeoutMs = settings.inactivityTimeoutMinutes * 60 * 1000;
      const elapsed = now - lastActivityRef.current;
      const remainingSecs = Math.max(0, Math.ceil((timeoutMs - elapsed) / 1000));
      setSecondsRemaining(remainingSecs);

      if (elapsed >= timeoutMs) {
        lockVault();
      }
    }, 1000);

    const handleUserEvent = () => touchActivity();
    window.addEventListener('mousemove', handleUserEvent, { passive: true });
    window.addEventListener('keydown', handleUserEvent, { passive: true });
    window.addEventListener('touchstart', handleUserEvent, { passive: true });

    // Handle tab visibility change
    const handleVisibility = () => {
      if (document.hidden) {
        // Tab backgrounded: check elapsed time immediately upon return
      } else {
        const now = Date.now();
        const timeoutMs = settings.inactivityTimeoutMinutes * 60 * 1000;
        if (now - lastActivityRef.current >= timeoutMs) {
          lockVault();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', handleUserEvent);
      window.removeEventListener('keydown', handleUserEvent);
      window.removeEventListener('touchstart', handleUserEvent);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isVaultUnlocked, settings.inactivityTimeoutMinutes, touchActivity, lockVault]);

  // Initial Supabase auth check if configured
  useEffect(() => {
    if (!isConfigured) return;

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setIsAuthenticated(true);
        setOwnerEmail(session.user.email || null);

        // Fetch owner profile and master salt
        const { data: profile, error } = await supabase
          .from('owner_profiles')
          .select('id, master_salt')
          .eq('auth_user_id', session.user.id)
          .maybeSingle();

        if (error || !profile) {
          // If no owner profile exists yet, user needs initial owner registration
          setNeedsInitialSetup(true);
        } else {
          setOwnerId(profile.id);
          masterSaltRef.current = profile.master_salt;
          setNeedsInitialSetup(false);
        }

        // Check if MFA is enrolled
        const { data: mfaData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (mfaData && mfaData.nextLevel === 'aal2' && mfaData.currentLevel !== 'aal2') {
          setIsMfaRequired(true);
        }
      } else {
        setIsAuthenticated(false);
        setOwnerId(null);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setIsAuthenticated(true);
        setOwnerEmail(session.user.email || null);
      } else {
        setIsAuthenticated(false);
        lockVault();
      }
    });

    return () => subscription.unsubscribe();
  }, [lockVault]);

  // Unlock Vault implementation
  const unlockVault = async (masterPassword: string): Promise<boolean> => {
    if (!masterSaltRef.current) {
      if (!isConfigured) {
        masterSaltRef.current = generateSalt();
      } else {
        throw new Error('Master salt configuration missing. Contact owner administrator.');
      }
    }

    try {
      // Derive key using Argon2id
      const derivedKey = await deriveVaultKey(masterPassword, masterSaltRef.current);
      vaultKeyRef.current = derivedKey;

      const currentOwnerId = ownerId || 'local-owner';

      // Load encrypted payloads and decrypt in memory
      const [rawEntries, rawFiles, rawNotes, rawAchievements, rawSettings] = await Promise.all([
        vaultApi.getEntries(currentOwnerId),
        vaultApi.getFiles(currentOwnerId),
        vaultApi.getNotes(currentOwnerId),
        vaultApi.getAchievements(currentOwnerId),
        vaultApi.getSettings(currentOwnerId),
      ]);

      // Decrypt entries
      const decryptedEnts: DecryptedPasswordEntry[] = [];
      for (const e of rawEntries) {
        try {
          const payload = await decryptPayload<DecryptedPasswordEntry['payload']>(e.encrypted_payload, derivedKey);
          decryptedEnts.push({
            id: e.id,
            owner_id: e.owner_id,
            payload,
            encryption_version: e.encryption_version,
            created_at: e.created_at,
            updated_at: e.updated_at,
          });
        } catch {
          console.warn(`Failed to decrypt password entry ${e.id}`);
        }
      }

      // Decrypt files metadata (not binary content until preview/download)
      const decryptedFils: DecryptedVaultFile[] = [];
      for (const f of rawFiles) {
        try {
          const metadata = await decryptPayload<FileMetadataPayload>(f.encrypted_metadata, derivedKey);
          decryptedFils.push({
            id: f.id,
            owner_id: f.owner_id,
            storage_object_id: f.storage_object_id,
            file_size: f.file_size,
            encryption_version: f.encryption_version,
            metadata,
            created_at: f.created_at,
            updated_at: f.updated_at,
          });
        } catch {
          console.warn(`Failed to decrypt metadata for file ${f.id}`);
        }
      }

      // Decrypt notes
      const decryptedNts: DecryptedVaultNote[] = [];
      for (const n of rawNotes) {
        try {
          const payload = await decryptPayload<DecryptedVaultNote['payload']>(n.encrypted_payload, derivedKey);
          decryptedNts.push({
            id: n.id,
            owner_id: n.owner_id,
            payload,
            encryption_version: n.encryption_version,
            created_at: n.created_at,
            updated_at: n.updated_at,
          });
        } catch {
          console.warn(`Failed to decrypt note ${n.id}`);
        }
      }

      // Decrypt achievements
      const decryptedAch: DecryptedVaultAchievement[] = [];
      for (const a of rawAchievements) {
        try {
          const payload = await decryptPayload<DecryptedVaultAchievement['payload']>(a.encrypted_payload, derivedKey);
          decryptedAch.push({
            id: a.id,
            owner_id: a.owner_id,
            payload,
            encryption_version: a.encryption_version,
            created_at: a.created_at,
            updated_at: a.updated_at,
          });
        } catch {
          console.warn(`Failed to decrypt achievement ${a.id}`);
        }
      }

      // Decrypt settings if available
      if (rawSettings) {
        try {
          const decryptedSett = await decryptPayload<VaultSettings>(rawSettings.encrypted_settings, derivedKey);
          setSettings(decryptedSett);
        } catch {
          // Keep defaults
        }
      }

      setEntries(decryptedEnts);
      setFiles(decryptedFils);
      setNotes(decryptedNts);
      setAchievements(decryptedAch);
      setIsVaultUnlocked(true);
      touchActivity();
      return true;
    } catch (err) {
      console.error('Vault unlock failure:', err);
      vaultKeyRef.current = null;
      throw err;
    }
  };

  // Logout
  const logout = async () => {
    lockVault();
    if (isConfigured) {
      await supabase.auth.signOut();
    }
    setIsAuthenticated(false);
    setOwnerId(null);
  };

  // Initial owner setup
  const initializeOwner = async (email: string, masterPassword: string) => {
    const salt = generateSalt();
    masterSaltRef.current = salt;

    if (!isConfigured) {
      setOwnerEmail(email);
      setOwnerId('local-owner');
      setIsAuthenticated(true);
      await unlockVault(masterPassword);
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: masterPassword,
    });
    if (authError || !authData.user) {
      throw new Error(`Authentication registration failed: ${authError?.message}`);
    }

    // Insert owner profile with master_salt
    const { data: profile, error: profileError } = await supabase
      .from('owner_profiles')
      .insert({
        auth_user_id: authData.user.id,
        master_salt: salt,
      })
      .select()
      .single();

    if (profileError) {
      throw new Error(`Owner initialization failed: ${profileError.message}`);
    }

    setOwnerId(profile.id);
    setNeedsInitialSetup(false);
    await unlockVault(masterPassword);
  };

  // Save Password Entry (Encrypted)
  const savePasswordEntry = async (payload: DecryptedPasswordEntry['payload'], id?: string) => {
    if (!vaultKeyRef.current) throw new Error('Vault is locked');
    const encryptedPayload = await encryptPayload(payload, vaultKeyRef.current);
    const currentOwnerId = ownerId || 'local-owner';

    if (id) {
      await vaultApi.updateEntry(id, encryptedPayload);
      setEntries(prev =>
        prev.map(item => (item.id === id ? { ...item, payload, updated_at: new Date().toISOString() } : item))
      );
    } else {
      const created = await vaultApi.createEntry({
        owner_id: currentOwnerId,
        encrypted_payload: encryptedPayload,
        encryption_version: 1,
      });
      setEntries(prev => [
        {
          id: created.id,
          owner_id: created.owner_id,
          payload,
          encryption_version: 1,
          created_at: created.created_at,
          updated_at: created.updated_at,
        },
        ...prev,
      ]);
    }
    touchActivity();
  };

  // Delete Password Entry
  const deletePasswordEntry = async (id: string) => {
    await vaultApi.deleteEntry(id);
    setEntries(prev => prev.filter(e => e.id !== id));
    touchActivity();
  };

  // Upload Vault File (Client-side AES-256-GCM encryption before storage)
  const uploadVaultFile = async (file: File, category?: string, tags: string[] = []) => {
    if (!vaultKeyRef.current) throw new Error('Vault is locked');
    const key = vaultKeyRef.current;
    const currentOwnerId = ownerId || 'local-owner';

    // 1. Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // 2. Encrypt binary buffer using AES-256-GCM
    const { encryptFileBuffer } = await import('../../lib/crypto');
    const encryptedBytes = await encryptFileBuffer(arrayBuffer, key);

    // 3. Encrypt metadata
    const metadataPayload: FileMetadataPayload = {
      originalFilename: file.name,
      mimeType: file.type || 'application/octet-stream',
      category: category || 'General',
      tags,
    };
    const encryptedMetadata = await encryptPayload(metadataPayload, key);
    const encryptedFilename = await encryptPayload(file.name, key);

    const storageObjectId = crypto.randomUUID();

    const createdRecord = await vaultApi.uploadFileRecord(
      {
        owner_id: currentOwnerId,
        encrypted_filename: encryptedFilename,
        encrypted_metadata: encryptedMetadata,
        storage_object_id: storageObjectId,
        file_size: file.size,
        mime_type: file.type,
        encryption_version: 1,
      },
      encryptedBytes
    );

    setFiles(prev => [
      {
        id: createdRecord.id,
        owner_id: createdRecord.owner_id,
        storage_object_id: storageObjectId,
        file_size: file.size,
        encryption_version: 1,
        metadata: metadataPayload,
        created_at: createdRecord.created_at,
        updated_at: createdRecord.updated_at,
      },
      ...prev,
    ]);
    touchActivity();
  };

  // Update File Metadata (Rename, categories, tags)
  const updateFileMetadata = async (id: string, metadata: FileMetadataPayload) => {
    if (!vaultKeyRef.current) throw new Error('Vault is locked');
    const key = vaultKeyRef.current;

    const encryptedMetadata = await encryptPayload(metadata, key);
    const encryptedFilename = await encryptPayload(metadata.originalFilename, key);

    await vaultApi.updateFileMetadata(id, encryptedFilename, encryptedMetadata);
    setFiles(prev =>
      prev.map(f => (f.id === id ? { ...f, metadata, updated_at: new Date().toISOString() } : f))
    );
    touchActivity();
  };

  // Delete Vault File
  const deleteVaultFile = async (id: string) => {
    const file = files.find(f => f.id === id);
    if (!file) return;
    const currentOwnerId = ownerId || 'local-owner';

    await vaultApi.deleteFile(id, currentOwnerId, file.storage_object_id);
    setFiles(prev => prev.filter(f => f.id !== id));
    touchActivity();
  };

  // Download File (Download encrypted -> Decrypt in browser -> Return Blob)
  const downloadVaultFile = async (file: DecryptedVaultFile): Promise<Blob> => {
    if (!vaultKeyRef.current) throw new Error('Vault is locked');
    const key = vaultKeyRef.current;
    const currentOwnerId = ownerId || 'local-owner';

    const encryptedBuffer = await vaultApi.downloadEncryptedFile(currentOwnerId, file.storage_object_id);
    const { decryptFileBuffer } = await import('../../lib/crypto');
    const decryptedBuffer = await decryptFileBuffer(encryptedBuffer, key);

    touchActivity();
    return new Blob([decryptedBuffer], { type: file.metadata.mimeType || 'application/octet-stream' });
  };

  // Preview File (Generates temporary Blob URL)
  const previewVaultFile = async (file: DecryptedVaultFile): Promise<string> => {
    const blob = await downloadVaultFile(file);
    const url = URL.createObjectURL(blob);
    previewUrlsRef.current.add(url);
    return url;
  };

  // Save Note
  const saveVaultNote = async (payload: DecryptedVaultNote['payload'], id?: string) => {
    if (!vaultKeyRef.current) throw new Error('Vault is locked');
    const encryptedPayload = await encryptPayload(payload, vaultKeyRef.current);
    const currentOwnerId = ownerId || 'local-owner';

    if (id) {
      await vaultApi.updateNote(id, encryptedPayload);
      setNotes(prev =>
        prev.map(item => (item.id === id ? { ...item, payload, updated_at: new Date().toISOString() } : item))
      );
    } else {
      const created = await vaultApi.createNote({
        owner_id: currentOwnerId,
        encrypted_payload: encryptedPayload,
        encryption_version: 1,
      });
      setNotes(prev => [
        {
          id: created.id,
          owner_id: created.owner_id,
          payload,
          encryption_version: 1,
          created_at: created.created_at,
          updated_at: created.updated_at,
        },
        ...prev,
      ]);
    }
    touchActivity();
  };

  // Delete Note
  const deleteVaultNote = async (id: string) => {
    await vaultApi.deleteNote(id);
    setNotes(prev => prev.filter(n => n.id !== id));
    touchActivity();
  };

  // Save Achievement
  const saveVaultAchievement = async (payload: DecryptedVaultAchievement['payload'], id?: string) => {
    if (!vaultKeyRef.current) throw new Error('Vault is locked');
    const encryptedPayload = await encryptPayload(payload, vaultKeyRef.current);
    const currentOwnerId = ownerId || 'local-owner';

    if (id) {
      await vaultApi.updateAchievement(id, encryptedPayload);
      setAchievements(prev =>
        prev.map(item => (item.id === id ? { ...item, payload, updated_at: new Date().toISOString() } : item))
      );
    } else {
      const created = await vaultApi.createAchievement({
        owner_id: currentOwnerId,
        encrypted_payload: encryptedPayload,
        encryption_version: 1,
      });
      setAchievements(prev => [
        {
          id: created.id,
          owner_id: created.owner_id,
          payload,
          encryption_version: 1,
          created_at: created.created_at,
          updated_at: created.updated_at,
        },
        ...prev,
      ]);
    }
    touchActivity();
  };

  // Delete Achievement
  const deleteVaultAchievement = async (id: string) => {
    await vaultApi.deleteAchievement(id);
    setAchievements(prev => prev.filter(a => a.id !== id));
    touchActivity();
  };

  // Settings update
  const updateSettings = async (newSettings: Partial<VaultSettings>) => {
    if (!vaultKeyRef.current) throw new Error('Vault is locked');
    const updated = { ...settings, ...newSettings };
    const currentOwnerId = ownerId || 'local-owner';
    const encrypted = await encryptPayload(updated, vaultKeyRef.current);

    await vaultApi.saveSettings(currentOwnerId, encrypted);
    setSettings(updated);
    touchActivity();
  };

  return (
    <VaultContext.Provider
      value={{
        isAuthenticated,
        isVaultUnlocked,
        isMfaRequired,
        ownerId,
        ownerEmail,
        needsInitialSetup,
        entries,
        files,
        notes,
        achievements,
        settings,
        unlockVault,
        lockVault,
        logout,
        initializeOwner,
        savePasswordEntry,
        deletePasswordEntry,
        uploadVaultFile,
        updateFileMetadata,
        deleteVaultFile,
        downloadVaultFile,
        previewVaultFile,
        saveVaultNote,
        deleteVaultNote,
        saveVaultAchievement,
        deleteVaultAchievement,
        updateSettings,
        touchActivity,
        lockdownCountdown: secondsRemaining,
        activePreviewUrls: Array.from(previewUrlsRef.current),
      }}
    >
      {children}
    </VaultContext.Provider>
  );
};

export const useVault = () => {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
};
