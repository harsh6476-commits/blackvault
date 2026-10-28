import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useVault } from '../features/vault/VaultContext';
import { isConfigured } from '../lib/supabase';

export const UnlockPage: React.FC = () => {
  const {
    unlockVault,
    loginAndUnlock,
    isVaultUnlocked,
    isAuthenticated,
    ownerEmail,
    needsInitialSetup,
    initializeOwner,
    dbMigrationNeeded,
  } = useVault();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(() => {
    return ownerEmail || localStorage.getItem('blackvault_cached_email') || '';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Rate limiting cooldown state
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Setup mode toggle
  const [isSetupMode, setIsSetupMode] = useState(needsInitialSetup);

  useEffect(() => {
    if (needsInitialSetup) {
      setIsSetupMode(true);
    }
  }, [needsInitialSetup]);

  // Redirect if already unlocked
  useEffect(() => {
    if (isVaultUnlocked) {
      navigate('/dashboard');
    }
  }, [isVaultUnlocked, navigate]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldownSeconds > 0) return;
    if (!password) {
      setError('Master password is required.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isSetupMode) {
        if (!email) {
          setError('Owner email address is required.');
          setIsLoading(false);
          return;
        }
        localStorage.setItem('blackvault_cached_email', email.trim());
        await initializeOwner(email.trim(), password);
      } else if (isConfigured && !isAuthenticated) {
        if (!email) {
          setError('Owner email is required to authenticate session.');
          setIsLoading(false);
          return;
        }
        localStorage.setItem('blackvault_cached_email', email.trim());
        await loginAndUnlock(email.trim(), password);
      } else {
        await unlockVault(password);
      }
      setFailedAttempts(0);
      navigate('/dashboard');
    } catch (err: unknown) {
      console.error(err);
      const attempts = failedAttempts + 1;
      setFailedAttempts(attempts);

      const errorMsg = err instanceof Error ? err.message : String(err);

      if (attempts >= 3) {
        const cooldown = attempts === 3 ? 5 : attempts === 4 ? 15 : 30;
        setCooldownSeconds(cooldown);
        setError(`${errorMsg} Cooldown applied: wait ${cooldown}s.`);
      } else {
        setError(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const showEmailField = isSetupMode || (isConfigured && !isAuthenticated);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#000000] p-4 text-[#F2F2F2]">
      <div className="w-full max-w-sm border border-[#242424] bg-[#0C0C0C] p-8 shadow-2xl rounded-sm">
        {/* Header */}
        <div className="mb-6">
          <div className="text-[11px] font-mono tracking-widest text-[#858585]">PROJECT BLACKVAULT</div>
          <h1 className="text-xl font-medium tracking-tight text-[#F2F2F2] mt-1">PRIVATE ACCESS</h1>
          <p className="text-xs text-[#858585] mt-1 font-mono">
            {isSetupMode
              ? 'OWNER INITIALIZATION'
              : isAuthenticated
              ? `SESSION VERIFIED: ${ownerEmail || 'OWNER'}`
              : 'CLIENT-SIDE VAULT DECRYPTION'}
          </p>
        </div>

        {/* Database Migration Alert */}
        {dbMigrationNeeded && (
          <div className="mb-5 p-3 bg-[#101010] border border-[#E5484D] text-[#E5484D] text-xs font-mono space-y-1.5">
            <div className="font-bold">DATABASE MIGRATION REQUIRED</div>
            <div className="text-[#858585] text-[11px] leading-relaxed">
              Tables not found in Supabase. Open your Supabase SQL Editor and run the script in:
            </div>
            <div className="text-[10px] text-[#F2F2F2] break-all bg-[#080808] p-1.5 border border-[#242424]">
              supabase/migrations/20261029000000_blackvault_schema.sql
            </div>
          </div>
        )}

        {/* Error / Cooldown Alert */}
        {error && (
          <div className="mb-5 p-3 bg-[#101010] border border-[#E5484D] text-[#E5484D] text-xs font-mono break-words">
            {error}
          </div>
        )}

        {/* Unlock / Setup Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {showEmailField && (
            <div>
              <label className="block text-xs font-mono text-[#858585] mb-2 tracking-wider">
                OWNER EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="owner@domain.com"
                disabled={isLoading}
                required
                className="w-full px-3 py-2 text-sm font-mono bg-[#101010] border border-[#242424] text-[#F2F2F2] focus:border-[#00D68F] focus:outline-none rounded-none"
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-mono text-[#858585] tracking-wider">
                MASTER PASSWORD
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] font-mono text-[#858585] hover:text-[#F2F2F2]"
              >
                {showPassword ? 'HIDE' : 'SHOW'}
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••••••••"
              disabled={isLoading || cooldownSeconds > 0}
              required
              autoFocus
              className="w-full px-3 py-2 text-sm font-mono bg-[#101010] border border-[#242424] text-[#F2F2F2] focus:border-[#00D68F] focus:outline-none rounded-none"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || cooldownSeconds > 0}
            className="w-full py-2.5 px-4 bg-[#00D68F] hover:bg-[#00c080] text-[#000000] text-xs font-mono font-semibold tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoading
              ? 'DERIVING KEYS & DECRYPTING...'
              : cooldownSeconds > 0
              ? `LOCKED (${cooldownSeconds}s)`
              : isSetupMode
              ? 'INITIALIZE BLACKVAULT'
              : 'UNLOCK VAULT'}
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="mt-8 pt-5 border-t border-[#242424] flex items-center justify-between text-[11px] font-mono text-[#858585]">
          <Link to="/recovery" className="hover:text-[#F2F2F2] transition-colors">
            RECOVERY KEY
          </Link>
          <button
            type="button"
            onClick={() => setIsSetupMode(!isSetupMode)}
            className="hover:text-[#00D68F] transition-colors"
          >
            {isSetupMode ? 'EXISTING VAULT' : 'SETUP OWNER'}
          </button>
        </div>
      </div>
    </div>
  );
};
