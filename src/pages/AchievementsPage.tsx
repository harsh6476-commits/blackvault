import React, { useState, useMemo } from 'react';
import { useVault } from '../features/vault/VaultContext';
import type { DecryptedVaultAchievement } from '../types';

export const AchievementsPage: React.FC = () => {
  const { achievements, files, saveVaultAchievement, deleteVaultAchievement } = useVault();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modal editor state
  const [showEditor, setShowEditor] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [organization, setOrganization] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Certifications');
  const [tagsInput, setTagsInput] = useState('');
  const [attachmentFileId, setAttachmentFileId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Categories
  const categories = useMemo(() => {
    const defaultCats = ['Certifications', 'Education', 'Projects', 'Hackathons', 'Awards', 'Milestones'];
    const set = new Set<string>(defaultCats);
    achievements.forEach(a => {
      if (a.payload.category) set.add(a.payload.category);
    });
    return ['ALL', ...Array.from(set)];
  }, [achievements]);

  // Filtered achievements
  const filteredAchievements = useMemo(() => {
    return achievements.filter(a => {
      const matchCat = selectedCategory === 'ALL' || a.payload.category === selectedCategory;
      if (!matchCat) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();

      if (a.payload.title.toLowerCase().includes(q)) return true;
      if (a.payload.organization.toLowerCase().includes(q)) return true;
      if (a.payload.description.toLowerCase().includes(q)) return true;
      if (a.payload.tags?.some(t => t.toLowerCase().includes(q))) return true;

      return false;
    });
  }, [achievements, searchQuery, selectedCategory]);

  const handleOpenNew = () => {
    setEditId(null);
    setTitle('');
    setOrganization('');
    setDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setCategory('Certifications');
    setTagsInput('');
    setAttachmentFileId('');
    setShowEditor(true);
  };

  const handleOpenEdit = (a: DecryptedVaultAchievement) => {
    setEditId(a.id);
    setTitle(a.payload.title);
    setOrganization(a.payload.organization);
    setDate(a.payload.date);
    setDescription(a.payload.description);
    setCategory(a.payload.category);
    setTagsInput(a.payload.tags ? a.payload.tags.join(', ') : '');
    setAttachmentFileId(a.payload.attachmentFileId || '');
    setShowEditor(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      const tags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      await saveVaultAchievement(
        {
          title: title.trim(),
          organization: organization.trim(),
          date,
          description: description.trim(),
          category,
          tags,
          attachmentFileId: attachmentFileId || undefined,
        },
        editId || undefined
      );

      setShowEditor(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save achievement.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, aTitle: string) => {
    if (confirm(`Delete achievement "${aTitle}"?`)) {
      await deleteVaultAchievement(id);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-[#242424] gap-4">
        <div>
          <div className="text-[11px] font-mono tracking-widest text-[#858585]">RECORD PORTFOLIO</div>
          <h1 className="text-xl font-semibold tracking-tight text-[#F2F2F2] mt-0.5">
            ACHIEVEMENTS & CERTIFICATES
          </h1>
        </div>

        <button
          type="button"
          onClick={handleOpenNew}
          className="px-3.5 py-2 bg-[#00D68F] hover:bg-[#00c080] text-[#000000] text-xs font-mono font-medium rounded transition-colors self-start sm:self-auto"
        >
          + ADD RECORD
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by title, organization, or tags..."
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

      {/* Achievement Cards / List */}
      {filteredAchievements.length === 0 ? (
        <div className="p-8 text-center border border-[#242424] bg-[#0C0C0C] space-y-2">
          <div className="text-xs font-mono text-[#858585]">
            {searchQuery ? 'NO MATCHING RECORDS FOUND' : 'NO ACHIEVEMENTS RECORDED YET'}
          </div>
          {!searchQuery && (
            <button
              onClick={handleOpenNew}
              className="text-xs font-mono text-[#00D68F] hover:underline pt-1"
            >
              Add your first achievement or certification →
            </button>
          )}
        </div>
      ) : (
        <div className="border border-[#242424] bg-[#0C0C0C] divide-y divide-[#1F1F1F]">
          {filteredAchievements.map(a => {
            const attachedFile = a.payload.attachmentFileId
              ? files.find(f => f.id === a.payload.attachmentFileId)
              : null;

            return (
              <div key={a.id} className="p-4 hover:bg-[#121212] transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-medium text-[#F2F2F2]">
                        {a.payload.title}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161616] border border-[#282828] text-[#858585]">
                        {a.payload.category}
                      </span>
                    </div>

                    <div className="text-xs font-mono text-[#00D68F]">
                      {a.payload.organization} • <span className="text-[#858585]">{a.payload.date}</span>
                    </div>

                    {a.payload.description && (
                      <p className="text-xs font-mono text-[#858585] leading-relaxed pt-1">
                        {a.payload.description}
                      </p>
                    )}

                    {attachedFile && (
                      <div className="pt-2">
                        <span className="text-[10px] font-mono text-[#858585] bg-[#101010] border border-[#242424] px-2 py-1 rounded inline-flex items-center gap-1.5">
                          ATTACHED CERTIFICATE: {attachedFile.metadata.originalFilename}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => handleOpenEdit(a)}
                      className="px-2.5 py-1 text-xs font-mono text-[#858585] hover:text-[#F2F2F2] border border-[#242424] rounded"
                    >
                      EDIT
                    </button>
                    <button
                      onClick={() => handleDelete(a.id, a.payload.title)}
                      className="px-2.5 py-1 text-xs font-mono text-[#858585] hover:text-[#E5484D] border border-transparent hover:border-[#E5484D] rounded"
                    >
                      DELETE
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#0C0C0C] border border-[#242424] p-6 space-y-4 rounded">
            <div className="flex items-center justify-between pb-3 border-b border-[#242424]">
              <div className="text-xs font-mono text-[#F2F2F2] font-medium">
                {editId ? 'EDIT ACHIEVEMENT RECORD' : 'ADD ACHIEVEMENT RECORD'}
              </div>
              <button
                onClick={() => setShowEditor(false)}
                className="text-xs text-[#858585] hover:text-[#F2F2F2]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-[#858585] mb-1">TITLE *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. AWS Certified Solutions Architect"
                  required
                  className="w-full px-3 py-2 text-xs font-mono bg-[#101010] border border-[#242424] text-[#F2F2F2] rounded focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-[#858585] mb-1">
                    ORGANIZATION *
                  </label>
                  <input
                    type="text"
                    value={organization}
                    onChange={e => setOrganization(e.target.value)}
                    placeholder="e.g. Amazon Web Services, MIT"
                    required
                    className="w-full px-3 py-2 text-xs font-mono bg-[#101010] border border-[#242424] text-[#F2F2F2] rounded focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#858585] mb-1">DATE</label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-[#101010] border border-[#242424] text-[#F2F2F2] rounded focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-[#858585] mb-1">
                    CATEGORY
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    placeholder="Certifications, Education, Awards..."
                    className="w-full px-3 py-2 text-xs font-mono bg-[#101010] border border-[#242424] text-[#F2F2F2] rounded focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#858585] mb-1">TAGS</label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={e => setTagsInput(e.target.value)}
                    placeholder="cloud, security, fullstack"
                    className="w-full px-3 py-2 text-xs font-mono bg-[#101010] border border-[#242424] text-[#F2F2F2] rounded focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#858585] mb-1">
                  ATTACH ENCRYPTED DOCUMENT
                </label>
                <select
                  value={attachmentFileId}
                  onChange={e => setAttachmentFileId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-[#101010] border border-[#242424] text-[#F2F2F2] rounded focus:outline-none"
                >
                  <option value="">None (No file attached)</option>
                  {files.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.metadata.originalFilename} ({f.metadata.category || 'File'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#858585] mb-1">
                  DESCRIPTION
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Record summary, verification credential ID, or achievement details..."
                  className="w-full px-3 py-2 text-xs font-mono bg-[#101010] border border-[#242424] text-[#F2F2F2] rounded focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#242424]">
                <button
                  type="button"
                  onClick={() => setShowEditor(false)}
                  className="px-3 py-1.5 text-xs font-mono text-[#858585] hover:text-[#F2F2F2]"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 bg-[#00D68F] text-[#000000] text-xs font-mono font-medium rounded hover:bg-[#00c080] disabled:opacity-50"
                >
                  {isSaving ? 'ENCRYPTING...' : 'SAVE RECORD'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
