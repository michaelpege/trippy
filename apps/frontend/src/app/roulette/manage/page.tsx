'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Filter,
  Shield,
  Lock,
  Mail,
  Disc,
  ArrowRight,
  Share2,
  Trash2,
  Edit3,
  Layers,
  Sparkles,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { RouletteNav } from '@/components/roulette/RouletteNav';
import { RouletteFormModal } from '@/components/roulette/RouletteFormModal';
import { ShareLinkModal } from '@/components/roulette/ShareLinkModal';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { useToast } from '@/components/common/Toast';
import { fetchRoulettes, createRoulette, updateRoulette, deleteRoulette } from '@/lib/api';
import type { Roulette, RouletteItem } from '@/types';

export default function RouletteManagementPage() {
  const router = useRouter();
  const toast = useToast();

  const [roulettes, setRoulettes] = useState<Roulette[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'places' | 'trips'>('all');
  const [authFilter, setAuthFilter] = useState<'all' | 'google' | 'token'>('all');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRoulette, setEditingRoulette] = useState<Roulette | null>(null);
  const [sharingRoulette, setSharingRoulette] = useState<Roulette | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchRoulettes();
      setRoulettes(res.roulettes || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load roulettes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = () => {
    setEditingRoulette(null);
    setIsFormOpen(true);
  };

  const handleEdit = (r: Roulette) => {
    setEditingRoulette(r);
    setIsFormOpen(true);
  };

  const handleSaveModal = async (data: {
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
    } else {
      const res = await createRoulette(data);
      toast.success(`Created "${res.roulette.title}".`);
    }
    await loadData();
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await deleteRoulette(deletingId);
      toast.success('Roulette deleted successfully.');
      setDeletingId(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Delete failed.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredRoulettes = useMemo(() => {
    return roulettes.filter((r) => {
      const matchesSearch =
        searchQuery === '' ||
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.description || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = typeFilter === 'all' || r.type === typeFilter;
      const matchesAuth = authFilter === 'all' || r.protection_type === authFilter;

      return matchesSearch && matchesType && matchesAuth;
    });
  }, [roulettes, searchQuery, typeFilter, authFilter]);

  // Metrics
  const totalCount = roulettes.length;
  const activeCount = roulettes.filter((r) => r.is_active).length;
  const placesCount = roulettes.filter((r) => r.type === 'places').length;
  const tripsCount = roulettes.filter((r) => r.type === 'trips').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b-[3px] border-[#111111] dark:border-white pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-3 h-3 bg-[#1A3A6B]" />
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-[#888888]">
              DECISION ENGINE // DIRECTORY
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-[#111111] dark:text-white leading-none">
            ROULETTE MANAGEMENT
          </h1>
          <p className="mt-2 text-xs text-[#555555] dark:text-[#A0A5B0]">
            Dedicated administrative console to inspect, configure, adjust candidate weights, and manage access security.
          </p>
        </div>

        <button
          onClick={handleCreate}
          className="px-5 py-2.5 bg-[#E63329] hover:bg-[#C22921] text-white text-xs font-black uppercase tracking-widest border-2 border-[#111111] dark:border-white transition-colors flex items-center gap-2 self-start md:self-auto shadow-[3px_3px_0px_0px_#111111] dark:shadow-[3px_3px_0px_0px_#FFFFFF]"
        >
          <Plus className="w-4 h-4" />
          <span>NEW ROULETTE</span>
        </button>
      </div>

      {/* Sub-Navigation */}
      <RouletteNav activeTab="manage" />

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-[#16191E] border-2 border-[#111111] dark:border-white">
          <p className="text-[10px] font-mono uppercase tracking-wider text-[#888888]">Total Roulettes</p>
          <p className="text-2xl font-black text-[#111111] dark:text-white mt-1">{totalCount}</p>
        </div>
        <div className="p-4 bg-white dark:bg-[#16191E] border-2 border-[#111111] dark:border-white">
          <p className="text-[10px] font-mono uppercase tracking-wider text-[#888888]">Active Wheels</p>
          <p className="text-2xl font-black text-[#1A3A6B] dark:text-[#F5C800] mt-1">{activeCount}</p>
        </div>
        <div className="p-4 bg-white dark:bg-[#16191E] border-2 border-[#111111] dark:border-white">
          <p className="text-[10px] font-mono uppercase tracking-wider text-[#888888]">Places Pools</p>
          <p className="text-2xl font-black text-[#E63329] mt-1">{placesCount}</p>
        </div>
        <div className="p-4 bg-white dark:bg-[#16191E] border-2 border-[#111111] dark:border-white">
          <p className="text-[10px] font-mono uppercase tracking-wider text-[#888888]">Trips Pools</p>
          <p className="text-2xl font-black text-[#F5C800] dark:text-[#F5C800] mt-1">{tripsCount}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white dark:bg-[#16191E] border-2 border-[#111111] dark:border-white flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#888888]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by roulette title or description..."
            className="w-full pl-9 pr-4 py-2 border-2 border-[#111111] dark:border-white text-xs font-bold uppercase bg-transparent text-[#111111] dark:text-white focus:outline-none focus:border-[#E63329]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Type Filter */}
          <div className="flex items-center gap-1 border-2 border-[#111111] dark:border-white p-0.5 bg-[#F7F5F0] dark:bg-[#111111]">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition ${
                typeFilter === 'all'
                  ? 'bg-[#111111] text-white dark:bg-white dark:text-[#111111]'
                  : 'text-[#888888] hover:text-[#111111]'
              }`}
            >
              ALL
            </button>
            <button
              onClick={() => setTypeFilter('places')}
              className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition ${
                typeFilter === 'places'
                  ? 'bg-[#1A3A6B] text-white'
                  : 'text-[#888888] hover:text-[#111111]'
              }`}
            >
              PLACES
            </button>
            <button
              onClick={() => setTypeFilter('trips')}
              className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition ${
                typeFilter === 'trips'
                  ? 'bg-[#E63329] text-white'
                  : 'text-[#888888] hover:text-[#111111]'
              }`}
            >
              TRIPS
            </button>
          </div>

          {/* Auth Filter */}
          <div className="flex items-center gap-1 border-2 border-[#111111] dark:border-white p-0.5 bg-[#F7F5F0] dark:bg-[#111111]">
            <button
              onClick={() => setAuthFilter('all')}
              className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition ${
                authFilter === 'all'
                  ? 'bg-[#111111] text-white dark:bg-white dark:text-[#111111]'
                  : 'text-[#888888] hover:text-[#111111]'
              }`}
            >
              ANY AUTH
            </button>
            <button
              onClick={() => setAuthFilter('google')}
              className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1 ${
                authFilter === 'google'
                  ? 'bg-[#1A3A6B] text-white'
                  : 'text-[#888888] hover:text-[#111111]'
              }`}
            >
              <Mail className="w-3 h-3" />
              <span>GOOGLE</span>
            </button>
            <button
              onClick={() => setAuthFilter('token')}
              className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1 ${
                authFilter === 'token'
                  ? 'bg-[#F5C800] text-[#111111]'
                  : 'text-[#888888] hover:text-[#111111]'
              }`}
            >
              <Lock className="w-3 h-3" />
              <span>TOKEN</span>
            </button>
          </div>
        </div>
      </div>

      {/* Roulette Grid */}
      {loading ? (
        <div className="py-20 text-center border-2 border-[#111111] dark:border-white bg-white dark:bg-[#16191E]">
          <Disc className="w-8 h-8 animate-spin mx-auto text-[#E63329] mb-3" />
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-[#888888]">
            Loading Roulettes...
          </p>
        </div>
      ) : filteredRoulettes.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-[#111111] dark:border-white bg-white dark:bg-[#16191E] space-y-3">
          <p className="font-mono text-xs uppercase font-bold text-[#888888]">
            No roulettes match your query or filters.
          </p>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-[#E63329] text-white text-xs font-black uppercase tracking-wider border-2 border-[#111111] dark:border-white hover:bg-[#C22921]"
          >
            Create Your First Roulette
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredRoulettes.map((roulette) => {
            const isGoogle = roulette.protection_type === 'google';
            const totalWeight = (roulette.items || []).reduce(
              (sum, it) => sum + (Math.max(1, Number(it.weight) || 1)),
              0
            );

            return (
              <div
                key={roulette.id}
                className="bg-white dark:bg-[#16191E] border-[3px] border-[#111111] dark:border-white flex flex-col justify-between hover:shadow-[4px_4px_0px_0px_#111111] dark:hover:shadow-[4px_4px_0px_0px_#FFFFFF] transition-all"
              >
                {/* Card Top */}
                <div className="p-5 space-y-4">
                  {/* Badges Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#111111]/10 dark:border-white/10 pb-3">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 text-[9px] font-mono font-black uppercase tracking-wider border ${
                          roulette.type === 'places'
                            ? 'bg-[#1A3A6B] text-white border-[#1A3A6B]'
                            : 'bg-[#E63329] text-white border-[#E63329]'
                        }`}
                      >
                        {roulette.type}
                      </span>

                      <span
                        className={`px-2 py-0.5 text-[9px] font-mono font-black uppercase tracking-wider border flex items-center gap-1 ${
                          isGoogle
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-[#1A3A6B] dark:text-blue-300 border-[#1A3A6B]'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-[#B8860B] dark:text-[#F5C800] border-[#B8860B]'
                        }`}
                      >
                        {isGoogle ? <Mail className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                        <span>{isGoogle ? 'GOOGLE SSO' : 'PASSCODE'}</span>
                      </span>
                    </div>

                    <span
                      className={`text-[9px] font-mono font-black uppercase tracking-wider px-1.5 py-0.5 border ${
                        roulette.is_active
                          ? 'border-emerald-600 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
                          : 'border-red-600 text-red-600 bg-red-50 dark:bg-red-950/40'
                      }`}
                    >
                      {roulette.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <Link
                      href={`/roulette/detail/?id=${roulette.id}`}
                      className="text-base font-black uppercase tracking-tight text-[#111111] dark:text-white hover:text-[#E63329] transition line-clamp-1 block"
                      title={roulette.title}
                    >
                      {roulette.title}
                    </Link>
                    {roulette.description ? (
                      <p className="text-xs text-[#666666] dark:text-[#A0A5B0] line-clamp-2 mt-1">
                        {roulette.description}
                      </p>
                    ) : (
                      <p className="text-xs text-[#888888] font-mono italic mt-1">
                        No description provided.
                      </p>
                    )}
                  </div>

                  {/* Candidate Items Summary */}
                  <div className="p-3 bg-[#F7F5F0] dark:bg-[#111111] border border-[#111111] dark:border-white/40 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono font-black uppercase text-[#888888]">
                      <span>Candidates: {(roulette.items || []).length} items</span>
                      <span>Total Weight: {totalWeight}</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {(roulette.items || []).slice(0, 3).map((it) => (
                        <span
                          key={it.item_id}
                          className="px-2 py-0.5 bg-white dark:bg-[#16191E] border border-[#111111]/30 dark:border-white/30 text-[10px] font-mono font-bold truncate max-w-[130px]"
                          title={`${it.title} (Weight: ${it.weight})`}
                        >
                          {it.title}
                        </span>
                      ))}
                      {(roulette.items || []).length > 3 && (
                        <span className="px-1.5 py-0.5 text-[9px] font-mono font-black text-[#888888] self-center">
                          +{(roulette.items || []).length - 3} MORE
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Protection Info */}
                  <div className="text-[10px] font-mono text-[#888888] flex items-center justify-between">
                    <span>
                      {isGoogle
                        ? `${(roulette.allowed_emails || []).length} authorized emails`
                        : `Token: ${roulette.access_token ? '••••••••' : 'None'}`}
                    </span>
                    <span>
                      {roulette.created_at
                        ? new Date(roulette.created_at).toLocaleDateString()
                        : ''}
                    </span>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="border-t-2 border-[#111111] dark:border-white bg-[#F7F5F0] dark:bg-[#111111] p-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setSharingRoulette(roulette)}
                      className="p-1.5 border border-[#111111] dark:border-white bg-white dark:bg-[#16191E] text-[#111111] dark:text-white hover:bg-[#F5C800] hover:text-[#111111] transition"
                      title="Share Roulette Link"
                      aria-label="Share Link"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleEdit(roulette)}
                      className="p-1.5 border border-[#111111] dark:border-white bg-white dark:bg-[#16191E] text-[#111111] dark:text-white hover:bg-[#1A3A6B] hover:text-white transition"
                      title="Quick Edit Modal"
                      aria-label="Edit"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingId(roulette.id)}
                      className="p-1.5 border border-[#111111] dark:border-white bg-white dark:bg-[#16191E] text-[#111111] dark:text-white hover:bg-[#E63329] hover:text-white transition"
                      title="Delete Roulette"
                      aria-label="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {(!roulette.rendering_modes || roulette.rendering_modes.includes('cards')) && (
                      <Link
                        href={`/peek-a-boo?id=${roulette.id}`}
                        className="px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider border border-[#111111] dark:border-white bg-[#111111] text-[#F5C800] hover:bg-[#1A3A6B] hover:text-white transition flex items-center gap-1"
                        title="Play in Peek a Boo cards format"
                      >
                        <Sparkles className="w-3 h-3 text-[#F5C800]" />
                        <span>CARDS</span>
                      </Link>
                    )}

                    <Link
                      href={`/roulette?id=${roulette.id}`}
                      className="px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider border border-[#111111] dark:border-white bg-white dark:bg-[#16191E] text-[#111111] dark:text-white hover:bg-[#E63329] hover:text-white transition flex items-center gap-1"
                    >
                      <Disc className="w-3 h-3" />
                      <span>SPIN</span>
                    </Link>

                    <Link
                      href={`/roulette/detail/?id=${roulette.id}`}
                      className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider border border-[#111111] dark:border-white bg-[#111111] text-white dark:bg-white dark:text-[#111111] hover:bg-[#F5C800] hover:text-[#111111] transition flex items-center gap-1"
                    >
                      <span>DETAILS & EDIT</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal for Creating/Editing */}
      <RouletteFormModal
        isOpen={isFormOpen}
        rouletteToEdit={editingRoulette}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveModal}
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
        title="Delete Roulette Configuration"
        message="Are you sure you want to delete this roulette wheel? All associated configurations will be removed permanently. Audit logs remain immutable."
        actionType="delete"
        confirmText="Yes, Delete Roulette"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
