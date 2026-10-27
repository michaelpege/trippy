'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Disc,
  Plus,
  Share2,
  History,
  Shield,
  Lock,
  Mail,
  Edit2,
  Trash2,
  Sparkles,
  ExternalLink,
  Sliders,
} from 'lucide-react';
import { RouletteWheel } from '@/components/roulette/RouletteWheel';
import { RouletteFormModal } from '@/components/roulette/RouletteFormModal';
import { ShareLinkModal } from '@/components/roulette/ShareLinkModal';
import { RouletteNav } from '@/components/roulette/RouletteNav';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import {
  fetchRoulettes,
  createRoulette,
  updateRoulette,
  deleteRoulette,
  spinRouletteAdmin,
} from '@/lib/api';
import { useToast } from '@/components/common/Toast';
import type { Roulette, RouletteItem } from '@/types';

function RouletteView() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const targetId = searchParams.get('id');

  const [roulettes, setRoulettes] = useState<Roulette[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRoulette, setActiveRoulette] = useState<Roulette | null>(null);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRoulette, setEditingRoulette] = useState<Roulette | null>(null);
  const [sharingRoulette, setSharingRoulette] = useState<Roulette | null>(null);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadRoulettes = async () => {
    setLoading(true);
    try {
      const res = await fetchRoulettes();
      const list = res.roulettes || [];
      setRoulettes(list);

      if (targetId) {
        const matching = list.find((r) => r.id === targetId);
        if (matching) {
          setActiveRoulette(matching);
          return;
        }
      }

      if (list.length > 0 && !activeRoulette) {
        setActiveRoulette(list[0]);
      } else if (activeRoulette) {
        const found = list.find((r) => r.id === activeRoulette.id);
        setActiveRoulette(found || list[0] || null);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load roulettes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoulettes();
  }, [targetId]);

  const handleOpenCreate = () => {
    setEditingRoulette(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (roulette: Roulette) => {
    setEditingRoulette(roulette);
    setIsFormOpen(true);
  };

  const handleSaveRoulette = async (data: {
    title: string;
    description?: string;
    type: 'trips' | 'places';
    items: RouletteItem[];
    protection_type: 'google' | 'token';
    allowed_emails?: string[];
    access_token?: string;
  }) => {
    if (editingRoulette) {
      const res = await updateRoulette(editingRoulette.id, data);
      toast.success(`Updated "${res.roulette.title}".`);
      setActiveRoulette(res.roulette);
    } else {
      const res = await createRoulette(data);
      toast.success(`Created "${res.roulette.title}".`);
      setActiveRoulette(res.roulette);
    }
    await loadRoulettes();
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await deleteRoulette(deletingId);
      toast.success('Roulette deleted.');
      if (activeRoulette?.id === deletingId) {
        setActiveRoulette(null);
      }
      setDeletingId(null);
      await loadRoulettes();
    } catch (err: any) {
      toast.error(err.message || 'Delete failed.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSpinRequest = async (): Promise<RouletteItem> => {
    if (!activeRoulette) throw new Error('No active roulette');
    const res = await spinRouletteAdmin(activeRoulette.id);
    return res.winner;
  };

  const totalActiveWeight = (activeRoulette?.items || []).reduce(
    (acc, it) => acc + (Math.max(1, Number(it.weight) || 1)),
    0
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b-[3px] border-[#111111] dark:border-white pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-3 h-3 bg-[#E63329]" />
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-[#888888]">
              DECISION // ENGINE
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-[#111111] dark:text-white leading-none">
            WEIGHTED ROULETTE
          </h1>
          <p className="mt-2 text-xs text-[#555555] dark:text-[#A0A5B0]">
            Probabilistic decision wheel for trips and places. Generates secure shareable links and permanent audit records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/roulette/manage"
            className="px-4 py-2.5 bg-white dark:bg-[#16191E] border-2 border-[#111111] dark:border-white text-xs font-black uppercase tracking-wider text-[#111111] dark:text-white hover:bg-[#F5C800] hover:text-[#111111] transition-colors flex items-center gap-1.5"
          >
            <Sliders className="w-4 h-4" />
            <span>MANAGEMENT CONSOLE</span>
          </Link>
          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 bg-[#E63329] hover:bg-[#C22921] text-white text-xs font-black uppercase tracking-widest border-2 border-[#111111] dark:border-white transition-colors flex items-center gap-2 shadow-[2px_2px_0px_0px_#111111]"
          >
            <Plus className="w-4 h-4" />
            <span>NEW ROULETTE</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <RouletteNav activeTab="spinner" />

      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center border-2 border-dashed border-[#111111]/30 dark:border-white/30 p-12">
          <div className="w-8 h-8 border-3 border-[#E63329] border-t-transparent animate-spin mb-4" />
          <p className="text-xs font-mono uppercase tracking-widest text-[#888888]">
            LOADING PROBABILISTIC WHEELS...
          </p>
        </div>
      ) : roulettes.length === 0 ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center border-[3px] border-[#111111] dark:border-white p-12 text-center bg-white dark:bg-[#16191E]">
          <div className="w-12 h-12 border-2 border-[#111111] dark:border-white bg-[#F5C800] text-[#111111] flex items-center justify-center mb-4 font-black">
            <Disc className="w-6 h-6" />
          </div>
          <h3 className="text-base font-black uppercase tracking-wider text-[#111111] dark:text-white">
            NO ROULETTES CREATED
          </h3>
          <p className="mt-2 text-xs font-mono text-[#888888] max-w-sm">
            Create your first weighted decision wheel to fairly distribute visit chances among candidate destinations.
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-6 px-5 py-2.5 bg-[#E63329] hover:bg-[#C22921] text-white text-xs font-black uppercase tracking-widest border-2 border-[#111111] dark:border-white transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>CREATE FIRST ROULETTE</span>
          </button>
        </div>
      ) : (
        /* Asymmetric Layout: Left = Wheel & Execution; Right = Config & Items */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Wheel & Active Card (lg:col-span-7) */}
          <div className="lg:col-span-7 space-y-6">
            {activeRoulette ? (
              <div className="space-y-6">
                <RouletteWheel
                  items={activeRoulette.items || []}
                  onSpinRequest={handleSpinRequest}
                />

                {/* Active Roulette Card */}
                <div className="bg-white dark:bg-[#16191E] border-[3px] border-[#111111] dark:border-white p-6 relative overflow-hidden">
                  <div className="corner-rule-yellow" />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-[#111111]/10 dark:border-white/10">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-[#1A3A6B] text-white border border-[#111111]">
                          {activeRoulette.type.toUpperCase()} ROULETTE
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-[#F5C800] text-[#111111] border border-[#111111] flex items-center gap-1">
                          {activeRoulette.protection_type === 'google' ? (
                            <>
                              <Mail className="w-3 h-3" /> GOOGLE SSO
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3" /> PASSCODE
                            </>
                          )}
                        </span>
                      </div>
                      <h2 className="text-xl font-black uppercase tracking-tight text-[#111111] dark:text-white">
                        {activeRoulette.title}
                      </h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/roulette/detail/?id=${activeRoulette.id}`}
                        className="px-3 py-1.5 bg-[#F5C800] text-[#111111] hover:bg-[#111111] hover:text-[#F5C800] border-2 border-[#111111] dark:border-white text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-1.5"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>DETAILS & EDIT</span>
                      </Link>

                      <button
                        onClick={() => setSharingRoulette(activeRoulette)}
                        className="px-3 py-1.5 bg-[#111111] dark:bg-white text-white dark:text-[#111111] hover:bg-[#E63329] dark:hover:bg-[#E63329] dark:hover:text-white border-2 border-[#111111] dark:border-white text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-1.5"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>SHARE</span>
                      </button>

                      <button
                        onClick={() => handleOpenEdit(activeRoulette)}
                        className="p-1.5 border-2 border-[#111111] dark:border-white text-[#111111] dark:text-white hover:bg-[#F5C800] hover:text-[#111111] transition-colors"
                        title="Edit Roulette Modal"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setDeletingId(activeRoulette.id)}
                        className="p-1.5 border-2 border-[#111111] dark:border-white text-[#111111] dark:text-white hover:bg-[#E63329] hover:text-white transition-colors"
                        title="Delete Roulette"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {activeRoulette.description && (
                    <p className="mt-4 text-xs text-[#555555] dark:text-[#A0A5B0] leading-relaxed">
                      {activeRoulette.description}
                    </p>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* Right Column: Roulette List & Active Items Weights (lg:col-span-5) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Roulettes Picker List */}
            <div className="bg-white dark:bg-[#16191E] border-[3px] border-[#111111] dark:border-white p-6">
              <div className="flex items-center justify-between pb-3 border-b-2 border-[#111111] dark:border-white mb-4">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#111111] dark:text-white">
                  CONFIGURED ROULETTES ({roulettes.length})
                </span>
                <Link
                  href="/roulette/manage"
                  className="text-[10px] font-mono font-black uppercase text-[#1A3A6B] dark:text-[#F5C800] hover:underline flex items-center gap-1"
                >
                  <span>MANAGE ALL</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </Link>
              </div>

              <div className="space-y-2">
                {roulettes.map((r) => {
                  const isSelected = activeRoulette?.id === r.id;
                  return (
                    <div
                      key={r.id}
                      className={`w-full p-3 border-2 transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-[#E63329] bg-[#FFFDE6] dark:bg-[#20242B] text-[#111111] dark:text-white'
                          : 'border-[#111111]/30 dark:border-white/30 hover:border-[#111111] dark:hover:border-white bg-[#F7F5F0] dark:bg-[#16191E]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveRoulette(r)}
                        className="truncate mr-2 text-left flex-1"
                      >
                        <span className="font-black uppercase tracking-wider text-xs block truncate">
                          {r.title}
                        </span>
                        <span className="text-[10px] font-mono text-[#888888]">
                          {r.items?.length || 0} ITEMS // {r.type.toUpperCase()}
                        </span>
                      </button>

                      <div className="flex items-center gap-2 shrink-0">
                        {isSelected && (
                          <span className="w-2.5 h-2.5 bg-[#E63329]" />
                        )}
                        <Link
                          href={`/roulette/detail/?id=${r.id}`}
                          className="p-1 border border-[#111111]/40 dark:border-white/40 hover:bg-[#F5C800] hover:text-[#111111] text-[#888888] transition"
                          title="Open Detail & Edit Page"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Probability Breakdown of Active Roulette */}
            {activeRoulette && (
              <div className="bg-white dark:bg-[#16191E] border-[3px] border-[#111111] dark:border-white p-6">
                <div className="flex items-center justify-between pb-3 border-b-2 border-[#111111] dark:border-white mb-4">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#111111] dark:text-white">
                    PROBABILITY WEIGHTS ({activeRoulette.items?.length || 0})
                  </span>
                  <span className="text-[10px] font-mono text-[#888888]">
                    TOTAL WEIGHT: {totalActiveWeight}
                  </span>
                </div>

                <div className="space-y-3">
                  {(activeRoulette.items || []).map((it) => {
                    const weightVal = Math.max(1, Number(it.weight) || 1);
                    const pct = totalActiveWeight > 0 ? (weightVal / totalActiveWeight) * 100 : 0;
                    return (
                      <div key={it.item_id || it.title} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="uppercase text-[#111111] dark:text-white truncate">
                            {it.title}
                          </span>
                          <span className="font-mono text-[11px] text-[#888888]">
                            {pct.toFixed(1)}% (wt: {weightVal})
                          </span>
                        </div>
                        {/* High-contrast Bauhaus Progress Bar */}
                        <div className="w-full h-3 bg-[#EEEEEE] dark:bg-[#20242B] border border-[#111111] dark:border-white overflow-hidden">
                          <div
                            className="h-full bg-[#E63329]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Roulette Form Modal */}
      <RouletteFormModal
        isOpen={isFormOpen}
        rouletteToEdit={editingRoulette}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveRoulette}
      />

      {/* Share Link Modal */}
      {sharingRoulette && (
        <ShareLinkModal
          isOpen={!!sharingRoulette}
          roulette={sharingRoulette}
          onClose={() => setSharingRoulette(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingId}
        title="Delete Roulette Confirmation"
        message="Are you sure you want to delete this roulette configuration? This action cannot be reversed."
        actionType="delete"
        confirmText="Yes, Delete Roulette"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}

export default function RoulettePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex flex-col items-center justify-center border-2 border-dashed border-[#111111]/30 dark:border-white/30 p-12">
          <div className="w-8 h-8 border-3 border-[#E63329] border-t-transparent animate-spin mb-4" />
          <p className="text-xs font-mono uppercase tracking-widest text-[#888888]">
            LOADING PROBABILISTIC WHEELS...
          </p>
        </div>
      }
    >
      <RouletteView />
    </Suspense>
  );
}
