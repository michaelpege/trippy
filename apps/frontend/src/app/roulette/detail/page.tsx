'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Share2,
  Disc,
  Trash2,
  Plus,
  Shield,
  Lock,
  Mail,
  RefreshCw,
  History,
  Eye,
  EyeOff,
  Copy,
  Check,
  Sliders,
  ExternalLink,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { RouletteNav } from '@/components/roulette/RouletteNav';
import { RouletteWheel } from '@/components/roulette/RouletteWheel';
import { ShareLinkModal } from '@/components/roulette/ShareLinkModal';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { useToast } from '@/components/common/Toast';
import {
  fetchRoulette,
  updateRoulette,
  spinRouletteAdmin,
  fetchPlaces,
  fetchTrips,
  fetchAuditLogs,
} from '@/lib/api';
import type { Roulette, RouletteItem, Place, Trip, RouletteAuditLog } from '@/types';

function RouletteDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const rouletteId = searchParams.get('id') || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [originalRoulette, setOriginalRoulette] = useState<Roulette | null>(null);

  // Editable Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [renderingModes, setRenderingModes] = useState<('wheel' | 'cards')[]>(['wheel', 'cards']);
  const [isActive, setIsActive] = useState(true);
  const [protectionType, setProtectionType] = useState<'google' | 'token'>('google');
  const [allowedEmails, setAllowedEmails] = useState<string[]>([]);
  const [newEmailInput, setNewEmailInput] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [items, setItems] = useState<RouletteItem[]>([]);

  // Available Candidates from Backend
  const [availablePlaces, setAvailablePlaces] = useState<Place[]>([]);
  const [availableTrips, setAvailableTrips] = useState<Trip[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState('');

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<RouletteAuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Modals & Wheel Test
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [lastSpinWinner, setLastSpinWinner] = useState<RouletteItem | null>(null);

  const wheelSectionRef = useRef<HTMLDivElement | null>(null);

  // Load Roulette Data & Audit Trail
  const loadRouletteData = async () => {
    if (!rouletteId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await fetchRoulette(rouletteId);
      const r = res.roulette;
      setOriginalRoulette(r);

      setTitle(r.title);
      setDescription(r.description || '');
      setRenderingModes(r.rendering_modes || ['wheel', 'cards']);
      setIsActive(r.is_active);
      setProtectionType(r.protection_type);
      setAllowedEmails(r.allowed_emails || []);
      setAccessToken(r.access_token || '');
      setItems(r.items || []);

      // Load Candidates
      if (r.type === 'places') {
        fetchPlaces().then((p) => setAvailablePlaces(p.places || [])).catch(console.error);
      } else {
        fetchTrips().then((t) => setAvailableTrips(t.trips || [])).catch(console.error);
      }

      // Load Audit
      loadAuditLogs();
    } catch (err: any) {
      toast.error(err.message || 'Failed to load roulette');
    } finally {
      setLoading(false);
    }
  };

  const toggleRenderingMode = (mode: 'wheel' | 'cards') => {
    if (renderingModes.includes(mode)) {
      if (renderingModes.length === 1) {
        toast.info('At least one presentation format must remain selected.');
        return;
      }
      setRenderingModes(renderingModes.filter((m) => m !== mode));
    } else {
      setRenderingModes([...renderingModes, mode]);
    }
  };

  const handleUpdateQuotes = (itemId: string, rawText: string) => {
    const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
    setItems((prev) =>
      prev.map((it) =>
        it.item_id === itemId
          ? {
              ...it,
              quotes: lines,
              quote: lines[0] || '',
            }
          : it
      )
    );
  };

  const loadAuditLogs = async () => {
    if (!rouletteId) return;
    try {
      setAuditLoading(true);
      const res = await fetchAuditLogs(rouletteId);
      setAuditLogs(res.logs || []);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    loadRouletteData();
  }, [rouletteId]);

  // Dirty State Detection
  const hasChanges = useMemo(() => {
    if (!originalRoulette) return false;
    const emailsMatch =
      JSON.stringify(allowedEmails.slice().sort()) ===
      JSON.stringify((originalRoulette.allowed_emails || []).slice().sort());
    const itemsMatch = JSON.stringify(items) === JSON.stringify(originalRoulette.items || []);
    const modesMatch =
      JSON.stringify(renderingModes.slice().sort()) ===
      JSON.stringify((originalRoulette.rendering_modes || ['wheel', 'cards']).slice().sort());

    return (
      title !== originalRoulette.title ||
      description !== (originalRoulette.description || '') ||
      !modesMatch ||
      isActive !== originalRoulette.is_active ||
      protectionType !== originalRoulette.protection_type ||
      !emailsMatch ||
      accessToken !== (originalRoulette.access_token || '') ||
      !itemsMatch
    );
  }, [
    originalRoulette,
    title,
    description,
    renderingModes,
    isActive,
    protectionType,
    allowedEmails,
    accessToken,
    items,
  ]);

  // Add Candidate
  const handleAddCandidate = () => {
    if (!selectedCandidateId) return;
    if (items.some((it) => it.item_id === selectedCandidateId)) {
      toast.info('Item is already in candidate pool.');
      setSelectedCandidateId('');
      return;
    }

    if (originalRoulette?.type === 'places') {
      const p = availablePlaces.find((x) => x.id === selectedCandidateId);
      if (p) {
        setItems((prev) => [
          ...prev,
          {
            item_id: p.id,
            title: p.name,
            subtitle: p.type,
            type: 'places',
            weight: 1,
          },
        ]);
        toast.success(`Added place "${p.name}". Remember to save.`);
      }
    } else {
      const t = availableTrips.find((x) => x.id === selectedCandidateId);
      if (t) {
        setItems((prev) => [
          ...prev,
          {
            item_id: t.id,
            title: t.name,
            subtitle: `${t.places?.length || 0} stops`,
            type: 'trips',
            weight: 1,
          },
        ]);
        toast.success(`Added trip "${t.name}". Remember to save.`);
      }
    }
    setSelectedCandidateId('');
  };

  // Remove Candidate
  const handleRemoveCandidate = (itemId: string) => {
    const it = items.find((x) => x.item_id === itemId);
    setItems((prev) => prev.filter((x) => x.item_id !== itemId));
    if (it) {
      toast.info(`Removed "${it.title}". Click "Save Changes" to commit.`);
    }
  };

  // Update Item Weight
  const handleUpdateWeight = (itemId: string, newWeight: number) => {
    const val = Math.max(1, Math.min(50, newWeight || 1));
    setItems((prev) =>
      prev.map((it) => (it.item_id === itemId ? { ...it, weight: val } : it))
    );
  };

  // Add Email to Whitelist
  const handleAddEmail = () => {
    const em = newEmailInput.trim().toLowerCase();
    if (!em) return;
    if (!em.includes('@') || !em.includes('.')) {
      toast.error('Please enter a valid email address.');
      return;
    }
    if (allowedEmails.includes(em)) {
      toast.info('Email is already whitelisted.');
      setNewEmailInput('');
      return;
    }
    setAllowedEmails((prev) => [...prev, em]);
    setNewEmailInput('');
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setAllowedEmails((prev) => prev.filter((e) => e !== emailToRemove));
  };

  // Generate Token
  const handleGenerateToken = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'ROU-';
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    code += '-';
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    setAccessToken(code);
    toast.info(`Generated token: ${code}`);
  };

  // Copy Token
  const handleCopyToken = () => {
    if (!accessToken) return;
    navigator.clipboard.writeText(accessToken);
    setCopiedToken(true);
    toast.success('Passcode token copied to clipboard');
    setTimeout(() => setCopiedToken(false), 2000);
  };

  // Save Changes
  const handleSaveAll = async () => {
    if (!title.trim()) {
      toast.error('Title is required.');
      return;
    }
    if (items.length < 2) {
      toast.error('Candidate pool requires at least 2 items for roulette.');
      return;
    }
    if (protectionType === 'token' && !accessToken.trim()) {
      toast.error('Passcode token is required when token protection is selected.');
      return;
    }
    if (protectionType === 'google' && allowedEmails.length === 0) {
      toast.error('At least one email is required for Google SSO protection.');
      return;
    }

    setSaving(true);
    try {
      const res = await updateRoulette(rouletteId, {
        title: title.trim(),
        description: description.trim(),
        rendering_modes: renderingModes,
        is_active: isActive,
        protection_type: protectionType,
        allowed_emails: allowedEmails,
        access_token: accessToken.trim(),
        items,
      });

      toast.success('Roulette updated & changes logged to immutable audit trail.');
      setOriginalRoulette(res.roulette);
      setShowSaveConfirm(false);
      await loadAuditLogs();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update roulette');
    } finally {
      setSaving(false);
    }
  };

  // Spin Request for Test
  const handleSpinTest = async (): Promise<RouletteItem> => {
    const res = await spinRouletteAdmin(rouletteId);
    setLastSpinWinner(res.winner);
    // Refresh audit logs after spin
    setTimeout(() => loadAuditLogs(), 1000);
    return res.winner;
  };

  const totalWeight = items.reduce(
    (sum, it) => sum + (Math.max(1, Number(it.weight) || 1)),
    0
  );

  // Unselected Candidates for the Add Candidate dropdown
  const unselectedCandidates = useMemo(() => {
    const existingIds = new Set(items.map((it) => it.item_id));
    if (originalRoulette?.type === 'places') {
      return availablePlaces.filter((p) => !existingIds.has(p.id));
    }
    return availableTrips.filter((t) => !existingIds.has(t.id));
  }, [items, availablePlaces, availableTrips, originalRoulette?.type]);

  if (loading) {
    return (
      <div className="py-24 text-center border-2 border-[#111111] dark:border-white bg-white dark:bg-[#16191E]">
        <Disc className="w-10 h-10 animate-spin mx-auto text-[#E63329] mb-4" />
        <p className="font-mono text-xs font-black uppercase tracking-widest text-[#888888]">
          Loading Roulette Configuration...
        </p>
      </div>
    );
  }

  if (!originalRoulette) {
    return (
      <div className="p-8 border-2 border-[#E63329] bg-white dark:bg-[#16191E] text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-[#E63329] mx-auto" />
        <h2 className="text-xl font-black uppercase text-[#111111] dark:text-white">
          Roulette Not Found
        </h2>
        <p className="text-xs text-[#888888] font-mono">
          The requested roulette does not exist or has been removed.
        </p>
        <Link
          href="/roulette/manage"
          className="inline-block px-4 py-2 bg-[#111111] text-white dark:bg-white dark:text-[#111111] text-xs font-black uppercase tracking-wider"
        >
          Return to Management Console
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-[3px] border-[#111111] dark:border-white pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/roulette/manage"
            className="p-2 border-2 border-[#111111] dark:border-white bg-white dark:bg-[#16191E] text-[#111111] dark:text-white hover:bg-[#F5C800] hover:text-[#111111] transition"
            title="Back to Management Console"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-[#E63329]" />
              <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-[#888888]">
                ROULETTE // CONFIGURATION // {originalRoulette.id}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#111111] dark:text-white">
              {originalRoulette.title}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href={`/roulette?id=${rouletteId}`}
            className="px-3.5 py-2 border-2 border-[#111111] dark:border-white bg-[#111111] text-white dark:bg-white dark:text-[#111111] text-xs font-black uppercase tracking-wider hover:bg-[#E63329] hover:text-white transition flex items-center gap-1.5"
            title="Spin on Roulette Wheel"
          >
            <Disc className="w-3.5 h-3.5 text-[#E63329]" />
            <span>PLAY WHEEL</span>
          </Link>

          <Link
            href={`/peek-a-boo?id=${rouletteId}`}
            className="px-3.5 py-2 border-2 border-[#111111] dark:border-white bg-[#111111] text-white dark:bg-white dark:text-[#111111] text-xs font-black uppercase tracking-wider hover:bg-[#1A3A6B] hover:text-white transition flex items-center gap-1.5"
            title="Play in Peek a Boo Cards Format"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#F5C800]" />
            <span>PLAY PEEK A BOO</span>
          </Link>

          <button
            onClick={() => setShowShareModal(true)}
            className="px-4 py-2 border-2 border-[#111111] dark:border-white bg-white dark:bg-[#16191E] text-xs font-black uppercase tracking-wider text-[#111111] dark:text-white hover:bg-[#F5C800] hover:text-[#111111] transition flex items-center gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>SHARE LINK</span>
          </button>

          <button
            onClick={() => {
              wheelSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-4 py-2 border-2 border-[#111111] dark:border-white bg-[#1A3A6B] text-white text-xs font-black uppercase tracking-wider hover:bg-[#152e55] transition flex items-center gap-1.5"
          >
            <Disc className="w-3.5 h-3.5" />
            <span>PREVIEW WHEEL</span>
          </button>

          <button
            onClick={() => setShowSaveConfirm(true)}
            disabled={!hasChanges || saving}
            className={`px-5 py-2 border-2 border-[#111111] dark:border-white text-xs font-black uppercase tracking-widest transition flex items-center gap-1.5 shadow-[3px_3px_0px_0px_#111111] dark:shadow-[3px_3px_0px_0px_#FFFFFF] ${
              hasChanges
                ? 'bg-[#E63329] text-white hover:bg-[#C22921] cursor-pointer'
                : 'bg-gray-200 dark:bg-gray-800 text-gray-500 cursor-not-allowed shadow-none'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'SAVING...' : hasChanges ? 'SAVE CHANGES' : 'SAVED'}</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation */}
      <RouletteNav activeTab="detail" />

      {/* Changes Notification Banner */}
      {hasChanges && (
        <div className="p-3 bg-[#F5C800] border-2 border-[#111111] text-[#111111] flex items-center justify-between gap-3 shadow-[3px_3px_0px_0px_#111111]">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p className="text-xs font-black uppercase tracking-wider">
              You have unsaved changes. All candidate modifications and security adjustments will be logged into the permanent audit trail once saved.
            </p>
          </div>
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="px-4 py-1.5 bg-[#111111] text-white text-xs font-black uppercase tracking-wider hover:bg-[#E63329] transition flex-shrink-0"
          >
            {saving ? 'Saving...' : 'Save Now'}
          </button>
        </div>
      )}

      {/* Main Grid: Left Column Settings, Right Column Live Wheel & Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Metadata, Auth Controls & Candidates Management */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card: Basic Parameters */}
          <div className="p-5 bg-white dark:bg-[#16191E] border-[3px] border-[#111111] dark:border-white space-y-4">
            <div className="flex items-center justify-between border-b-2 border-[#111111]/10 dark:border-white/10 pb-3">
              <span className="text-xs font-black uppercase tracking-wider text-[#111111] dark:text-white flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-[#1A3A6B] dark:text-[#F5C800]" />
                General Parameters
              </span>
              <span className="text-[10px] font-mono uppercase font-black text-[#888888]">
                [SETTINGS]
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono font-black uppercase tracking-wider text-[#888888] mb-1">
                  Roulette Title <span className="text-[#E63329]">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-[#111111] dark:border-white text-xs font-black uppercase bg-transparent text-[#111111] dark:text-white focus:outline-none focus:border-[#E63329]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-black uppercase tracking-wider text-[#888888] mb-1">
                  Description / Purpose
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Instructions for companions spinning this wheel..."
                  className="w-full px-3 py-2 border-2 border-[#111111] dark:border-white text-xs font-medium bg-transparent text-[#111111] dark:text-white focus:outline-none focus:border-[#E63329]"
                />
              </div>

              {/* Presentation Formats Chips */}
              <div>
                <label className="block text-[10px] font-mono font-black uppercase tracking-wider text-[#888888] mb-1.5">
                  Presentation Formats <span className="text-[#E63329]">*</span>
                </label>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => toggleRenderingMode('wheel')}
                    className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 transition-all flex items-center gap-2 ${
                      renderingModes.includes('wheel')
                        ? 'bg-[#111111] text-[#F5C800] dark:bg-white dark:text-[#111111] border-[#111111] dark:border-white shadow-[2px_2px_0px_0px_#E63329]'
                        : 'bg-white dark:bg-[#111111] text-[#888888] border-[#888888]/40 hover:border-[#111111]'
                    }`}
                  >
                    <Disc className="w-3.5 h-3.5" />
                    <span>Roulette Wheel</span>
                    {renderingModes.includes('wheel') && <span className="text-[10px] font-mono">✓</span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleRenderingMode('cards')}
                    className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 transition-all flex items-center gap-2 ${
                      renderingModes.includes('cards')
                        ? 'bg-[#111111] text-[#F5C800] dark:bg-white dark:text-[#111111] border-[#111111] dark:border-white shadow-[2px_2px_0px_0px_#1A3A6B]'
                        : 'bg-white dark:bg-[#111111] text-[#888888] border-[#888888]/40 hover:border-[#111111]'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Peek a Boo Cards</span>
                    {renderingModes.includes('cards') && <span className="text-[10px] font-mono">✓</span>}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-[10px] font-mono font-black uppercase tracking-wider text-[#888888] mb-1">
                    Candidate Pool Mode
                  </label>
                  <div className="px-3 py-2 border-2 border-[#111111] dark:border-white bg-[#F7F5F0] dark:bg-[#111111] text-xs font-black uppercase tracking-wider flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 ${
                        originalRoulette.type === 'places' ? 'bg-[#1A3A6B]' : 'bg-[#E63329]'
                      }`}
                    />
                    <span>{originalRoulette.type.toUpperCase()} POOL</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-black uppercase tracking-wider text-[#888888] mb-1">
                    Activity Status
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`w-full px-3 py-2 border-2 border-[#111111] dark:border-white text-xs font-black uppercase tracking-wider transition text-center ${
                      isActive
                        ? 'bg-emerald-600 text-white'
                        : 'bg-red-600 text-white'
                    }`}
                  >
                    {isActive ? '● ACTIVE WHEEL' : '○ INACTIVE / PAUSED'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Guest Authentication Protocol (The Core Feature Request!) */}
          <div className="p-5 bg-white dark:bg-[#16191E] border-[3px] border-[#111111] dark:border-white space-y-4">
            <div className="flex items-center justify-between border-b-2 border-[#111111]/10 dark:border-white/10 pb-3">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-[#111111] dark:text-white flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-[#1A3A6B] dark:text-[#F5C800]" />
                  Guest Authorization Protocol
                </span>
                <p className="text-[10px] text-[#888888] font-mono mt-0.5">
                  Select authentication protocol for public / companion access
                </p>
              </div>
              <span className="text-[10px] font-mono uppercase font-black text-[#888888]">
                [SECURITY]
              </span>
            </div>

            {/* Protocol Selector Tabs */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setProtectionType('google')}
                className={`p-3.5 border-2 text-left transition flex items-center gap-3 ${
                  protectionType === 'google'
                    ? 'border-[#111111] dark:border-white bg-[#1A3A6B] text-white shadow-[2px_2px_0px_0px_#111111]'
                    : 'border-[#111111] dark:border-white bg-[#F7F5F0] dark:bg-[#111111] text-[#111111] dark:text-white hover:bg-[#EAE6DE]'
                }`}
              >
                <Mail className="w-5 h-5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-black uppercase tracking-wider">Google Sign-In</p>
                  <p className={`text-[10px] font-mono ${protectionType === 'google' ? 'text-white/80' : 'text-[#888888]'}`}>
                    Strict Gmail whitelist
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setProtectionType('token')}
                className={`p-3.5 border-2 text-left transition flex items-center gap-3 ${
                  protectionType === 'token'
                    ? 'border-[#111111] dark:border-white bg-[#F5C800] text-[#111111] shadow-[2px_2px_0px_0px_#111111]'
                    : 'border-[#111111] dark:border-white bg-[#F7F5F0] dark:bg-[#111111] text-[#111111] dark:text-white hover:bg-[#EAE6DE]'
                }`}
              >
                <Lock className="w-5 h-5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-black uppercase tracking-wider">Passcode Token</p>
                  <p className={`text-[10px] font-mono ${protectionType === 'token' ? 'text-[#111111]/80' : 'text-[#888888]'}`}>
                    Shared passphrase
                  </p>
                </div>
              </button>
            </div>

            {/* Configuration for Chosen Protocol */}
            {protectionType === 'google' ? (
              <div className="p-4 bg-[#F7F5F0] dark:bg-[#111111] border-2 border-[#111111] dark:border-white space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-mono font-black uppercase tracking-wider text-[#888888]">
                    Whitelisted Gmail Accounts ({allowedEmails.length})
                  </label>
                  <span className="text-[10px] font-mono text-[#888888]">
                    Only these accounts can spin
                  </span>
                </div>

                {/* Add Email Bar */}
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={newEmailInput}
                    onChange={(e) => setNewEmailInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddEmail();
                      }
                    }}
                    placeholder="companion@gmail.com"
                    className="flex-1 px-3 py-2 border-2 border-[#111111] dark:border-white text-xs font-mono bg-white dark:bg-[#16191E] text-[#111111] dark:text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddEmail}
                    className="px-4 py-2 bg-[#1A3A6B] text-white text-xs font-black uppercase tracking-wider border-2 border-[#111111] dark:border-white hover:bg-[#152e55] transition"
                  >
                    + ADD EMAIL
                  </button>
                </div>

                {/* Email Chips List */}
                {allowedEmails.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {allowedEmails.map((em) => (
                      <span
                        key={em}
                        className="px-2.5 py-1 bg-white dark:bg-[#16191E] border-2 border-[#111111] dark:border-white text-xs font-mono font-bold flex items-center gap-2"
                      >
                        <span>{em}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveEmail(em)}
                          className="text-[#E63329] hover:text-[#111111] dark:hover:text-white font-black"
                          title="Remove email"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] font-mono text-[#E63329] font-bold">
                    Warning: At least one email is required for Google SSO protection.
                  </p>
                )}
              </div>
            ) : (
              <div className="p-4 bg-[#F7F5F0] dark:bg-[#111111] border-2 border-[#111111] dark:border-white space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-mono font-black uppercase tracking-wider text-[#888888]">
                    Secret Passcode Token
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateToken}
                    className="text-[10px] font-mono font-black uppercase text-[#1A3A6B] dark:text-[#F5C800] hover:underline"
                  >
                    + Generate New Token
                  </button>
                </div>

                <div className="relative flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="e.g. BALI-2026-SECRET"
                    className="w-full px-3 py-2 pr-20 border-2 border-[#111111] dark:border-white text-xs font-mono font-bold uppercase bg-white dark:bg-[#16191E] text-[#111111] dark:text-white focus:outline-none"
                  />
                  <div className="absolute right-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 text-[#888888] hover:text-[#111111] dark:hover:text-white"
                      title={showPassword ? 'Hide passcode' : 'Show passcode'}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyToken}
                      className="p-1 text-[#888888] hover:text-[#111111] dark:hover:text-white"
                      title="Copy passcode"
                    >
                      {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <p className="text-[10px] font-mono text-[#888888]">
                  Companions opening the link will be prompted to enter this passcode before accessing the wheel.
                </p>
              </div>
            )}
          </div>

          {/* Card: Candidates & Relative Weights Manager */}
          <div className="p-5 bg-white dark:bg-[#16191E] border-[3px] border-[#111111] dark:border-white space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-[#111111]/10 dark:border-white/10 pb-3">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-[#111111] dark:text-white flex items-center gap-1.5">
                  <Disc className="w-4 h-4 text-[#E63329]" />
                  Candidate Pool & Probability Angles ({items.length})
                </span>
                <p className="text-[10px] text-[#888888] font-mono mt-0.5">
                  Total Weight: {totalWeight} | Relative angles automatically scale with weight
                </p>
              </div>

              {/* Add Candidate Dropdown */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedCandidateId}
                  onChange={(e) => setSelectedCandidateId(e.target.value)}
                  className="px-3 py-1.5 border-2 border-[#111111] dark:border-white text-xs font-bold uppercase bg-[#F7F5F0] dark:bg-[#111111] text-[#111111] dark:text-white focus:outline-none max-w-[200px]"
                >
                  <option value="">
                    + Select {originalRoulette.type === 'places' ? 'Place' : 'Trip'}...
                  </option>
                  {unselectedCandidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddCandidate}
                  disabled={!selectedCandidateId}
                  className="px-3 py-1.5 bg-[#111111] text-white dark:bg-white dark:text-[#111111] text-xs font-black uppercase tracking-wider border-2 border-[#111111] dark:border-white hover:bg-[#E63329] hover:text-white transition disabled:opacity-40"
                >
                  ADD
                </button>
              </div>
            </div>

            {/* Candidate Items List */}
            {items.length > 0 ? (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {items.map((it, idx) => {
                  const itemWeight = Math.max(1, Number(it.weight) || 1);
                  const pct = totalWeight > 0 ? ((itemWeight / totalWeight) * 100).toFixed(1) : '0';

                  return (
                    <div
                      key={it.item_id}
                      className="p-3.5 bg-[#F7F5F0] dark:bg-[#111111] border-2 border-[#111111] dark:border-white space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 truncate flex-1">
                          <span className="font-mono text-xs font-black text-[#888888] bg-white dark:bg-[#16191E] px-2 py-0.5 border border-[#111111]/30 dark:border-white/30">
                            #{String(idx + 1).padStart(2, '0')}
                          </span>
                          <div className="truncate">
                            <p className="text-xs font-black uppercase tracking-tight text-[#111111] dark:text-white truncate">
                              {it.title}
                            </p>
                            {it.subtitle && (
                              <p className="text-[10px] font-mono text-[#888888] truncate">
                                {it.subtitle}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Weight Controls */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleUpdateWeight(it.item_id, itemWeight - 1)}
                            className="w-6 h-6 border-2 border-[#111111] dark:border-white bg-white dark:bg-[#16191E] font-black text-xs hover:bg-[#F5C800] transition flex items-center justify-center"
                            title="Decrease weight"
                          >
                            -
                          </button>

                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-mono font-bold text-[#888888]">W:</span>
                            <input
                              type="number"
                              min={1}
                              max={50}
                              value={itemWeight}
                              onChange={(e) =>
                                handleUpdateWeight(it.item_id, parseInt(e.target.value, 10) || 1)
                              }
                              className="w-12 px-1.5 py-0.5 border-2 border-[#111111] dark:border-white text-xs font-mono font-black text-center bg-white dark:bg-[#16191E] text-[#111111] dark:text-white focus:outline-none"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleUpdateWeight(it.item_id, itemWeight + 1)}
                            className="w-6 h-6 border-2 border-[#111111] dark:border-white bg-white dark:bg-[#16191E] font-black text-xs hover:bg-[#F5C800] transition flex items-center justify-center"
                            title="Increase weight"
                          >
                            +
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveCandidate(it.item_id)}
                            className="p-1 border-2 border-[#111111] dark:border-white bg-white dark:bg-[#16191E] text-[#E63329] hover:bg-[#E63329] hover:text-white transition ml-1"
                            title="Remove candidate"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Probability Gauge Bar */}
                      <div>
                        <div className="flex justify-between text-[10px] font-mono mb-1">
                          <span className="text-[#888888]">PROBABILITY ANGLE:</span>
                          <span className="font-black text-[#1A3A6B] dark:text-[#F5C800]">{pct}%</span>
                        </div>
                        <div className="w-full h-2 bg-white dark:bg-[#16191E] border border-[#111111]/30 dark:border-white/30 overflow-hidden">
                          <div
                            className="h-full bg-[#E63329] transition-all duration-300"
                            style={{ width: `${Math.min(100, Math.max(2, Number(pct)))}%` }}
                          />
                        </div>
                      </div>

                      {/* Card Clues / Quotes (Plural with random pick on shuffle) */}
                      <div className="pt-2 border-t border-dashed border-[#111111]/20 dark:border-white/20 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase font-black text-[#888888]">
                            Card Clues / Quotes (one per line, picked randomly on shuffle):
                          </span>
                          {it.quotes && it.quotes.length > 1 && (
                            <span className="text-[9px] font-mono font-bold text-[#E63329]">
                              {it.quotes.length} quotes configured
                            </span>
                          )}
                        </div>
                        <textarea
                          rows={2}
                          placeholder={'e.g.\nSmoky woodfired Margherita pizza\nCosy candlelit hidden garden\nCrispy truffle parmesan fries'}
                          value={
                            it.quotes && it.quotes.length > 0
                              ? it.quotes.join('\n')
                              : (it.quote || '')
                          }
                          onChange={(e) => handleUpdateQuotes(it.item_id, e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-[#111111] dark:border-white bg-white dark:bg-[#16191E] text-[#111111] dark:text-white font-mono focus:outline-none focus:border-[#E63329] leading-relaxed"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center border-2 border-dashed border-[#111111]/30 dark:border-white/30 p-6 bg-[#F7F5F0] dark:bg-[#111111]">
                <p className="text-xs font-mono text-[#888888] font-bold uppercase">
                  Candidate pool is empty. Use selector above to add destinations.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Live Wheel & Immutable Audit Trail */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card: Live Interactive Preview Wheel */}
          <div
            ref={wheelSectionRef}
            className="p-5 bg-white dark:bg-[#16191E] border-[3px] border-[#111111] dark:border-white space-y-4"
          >
            <div className="flex items-center justify-between border-b-2 border-[#111111]/10 dark:border-white/10 pb-3">
              <span className="text-xs font-black uppercase tracking-wider text-[#111111] dark:text-white flex items-center gap-1.5">
                <Disc className="w-4 h-4 text-[#E63329]" />
                Interactive Wheel Preview
              </span>
              <span className="text-[10px] font-mono uppercase font-black text-[#888888]">
                [SIMULATION]
              </span>
            </div>

            {/* Wheel Canvas */}
            <div className="flex flex-col items-center justify-center p-3 bg-[#F7F5F0] dark:bg-[#111111] border-2 border-[#111111] dark:border-white">
              <RouletteWheel
                items={items}
                onSpinRequest={handleSpinTest}
                disabled={items.length < 2 || !isActive}
              />
            </div>

            {lastSpinWinner && (
              <div className="p-3 bg-white dark:bg-[#16191E] border-2 border-[#E63329] flex items-center gap-3">
                <div className="w-8 h-8 bg-[#E63329] text-white flex items-center justify-center font-black text-xs flex-shrink-0">
                  WIN
                </div>
                <div className="truncate">
                  <p className="text-[10px] font-mono uppercase font-bold text-[#888888]">Last Spin Result:</p>
                  <p className="text-xs font-black uppercase text-[#111111] dark:text-white truncate">
                    {lastSpinWinner.title}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Card: Immutable Audit Trail */}
          <div className="p-5 bg-white dark:bg-[#16191E] border-[3px] border-[#111111] dark:border-white space-y-4">
            <div className="flex items-center justify-between border-b-2 border-[#111111]/10 dark:border-white/10 pb-3">
              <span className="text-xs font-black uppercase tracking-wider text-[#111111] dark:text-white flex items-center gap-1.5">
                <History className="w-4 h-4 text-[#1A3A6B] dark:text-[#F5C800]" />
                Permanent Audit Trail ({auditLogs.length})
              </span>
              <button
                type="button"
                onClick={loadAuditLogs}
                className="text-[10px] font-mono uppercase font-black text-[#888888] hover:text-[#111111] dark:hover:text-white flex items-center gap-1"
                title="Refresh audit"
              >
                <RefreshCw className={`w-3 h-3 ${auditLoading ? 'animate-spin' : ''}`} />
                <span>REFRESH</span>
              </button>
            </div>

            {/* Audit Log Entries List */}
            {auditLoading ? (
              <div className="py-8 text-center text-[#888888] font-mono text-xs">
                Loading audit entries...
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="py-8 text-center text-[#888888] font-mono text-xs bg-[#F7F5F0] dark:bg-[#111111] border border-dashed border-[#111111]/30">
                No audit records yet for this roulette.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {auditLogs.map((log) => {
                  const isAdd = log.selected_item_title.startsWith('[ITEM_ADDED]');
                  const isRemove = log.selected_item_title.startsWith('[ITEM_REMOVED]');
                  const isWeight = log.selected_item_title.startsWith('[WEIGHT_MODIFIED]');
                  const isAuth = log.selected_item_title.startsWith('[AUTH_');
                  const isSpin = !isAdd && !isRemove && !isWeight && !isAuth;

                  let badgeColor = 'bg-[#111111] text-white';
                  let badgeText = 'CONFIG';

                  if (isSpin) {
                    badgeColor = 'bg-[#E63329] text-white';
                    badgeText = 'SPIN';
                  } else if (isAdd) {
                    badgeColor = 'bg-[#1A3A6B] text-white';
                    badgeText = '+ ITEM';
                  } else if (isRemove) {
                    badgeColor = 'bg-red-700 text-white';
                    badgeText = '- ITEM';
                  } else if (isWeight) {
                    badgeColor = 'bg-[#F5C800] text-[#111111]';
                    badgeText = 'WEIGHT';
                  } else if (isAuth) {
                    badgeColor = 'bg-purple-700 text-white';
                    badgeText = 'AUTH';
                  }

                  return (
                    <div
                      key={log.id}
                      className="p-3 bg-[#F7F5F0] dark:bg-[#111111] border border-[#111111]/30 dark:border-white/30 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`px-1.5 py-0.5 text-[9px] font-mono font-black uppercase tracking-wider ${badgeColor}`}
                        >
                          {badgeText}
                        </span>
                        <span className="text-[10px] font-mono text-[#888888]">
                          {new Date(log.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}{' '}
                          {new Date(log.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <p className="text-xs font-black uppercase tracking-tight text-[#111111] dark:text-white line-clamp-2">
                        {log.selected_item_title}
                      </p>

                      <div className="flex items-center justify-between text-[9px] font-mono text-[#888888] pt-1 border-t border-[#111111]/10 dark:border-white/10">
                        <span>Actor: {log.executed_by_identifier}</span>
                        <span>{log.ip_address || 'Cloudflare Edge'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Share Link Modal */}
      {showShareModal && (
        <ShareLinkModal
          isOpen={showShareModal}
          roulette={originalRoulette}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Save Confirmation Modal */}
      <ConfirmModal
        isOpen={showSaveConfirm}
        title="Commit Roulette Modifications"
        message={`Are you sure you want to save modifications to "${title}"? All candidate additions, removals, weight adjustments, and security changes will be permanently appended to the immutable audit log.`}
        actionType="edit"
        confirmText="Confirm & Commit Changes"
        isLoading={saving}
        onConfirm={handleSaveAll}
        onCancel={() => setShowSaveConfirm(false)}
      />
    </div>
  );
}

export default function RouletteDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center border-2 border-[#111111] dark:border-white bg-white dark:bg-[#16191E]">
          <Disc className="w-10 h-10 animate-spin mx-auto text-[#E63329] mb-4" />
          <p className="font-mono text-xs font-black uppercase tracking-widest text-[#888888]">
            Loading Roulette Configuration...
          </p>
        </div>
      }
    >
      <RouletteDetailContent />
    </Suspense>
  );
}
