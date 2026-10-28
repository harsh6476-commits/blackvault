import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useVault } from '../features/vault/VaultContext';

export const PasswordsPage: React.FC = () => {
  const { entries, deletePasswordEntry } = useVault();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Categories extraction
  const categories = useMemo(() => {
    const set = new Set<string>();
    entries.forEach(e => {
      if (e.payload.category) set.add(e.payload.category);
    });
    return ['ALL', ...Array.from(set)];
  }, [entries]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      const matchCategory = selectedCategory === 'ALL' || e.payload.category === selectedCategory;
      if (!matchCategory) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();

      // Search title
      if (e.payload.title.toLowerCase().includes(q)) return true;
      // Search keywords
      if (e.payload.keywords?.some(k => k.toLowerCase().includes(q))) return true;
      // Search field keys or values
      if (e.payload.fields?.some(f => f.key.toLowerCase().includes(q) || f.value.toLowerCase().includes(q))) return true;
      // Search website URL
      if (e.payload.websiteUrl?.toLowerCase().includes(q)) return true;

      return false;
    });
  }, [entries, searchQuery, selectedCategory]);

  const handleDelete = async (id: string, title: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`Permanently delete encrypted credentials for "${title}"?`)) {
      await deletePasswordEntry(id);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-[#242424] gap-4">
        <div>
          <div className="text-[11px] font-mono tracking-widest text-[#858585]">CREDENTIAL VAULT</div>
          <h1 className="text-xl font-semibold tracking-tight text-[#F2F2F2] mt-0.5">PASSWORDS</h1>
        </div>
        <Link
          to="/passwords/new"
          className="px-3.5 py-2 bg-[#00D68F] hover:bg-[#00c080] text-[#000000] text-xs font-mono font-medium rounded transition-colors self-start sm:self-auto"
        >
          + NEW ENTRY
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by title, keyword, field name or value..."
          className="flex-1 px-3 py-2 text-xs font-mono bg-[#0C0C0C] border border-[#242424] text-[#F2F2F2] focus:border-[#414141] focus:outline-none rounded"
        />

        {/* Categories selector */}
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

      {/* Entries List */}
      {filteredEntries.length === 0 ? (
        <div className="p-8 text-center border border-[#242424] bg-[#0C0C0C] space-y-2">
          <div className="text-xs font-mono text-[#858585]">
            {searchQuery ? 'NO MATCHING PASSWORDS FOUND' : 'NO PASSWORD ENTRIES STORED'}
          </div>
          {!searchQuery && (
            <Link to="/passwords/new" className="inline-block text-xs font-mono text-[#00D68F] hover:underline pt-2">
              Create an encrypted password entry →
            </Link>
          )}
        </div>
      ) : (
        <div className="border border-[#242424] bg-[#0C0C0C] divide-y divide-[#1F1F1F]">
          {filteredEntries.map(entry => (
            <div
              key={entry.id}
              className="flex items-center justify-between p-4 hover:bg-[#121212] transition-colors"
            >
              <Link to={`/passwords/${entry.id}`} className="min-w-0 flex-1 pr-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono font-medium text-[#F2F2F2] truncate">
                    {entry.payload.title}
                  </span>
                  {entry.payload.isFavorite && (
                    <span className="text-xs text-[#00D68F]" title="Favorite">★</span>
                  )}
                  {entry.payload.category && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#161616] border border-[#282828] text-[#858585]">
                      {entry.payload.category}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 mt-1.5 text-[11px] font-mono text-[#858585]">
                  <span>{entry.payload.fields.length} custom field{entry.payload.fields.length === 1 ? '' : 's'}</span>
                  {entry.payload.websiteUrl && (
                    <span className="truncate text-[#666666]">{entry.payload.websiteUrl}</span>
                  )}
                  {entry.payload.keywords && entry.payload.keywords.length > 0 && (
                    <span className="truncate text-[#666666]">
                      #{entry.payload.keywords.slice(0, 3).join(', #')}
                    </span>
                  )}
                </div>
              </Link>

              <div className="flex items-center gap-3">
                <Link
                  to={`/passwords/${entry.id}`}
                  className="px-2.5 py-1 text-xs font-mono text-[#858585] hover:text-[#F2F2F2] border border-[#242424] hover:border-[#414141] rounded"
                >
                  VIEW
                </Link>
                <button
                  onClick={e => handleDelete(entry.id, entry.payload.title, e)}
                  className="px-2.5 py-1 text-xs font-mono text-[#858585] hover:text-[#E5484D] border border-transparent hover:border-[#E5484D] rounded transition-colors"
                >
                  DELETE
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
