import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVault } from '../features/vault/VaultContext';
import { exportEncryptedBackup, validateAndImportBackup } from '../features/backup/backupService';
import { isConfigured } from '../lib/supabase';

export const SettingsPage: React.FC = () => {
  const {
    ownerId,
    ownerEmail,
    settings,
    updateSettings,
    lockVault,
    logout,
    files,
    entries,
    notes,
    achievements,
  } = useVault();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'security' | 'backup' | 'storage'>('security');

  // Inactivity timeout state
  const [timeoutMinutes, setTimeoutMinutes] = useState(settings.inactivityTimeoutMinutes);
  const [isUpdatingTimeout, setIsUpdatingTimeout] = useState(false);

  // Backup states
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const importFileInputRef = useRef<HTMLInputElement | null>(null);

  // Storage calculations
  const totalFileBytes = files.reduce((acc, f) => acc + (f.file_size || 0), 0);
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleTimeoutChange = async (mins: number) => {
    setTimeoutMinutes(mins);
    setIsUpdatingTimeout(true);
    try {
      await updateSettings({ inactivityTimeoutMinutes: mins });
    } finally {
      setIsUpdatingTimeout(false);
    }
  };

  const handleExportBackup = async () => {
    if (!ownerId) return;
    setIsExporting(true);
    try {
      const backupContainer = await exportEncryptedBackup(ownerId);
      const jsonStr = JSON.stringify(backupContainer, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `blackvault-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await updateSettings({ lastBackupExportAt: new Date().toISOString() });
    } catch (err: unknown) {
      console.error(err);
      alert('Failed to generate encrypted backup.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !ownerId) return;

    const confirmMsg =
      importMode === 'replace'
        ? 'WARNING: You selected REPLACE mode. This will wipe all current entries before importing. Continue?'
        : 'Import and merge records from this backup?';

    if (!confirm(confirmMsg)) {
      if (importFileInputRef.current) importFileInputRef.current.value = '';
      return;
    }

    setIsImporting(true);
    setImportStatus(null);
    setImportError(null);

    try {
      const text = await file.text();
      const result = await validateAndImportBackup(text, ownerId, importMode);
      setImportStatus(
        `Successfully restored ${result.importedCount} encrypted records.${
          result.errors.length ? ` (${result.errors.length} warnings)` : ''
        }`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Import failed';
      setImportError(msg);
    } finally {
      setIsImporting(false);
      if (importFileInputRef.current) importFileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="pb-5 border-b border-[#242424]">
        <div className="text-[11px] font-mono tracking-widest text-[#858585]">ENCLAVE CONFIGURATION</div>
        <h1 className="text-xl font-semibold tracking-tight text-[#F2F2F2] mt-0.5">SETTINGS & SECURITY</h1>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#242424] text-xs font-mono">
        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'security'
              ? 'border-[#00D68F] text-[#00D68F]'
              : 'border-transparent text-[#858585] hover:text-[#F2F2F2]'
          }`}
        >
          SECURITY
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'backup'
              ? 'border-[#00D68F] text-[#00D68F]'
              : 'border-transparent text-[#858585] hover:text-[#F2F2F2]'
          }`}
        >
          BACKUP & RECOVERY
        </button>
        <button
          onClick={() => setActiveTab('storage')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'storage'
              ? 'border-[#00D68F] text-[#00D68F]'
              : 'border-transparent text-[#858585] hover:text-[#F2F2F2]'
          }`}
        >
          STORAGE
        </button>
      </div>

      {/* SECURITY TAB */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Owner Profile Panel */}
          <div className="p-5 bg-[#0C0C0C] border border-[#242424] space-y-3">
            <div className="text-xs font-mono text-[#F2F2F2] font-medium tracking-wider">
              AUTHENTICATED OWNER IDENTITY
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono text-[#858585] pt-1">
              <div>
                <span className="block text-[10px] text-[#666666]">OWNER IDENTIFIER</span>
                <span className="text-[#F2F2F2] font-mono text-[11px] truncate block">
                  {ownerId || 'LOCAL_STANDALONE_OWNER'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-[#666666]">PRIMARY EMAIL</span>
                <span className="text-[#F2F2F2]">{ownerEmail || 'local@blackvault'}</span>
              </div>
              <div>
                <span className="block text-[10px] text-[#666666]">BACKEND STATUS</span>
                <span className={isConfigured ? 'text-[#00D68F]' : 'text-[#858585]'}>
                  {isConfigured ? 'SUPABASE CONNECTED' : 'LOCAL STANDALONE MODE'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-[#666666]">ENCRYPTION ALGORITHM</span>
                <span className="text-[#00D68F]">AES-256-GCM + ARGON2ID</span>
              </div>
            </div>
          </div>

          {/* Inactivity Timeout */}
          <div className="p-5 bg-[#0C0C0C] border border-[#242424] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-mono text-[#F2F2F2] font-medium tracking-wider">
                  VAULT INACTIVITY LOCKOUT
                </div>
                <div className="text-[11px] font-mono text-[#858585] mt-0.5">
                  Vault locks and clears decrypted application memory after specified inactivity.
                </div>
              </div>
              {isUpdatingTimeout && (
                <span className="text-[10px] font-mono text-[#00D68F]">UPDATING...</span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              {[1, 2, 5, 10].map(mins => (
                <button
                  key={mins}
                  onClick={() => handleTimeoutChange(mins)}
                  className={`py-2 px-3 text-xs font-mono rounded border transition-colors ${
                    timeoutMinutes === mins
                      ? 'border-[#00D68F] bg-[#121212] text-[#00D68F]'
                      : 'border-[#242424] bg-[#101010] text-[#858585] hover:text-[#F2F2F2]'
                  }`}
                >
                  {mins} MINUTE{mins === 1 ? '' : 'S'}
                </button>
              ))}
            </div>
          </div>

          {/* Emergency Lock & Sign Out */}
          <div className="p-5 bg-[#0C0C0C] border border-[#242424] space-y-3">
            <div className="text-xs font-mono text-[#F2F2F2] font-medium tracking-wider">
              SESSION MANAGEMENT
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                onClick={() => {
                  lockVault();
                  navigate('/unlock');
                }}
                className="px-4 py-2 text-xs font-mono border border-[#242424] hover:border-[#E5484D] text-[#E5484D] transition-colors rounded"
              >
                LOCK VAULT IMMEDIATELY
              </button>
              <button
                onClick={async () => {
                  await logout();
                  navigate('/unlock');
                }}
                className="px-4 py-2 text-xs font-mono bg-[#101010] border border-[#242424] hover:border-[#414141] text-[#858585] hover:text-[#F2F2F2] transition-colors rounded"
              >
                SIGN OUT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BACKUP TAB */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          {/* Export Panel */}
          <div className="p-5 bg-[#0C0C0C] border border-[#242424] space-y-4">
            <div>
              <div className="text-xs font-mono text-[#F2F2F2] font-medium tracking-wider">
                EXPORT ENCRYPTED ARCHIVE
              </div>
              <p className="text-[11px] font-mono text-[#858585] mt-1 leading-relaxed">
                Generates a JSON backup package containing all ciphertext containers, file references,
                version headers, and a cryptographically verified SHA-256 integrity checksum. Plaintext secrets are never included.
              </p>
            </div>

            {settings.lastBackupExportAt && (
              <div className="text-[11px] font-mono text-[#858585]">
                LAST EXPORT: {new Date(settings.lastBackupExportAt).toLocaleString()}
              </div>
            )}

            <button
              onClick={handleExportBackup}
              disabled={isExporting}
              className="px-4 py-2 bg-[#00D68F] hover:bg-[#00c080] text-[#000000] text-xs font-mono font-medium rounded transition-colors disabled:opacity-50"
            >
              {isExporting ? 'COMPUTING INTEGRITY CHECKSUM...' : 'DOWNLOAD ENCRYPTED BACKUP (.JSON)'}
            </button>
          </div>

          {/* Import Panel */}
          <div className="p-5 bg-[#0C0C0C] border border-[#242424] space-y-4">
            <div>
              <div className="text-xs font-mono text-[#F2F2F2] font-medium tracking-wider">
                RESTORE FROM BACKUP
              </div>
              <p className="text-[11px] font-mono text-[#858585] mt-1 leading-relaxed">
                Restore previously exported encrypted records. The backup checksum is validated before writing any changes.
              </p>
            </div>

            {/* Mode Selector */}
            <div className="flex items-center gap-4 text-xs font-mono text-[#858585]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  value="merge"
                  checked={importMode === 'merge'}
                  onChange={() => setImportMode('merge')}
                  className="text-[#00D68F]"
                />
                <span>MERGE (PRESERVE CURRENT DATA)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  value="replace"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                  className="text-[#E5484D]"
                />
                <span className="text-[#E5484D]">REPLACE (DESTRUCTIVE OVERWRITE)</span>
              </label>
            </div>

            <input
              type="file"
              accept=".json"
              ref={importFileInputRef}
              onChange={handleImportFile}
              className="hidden"
            />

            <button
              onClick={() => importFileInputRef.current?.click()}
              disabled={isImporting}
              className="px-4 py-2 border border-[#242424] hover:border-[#414141] bg-[#101010] text-[#F2F2F2] text-xs font-mono rounded transition-colors disabled:opacity-50"
            >
              {isImporting ? 'VALIDATING CHECKSUM & RESTORING...' : 'SELECT BACKUP FILE'}
            </button>

            {importStatus && (
              <div className="p-3 bg-[#101010] border border-[#00D68F] text-[#00D68F] text-xs font-mono">
                {importStatus}
              </div>
            )}

            {importError && (
              <div className="p-3 bg-[#101010] border border-[#E5484D] text-[#E5484D] text-xs font-mono">
                {importError}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STORAGE TAB */}
      {activeTab === 'storage' && (
        <div className="space-y-6">
          <div className="p-5 bg-[#0C0C0C] border border-[#242424] space-y-4">
            <div className="text-xs font-mono text-[#F2F2F2] font-medium tracking-wider">
              ACTUAL STORAGE TELEMETRY
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 bg-[#101010] border border-[#242424]">
                <div className="text-[10px] font-mono text-[#858585]">ENCRYPTED OBJECT BYTES</div>
                <div className="text-xl font-mono text-[#00D68F] mt-1">{formatBytes(totalFileBytes)}</div>
                <div className="text-[10px] font-mono text-[#666666] mt-1">Total ciphertext stored</div>
              </div>

              <div className="p-4 bg-[#101010] border border-[#242424]">
                <div className="text-[10px] font-mono text-[#858585]">STORED DOCUMENTS</div>
                <div className="text-xl font-mono text-[#F2F2F2] mt-1">{files.length}</div>
                <div className="text-[10px] font-mono text-[#666666] mt-1">In blackvault-encrypted</div>
              </div>

              <div className="p-4 bg-[#101010] border border-[#242424]">
                <div className="text-[10px] font-mono text-[#858585]">PAYLOAD RECORDS</div>
                <div className="text-xl font-mono text-[#F2F2F2] mt-1">
                  {entries.length + notes.length + achievements.length}
                </div>
                <div className="text-[10px] font-mono text-[#666666] mt-1">Passwords, notes & records</div>
              </div>
            </div>

            <div className="text-xs font-mono text-[#858585] pt-2 border-t border-[#242424] space-y-1">
              <div>• Maximum upload limit per individual file: 50MB.</div>
              <div>• All object content is encrypted client-side before transmission.</div>
              <div>• Supabase Storage bucket: private <code>blackvault-encrypted</code>.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
