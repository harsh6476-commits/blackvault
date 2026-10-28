import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useVault } from '../features/vault/VaultContext';
import { generatePassword } from '../lib/crypto';
import type { PasswordGeneratorOptions } from '../lib/crypto';
import type { CustomField } from '../types';

export const PasswordEntryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { entries, savePasswordEntry, deletePasswordEntry } = useVault();

  const isEditing = Boolean(id && id !== 'new');
  const existingEntry = isEditing ? entries.find(e => e.id === id) : null;

  // Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Logins');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [keywordsInput, setKeywordsInput] = useState('');
  const [notes, setNotes] = useState('');
  const [fields, setFields] = useState<CustomField[]>([
    { id: '1', key: 'username', value: '', isSensitive: false },
    { id: '2', key: 'password', value: '', isSensitive: true },
  ]);

  // Sensitive fields visibility state
  const [revealedFieldIds, setRevealedFieldIds] = useState<Set<string>>(new Set());
  const [copiedFieldId, setCopiedFieldId] = useState<string | null>(null);

  // Password Generator Modal / Drawer state
  const [showGenModal, setShowGenModal] = useState(false);
  const [targetFieldId, setTargetFieldId] = useState<string | null>(null);
  const [genOptions, setGenOptions] = useState<PasswordGeneratorOptions>({
    length: 20,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: true,
    excludeAmbiguous: true,
  });
  const [generatedPasswordPreview, setGeneratedPasswordPreview] = useState('');

  // Populate data when editing
  useEffect(() => {
    if (existingEntry) {
      setTitle(existingEntry.payload.title);
      setCategory(existingEntry.payload.category || 'General');
      setWebsiteUrl(existingEntry.payload.websiteUrl || '');
      setIsFavorite(Boolean(existingEntry.payload.isFavorite));
      setKeywordsInput(existingEntry.payload.keywords ? existingEntry.payload.keywords.join(', ') : '');
      setNotes(existingEntry.payload.notes || '');
      setFields(
        existingEntry.payload.fields?.length
          ? existingEntry.payload.fields
          : [{ id: '1', key: 'username', value: '', isSensitive: false }]
      );
    }
  }, [existingEntry]);

  // Field manipulation
  const addField = () => {
    setFields(prev => [
      ...prev,
      { id: crypto.randomUUID(), key: '', value: '', isSensitive: false },
    ]);
  };

  const removeField = (fieldId: string) => {
    setFields(prev => prev.filter(f => f.id !== fieldId));
  };

  const updateField = (fieldId: string, updates: Partial<CustomField>) => {
    setFields(prev => prev.map(f => (f.id === fieldId ? { ...f, ...updates } : f)));
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === fields.length - 1)) {
      return;
    }
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...fields];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);
    setFields(reordered);
  };

  const toggleReveal = (fieldId: string) => {
    setRevealedFieldIds(prev => {
      const next = new Set(prev);
      if (next.has(fieldId)) next.delete(fieldId);
      else next.add(fieldId);
      return next;
    });
  };

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFieldId(fieldId);
    setTimeout(() => setCopiedFieldId(null), 2000);
  };

  // Open generator
  const openGenerator = (fieldId: string) => {
    setTargetFieldId(fieldId);
    const pwd = generatePassword(genOptions);
    setGeneratedPasswordPreview(pwd);
    setShowGenModal(true);
  };

  const applyGeneratedPassword = () => {
    if (targetFieldId) {
      updateField(targetFieldId, { value: generatedPasswordPreview, isSensitive: true });
      setShowGenModal(false);
    }
  };

  // Save entry
  const [isSaving, setIsSaving] = useState(false);
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      const keywords = keywordsInput
        .split(',')
        .map(k => k.trim())
        .filter(Boolean);

      await savePasswordEntry(
        {
          title: title.trim(),
          category: category.trim(),
          websiteUrl: websiteUrl.trim() || undefined,
          isFavorite,
          fields,
          keywords,
          notes: notes.trim() || undefined,
        },
        isEditing ? id : undefined
      );

      navigate('/passwords');
    } catch (err) {
      console.error(err);
      alert('Failed to encrypt and save entry.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (id && confirm(`Permanently delete "${title}"?`)) {
      await deletePasswordEntry(id);
      navigate('/passwords');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-5 border-b border-[#242424]">
        <div className="flex items-center gap-3">
          <Link to="/passwords" className="text-xs font-mono text-[#858585] hover:text-[#F2F2F2]">
            ← BACK
          </Link>
          <span className="text-[#333333]">/</span>
          <h1 className="text-base font-semibold tracking-tight text-[#F2F2F2]">
            {isEditing ? `EDIT: ${title || 'ENTRY'}` : 'NEW PASSWORD ENTRY'}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {isEditing && (
            <button
              type="button"
              onClick={handleDelete}
              className="px-3 py-1.5 text-xs font-mono text-[#E5484D] border border-transparent hover:border-[#E5484D] rounded"
            >
              DELETE
            </button>
          )}
          <button
            type="submit"
            form="password-entry-form"
            disabled={isSaving}
            className="px-4 py-1.5 bg-[#00D68F] hover:bg-[#00c080] text-[#000000] text-xs font-mono font-medium rounded transition-colors disabled:opacity-50"
          >
            {isSaving ? 'ENCRYPTING...' : 'SAVE ENTRY'}
          </button>
        </div>
      </div>

      <form id="password-entry-form" onSubmit={handleSave} className="space-y-6">
        {/* Basic Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-[#0C0C0C] border border-[#242424]">
          <div className="md:col-span-2">
            <label className="block text-xs font-mono text-[#858585] mb-1.5 tracking-wider">
              ENTRY TITLE *
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. AWS Production Infrastructure, ProtonMail"
              required
              className="w-full px-3 py-2 text-xs font-mono bg-[#101010] border border-[#242424] text-[#F2F2F2] focus:border-[#414141] focus:outline-none rounded"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-[#858585] mb-1.5 tracking-wider">
              CATEGORY
            </label>
            <input
              type="text"
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder="e.g. Server, Finance, Development"
              className="w-full px-3 py-2 text-xs font-mono bg-[#101010] border border-[#242424] text-[#F2F2F2] focus:border-[#414141] focus:outline-none rounded"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-mono text-[#858585] mb-1.5 tracking-wider">
              WEBSITE / RESOURCE URL
            </label>
            <input
              type="url"
              value={websiteUrl}
              onChange={e => setWebsiteUrl(e.target.value)}
              placeholder="https://console.aws.amazon.com"
              className="w-full px-3 py-2 text-xs font-mono bg-[#101010] border border-[#242424] text-[#F2F2F2] focus:border-[#414141] focus:outline-none rounded"
            />
          </div>

          <div className="flex items-center pt-6">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-[#858585]">
              <input
                type="checkbox"
                checked={isFavorite}
                onChange={e => setIsFavorite(e.target.checked)}
                className="rounded border-[#242424] bg-[#101010] text-[#00D68F] focus:ring-0"
              />
              <span>MARK AS FAVORITE</span>
            </label>
          </div>
        </div>

        {/* Custom Key-Value Fields Section */}
        <div className="p-5 bg-[#0C0C0C] border border-[#242424] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#242424]">
            <div>
              <span className="text-xs font-mono tracking-wider text-[#F2F2F2]">
                CUSTOM KEY-VALUE FIELDS
              </span>
              <p className="text-[11px] font-mono text-[#858585] mt-0.5">
                Add unlimited arbitrary key-value pairs (API tokens, recovery codes, usernames, passwords).
              </p>
            </div>
            <button
              type="button"
              onClick={addField}
              className="px-2.5 py-1 text-xs font-mono text-[#00D68F] border border-[#242424] hover:border-[#00D68F] rounded transition-colors"
            >
              + ADD FIELD
            </button>
          </div>

          <div className="space-y-3">
            {fields.map((field, idx) => {
              const isRevealed = revealedFieldIds.has(field.id);
              const isMasked = field.isSensitive && !isRevealed;

              return (
                <div
                  key={field.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 bg-[#101010] border border-[#242424] rounded"
                >
                  {/* Reorder Buttons */}
                  <div className="flex items-center gap-1 text-[10px] text-[#666666]">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveField(idx, 'up')}
                      className="hover:text-[#F2F2F2] disabled:opacity-20"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      disabled={idx === fields.length - 1}
                      onClick={() => moveField(idx, 'down')}
                      className="hover:text-[#F2F2F2] disabled:opacity-20"
                    >
                      ▼
                    </button>
                  </div>

                  {/* Key Input */}
                  <input
                    type="text"
                    value={field.key}
                    onChange={e => updateField(field.id, { key: e.target.value })}
                    placeholder="Field name (e.g. Password, 2FA Secret)"
                    className="w-full sm:w-44 px-2.5 py-1.5 text-xs font-mono bg-[#080808] border border-[#242424] text-[#F2F2F2] focus:border-[#414141] focus:outline-none rounded"
                  />

                  {/* Value Input */}
                  <div className="flex-1 w-full relative">
                    <input
                      type={isMasked ? 'password' : 'text'}
                      value={field.value}
                      onChange={e => updateField(field.id, { value: e.target.value })}
                      placeholder="Value"
                      className="w-full px-2.5 py-1.5 text-xs font-mono bg-[#080808] border border-[#242424] text-[#F2F2F2] focus:border-[#414141] focus:outline-none rounded"
                    />
                  </div>

                  {/* Field Action Buttons */}
                  <div className="flex items-center gap-2 self-end sm:self-auto pt-1 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => updateField(field.id, { isSensitive: !field.isSensitive })}
                      className={`px-2 py-1 text-[10px] font-mono rounded border ${
                        field.isSensitive
                          ? 'border-[#00D68F] text-[#00D68F]'
                          : 'border-[#242424] text-[#666666] hover:text-[#858585]'
                      }`}
                      title={field.isSensitive ? 'Masked as sensitive' : 'Unmasked'}
                    >
                      {field.isSensitive ? 'SECRET' : 'PLAIN'}
                    </button>

                    {field.isSensitive && (
                      <button
                        type="button"
                        onClick={() => toggleReveal(field.id)}
                        className="px-2 py-1 text-[10px] font-mono border border-[#242424] text-[#858585] hover:text-[#F2F2F2] rounded"
                      >
                        {isRevealed ? 'HIDE' : 'REVEAL'}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => copyToClipboard(field.value, field.id)}
                      className="px-2 py-1 text-[10px] font-mono border border-[#242424] text-[#858585] hover:text-[#F2F2F2] rounded"
                    >
                      {copiedFieldId === field.id ? 'COPIED' : 'COPY'}
                    </button>

                    <button
                      type="button"
                      onClick={() => openGenerator(field.id)}
                      className="px-2 py-1 text-[10px] font-mono border border-[#242424] text-[#858585] hover:text-[#00D68F] rounded"
                      title="Generate random password into this field"
                    >
                      GEN
                    </button>

                    <button
                      type="button"
                      onClick={() => removeField(field.id)}
                      className="px-2 py-1 text-[10px] font-mono text-[#E5484D] hover:bg-[#1f1010] rounded"
                      title="Delete field"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Searchable Keywords & Private Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-[#0C0C0C] border border-[#242424]">
          <div>
            <label className="block text-xs font-mono text-[#858585] mb-1.5 tracking-wider">
              SEARCHABLE KEYWORDS (COMMA-SEPARATED)
            </label>
            <input
              type="text"
              value={keywordsInput}
              onChange={e => setKeywordsInput(e.target.value)}
              placeholder="e.g. staging, ssh, devops, database"
              className="w-full px-3 py-2 text-xs font-mono bg-[#101010] border border-[#242424] text-[#F2F2F2] focus:border-[#414141] focus:outline-none rounded"
            />
            <p className="text-[10px] font-mono text-[#666666] mt-1">
              Encrypted locally. Search operates entirely in-memory when vault is unlocked.
            </p>
          </div>

          <div>
            <label className="block text-xs font-mono text-[#858585] mb-1.5 tracking-wider">
              PRIVATE ENTRY NOTES
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Private instructions, server ports, or pin codes..."
              className="w-full px-3 py-2 text-xs font-mono bg-[#101010] border border-[#242424] text-[#F2F2F2] focus:border-[#414141] focus:outline-none rounded"
            />
          </div>
        </div>
      </form>

      {/* Local Cryptographic Password Generator Modal */}
      {showGenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0C0C0C] border border-[#242424] p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#242424]">
              <div className="text-xs font-mono text-[#F2F2F2] font-medium">PASSWORD GENERATOR</div>
              <button
                onClick={() => setShowGenModal(false)}
                className="text-xs text-[#858585] hover:text-[#F2F2F2]"
              >
                ✕
              </button>
            </div>

            {/* Password Preview Box */}
            <div className="p-3 bg-[#101010] border border-[#242424] font-mono text-sm text-[#00D68F] break-all select-all flex items-center justify-between">
              <span>{generatedPasswordPreview}</span>
              <button
                type="button"
                onClick={() => {
                  const pwd = generatePassword(genOptions);
                  setGeneratedPasswordPreview(pwd);
                }}
                className="ml-2 text-xs text-[#858585] hover:text-[#F2F2F2] border border-[#242424] px-2 py-1 rounded"
              >
                RE-ROLL
              </button>
            </div>

            {/* Options */}
            <div className="space-y-3 text-xs font-mono text-[#858585]">
              <div className="flex items-center justify-between">
                <span>LENGTH: {genOptions.length}</span>
                <input
                  type="range"
                  min={12}
                  max={64}
                  value={genOptions.length}
                  onChange={e => {
                    const next = { ...genOptions, length: Number(e.target.value) };
                    setGenOptions(next);
                    setGeneratedPasswordPreview(generatePassword(next));
                  }}
                  className="w-40"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={genOptions.includeUppercase}
                    onChange={e => {
                      const next = { ...genOptions, includeUppercase: e.target.checked };
                      setGenOptions(next);
                      setGeneratedPasswordPreview(generatePassword(next));
                    }}
                  />
                  <span>UPPERCASE (A-Z)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={genOptions.includeLowercase}
                    onChange={e => {
                      const next = { ...genOptions, includeLowercase: e.target.checked };
                      setGenOptions(next);
                      setGeneratedPasswordPreview(generatePassword(next));
                    }}
                  />
                  <span>LOWERCASE (a-z)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={genOptions.includeNumbers}
                    onChange={e => {
                      const next = { ...genOptions, includeNumbers: e.target.checked };
                      setGenOptions(next);
                      setGeneratedPasswordPreview(generatePassword(next));
                    }}
                  />
                  <span>NUMBERS (0-9)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={genOptions.includeSymbols}
                    onChange={e => {
                      const next = { ...genOptions, includeSymbols: e.target.checked };
                      setGenOptions(next);
                      setGeneratedPasswordPreview(generatePassword(next));
                    }}
                  />
                  <span>SYMBOLS (!@#$)</span>
                </label>
              </div>

              <label className="flex items-center gap-2 pt-2 border-t border-[#242424]">
                <input
                  type="checkbox"
                  checked={genOptions.excludeAmbiguous}
                  onChange={e => {
                    const next = { ...genOptions, excludeAmbiguous: e.target.checked };
                    setGenOptions(next);
                    setGeneratedPasswordPreview(generatePassword(next));
                  }}
                />
                <span>EXCLUDE AMBIGUOUS CHARS (0, O, 1, l, I)</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#242424]">
              <button
                type="button"
                onClick={() => setShowGenModal(false)}
                className="px-3 py-1.5 text-xs font-mono text-[#858585] hover:text-[#F2F2F2]"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={applyGeneratedPassword}
                className="px-4 py-1.5 bg-[#00D68F] text-[#000000] text-xs font-mono font-medium rounded hover:bg-[#00c080]"
              >
                USE PASSWORD
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
