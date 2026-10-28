import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useVault } from '../../features/vault/VaultContext';

export const AppLayout: React.FC = () => {
  const { lockVault, lockdownCountdown, ownerEmail } = useVault();
  const navigate = useNavigate();

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLock = () => {
    lockVault();
    navigate('/unlock');
  };

  const navItems = [
    { path: '/dashboard', label: 'DASHBOARD' },
    { path: '/files', label: 'FILES' },
    { path: '/passwords', label: 'PASSWORDS' },
    { path: '/notes', label: 'NOTES' },
    { path: '/achievements', label: 'ACHIEVEMENTS' },
    { path: '/search', label: 'SEARCH' },
    { path: '/settings', label: 'SETTINGS' },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#000000] text-[#F2F2F2]">
      {/* Desktop Narrow Left Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col justify-between border-r border-[#242424] bg-[#080808]">
        <div>
          {/* Logo / Header */}
          <div className="p-5 border-b border-[#242424]">
            <div className="text-xs font-mono tracking-widest text-[#858585]">INFRASTRUCTURE</div>
            <div className="text-sm font-semibold tracking-wider text-[#F2F2F2] mt-0.5">BLACKVAULT</div>
            <div className="flex items-center gap-2 mt-2 text-[11px] text-[#858585] truncate font-mono">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00D68F]"></span>
              <span className="truncate">{ownerEmail || 'OWNER ACCESS'}</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 text-xs font-mono tracking-wider transition-colors duration-150 rounded ${
                    isActive
                      ? 'bg-[#121212] text-[#00D68F] border-l-2 border-[#00D68F]'
                      : 'text-[#858585] hover:text-[#F2F2F2] hover:bg-[#0E0E0E]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Inactivity Status & Lock Vault Button */}
        <div className="p-4 border-t border-[#242424] space-y-3 bg-[#080808]">
          <div className="flex items-center justify-between text-[11px] font-mono text-[#858585]">
            <span>AUTO-LOCK</span>
            <span className={lockdownCountdown < 60 ? 'text-[#E5484D] font-bold' : 'text-[#F2F2F2]'}>
              {formatCountdown(lockdownCountdown)}
            </span>
          </div>

          <button
            onClick={handleLock}
            className="w-full py-2 px-3 text-xs font-mono tracking-wider text-[#F2F2F2] bg-[#101010] border border-[#242424] hover:border-[#E5484D] hover:text-[#E5484D] transition-colors rounded"
          >
            LOCK VAULT
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-12 border-b border-[#242424] bg-[#080808] flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono uppercase tracking-widest text-[#858585]">
              ZERO-KNOWLEDGE CLIENT-SIDE ENCRYPTION
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#101010] text-[#00D68F] border border-[#242424]">
              AES-256-GCM
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-[#858585]">
            <span className="hidden sm:inline">SINGLE-OWNER ENCLAVE</span>
            <button
              onClick={handleLock}
              className="px-2.5 py-1 text-[11px] font-mono text-[#858585] hover:text-[#E5484D] border border-transparent hover:border-[#242424] rounded"
            >
              LOCK
            </button>
          </div>
        </header>

        {/* Scrollable View Area */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#000000]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
