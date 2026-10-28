import { supabase, isConfigured } from '../supabase';
import type {
  EncryptedVaultEntry,
  EncryptedVaultFile,
  EncryptedVaultNote,
  EncryptedVaultAchievement,
  EncryptedVaultSettings,
} from '../../types';

// In-memory / session fallback store for local testing when Supabase is not connected
const localStore = {
  entries: [] as EncryptedVaultEntry[],
  files: [] as EncryptedVaultFile[],
  fileBlobs: new Map<string, ArrayBuffer>(),
  notes: [] as EncryptedVaultNote[],
  achievements: [] as EncryptedVaultAchievement[],
  settings: null as EncryptedVaultSettings | null,
};

export const vaultApi = {
  // --- PASSWORD ENTRIES ---
  async getEntries(ownerId: string): Promise<EncryptedVaultEntry[]> {
    if (!isConfigured) {
      return [...localStore.entries];
    }
    const { data, error } = await supabase
      .from('vault_entries')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createEntry(entry: Omit<EncryptedVaultEntry, 'id' | 'created_at' | 'updated_at'>): Promise<EncryptedVaultEntry> {
    if (!isConfigured) {
      const now = new Date().toISOString();
      const newEntry: EncryptedVaultEntry = {
        ...entry,
        id: crypto.randomUUID(),
        created_at: now,
        updated_at: now,
      };
      localStore.entries.unshift(newEntry);
      return newEntry;
    }
    const { data, error } = await supabase
      .from('vault_entries')
      .insert([entry])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateEntry(id: string, encryptedPayload: string): Promise<void> {
    if (!isConfigured) {
      const idx = localStore.entries.findIndex(e => e.id === id);
      if (idx !== -1) {
        localStore.entries[idx].encrypted_payload = encryptedPayload;
        localStore.entries[idx].updated_at = new Date().toISOString();
      }
      return;
    }
    const { error } = await supabase
      .from('vault_entries')
      .update({ encrypted_payload: encryptedPayload, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  async deleteEntry(id: string): Promise<void> {
    if (!isConfigured) {
      localStore.entries = localStore.entries.filter(e => e.id !== id);
      return;
    }
    const { error } = await supabase.from('vault_entries').delete().eq('id', id);
    if (error) throw error;
  },

  // --- FILES ---
  async getFiles(ownerId: string): Promise<EncryptedVaultFile[]> {
    if (!isConfigured) {
      return [...localStore.files];
    }
    const { data, error } = await supabase
      .from('vault_files')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async uploadFileRecord(
    record: Omit<EncryptedVaultFile, 'id' | 'created_at' | 'updated_at'>,
    encryptedBuffer: Uint8Array
  ): Promise<EncryptedVaultFile> {
    if (!isConfigured) {
      const now = new Date().toISOString();
      const newFile: EncryptedVaultFile = {
        ...record,
        id: crypto.randomUUID(),
        created_at: now,
        updated_at: now,
      };
      localStore.files.unshift(newFile);
      localStore.fileBlobs.set(record.storage_object_id, encryptedBuffer.buffer as ArrayBuffer);
      return newFile;
    }

    // 1. Upload encrypted buffer to Supabase private storage
    const storagePath = `${record.owner_id}/${record.storage_object_id}.enc`;
    const { error: uploadError } = await supabase.storage
      .from('blackvault-encrypted')
      .upload(storagePath, encryptedBuffer, {
        contentType: 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // 2. Insert metadata record in PostgreSQL
    const { data, error: dbError } = await supabase
      .from('vault_files')
      .insert([record])
      .select()
      .single();

    if (dbError) {
      // Rollback uploaded storage object if DB record insertion fails
      await supabase.storage.from('blackvault-encrypted').remove([storagePath]);
      throw new Error(`Database record creation failed: ${dbError.message}`);
    }

    return data;
  },

  async downloadEncryptedFile(ownerId: string, storageObjectId: string): Promise<ArrayBuffer> {
    if (!isConfigured) {
      const buffer = localStore.fileBlobs.get(storageObjectId);
      if (!buffer) throw new Error('File not found in local store');
      return buffer;
    }

    const storagePath = `${ownerId}/${storageObjectId}.enc`;
    const { data, error } = await supabase.storage
      .from('blackvault-encrypted')
      .download(storagePath);

    if (error || !data) {
      throw new Error(`Failed to retrieve encrypted file: ${error?.message || 'Empty response'}`);
    }

    return await data.arrayBuffer();
  },

  async updateFileMetadata(id: string, encryptedFilename: string, encryptedMetadata: string): Promise<void> {
    if (!isConfigured) {
      const idx = localStore.files.findIndex(f => f.id === id);
      if (idx !== -1) {
        localStore.files[idx].encrypted_filename = encryptedFilename;
        localStore.files[idx].encrypted_metadata = encryptedMetadata;
        localStore.files[idx].updated_at = new Date().toISOString();
      }
      return;
    }
    const { error } = await supabase
      .from('vault_files')
      .update({
        encrypted_filename: encryptedFilename,
        encrypted_metadata: encryptedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw error;
  },

  async deleteFile(id: string, ownerId: string, storageObjectId: string): Promise<void> {
    if (!isConfigured) {
      localStore.files = localStore.files.filter(f => f.id !== id);
      localStore.fileBlobs.delete(storageObjectId);
      return;
    }

    const storagePath = `${ownerId}/${storageObjectId}.enc`;
    // Delete from storage
    await supabase.storage.from('blackvault-encrypted').remove([storagePath]);

    // Delete record from DB
    const { error } = await supabase.from('vault_files').delete().eq('id', id);
    if (error) throw error;
  },

  // --- NOTES ---
  async getNotes(ownerId: string): Promise<EncryptedVaultNote[]> {
    if (!isConfigured) {
      return [...localStore.notes];
    }
    const { data, error } = await supabase
      .from('vault_notes')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createNote(note: Omit<EncryptedVaultNote, 'id' | 'created_at' | 'updated_at'>): Promise<EncryptedVaultNote> {
    if (!isConfigured) {
      const now = new Date().toISOString();
      const newNote: EncryptedVaultNote = {
        ...note,
        id: crypto.randomUUID(),
        created_at: now,
        updated_at: now,
      };
      localStore.notes.unshift(newNote);
      return newNote;
    }
    const { data, error } = await supabase.from('vault_notes').insert([note]).select().single();
    if (error) throw error;
    return data;
  },

  async updateNote(id: string, encryptedPayload: string): Promise<void> {
    if (!isConfigured) {
      const idx = localStore.notes.findIndex(n => n.id === id);
      if (idx !== -1) {
        localStore.notes[idx].encrypted_payload = encryptedPayload;
        localStore.notes[idx].updated_at = new Date().toISOString();
      }
      return;
    }
    const { error } = await supabase
      .from('vault_notes')
      .update({ encrypted_payload: encryptedPayload, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  async deleteNote(id: string): Promise<void> {
    if (!isConfigured) {
      localStore.notes = localStore.notes.filter(n => n.id !== id);
      return;
    }
    const { error } = await supabase.from('vault_notes').delete().eq('id', id);
    if (error) throw error;
  },

  // --- ACHIEVEMENTS ---
  async getAchievements(ownerId: string): Promise<EncryptedVaultAchievement[]> {
    if (!isConfigured) {
      return [...localStore.achievements];
    }
    const { data, error } = await supabase
      .from('vault_achievements')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createAchievement(
    achievement: Omit<EncryptedVaultAchievement, 'id' | 'created_at' | 'updated_at'>
  ): Promise<EncryptedVaultAchievement> {
    if (!isConfigured) {
      const now = new Date().toISOString();
      const item: EncryptedVaultAchievement = {
        ...achievement,
        id: crypto.randomUUID(),
        created_at: now,
        updated_at: now,
      };
      localStore.achievements.unshift(item);
      return item;
    }
    const { data, error } = await supabase.from('vault_achievements').insert([achievement]).select().single();
    if (error) throw error;
    return data;
  },

  async updateAchievement(id: string, encryptedPayload: string): Promise<void> {
    if (!isConfigured) {
      const idx = localStore.achievements.findIndex(a => a.id === id);
      if (idx !== -1) {
        localStore.achievements[idx].encrypted_payload = encryptedPayload;
        localStore.achievements[idx].updated_at = new Date().toISOString();
      }
      return;
    }
    const { error } = await supabase
      .from('vault_achievements')
      .update({ encrypted_payload: encryptedPayload, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  async deleteAchievement(id: string): Promise<void> {
    if (!isConfigured) {
      localStore.achievements = localStore.achievements.filter(a => a.id !== id);
      return;
    }
    const { error } = await supabase.from('vault_achievements').delete().eq('id', id);
    if (error) throw error;
  },

  // --- SETTINGS ---
  async getSettings(ownerId: string): Promise<EncryptedVaultSettings | null> {
    if (!isConfigured) {
      return localStore.settings;
    }
    const { data, error } = await supabase
      .from('vault_settings')
      .select('*')
      .eq('owner_id', ownerId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async saveSettings(ownerId: string, encryptedSettings: string): Promise<void> {
    if (!isConfigured) {
      localStore.settings = {
        id: 'local-settings',
        owner_id: ownerId,
        encrypted_settings: encryptedSettings,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return;
    }
    const { error } = await supabase
      .from('vault_settings')
      .upsert({
        owner_id: ownerId,
        encrypted_settings: encryptedSettings,
        updated_at: new Date().toISOString(),
      });
    if (error) throw error;
  },
};
