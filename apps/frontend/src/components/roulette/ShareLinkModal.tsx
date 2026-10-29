'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Share2, Shield, Lock, Mail, Disc, Sparkles } from 'lucide-react';
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
  const [copiedWheel, setCopiedWheel] = useState(false);
  const [copiedCards, setCopiedCards] = useState(false);

  if (!isOpen || !roulette) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const wheelShareUrl = `${origin}/roulette/share?id=${roulette.id}`;
  const cardsShareUrl = `${origin}/peek-a-boo/share?id=${roulette.id}`;

  const modes = roulette.rendering_modes && roulette.rendering_modes.length > 0
    ? roulette.rendering_modes
    : ['wheel', 'cards'];

  const handleCopyWheel = () => {
    navigator.clipboard.writeText(wheelShareUrl);
    setCopiedWheel(true);
    toast.success('Roulette wheel share link copied!');
    setTimeout(() => setCopiedWheel(false), 2500);
  };

  const handleCopyCards = () => {
    navigator.clipboard.writeText(cardsShareUrl);
    setCopiedCards(true);
    toast.success('Peek a Boo cards share link copied!');
    setTimeout(() => setCopiedCards(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
      <div className="w-full max-w-lg bg-[#FFFFFF] dark:bg-[#0E1013] border-[3px] border-[#111111] dark:border-[#FFFFFF] corner-rule-blue rounded-none overflow-hidden relative">
        {/* Header */}
        <div className="px-6 py-4 bg-[#F7F5F0] dark:bg-[#111111] border-b-2 border-[#111111] dark:border-[#FFFFFF] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 border-2 border-[#111111] dark:border-[#FFFFFF] bg-[#1A3A6B] text-white flex items-center justify-center font-bold">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-mono text-[10px] font-black uppercase tracking-widest text-[#1A3A6B] dark:text-[#F5C800]">
                [ACCESS // DISPATCH]
              </span>
              <h3 className="text-base font-black uppercase tracking-tight text-[#111111] dark:text-[#FFFFFF]">
                Protected Shareable Links
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 border-2 border-[#111111] dark:border-[#FFFFFF] bg-white dark:bg-[#0E1013] text-[#111111] dark:text-[#FFFFFF] hover:bg-[#E63329] hover:text-white transition rounded-none"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Wheel Link */}
          {modes.includes('wheel') && (
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-[#111111] dark:text-[#FFFFFF] mb-1.5 flex items-center gap-1.5">
                <Disc className="w-3.5 h-3.5 text-[#E63329]" />
                <span>Roulette Wheel URL</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={wheelShareUrl}
                  className="w-full px-3.5 py-2 rounded-none border-2 border-[#111111] dark:border-[#FFFFFF] text-xs font-mono font-bold bg-[#F7F5F0] dark:bg-[#111111] text-[#111111] dark:text-[#FFFFFF] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyWheel}
                  className="px-4 py-2 bg-[#F5C800] hover:bg-[#111111] hover:text-[#F5C800] text-[#111111] border-2 border-[#111111] dark:border-[#FFFFFF] text-xs font-black uppercase tracking-wider rounded-none flex items-center gap-1.5 transition flex-shrink-0"
                >
                  {copiedWheel ? <Check className="w-4 h-4 text-[#111111]" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedWheel ? 'COPIED' : 'COPY'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Peek a Boo Link */}
          {modes.includes('cards') && (
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-[#111111] dark:text-[#FFFFFF] mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#F5C800]" />
                <span>Peek a Boo Cards URL</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={cardsShareUrl}
                  className="w-full px-3.5 py-2 rounded-none border-2 border-[#111111] dark:border-[#FFFFFF] text-xs font-mono font-bold bg-[#F7F5F0] dark:bg-[#111111] text-[#111111] dark:text-[#FFFFFF] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyCards}
                  className="px-4 py-2 bg-[#1A3A6B] hover:bg-[#111111] text-white border-2 border-[#111111] dark:border-[#FFFFFF] text-xs font-black uppercase tracking-wider rounded-none flex items-center gap-1.5 transition flex-shrink-0"
                >
                  {copiedCards ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedCards ? 'COPIED' : 'COPY'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Protection Details */}
          <div className="p-4 bg-[#F7F5F0] dark:bg-[#111111] border-2 border-[#111111] dark:border-[#FFFFFF] rounded-none space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-[#111111]/20 dark:border-[#FFFFFF]/20">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#E63329]" />
                <span className="text-xs font-black uppercase tracking-wider text-[#111111] dark:text-[#FFFFFF]">
                  Cryptographic Access Gate
                </span>
              </div>
              <span className="font-mono text-[10px] font-black uppercase text-[#888888]">
                {roulette.protection_type.toUpperCase()}
              </span>
            </div>

            {roulette.protection_type === 'google' ? (
              <div className="text-xs space-y-2">
                <p className="flex items-center gap-1.5 text-[#1A3A6B] dark:text-[#F5C800] font-black uppercase tracking-wider text-[11px]">
                  <Mail className="w-3.5 h-3.5" />
                  Restricted to Authorized Google GIS Accounts
                </p>
                <p className="text-[11px] text-[#888888] font-mono leading-relaxed">
                  Only the owner and the following whitelisted Gmail addresses can decrypt candidates and play:
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {roulette.allowed_emails.map((e) => (
                    <span
                      key={e}
                      className="px-2 py-0.5 bg-white dark:bg-[#0E1013] text-[#111111] dark:text-[#FFFFFF] border border-[#111111] dark:border-[#FFFFFF] text-[10px] font-mono font-bold"
                    >
                      {e}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-xs space-y-2">
                <p className="flex items-center gap-1.5 text-[#E63329] font-black uppercase tracking-wider text-[11px]">
                  <Lock className="w-3.5 h-3.5" />
                  Protected by Shared Passcode Token
                </p>
                <p className="text-[11px] text-[#888888] font-mono leading-relaxed">
                  Participants must supply this passcode upon arrival before candidate data is revealed:
                </p>
                <div className="p-2.5 bg-white dark:bg-[#0E1013] border-2 border-[#111111] dark:border-[#FFFFFF] text-[#111111] dark:text-[#FFFFFF] font-mono font-black text-xs tracking-wider">
                  PASSCODE: {roulette.access_token || '(NONE)'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#F7F5F0] dark:bg-[#111111] border-t-2 border-[#111111] dark:border-[#FFFFFF] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-black uppercase tracking-wider text-[#111111] dark:text-[#FFFFFF] bg-white dark:bg-[#0E1013] border-2 border-[#111111] dark:border-[#FFFFFF] hover:bg-[#111111] hover:text-white dark:hover:bg-[#FFFFFF] dark:hover:text-[#111111] rounded-none transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
