import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export const MfaPage: React.FC = () => {
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleVerifyTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totpCode.length !== 6) {
      setError('Enter a valid 6-digit authenticator code.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;

      const totpFactor = factors.totp[0];
      if (!totpFactor) {
        throw new Error('No enrolled TOTP factor found for this account.');
      }

      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challenge.id,
        code: totpCode,
      });
      if (verifyError) throw verifyError;

      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'MFA verification failed';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#000000] p-4 text-[#F2F2F2]">
      <div className="w-full max-w-sm border border-[#242424] bg-[#0C0C0C] p-8 rounded-sm">
        <div className="mb-8">
          <div className="text-[11px] font-mono tracking-widest text-[#858585]">PROJECT BLACKVAULT</div>
          <h1 className="text-xl font-medium tracking-tight text-[#F2F2F2] mt-1">TWO-FACTOR CHALLENGE</h1>
          <p className="text-xs text-[#858585] mt-1 font-mono">
            ENTER TIME-BASED AUTHENTICATOR CODE (TOTP)
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-[#101010] border border-[#E5484D] text-[#E5484D] text-xs font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleVerifyTotp} className="space-y-5">
          <div>
            <label className="block text-xs font-mono text-[#858585] mb-2 tracking-wider">
              6-DIGIT CODE
            </label>
            <input
              type="text"
              maxLength={6}
              value={totpCode}
              onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              autoFocus
              className="w-full px-3 py-2 text-center text-lg tracking-[0.5em] font-mono bg-[#101010] border border-[#242424] text-[#00D68F] focus:border-[#00D68F] focus:outline-none rounded-none"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || totpCode.length !== 6}
            className="w-full py-2.5 px-4 bg-[#00D68F] hover:bg-[#00c080] text-[#000000] text-xs font-mono font-semibold tracking-wider transition-colors disabled:opacity-40"
          >
            {isLoading ? 'VERIFYING...' : 'CONFIRM MFA'}
          </button>
        </form>

        <div className="mt-8 pt-5 border-t border-[#242424] text-center">
          <Link to="/unlock" className="text-xs font-mono text-[#858585] hover:text-[#F2F2F2]">
            BACK TO UNLOCK
          </Link>
        </div>
      </div>
    </div>
  );
};
