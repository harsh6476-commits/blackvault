import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useVault } from '../features/vault/VaultContext';

export const DashboardPage: React.FC = () => {
  const { entries, files, notes, achievements, lockVault } = useVault();
  const navigate = useNavigate();

  // Calculate actual storage usage from decrypted file metadata
  const totalFileBytes = files.reduce((acc, f) => acc + (f.file_size || 0), 0);
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Combine recent items
  const recentItems = [
    ...entries.map(e => ({ type: 'PASSWORD', title: e.payload.title, date: e.created_at, link: `/passwords/${e.id}` })),
    ...files.map(f => ({ type: 'FILE', title: f.metadata.originalFilename, date: f.created_at, link: '/files' })),
    ...notes.map(n => ({ type: 'NOTE', title: n.payload.title, date: n.created_at, link: `/notes/${n.id}` })),
    ...achievements.map(a => ({ type: 'RECORD', title: a.payload.title, date: a.created_at, link: `/achievements/${a.id}` })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);

  const totalItems = entries.length + files.length + notes.length + achievements.length;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#242424] gap-4">
        <div>
          <div className="text-[11px] font-mono tracking-widest text-[#858585]">SINGLE-OWNER ENCLAVE</div>
          <h1 className="text-xl font-semibold tracking-tight text-[#F2F2F2] mt-0.5">VAULT STATUS</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              lockVault();
              navigate('/unlock');
            }}
            className="px-3 py-1.5 text-xs font-mono border border-[#242424] hover:border-[#E5484D] text-[#858585] hover:text-[#E5484D] transition-colors rounded"
          >
            LOCK VAULT
          </button>
        </div>
      </div>

      {/* Metrics Row - Simple Text-based Panels */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-4 bg-[#0C0C0C] border border-[#242424]">
          <div className="text-[11px] font-mono text-[#858585]">FILES</div>
          <div className="text-2xl font-mono font-medium text-[#F2F2F2] mt-1">{files.length}</div>
          <div className="text-[10px] font-mono text-[#858585] mt-1">{formatBytes(totalFileBytes)}</div>
        </div>

        <div className="p-4 bg-[#0C0C0C] border border-[#242424]">
          <div className="text-[11px] font-mono text-[#858585]">PASSWORDS</div>
          <div className="text-2xl font-mono font-medium text-[#F2F2F2] mt-1">{entries.length}</div>
          <div className="text-[10px] font-mono text-[#858585] mt-1">ENCRYPTED KV</div>
        </div>

        <div className="p-4 bg-[#0C0C0C] border border-[#242424]">
          <div className="text-[11px] font-mono text-[#858585]">NOTES</div>
          <div className="text-2xl font-mono font-medium text-[#F2F2F2] mt-1">{notes.length}</div>
          <div className="text-[10px] font-mono text-[#858585] mt-1">PRIVATE TEXT</div>
        </div>

        <div className="p-4 bg-[#0C0C0C] border border-[#242424]">
          <div className="text-[11px] font-mono text-[#858585]">ACHIEVEMENTS</div>
          <div className="text-2xl font-mono font-medium text-[#F2F2F2] mt-1">{achievements.length}</div>
          <div className="text-[10px] font-mono text-[#858585] mt-1">RECORDS</div>
        </div>

        <div className="p-4 bg-[#0C0C0C] border border-[#242424] col-span-2 md:col-span-1">
          <div className="text-[11px] font-mono text-[#858585]">TOTAL PAYLOADS</div>
          <div className="text-2xl font-mono font-medium text-[#00D68F] mt-1">{totalItems}</div>
          <div className="text-[10px] font-mono text-[#858585] mt-1">ZERO-KNOWLEDGE</div>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div>
        <div className="text-xs font-mono text-[#858585] mb-3 tracking-wider">QUICK ACTIONS</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            to="/files"
            className="p-3 bg-[#0C0C0C] border border-[#242424] hover:border-[#414141] text-xs font-mono text-[#F2F2F2] flex items-center justify-between transition-colors"
          >
            <span>UPLOAD FILE</span>
            <span className="text-[#858585]">→</span>
          </Link>
          <Link
            to="/passwords/new"
            className="p-3 bg-[#0C0C0C] border border-[#242424] hover:border-[#414141] text-xs font-mono text-[#F2F2F2] flex items-center justify-between transition-colors"
          >
            <span>NEW PASSWORD</span>
            <span className="text-[#858585]">→</span>
          </Link>
          <Link
            to="/notes"
            className="p-3 bg-[#0C0C0C] border border-[#242424] hover:border-[#414141] text-xs font-mono text-[#F2F2F2] flex items-center justify-between transition-colors"
          >
            <span>NEW NOTE</span>
            <span className="text-[#858585]">→</span>
          </Link>
          <Link
            to="/achievements"
            className="p-3 bg-[#0C0C0C] border border-[#242424] hover:border-[#414141] text-xs font-mono text-[#F2F2F2] flex items-center justify-between transition-colors"
          >
            <span>ADD RECORD</span>
            <span className="text-[#858585]">→</span>
          </Link>
        </div>
      </div>

      {/* Recently Added Items List */}
      <div>
        <div className="text-xs font-mono text-[#858585] mb-3 tracking-wider">RECENT ENCRYPTED ITEMS</div>
        {recentItems.length === 0 ? (
          <div className="p-8 text-center border border-[#242424] bg-[#0C0C0C] space-y-3">
            <div className="text-sm font-mono text-[#858585]">VAULT IS CURRENTLY EMPTY</div>
            <p className="text-xs font-mono text-[#666666] max-w-md mx-auto">
              Add your first credential, encrypted document, private note, or achievement record to populate the vault.
            </p>
            <div className="pt-2">
              <Link
                to="/passwords/new"
                className="inline-block px-4 py-2 bg-[#00D68F] text-[#000000] text-xs font-mono font-medium rounded hover:bg-[#00c080] transition-colors"
              >
                CREATE FIRST ENTRY
              </Link>
            </div>
          </div>
        ) : (
          <div className="border border-[#242424] bg-[#0C0C0C] divide-y divide-[#1F1F1F]">
            {recentItems.map((item, idx) => (
              <Link
                key={idx}
                to={item.link}
                className="flex items-center justify-between p-3.5 hover:bg-[#121212] transition-colors text-xs font-mono"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#161616] border border-[#282828] text-[#858585]">
                    {item.type}
                  </span>
                  <span className="text-[#F2F2F2] truncate">{item.title}</span>
                </div>
                <div className="text-[#858585] text-[11px] whitespace-nowrap ml-4">
                  {new Date(item.date).toLocaleDateString()}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
