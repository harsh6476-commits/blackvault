import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useVault } from '../features/vault/VaultContext';

export const SearchPage: React.FC = () => {
  const { entries, files, notes, achievements } = useVault();
  const [query, setQuery] = useState('');

  const searchResults = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();

    const matchedEntries = entries.filter(e => {
      if (e.payload.title.toLowerCase().includes(q)) return true;
      if (e.payload.category?.toLowerCase().includes(q)) return true;
      if (e.payload.keywords?.some(k => k.toLowerCase().includes(q))) return true;
      if (e.payload.websiteUrl?.toLowerCase().includes(q)) return true;
      if (e.payload.notes?.toLowerCase().includes(q)) return true;
      if (e.payload.fields?.some(f => f.key.toLowerCase().includes(q) || f.value.toLowerCase().includes(q))) return true;
      return false;
    });

    const matchedFiles = files.filter(f => {
      if (f.metadata.originalFilename.toLowerCase().includes(q)) return true;
      if (f.metadata.category?.toLowerCase().includes(q)) return true;
      if (f.metadata.tags?.some(t => t.toLowerCase().includes(q))) return true;
      return false;
    });

    const matchedNotes = notes.filter(n => {
      if (n.payload.title.toLowerCase().includes(q)) return true;
      if (n.payload.body.toLowerCase().includes(q)) return true;
      if (n.payload.category?.toLowerCase().includes(q)) return true;
      if (n.payload.keywords?.some(k => k.toLowerCase().includes(q))) return true;
      return false;
    });

    const matchedAchievements = achievements.filter(a => {
      if (a.payload.title.toLowerCase().includes(q)) return true;
      if (a.payload.organization.toLowerCase().includes(q)) return true;
      if (a.payload.description?.toLowerCase().includes(q)) return true;
      if (a.payload.category?.toLowerCase().includes(q)) return true;
      if (a.payload.tags?.some(t => t.toLowerCase().includes(q))) return true;
      return false;
    });

    const totalMatches =
      matchedEntries.length + matchedFiles.length + matchedNotes.length + matchedAchievements.length;

    return {
      entries: matchedEntries,
      files: matchedFiles,
      notes: matchedNotes,
      achievements: matchedAchievements,
      totalMatches,
    };
  }, [entries, files, notes, achievements, query]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="pb-5 border-b border-[#242424]">
        <div className="text-[11px] font-mono tracking-widest text-[#858585]">CLIENT-SIDE RETRIEVAL</div>
        <h1 className="text-xl font-semibold tracking-tight text-[#F2F2F2] mt-0.5">VAULT SEARCH</h1>
        <p className="text-xs font-mono text-[#858585] mt-1">
          Searches in-memory across decrypted titles, custom fields, keywords, files, notes, and records.
        </p>
      </div>

      {/* Search Input Bar */}
      <div>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Type to search across everything in the vault..."
          autoFocus
          className="w-full px-4 py-3 text-sm font-mono bg-[#0C0C0C] border border-[#242424] text-[#F2F2F2] focus:border-[#00D68F] focus:outline-none rounded"
        />
      </div>

      {/* Search Results */}
      {!query.trim() ? (
        <div className="p-8 text-center border border-[#242424] bg-[#0C0C0C]">
          <div className="text-xs font-mono text-[#858585]">
            ENTER A QUERY TO SEARCH ACROSS DECRYPTED DATA
          </div>
        </div>
      ) : searchResults && searchResults.totalMatches === 0 ? (
        <div className="p-8 text-center border border-[#242424] bg-[#0C0C0C]">
          <div className="text-xs font-mono text-[#858585]">
            NO MATCHING ITEMS FOUND FOR "{query}"
          </div>
        </div>
      ) : searchResults ? (
        <div className="space-y-6">
          <div className="text-xs font-mono text-[#00D68F]">
            {searchResults.totalMatches} MATCH{searchResults.totalMatches === 1 ? '' : 'ES'} FOUND
          </div>

          {/* Passwords Matches */}
          {searchResults.entries.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-mono text-[#858585] tracking-wider">
                PASSWORDS ({searchResults.entries.length})
              </div>
              <div className="border border-[#242424] bg-[#0C0C0C] divide-y divide-[#1F1F1F]">
                {searchResults.entries.map(e => (
                  <Link
                    key={e.id}
                    to={`/passwords/${e.id}`}
                    className="flex items-center justify-between p-3.5 hover:bg-[#121212] transition-colors text-xs font-mono"
                  >
                    <div>
                      <div className="text-[#F2F2F2] font-medium">{e.payload.title}</div>
                      <div className="text-[11px] text-[#858585] mt-0.5">
                        {e.payload.category} • {e.payload.fields.length} fields
                      </div>
                    </div>
                    <span className="text-[#00D68F] text-[11px]">OPEN →</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Files Matches */}
          {searchResults.files.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-mono text-[#858585] tracking-wider">
                FILES ({searchResults.files.length})
              </div>
              <div className="border border-[#242424] bg-[#0C0C0C] divide-y divide-[#1F1F1F]">
                {searchResults.files.map(f => (
                  <Link
                    key={f.id}
                    to="/files"
                    className="flex items-center justify-between p-3.5 hover:bg-[#121212] transition-colors text-xs font-mono"
                  >
                    <div>
                      <div className="text-[#F2F2F2] font-medium">{f.metadata.originalFilename}</div>
                      <div className="text-[11px] text-[#858585] mt-0.5">
                        {f.metadata.category || 'File'} • {(f.file_size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                    <span className="text-[#00D68F] text-[11px]">VIEW IN FILES →</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Notes Matches */}
          {searchResults.notes.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-mono text-[#858585] tracking-wider">
                NOTES ({searchResults.notes.length})
              </div>
              <div className="border border-[#242424] bg-[#0C0C0C] divide-y divide-[#1F1F1F]">
                {searchResults.notes.map(n => (
                  <Link
                    key={n.id}
                    to="/notes"
                    className="flex items-center justify-between p-3.5 hover:bg-[#121212] transition-colors text-xs font-mono"
                  >
                    <div className="min-w-0 pr-4">
                      <div className="text-[#F2F2F2] font-medium">{n.payload.title}</div>
                      <div className="text-[11px] text-[#858585] truncate mt-0.5">
                        {n.payload.body}
                      </div>
                    </div>
                    <span className="text-[#00D68F] text-[11px] flex-shrink-0">OPEN →</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Achievements Matches */}
          {searchResults.achievements.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-mono text-[#858585] tracking-wider">
                ACHIEVEMENTS ({searchResults.achievements.length})
              </div>
              <div className="border border-[#242424] bg-[#0C0C0C] divide-y divide-[#1F1F1F]">
                {searchResults.achievements.map(a => (
                  <Link
                    key={a.id}
                    to="/achievements"
                    className="flex items-center justify-between p-3.5 hover:bg-[#121212] transition-colors text-xs font-mono"
                  >
                    <div>
                      <div className="text-[#F2F2F2] font-medium">{a.payload.title}</div>
                      <div className="text-[11px] text-[#858585] mt-0.5">
                        {a.payload.organization} • {a.payload.category}
                      </div>
                    </div>
                    <span className="text-[#00D68F] text-[11px]">VIEW →</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
