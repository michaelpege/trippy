'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Share2, Shield, Lock, Mail } from 'lucide-react';
import { useToast } from '../common/Toast';
import type { Roulette } from '@/types';

interface ShareLinkModalProps {
  isOpen: boolean;
  roulette: Roulette | null;
  onClose: () => void;
}

export const ShareLinkModal: React.FC<ShareLinkModalProps> = ({
  isOpen,
  roulette,
  onClose,
}) => {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  if (!isOpen || !roulette) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = `${origin}/roulette/share/?id=${roulette.id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Shareable link copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Protected Shareable Link
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Share with travel companions or friends
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Roulette Share Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition flex-shrink-0"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Protection Details */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Access Security
              </span>
            </div>

            {roulette.protection_type === 'google' ? (
              <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <p className="flex items-center gap-1 text-slate-700 dark:text-slate-200 font-semibold">
                  <Mail className="w-3.5 h-3.5 text-blue-500" />
                  Protected by Google Sign-In
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Only the owner and the following authorized Gmail accounts can access and spin:
                </p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {roulette.allowed_emails.map((e) => (
                    <span
                      key={e}
                      className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] font-mono rounded-md"
                    >
                      {e}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <p className="flex items-center gap-1 text-slate-700 dark:text-slate-200 font-semibold">
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                  Protected by Passcode / Token
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Participants will be prompted to enter the secret passcode:
                </p>
                <div className="p-2 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-900 dark:text-amber-200 font-mono font-bold text-xs">
                  Passcode: {roulette.access_token || '(None)'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-750 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
