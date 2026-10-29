'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Sparkles,
  Disc,
  Plus,
  Share2,
  Sliders,
  Shield,
  Lock,
  Mail,
  History,
  AlertCircle,
  ExternalLink,
  Eye,
} from 'lucide-react';
import { PeekABooDeck } from '@/components/peek-a-boo/PeekABooDeck';
import { RouletteFormModal } from '@/components/roulette/RouletteFormModal';
import { ShareLinkModal } from '@/components/roulette/ShareLinkModal';
import { RouletteNav } from '@/components/roulette/RouletteNav';
import {
  fetchRoulettes,
  createRoulette,
  updateRoulette,
  spinRouletteAdmin,
  fetchAuditLogs,
} from '@/lib/api';
import { useToast } from '@/components/common/Toast';
import type { Roulette, RouletteItem, RouletteAuditLog } from '@/types';

function PeekABooView() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const targetId = searchParams.get('id');

  const [roulettes, setRoulettes] = useState<Roulette[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRoulette, setActiveRoulette] = useState<Roulette | null>(null);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [sharingRoulette, setSharingRoulette] = useState<Roulette | null>(null);

  // Recent audit history
  const [recentLogs, setRecentLogs] = useState<RouletteAuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const loadRoulettes = async () => {
    setLoading(true);
    try {
      const res = await fetchRoulettes();
      const list = res.roulettes || [];
      // Filter for sets that allow cards format (or default if unassigned)
      const cardSets = list.filter(
        (r) => !r.rendering_modes || r.rendering_modes.includes('cards')
      );
      setRoulettes(cardSets.length > 0 ? cardSets : list);

      if (targetId) {
        const matching = list.find((r) => r.id === targetId);
        if (matching) {
          setActiveRoulette(matching);
          return;
        }
      }

      if (cardSets.length > 0 && !activeRoulette) {
        setActiveRoulette(cardSets[0]);
      } else if (activeRoulette) {
        const found = list.find((r) => r.id === activeRoulette.id);
        setActiveRoulette(found || cardSets[0] || list[0] || null);
      } else if (list.length > 0) {
        setActiveRoulette(list[0]);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load candidate pools.');
    } finally {
      setLoading(false);
    }
  };

  const loadRecentAudit = async (rouletteId: string) => {
    if (!rouletteId) return;
    try {
      setLogsLoading(true);
      const res = await fetchAuditLogs(rouletteId);
      setRecentLogs((res.logs || []).slice(0, 5));
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    loadRoulettes();
  }, [targetId]);

  useEffect(() => {
    if (activeRoulette?.id) {
      loadRecentAudit(activeRoulette.id);
    }
  }, [activeRoulette?.id]);

  const handleSaveRoulette = async (data: {
    title: string;
    description?: string;
    type: 'trips' | 'places';
    items: RouletteItem[];
    protection_type: 'google' | 'token';
    allowed_emails?: string[];
    access_token?: string;
    rendering_modes?: ('wheel' | 'cards')[];
  }) => {
    const res = await createRoulette(data);
    toast.success(`Created "${res.roulette.title}".`);
    setActiveRoulette(res.roulette);
    await loadRoulettes();
  };

  // Spin Request for Card flip
  const handleSpinRequest = async (pickedItem?: RouletteItem): Promise<RouletteItem> => {
    if (!activeRoulette) throw new Error('No active pool selected');
    const res = await spinRouletteAdmin(activeRoulette.id);
    // Refresh audit trail
    setTimeout(() => {
      if (activeRoulette?.id) loadRecentAudit(activeRoulette.id);
    }, 1000);
    return res.winner || pickedItem || activeRoulette.items[0];
  };

  return (
    <div className="space-y-6">
      {/* Sub-Navigation */}
      <RouletteNav
        activeTab="peek-a-boo"
        rightElement={
          <button
            onClick={() => setIsFormOpen(true)}
            className="px-4 py-2 border-2 border-[#111111] dark:border-white bg-[#F5C800] text-[#111111] text-xs font-black uppercase tracking-wider hover:bg-[#111111] hover:text-[#F5C800] transition flex items-center gap-2 shadow-[2px_2px_0px_0px_#111111] dark:shadow-[2px_2px_0px_0px_#FFFFFF]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>CONFIGURE NEW SET</span>
          </button>
        }
      />

      {/* Header Banner */}
      <div className="p-6 bg-white dark:bg-[#16191E] border-[3px] border-[#111111] dark:border-white corner-rule-yellow flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 bg-[#F5C800]" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#E63329]">
              PROBABILITY PICKER // PEEK A BOO
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#111111] dark:text-white">
            Peek a Boo Cards
          </h1>
          <p className="text-xs text-[#888888] font-mono mt-1">
            Upside-down weighted card deck. Hover or tap to peek at card clues, then flip to reveal the destination.
          </p>
        </div>

        {activeRoulette && (
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href={`/peek-a-boo/share?id=${activeRoulette.id}&preview=true`}
              className="px-3.5 py-2 border-2 border-[#111111] dark:border-white bg-[#F5C800] text-[#111111] text-xs font-black uppercase tracking-wider hover:bg-[#111111] hover:text-[#F5C800] transition flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#111111]"
              title="Preview Recipient POV (Zero DB Writes)"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>PREVIEW CARDS</span>
            </Link>

            <Link
              href={`/roulette?id=${activeRoulette.id}`}
              className="px-3.5 py-2 border-2 border-[#111111] dark:border-white bg-[#111111] text-white dark:bg-white dark:text-[#111111] text-xs font-black uppercase tracking-wider hover:bg-[#E63329] hover:text-white transition flex items-center gap-1.5"
              title="Render as Roulette Wheel"
            >
              <Disc className="w-3.5 h-3.5 text-[#E63329]" />
              <span>SPIN ON WHEEL</span>
            </Link>

            <Link
              href={`/roulette/detail?id=${activeRoulette.id}`}
              className="px-3.5 py-2 border-2 border-[#111111] dark:border-white bg-white dark:bg-[#16191E] text-[#111111] dark:text-white text-xs font-black uppercase tracking-wider hover:bg-[#F5C800] hover:text-[#111111] transition flex items-center gap-1.5"
              title="Edit items, weights, and quotes"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>EDIT SET</span>
            </Link>

            <button
              onClick={() => setSharingRoulette(activeRoulette)}
              className="px-4 py-2 border-2 border-[#111111] dark:border-white bg-[#1A3A6B] text-white text-xs font-black uppercase tracking-wider hover:bg-[#152e55] transition flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#111111] dark:shadow-[2px_2px_0px_0px_#FFFFFF]"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>SHARE LINK</span>
            </button>
          </div>
        )}
      </div>

      {/* Set Selector Dropdown & Metadata */}
      {roulettes.length > 0 && (
        <div className="p-4 bg-white dark:bg-[#16191E] border-2 border-[#111111] dark:border-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <label className="text-xs font-black uppercase tracking-wider text-[#111111] dark:text-white flex-shrink-0">
              Active Set:
            </label>
            <select
              value={activeRoulette?.id || ''}
              onChange={(e) => {
                const sel = roulettes.find((r) => r.id === e.target.value);
                if (sel) setActiveRoulette(sel);
              }}
              className="w-full sm:max-w-md px-3 py-1.5 border-2 border-[#111111] dark:border-white text-xs font-bold uppercase bg-[#F7F5F0] dark:bg-[#111111] text-[#111111] dark:text-white focus:outline-none"
            >
              {roulettes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} ({r.items.length} candidates, {r.type.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {activeRoulette && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="px-2.5 py-1 border border-[#111111] dark:border-white text-[10px] font-mono font-bold uppercase bg-[#F7F5F0] dark:bg-[#111111] text-[#111111] dark:text-white flex items-center gap-1">
                {activeRoulette.protection_type === 'google' ? (
                  <>
                    <Mail className="w-3 h-3 text-[#1A3A6B]" />
                    <span>Google GIS</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3 text-[#E63329]" />
                    <span>Passcode Token</span>
                  </>
                )}
              </span>

              <span className="px-2.5 py-1 border border-[#111111] dark:border-white text-[10px] font-mono font-bold uppercase bg-[#F7F5F0] dark:bg-[#111111] text-[#111111] dark:text-white">
                {activeRoulette.type.toUpperCase()} POOL
              </span>
            </div>
          )}
        </div>
      )}

      {/* Main Deck Container */}
      {loading ? (
        <div className="py-24 text-center border-2 border-[#111111] dark:border-white bg-white dark:bg-[#16191E]">
          <Sparkles className="w-10 h-10 animate-spin mx-auto text-[#F5C800] mb-4" />
          <p className="font-mono text-xs font-black uppercase tracking-widest text-[#888888]">
            Shuffling & Dealing Peek a Boo Deck...
          </p>
        </div>
      ) : activeRoulette ? (
        <div className="space-y-6">
          <PeekABooDeck
            items={activeRoulette.items}
            title={activeRoulette.title}
            type={activeRoulette.type}
            onSpinRequest={handleSpinRequest}
          />

          {/* Recent Immutable Audit Logs for this set */}
          <div className="p-5 bg-white dark:bg-[#16191E] border-[3px] border-[#111111] dark:border-white space-y-4">
            <div className="flex items-center justify-between border-b-2 border-[#111111]/10 dark:border-white/10 pb-3">
              <span className="text-xs font-black uppercase tracking-wider text-[#111111] dark:text-white flex items-center gap-1.5">
                <History className="w-4 h-4 text-[#1A3A6B] dark:text-[#F5C800]" />
                Recent Picks & Audit History
              </span>
              <Link
                href="/roulette/audit"
                className="text-[10px] font-mono font-bold uppercase text-[#1A3A6B] dark:text-[#F5C800] hover:underline flex items-center gap-1"
              >
                <span>View Full Log</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            {logsLoading ? (
              <p className="text-xs font-mono text-[#888888] py-2">Loading audit trail...</p>
            ) : recentLogs.length > 0 ? (
              <div className="space-y-2">
                {recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-[#F7F5F0] dark:bg-[#111111] border border-[#111111]/20 dark:border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <span className="font-mono text-[10px] font-black text-[#E63329] uppercase">
                        PICKED // {log.selected_item_title}
                      </span>
                      <p className="text-[10px] font-mono text-[#888888]">
                        Executed by: {log.executed_by_identifier} ({log.executed_by_type.toUpperCase()})
                      </p>
                    </div>
                    <span className="font-mono text-[10px] text-[#888888]">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-mono text-[#888888] italic py-2">
                No picks recorded yet for this set. Tap any card above to flip and generate an immutable record.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="py-16 text-center border-2 border-dashed border-[#111111]/30 dark:border-white/30 p-8 bg-white dark:bg-[#16191E] space-y-4">
          <Sparkles className="w-12 h-12 text-[#F5C800] mx-auto" />
          <h3 className="text-base font-black uppercase text-[#111111] dark:text-white">
            No Candidate Pools Configured Yet
          </h3>
          <p className="text-xs text-[#888888] font-mono max-w-md mx-auto">
            Assemble your places or trips into a pool and render them either as a Bauhaus Roulette Wheel or a Peek a Boo Card Deck.
          </p>
          <button
            onClick={() => setIsFormOpen(true)}
            className="px-5 py-2.5 bg-[#F5C800] text-[#111111] border-2 border-[#111111] dark:border-white text-xs font-black uppercase tracking-wider hover:bg-[#111111] hover:text-[#F5C800] transition"
          >
            + Create First Pool
          </button>
        </div>
      )}

      {/* Create / Edit Form Modal */}
      <RouletteFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveRoulette}
      />

      {/* Share Link Modal */}
      <ShareLinkModal
        isOpen={!!sharingRoulette}
        roulette={sharingRoulette}
        onClose={() => setSharingRoulette(null)}
      />
    </div>
  );
}

export default function PeekABooPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center border-2 border-[#111111] dark:border-white bg-white dark:bg-[#16191E]">
          <Sparkles className="w-10 h-10 animate-spin mx-auto text-[#F5C800] mb-4" />
          <p className="font-mono text-xs font-black uppercase tracking-widest text-[#888888]">
            Loading Peek a Boo...
          </p>
        </div>
      }
    >
      <PeekABooView />
    </Suspense>
  );
}
