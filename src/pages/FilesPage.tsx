import React, { useState, useMemo, useRef } from 'react';
import { useVault } from '../features/vault/VaultContext';
import type { DecryptedVaultFile } from '../types';

export const FilesPage: React.FC = () => {
  const { files, uploadVaultFile, deleteVaultFile, downloadVaultFile, previewVaultFile, updateFileMetadata } = useVault();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<DecryptedVaultFile | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Rename modal
  const [renameFile, setRenameFile] = useState<DecryptedVaultFile | null>(null);
  const [newFilename, setNewFilename] = useState('');
  const [newCategory, setNewCategory] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // File categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    files.forEach(f => {
      if (f.metadata.category) set.add(f.metadata.category);
    });
    return ['ALL', ...Array.from(set)];
  }, [files]);

  // Filter files
  const filteredFiles = useMemo(() => {
    return files.filter(f => {
      const matchCat = selectedCategory === 'ALL' || f.metadata.category === selectedCategory;
      if (!matchCat) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();

      if (f.metadata.originalFilename.toLowerCase().includes(q)) return true;
      if (f.metadata.tags?.some(t => t.toLowerCase().includes(q))) return true;
      if (f.metadata.category?.toLowerCase().includes(q)) return true;

      return false;
    });
  }, [files, searchQuery, selectedCategory]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Upload handler
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      if (file.size > 50 * 1024 * 1024) {
        setUploadError(`File ${file.name} exceeds 50MB maximum size limit.`);
        setIsUploading(false);
        return;
      }

      try {
        await uploadVaultFile(file, 'General', []);
      } catch (err: unknown) {
        console.error(err);
        setUploadError(`Failed to encrypt and upload ${file.name}.`);
      }
    }

    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Drag and drop upload
  const [isDragging, setIsDragging] = useState(false);
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = e.dataTransfer.files;
    if (!droppedFiles || droppedFiles.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    for (let i = 0; i < droppedFiles.length; i++) {
      const file = droppedFiles[i];
      if (file.size > 50 * 1024 * 1024) {
        setUploadError(`File ${file.name} exceeds 50MB limit.`);
        continue;
      }
      try {
        await uploadVaultFile(file, 'General', []);
      } catch (err) {
        console.error(err);
        setUploadError(`Upload failure for ${file.name}`);
      }
    }

    setIsUploading(false);
  };

  // Preview
  const handlePreview = async (file: DecryptedVaultFile) => {
    setPreviewLoading(true);
    setPreviewFile(file);
    try {
      const url = await previewVaultFile(file);
      setPreviewUrl(url);
    } catch (err) {
      console.error(err);
      alert('Unable to decrypt file preview.');
      setPreviewFile(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewFile(null);
  };

  // Download
  const handleDownload = async (file: DecryptedVaultFile) => {
    try {
      const blob = await downloadVaultFile(file);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.metadata.originalFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to decrypt and download file.');
    }
  };

  // Delete
  const handleDelete = async (file: DecryptedVaultFile) => {
    if (confirm(`Permanently delete encrypted file "${file.metadata.originalFilename}"?`)) {
      await deleteVaultFile(file.id);
    }
  };

  // Save rename
  const handleSaveRename = async () => {
    if (!renameFile || !newFilename.trim()) return;
    await updateFileMetadata(renameFile.id, {
      ...renameFile.metadata,
      originalFilename: newFilename.trim(),
      category: newCategory.trim() || undefined,
    });
    setRenameFile(null);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-[#242424] gap-4">
        <div>
          <div className="text-[11px] font-mono tracking-widest text-[#858585]">DOCUMENT REPOSITORY</div>
          <h1 className="text-xl font-semibold tracking-tight text-[#F2F2F2] mt-0.5">ENCRYPTED FILES</h1>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-3.5 py-2 bg-[#00D68F] hover:bg-[#00c080] text-[#000000] text-xs font-mono font-medium rounded transition-colors disabled:opacity-50"
          >
            {isUploading ? 'ENCRYPTING & UPLOADING...' : '+ UPLOAD FILE'}
          </button>
        </div>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={e => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`p-6 border border-dashed rounded text-center transition-colors ${
          isDragging
            ? 'border-[#00D68F] bg-[#00D68F]/5'
            : 'border-[#242424] bg-[#0C0C0C] hover:border-[#414141]'
        }`}
      >
        <div className="text-xs font-mono text-[#F2F2F2]">
          DRAG & DROP FILES HERE OR CLICK BROWSE
        </div>
        <div className="text-[11px] font-mono text-[#858585] mt-1">
          Files are encrypted in the browser with AES-256-GCM before upload. 50MB limit.
        </div>
      </div>

      {uploadError && (
        <div className="p-3 bg-[#101010] border border-[#E5484D] text-[#E5484D] text-xs font-mono">
          {uploadError}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by filename, category, or tags..."
          className="flex-1 px-3 py-2 text-xs font-mono bg-[#0C0C0C] border border-[#242424] text-[#F2F2F2] focus:border-[#414141] focus:outline-none rounded"
        />

        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1.5 text-xs font-mono rounded whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#181818] text-[#00D68F] border border-[#333333]'
                  : 'text-[#858585] hover:text-[#F2F2F2] border border-transparent'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* File List */}
      {filteredFiles.length === 0 ? (
        <div className="p-8 text-center border border-[#242424] bg-[#0C0C0C] space-y-2">
          <div className="text-xs font-mono text-[#858585]">
            {searchQuery ? 'NO MATCHING FILES FOUND' : 'NO ENCRYPTED FILES STORED'}
          </div>
          {!searchQuery && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-mono text-[#00D68F] hover:underline pt-1"
            >
              Upload your first encrypted document →
            </button>
          )}
        </div>
      ) : (
        <div className="border border-[#242424] bg-[#0C0C0C] divide-y divide-[#1F1F1F]">
          {filteredFiles.map(file => {
            const isImage = file.metadata.mimeType?.startsWith('image/');
            const isPdf = file.metadata.mimeType === 'application/pdf';
            const isText = file.metadata.mimeType?.startsWith('text/');
            const canPreview = isImage || isPdf || isText;

            return (
              <div
                key={file.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-[#121212] transition-colors gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-medium text-[#F2F2F2] truncate">
                      {file.metadata.originalFilename}
                    </span>
                    {file.metadata.category && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#161616] border border-[#282828] text-[#858585]">
                        {file.metadata.category}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 mt-1 text-[11px] font-mono text-[#858585]">
                    <span>{formatBytes(file.file_size)}</span>
                    <span className="truncate">{file.metadata.mimeType || 'binary'}</span>
                    <span>{new Date(file.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {canPreview && (
                    <button
                      type="button"
                      onClick={() => handlePreview(file)}
                      className="px-2.5 py-1 text-xs font-mono text-[#858585] hover:text-[#F2F2F2] border border-[#242424] hover:border-[#414141] rounded"
                    >
                      PREVIEW
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDownload(file)}
                    className="px-2.5 py-1 text-xs font-mono text-[#00D68F] hover:text-[#00c080] border border-[#242424] hover:border-[#00D68F] rounded"
                  >
                    DOWNLOAD
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRenameFile(file);
                      setNewFilename(file.metadata.originalFilename);
                      setNewCategory(file.metadata.category || '');
                    }}
                    className="px-2.5 py-1 text-xs font-mono text-[#858585] hover:text-[#F2F2F2] border border-[#242424] rounded"
                  >
                    EDIT
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(file)}
                    className="px-2.5 py-1 text-xs font-mono text-[#858585] hover:text-[#E5484D] border border-transparent hover:border-[#E5484D] rounded"
                  >
                    DELETE
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* File Preview Modal */}
      {(previewUrl || previewLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl max-h-[90vh] bg-[#0C0C0C] border border-[#242424] flex flex-col rounded">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#242424]">
              <div className="font-mono text-xs text-[#F2F2F2] truncate">
                PREVIEW: {previewFile?.metadata.originalFilename}
              </div>
              <button
                onClick={closePreview}
                className="text-xs font-mono text-[#858585] hover:text-[#F2F2F2] px-2 py-1"
              >
                ✕ CLOSE
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[300px]">
              {previewLoading ? (
                <div className="text-xs font-mono text-[#858585]">DECRYPTING IN BROWSER MEMORY...</div>
              ) : previewFile?.metadata.mimeType?.startsWith('image/') ? (
                <img
                  src={previewUrl!}
                  alt={previewFile.metadata.originalFilename}
                  className="max-w-full max-h-[75vh] object-contain rounded"
                />
              ) : previewFile?.metadata.mimeType === 'application/pdf' ? (
                <iframe
                  src={previewUrl!}
                  title="PDF Preview"
                  className="w-full h-[70vh] border-0"
                />
              ) : (
                <div className="text-xs font-mono text-[#858585]">
                  PREVIEW NOT AVAILABLE FOR THIS FILE FORMAT. USE DOWNLOAD TO VIEW.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rename File Modal */}
      {renameFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0C0C0C] border border-[#242424] p-6 space-y-4 rounded">
            <div className="text-xs font-mono text-[#F2F2F2] font-medium border-b border-[#242424] pb-2">
              EDIT FILE METADATA
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-[#858585] mb-1">
                  FILENAME
                </label>
                <input
                  type="text"
                  value={newFilename}
                  onChange={e => setNewFilename(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-[#101010] border border-[#242424] text-[#F2F2F2] rounded focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#858585] mb-1">
                  CATEGORY
                </label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  placeholder="e.g. Invoices, Identity, Taxes"
                  className="w-full px-3 py-2 text-xs font-mono bg-[#101010] border border-[#242424] text-[#F2F2F2] rounded focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#242424]">
              <button
                type="button"
                onClick={() => setRenameFile(null)}
                className="px-3 py-1.5 text-xs font-mono text-[#858585] hover:text-[#F2F2F2]"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleSaveRename}
                className="px-4 py-1.5 bg-[#00D68F] text-[#000000] text-xs font-mono font-medium rounded hover:bg-[#00c080]"
              >
                SAVE CHANGES
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
