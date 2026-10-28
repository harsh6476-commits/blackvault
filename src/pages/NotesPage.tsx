import React, { useState, useMemo } from 'react';
import { useVault } from '../features/vault/VaultContext';
import type { DecryptedVaultNote } from '../types';

export const NotesPage: React.FC = () => {
  const { notes, saveVaultNote, deleteVaultNote } = useVault();

  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Form states for active or new note
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('General');
  const [keywords, setKeywords] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load active note into editor
  const handleSelectNote = (note: DecryptedVaultNote) => {
    setActiveNoteId(note.id);
    setTitle(note.payload.title);
    setBody(note.payload.body);
    setCategory(note.payload.category || 'General');
    setKeywords(note.payload.keywords ? note.payload.keywords.join(', ') : '');
    setIsFavorite(Boolean(note.payload.isFavorite));
  };

  const handleNewNote = () => {
    setActiveNoteId(null);
    setTitle('');
    setBody('');
    setCategory('General');
    setKeywords('');
    setIsFavorite(false);
  };

  // Categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    notes.forEach(n => {
      if (n.payload.category) set.add(n.payload.category);
    });
    return ['ALL', ...Array.from(set)];
  }, [notes]);

  // Filtered notes list
  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      const matchCat = selectedCategory === 'ALL' || n.payload.category === selectedCategory;
      if (!matchCat) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();

      if (n.payload.title.toLowerCase().includes(q)) return true;
      if (n.payload.body.toLowerCase().includes(q)) return true;
      if (n.payload.keywords?.some(k => k.toLowerCase().includes(q))) return true;

      return false;
    });
  }, [notes, searchQuery, selectedCategory]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      const kwList = keywords
        .split(',')
        .map(k => k.trim())
        .filter(Boolean);

      await saveVaultNote(
        {
          title: title.trim(),
          body,
          category: category.trim(),
          keywords: kwList,
          isFavorite,
        },
        activeNoteId || undefined
      );

      if (!activeNoteId && notes.length > 0) {
        // Will select on next render
      }
    } catch (err) {
      console.error(err);
      alert('Failed to encrypt and save note.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (activeNoteId && confirm(`Permanently delete "${title}"?`)) {
      await deleteVaultNote(activeNoteId);
      handleNewNote();
    }
  };

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col space-y-4 max-w-6xl mx-auto">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-[#242424]">
        <div>
          <div className="text-[11px] font-mono tracking-widest text-[#858585]">ENCRYPTED MEMORANDA</div>
          <h1 className="text-xl font-semibold tracking-tight text-[#F2F2F2] mt-0.5">PRIVATE NOTES</h1>
        </div>

        <button
          type="button"
          onClick={handleNewNote}
          className="px-3.5 py-1.5 bg-[#00D68F] hover:bg-[#00c080] text-[#000000] text-xs font-mono font-medium rounded transition-colors"
        >
          + NEW NOTE
        </button>
      </div>

      {/* Main Two-Column Layout */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
        {/* Left Notes List */}
        <div className="w-full md:w-80 flex flex-col border border-[#242424] bg-[#0C0C0C] rounded overflow-hidden flex-shrink-0">
          {/* Search Box */}
          <div className="p-3 border-b border-[#242424]">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="w-full px-2.5 py-1.5 text-xs font-mono bg-[#101010] border border-[#242424] text-[#F2F2F2] rounded focus:outline-none"
            />

            {/* Categories filter */}
            <div className="flex items-center gap-1 overflow-x-auto pt-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-0.5 text-[10px] font-mono rounded whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-[#181818] text-[#00D68F] border border-[#333333]'
                      : 'text-[#858585]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Notes items list */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#1F1F1F]">
            {filteredNotes.length === 0 ? (
              <div className="p-6 text-center text-xs font-mono text-[#858585]">
                {searchQuery ? 'NO MATCHING NOTES' : 'NO NOTES CREATED'}
              </div>
            ) : (
              filteredNotes.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleSelectNote(n)}
                  className={`p-3 cursor-pointer transition-colors ${
                    activeNoteId === n.id ? 'bg-[#161616] border-l-2 border-[#00D68F]' : 'hover:bg-[#121212]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono text-[#F2F2F2] font-medium truncate">
                    <span className="truncate">{n.payload.title}</span>
                    {n.payload.isFavorite && <span className="text-[#00D68F]">★</span>}
                  </div>
                  <div className="text-[11px] font-mono text-[#858585] truncate mt-1 line-clamp-1">
                    {n.payload.body || 'Empty note...'}
                  </div>
                  <div className="text-[10px] font-mono text-[#666666] mt-1.5">
                    {new Date(n.updated_at).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Editor Area */}
        <div className="flex-1 flex flex-col border border-[#242424] bg-[#0C0C0C] rounded overflow-hidden">
          <form onSubmit={handleSave} className="flex-1 flex flex-col p-4 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#242424] gap-3">
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Note title..."
                required
                className="flex-1 text-sm font-mono font-medium bg-transparent border-0 text-[#F2F2F2] focus:outline-none"
              />

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs font-mono text-[#858585] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFavorite}
                    onChange={e => setIsFavorite(e.target.checked)}
                    className="rounded border-[#242424] bg-[#101010] text-[#00D68F]"
                  />
                  <span>FAV</span>
                </label>

                {activeNoteId && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-2.5 py-1 text-xs font-mono text-[#E5484D] hover:bg-[#1f1010] rounded"
                  >
                    DELETE
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isSaving || !title.trim()}
                  className="px-4 py-1.5 bg-[#00D68F] hover:bg-[#00c080] text-[#000000] text-xs font-mono font-medium rounded transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'ENCRYPTING...' : 'SAVE'}
                </button>
              </div>
            </div>

            {/* Note Metadata row */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div>
                <input
                  type="text"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  placeholder="Category (e.g. Research, Operations)"
                  className="w-full px-2.5 py-1 text-xs font-mono bg-[#101010] border border-[#242424] text-[#F2F2F2] rounded focus:outline-none"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={keywords}
                  onChange={e => setKeywords(e.target.value)}
                  placeholder="Keywords (comma-separated)"
                  className="w-full px-2.5 py-1 text-xs font-mono bg-[#101010] border border-[#242424] text-[#F2F2F2] rounded focus:outline-none"
                />
              </div>
            </div>

            {/* Note Body Textarea */}
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Write your private encrypted thoughts, architectures, or records here..."
              className="flex-1 w-full p-3 text-xs font-mono bg-[#101010] border border-[#242424] text-[#F2F2F2] focus:border-[#414141] focus:outline-none rounded resize-none leading-relaxed"
            />
          </form>
        </div>
      </div>
    </div>
  );
};
