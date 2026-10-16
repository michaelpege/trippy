'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
} from 'lucide-react';
import { RouletteWheel } from '@/components/roulette/RouletteWheel';
import { RouletteFormModal } from '@/components/roulette/RouletteFormModal';
import { ShareLinkModal } from '@/components/roulette/ShareLinkModal';
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

export default function RoulettePage() {
  const toast = useToast();
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
  }, []);

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
      toast.success(`Updated roulette "${res.roulette.title}".`);
    } else {
      const res = await createRoulette(data);
      toast.success(`Created roulette "${res.roulette.title}".`);
    }
    await loadRoulettes();
  };

  const handleDeleteRoulette = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await deleteRoulette(deletingId);
      toast.success('Roulette deleted successfully.');
      setDeletingId(null);
      await loadRoulettes();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete roulette.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSpinExecution = async (): Promise<RouletteItem> => {
    if (!activeRoulette) throw new Error('No roulette selected');
    const res = await spinRouletteAdmin(activeRoulette.id);
    toast.success(`Result: ${res.winner.title} (Logged to audit trail)`);
    return res.winner;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Roulette</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Pick randomly between places or trips with custom weights, protected share links, and
            permanent audit trail
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <Link
            href="/roulette/audit"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-xs font-bold rounded-2xl shadow-sm transition"
          >
            <History className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Audit Trail</span>
          </Link>

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/20 transition text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Roulette</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400 dark:text-slate-500">Loading roulettes...</p>
          </div>
        </div>
      ) : roulettes.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: List of Roulette configs */}
          <div className="lg:col-span-5 space-y-4">
            <h2 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Configured Roulettes ({roulettes.length})
            </h2>

            <div className="space-y-3">
              {roulettes.map((roulette) => {
                const isSelected = activeRoulette?.id === roulette.id;
                return (
                  <div
                    key={roulette.id}
                    onClick={() => setActiveRoulette(roulette)}
                    className={`p-4 rounded-3xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white dark:bg-slate-900 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                        : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="truncate">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              roulette.type === 'trips'
                                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300'
                                : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300'
                            }`}
                          >
                            {roulette.type}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                            {roulette.protection_type === 'google' ? (
                              <>
                                <Mail className="w-3 h-3 text-blue-500" /> Google Auth
                              </>
                            ) : (
                              <>
                                <Lock className="w-3 h-3 text-amber-500" /> Token Passcode
                              </>
                            )}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                          {roulette.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSharingRoulette(roulette);
                          }}
                          className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition"
                          title="Share Link"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(roulette);
                          }}
                          className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition"
                          title="Edit Roulette"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingId(roulette.id);
                          }}
                          className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                          title="Delete Roulette"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {roulette.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                        {roulette.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1">
                      {roulette.items.slice(0, 4).map((it) => (
                        <span
                          key={it.item_id}
                          className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] text-slate-700 dark:text-slate-300 font-medium"
                        >
                          {it.title} ({it.weight}x)
                        </span>
                      ))}
                      {roulette.items.length > 4 && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 self-center">
                          +{roulette.items.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Live Wheel Simulation / Execution */}
          <div className="lg:col-span-7">
            {activeRoulette ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Live Wheel: {activeRoulette.title}
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Spins are executed with weighted probability and written permanently to audit
                      trail
                    </p>
                  </div>

                  <button
                    onClick={() => setSharingRoulette(activeRoulette)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Get Share Link</span>
                  </button>
                </div>

                <RouletteWheel
                  items={activeRoulette.items}
                  onSpinRequest={handleSpinExecution}
                />
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                Select a roulette on the left to preview and spin.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto mb-3">
            <Disc className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No roulettes created yet</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Create a weighted roulette to randomly decide your next destination or trip itinerary.
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white font-semibold text-xs rounded-xl hover:bg-emerald-700 transition"
          >
            Create Roulette Now
          </button>
        </div>
      )}

      {/* Form Modal */}
      <RouletteFormModal
        isOpen={isFormOpen}
        rouletteToEdit={editingRoulette}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveRoulette}
      />

      {/* Share Link Modal */}
      <ShareLinkModal
        isOpen={!!sharingRoulette}
        roulette={sharingRoulette}
        onClose={() => setSharingRoulette(null)}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingId}
        title="Delete Roulette Confirmation"
        message="Are you sure you want to delete this roulette? Note: All historical execution audit records will remain permanently preserved."
        actionType="delete"
        confirmText="Yes, Delete Roulette"
        isLoading={isDeleting}
        onConfirm={handleDeleteRoulette}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
