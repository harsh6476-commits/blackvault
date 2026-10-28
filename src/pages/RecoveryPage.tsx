import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { generateRecoveryKey } from '../lib/crypto';

export const RecoveryPage: React.FC = () => {
  const [newRecoveryKey, setNewRecoveryKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerateSampleKey = () => {
    const key = generateRecoveryKey();
    setNewRecoveryKey(key);
    setCopied(false);
  };

  const handleCopy = () => {
    if (newRecoveryKey) {
      navigator.clipboard.writeText(newRecoveryKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#000000] p-4 text-[#F2F2F2]">
      <div className="w-full max-w-lg border border-[#242424] bg-[#0C0C0C] p-8 rounded-sm">
        <div className="mb-6">
          <div className="text-[11px] font-mono tracking-widest text-[#858585]">PROJECT BLACKVAULT</div>
          <h1 className="text-xl font-medium tracking-tight text-[#F2F2F2] mt-1">EMERGENCY RECOVERY</h1>
          <p className="text-xs text-[#858585] mt-1 font-mono">
            ZERO-KNOWLEDGE ARCHITECTURE KEY GUIDANCE
          </p>
        </div>

        <div className="space-y-4 text-xs font-mono text-[#858585] leading-relaxed border-t border-b border-[#242424] py-5">
          <p className="text-[#F2F2F2]">
            BLACKVAULT utilizes client-side authenticated AES-256-GCM encryption with Argon2id key derivation.
          </p>
          <div className="p-3 bg-[#101010] border-l-2 border-[#E5484D] text-[#F2F2F2]">
            <span className="text-[#E5484D] font-bold">CRITICAL WARNING: </span>
            The server and database never receive your plaintext master password or unencrypted vault key.
            If you lose both your master password and your offline encrypted backup, your data is mathematically unrecoverable.
          </div>
          <p>
            To prevent permanent data loss:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-[#858585]">
            <li>Store your master password in an offline, physical safe location.</li>
            <li>Regularly export an encrypted backup file from the Settings page.</li>
            <li>Store backup archives on encrypted secondary hardware or cold storage.</li>
          </ul>
        </div>

        {/* Recovery Key Generator tool */}
        <div className="my-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-[#F2F2F2]">EMERGENCY RECOVERY KEY FORMAT</span>
            <button
              onClick={handleGenerateSampleKey}
              className="text-[11px] font-mono text-[#00D68F] hover:underline"
            >
              GENERATE NEW RECOVERY KEY
            </button>
          </div>

          {newRecoveryKey ? (
            <div className="p-3 bg-[#101010] border border-[#242424] flex items-center justify-between font-mono text-sm">
              <span className="text-[#00D68F] tracking-wider select-all">{newRecoveryKey}</span>
              <button
                onClick={handleCopy}
                className="text-xs text-[#858585] hover:text-[#F2F2F2] border border-[#242424] px-2 py-1 rounded"
              >
                {copied ? 'COPIED' : 'COPY'}
              </button>
            </div>
          ) : (
            <div className="p-3 bg-[#101010] border border-[#242424] text-[11px] font-mono text-[#858585]">
              Generate a high-entropy 24-byte base32 emergency key during initial configuration.
            </div>
          )}
        </div>

        <div className="pt-2 flex justify-between items-center text-xs font-mono">
          <Link to="/unlock" className="text-[#858585] hover:text-[#F2F2F2] transition-colors">
            ← BACK TO UNLOCK
          </Link>
          <Link to="/settings/backup" className="text-[#00D68F] hover:underline">
            BACKUP CENTER →
          </Link>
        </div>
      </div>
    </div>
  );
};
