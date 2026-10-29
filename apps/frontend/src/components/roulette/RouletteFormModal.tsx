'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Shield, Lock, Mail, Disc, Sparkles } from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';
import { fetchPlaces, fetchTrips } from '@/lib/api';
import { useToast } from '../common/Toast';
import type { Roulette, RouletteItem, Place, Trip } from '@/types';

interface RouletteFormModalProps {
  isOpen: boolean;
  rouletteToEdit?: Roulette | null;
  onClose: () => void;
  onSave: (data: {
    title: string;
    description?: string;
    type: 'trips' | 'places';
    items: RouletteItem[];
    protection_type: 'google' | 'token';
    allowed_emails?: string[];
    access_token?: string;
    rendering_modes?: ('wheel' | 'cards')[];
  }) => Promise<void>;
}

export const RouletteFormModal: React.FC<RouletteFormModalProps> = ({
  isOpen,
  rouletteToEdit,
  onClose,
  onSave,
}) => {
  const toast = useToast();
  const isEditing = !!rouletteToEdit;

  const [title, setTitle] = useState(rouletteToEdit?.title || '');
  const [description, setDescription] = useState(rouletteToEdit?.description || '');
  const [renderingModes, setRenderingModes] = useState<('wheel' | 'cards')[]>(
    rouletteToEdit?.rendering_modes || ['wheel', 'cards']
  );
  const [type, setType] = useState<'trips' | 'places'>(rouletteToEdit?.type || 'places');
  const [protectionType, setProtectionType] = useState<'google' | 'token'>(
    rouletteToEdit?.protection_type || 'google'
  );
  const [allowedEmailsStr, setAllowedEmailsStr] = useState(
    rouletteToEdit?.allowed_emails?.join(', ') || ''
  );
  const [accessToken, setAccessToken] = useState(rouletteToEdit?.access_token || '');

  const [availablePlaces, setAvailablePlaces] = useState<Place[]>([]);
  const [availableTrips, setAvailableTrips] = useState<Trip[]>([]);
  const [items, setItems] = useState<RouletteItem[]>(rouletteToEdit?.items || []);

  const [showConfirm, setShowConfirm] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    fetchPlaces()
      .then((res) => setAvailablePlaces(res.places))
      .catch((err) => console.error(err));
    fetchTrips()
      .then((res) => setAvailableTrips(res.trips))
      .catch((err) => console.error(err));

    if (rouletteToEdit) {
      setTitle(rouletteToEdit.title || '');
      setDescription(rouletteToEdit.description || '');
      setRenderingModes(rouletteToEdit.rendering_modes || ['wheel', 'cards']);
      setType(rouletteToEdit.type || 'places');
      setProtectionType(rouletteToEdit.protection_type || 'google');
      setAllowedEmailsStr((rouletteToEdit.allowed_emails || []).join(', '));
      setAccessToken(rouletteToEdit.access_token || '');
      setItems(rouletteToEdit.items || []);
    } else {
      setTitle('');
      setDescription('');
      setRenderingModes(['wheel', 'cards']);
      setType('places');
      setProtectionType('google');
      setAllowedEmailsStr('');
      setAccessToken('');
      setItems([]);
    }
  }, [isOpen, rouletteToEdit]);

  if (!isOpen) return null;

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

  const isFormDirty = () => {
    if (!rouletteToEdit) {
      return (
        !!title.trim() ||
        !!description.trim() ||
        items.length > 0 ||
        !!allowedEmailsStr.trim() ||
        !!accessToken.trim()
      );
    }
    const initialEmails = (rouletteToEdit.allowed_emails || []).join(', ');
    return (
      title !== (rouletteToEdit.title || '') ||
      description !== (rouletteToEdit.description || '') ||
      JSON.stringify(renderingModes.slice().sort()) !== JSON.stringify((rouletteToEdit.rendering_modes || ['wheel', 'cards']).slice().sort()) ||
      type !== rouletteToEdit.type ||
      protectionType !== rouletteToEdit.protection_type ||
      allowedEmailsStr !== initialEmails ||
      accessToken !== (rouletteToEdit.access_token || '') ||
      JSON.stringify(items) !== JSON.stringify(rouletteToEdit.items || [])
    );
  };

  const handleRequestClose = () => {
    if (isFormDirty()) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const handleGenerateToken = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'ROU-';
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    code += '-';
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    setAccessToken(code);
    toast.info(`Generated passcode token: ${code}`);
  };

  const handleAddItem = (id: string) => {
    if (!id) return;
    if (items.some((it) => it.item_id === id)) {
      toast.info('Item is already in roulette candidates.');
      return;
    }

    if (type === 'places') {
      const p = availablePlaces.find((x) => x.id === id);
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
      }
    } else {
      const t = availableTrips.find((x) => x.id === id);
      if (t) {
        setItems((prev) => [
          ...prev,
          {
            item_id: t.id,
            title: t.name,
            subtitle: `${t.places?.length || 0} places`,
            type: 'trips',
            weight: 1,
          },
        ]);
      }
    }
  };

  const handleRemoveItem = (itemId: string) => {
    setItems((prev) => prev.filter((it) => it.item_id !== itemId));
  };

  const handleUpdateWeight = (itemId: string, weight: number) => {
    setItems((prev) =>
      prev.map((it) => (it.item_id === itemId ? { ...it, weight: Math.max(1, weight) } : it))
    );
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

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Roulette title is required.');
      return;
    }
    if (renderingModes.length === 0) {
      toast.error('Select at least one presentation format.');
      return;
    }
    if (items.length < 2) {
      toast.error('Add at least 2 candidates for the roulette wheel.');
      return;
    }
    if (protectionType === 'token' && !accessToken.trim()) {
      toast.error('Passcode/Token is required for token protection.');
      return;
    }
    if (protectionType === 'google' && !allowedEmailsStr.trim()) {
      toast.error('At least one allowed Gmail address is required for Google protection.');
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmSave = async () => {
    setIsSubmitting(true);
    try {
      const emails = allowedEmailsStr
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

      await onSave({
        title: title.trim(),
        description: description.trim(),
        type,
        items,
        protection_type: protectionType,
        allowed_emails: emails,
        access_token: accessToken.trim(),
        rendering_modes: renderingModes,
      });
      setShowConfirm(false);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save roulette.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 overflow-y-auto">
        <div className="w-full max-w-2xl bg-[#FFFFFF] dark:bg-[#0E1013] border-[3px] border-[#111111] dark:border-[#FFFFFF] corner-rule-yellow rounded-none my-6 relative">
          {/* Modal Header */}
          <div className="px-6 py-4 bg-[#F7F5F0] dark:bg-[#111111] border-b-2 border-[#111111] dark:border-[#FFFFFF] flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-black uppercase tracking-widest text-[#E63329]">
                  [WHEEL // CONFIG]
                </span>
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight text-[#111111] dark:text-[#FFFFFF]">
                {isEditing ? 'Edit Roulette Wheel' : 'Configure New Roulette'}
              </h2>
              <p className="text-xs text-[#888888] font-mono mt-0.5">
                Weighted random destination generator with protected access controls
              </p>
            </div>
            <button
              onClick={handleRequestClose}
              className="p-2 border-2 border-[#111111] dark:border-[#FFFFFF] bg-white dark:bg-[#0E1013] text-[#111111] dark:text-[#FFFFFF] hover:bg-[#E63329] hover:text-white transition rounded-none"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleFormSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            {/* Title */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-[#111111] dark:text-[#FFFFFF] mb-1.5">
                Roulette Title <span className="text-[#E63329]">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. DINNER DECIDER // BALI TRIP SHORTLIST"
                className="w-full px-4 py-2.5 rounded-none border-2 border-[#111111] dark:border-[#FFFFFF] bg-white dark:bg-[#111111] text-[#111111] dark:text-[#FFFFFF] text-sm font-bold focus:outline-none focus:border-[#E63329] transition"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-[#111111] dark:text-[#FFFFFF] mb-1.5">
                Description / Notes
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional purpose or instructions for companions..."
                className="w-full px-4 py-2 rounded-none border-2 border-[#111111] dark:border-[#FFFFFF] bg-white dark:bg-[#111111] text-[#111111] dark:text-[#FFFFFF] text-xs font-medium focus:outline-none focus:border-[#E63329] transition"
              />
            </div>

            {/* Display / Presentation Formats */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-[#111111] dark:text-[#FFFFFF] mb-1">
                Presentation Formats <span className="text-[#E63329]">*</span>
              </label>
              <p className="text-[10px] font-mono text-[#888888] mb-2">
                Enable Roulette Wheel, Peek a Boo Cards, or both for this pool:
              </p>
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => toggleRenderingMode('wheel')}
                  className={`px-3.5 py-2 text-xs font-black uppercase tracking-wider border-2 transition-all flex items-center gap-2 ${
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
                  className={`px-3.5 py-2 text-xs font-black uppercase tracking-wider border-2 transition-all flex items-center gap-2 ${
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

            {/* Mode: Trips or Places */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-[#111111] dark:text-[#FFFFFF] mb-1.5">
                Candidate Target Mode <span className="text-[#E63329]">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (type !== 'places') {
                      setType('places');
                      setItems([]);
                    }
                  }}
                  className={`p-3.5 border-2 text-left transition rounded-none flex items-center gap-3 ${
                    type === 'places'
                      ? 'border-[#111111] dark:border-[#FFFFFF] bg-[#1A3A6B] text-white'
                      : 'border-[#111111] dark:border-[#FFFFFF] bg-white dark:bg-[#111111] text-[#111111] dark:text-[#FFFFFF] hover:bg-[#F7F5F0] dark:hover:bg-[#1e2024]'
                  }`}
                >
                  <div className={`w-8 h-8 border-2 border-current flex items-center justify-center font-black text-xs ${
                    type === 'places' ? 'bg-[#F5C800] text-[#111111]' : 'bg-[#111111] text-white'
                  }`}>
                    PL
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider">Places Pool</p>
                    <p className={`text-[10px] font-mono ${type === 'places' ? 'text-white/80' : 'text-[#888888]'}`}>
                      Spin individual spots
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (type !== 'trips') {
                      setType('trips');
                      setItems([]);
                    }
                  }}
                  className={`p-3.5 border-2 text-left transition rounded-none flex items-center gap-3 ${
                    type === 'trips'
                      ? 'border-[#111111] dark:border-[#FFFFFF] bg-[#E63329] text-white'
                      : 'border-[#111111] dark:border-[#FFFFFF] bg-white dark:bg-[#111111] text-[#111111] dark:text-[#FFFFFF] hover:bg-[#F7F5F0] dark:hover:bg-[#1e2024]'
                  }`}
                >
                  <div className={`w-8 h-8 border-2 border-current flex items-center justify-center font-black text-xs ${
                    type === 'trips' ? 'bg-[#F5C800] text-[#111111]' : 'bg-[#111111] text-white'
                  }`}>
                    TR
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider">Trips Pool</p>
                    <p className={`text-[10px] font-mono ${type === 'trips' ? 'text-white/80' : 'text-[#888888]'}`}>
                      Spin multi-stop routes
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Candidate Items & Weights */}
            <div className="p-4 bg-[#F7F5F0] dark:bg-[#111111] border-2 border-[#111111] dark:border-[#FFFFFF] rounded-none space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#111111]/30 dark:border-[#FFFFFF]/30">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-[#111111] dark:text-[#FFFFFF]">
                    Candidate Pool & Relative Weights ({items.length})
                  </span>
                  <p className="text-[10px] text-[#888888] font-mono">
                    Higher weight proportionally expands wedge angle
                  </p>
                </div>

                <select
                  onChange={(e) => {
                    handleAddItem(e.target.value);
                    e.target.value = '';
                  }}
                  defaultValue=""
                  className="text-xs px-3 py-1.5 bg-white dark:bg-[#0E1013] text-[#111111] dark:text-[#FFFFFF] font-black uppercase tracking-wider border-2 border-[#111111] dark:border-[#FFFFFF] rounded-none focus:outline-none cursor-pointer"
                >
                  <option value="" disabled>
                    + ADD {type === 'places' ? 'PLACE' : 'TRIP'}...
                  </option>
                  {type === 'places'
                    ? availablePlaces.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} [{p.type.toUpperCase()}]
                        </option>
                      ))
                    : availableTrips.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                </select>
              </div>

              {items.length > 0 ? (
                <div className="space-y-2 mt-2 max-h-56 overflow-y-auto pr-1">
                  {items.map((item, idx) => (
                    <div
                      key={item.item_id}
                      className="p-3 bg-white dark:bg-[#0E1013] border-2 border-[#111111] dark:border-[#FFFFFF] rounded-none flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 truncate flex-1">
                          <span className="font-mono text-[10px] font-black text-[#888888]">
                            #{String(idx + 1).padStart(2, '0')}
                          </span>
                          <div className="truncate">
                            <p className="text-xs font-black uppercase tracking-tight text-[#111111] dark:text-[#FFFFFF] truncate">
                              {item.title}
                            </p>
                            {item.subtitle && (
                              <p className="text-[10px] font-mono text-[#888888] truncate">
                                {item.subtitle}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Weight Selector */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[10px] font-mono uppercase font-black text-[#888888]">
                            Weight:
                          </span>
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={item.weight}
                            onChange={(e) =>
                              handleUpdateWeight(item.item_id, parseInt(e.target.value, 10) || 1)
                            }
                            className="w-14 px-2 py-1 text-xs font-mono font-black text-center border-2 border-[#111111] dark:border-[#FFFFFF] rounded-none bg-white dark:bg-[#111111] text-[#111111] dark:text-[#FFFFFF] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.item_id)}
                            className="p-1.5 border-2 border-[#111111] dark:border-[#FFFFFF] bg-white dark:bg-[#111111] text-[#111111] dark:text-[#FFFFFF] hover:bg-[#E63329] hover:text-white transition rounded-none"
                            title="Remove Candidate"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Card Clues / Quotes (Plural with random pick on shuffle) */}
                      <div className="pt-2 border-t border-dashed border-[#111111]/20 dark:border-white/20 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase font-black text-[#888888]">
                            Card Clues / Quotes (one per line, picked randomly on shuffle):
                          </span>
                          {item.quotes && item.quotes.length > 1 && (
                            <span className="text-[9px] font-mono font-bold text-[#E63329]">
                              {item.quotes.length} quotes configured
                            </span>
                          )}
                        </div>
                        <textarea
                          rows={2}
                          placeholder={'e.g.\nSmoky woodfired Margherita pizza\nCosy candlelit hidden garden\nCrispy truffle parmesan fries'}
                          value={
                            item.quotes && item.quotes.length > 0
                              ? item.quotes.join('\n')
                              : (item.quote || '')
                          }
                          onChange={(e) => handleUpdateQuotes(item.item_id, e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-[#111111] dark:border-white bg-[#F7F5F0] dark:bg-[#16191E] text-[#111111] dark:text-[#FFFFFF] font-mono focus:outline-none focus:border-[#E63329] leading-relaxed"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border-2 border-dashed border-[#111111]/40 dark:border-[#FFFFFF]/40 rounded-none p-5 text-center text-xs text-[#888888] font-mono bg-white dark:bg-[#0E1013]">
                  Candidate pool is empty. Use dropdown above to assemble items.
                </div>
              )}
            </div>

            {/* Shareable Link Protection */}
            <div className="p-4 bg-[#F7F5F0] dark:bg-[#111111] border-2 border-[#111111] dark:border-[#FFFFFF] rounded-none space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#111111]/30 dark:border-[#FFFFFF]/30">
                <span className="text-xs font-black uppercase tracking-wider text-[#111111] dark:text-[#FFFFFF] flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-[#1A3A6B] dark:text-[#F5C800]" />
                  Guest Authorization Protocol
                </span>
                <span className="font-mono text-[10px] font-black uppercase text-[#888888]">
                  [SECURITY]
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setProtectionType('google')}
                  className={`p-3 border-2 rounded-none text-left transition flex items-center gap-2.5 ${
                    protectionType === 'google'
                      ? 'border-[#111111] dark:border-[#FFFFFF] bg-[#1A3A6B] text-white'
                      : 'border-[#111111] dark:border-[#FFFFFF] bg-white dark:bg-[#0E1013] text-[#111111] dark:text-[#FFFFFF] hover:bg-[#F7F5F0]'
                  }`}
                >
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider">Google Sign-In</p>
                    <p className={`text-[10px] font-mono ${protectionType === 'google' ? 'text-white/80' : 'text-[#888888]'}`}>
                      Whitelisted emails
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setProtectionType('token')}
                  className={`p-3 border-2 rounded-none text-left transition flex items-center gap-2.5 ${
                    protectionType === 'token'
                      ? 'border-[#111111] dark:border-[#FFFFFF] bg-[#F5C800] text-[#111111]'
                      : 'border-[#111111] dark:border-[#FFFFFF] bg-white dark:bg-[#0E1013] text-[#111111] dark:text-[#FFFFFF] hover:bg-[#F7F5F0]'
                  }`}
                >
                  <Lock className="w-4 h-4 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider">Passcode Token</p>
                    <p className={`text-[10px] font-mono ${protectionType === 'token' ? 'text-[#111111]/80' : 'text-[#888888]'}`}>
                      Shared passphrase
                    </p>
                  </div>
                </button>
              </div>

              {protectionType === 'google' ? (
                <div>
                  <label className="block text-[10px] font-mono font-black uppercase tracking-wider text-[#888888] mb-1">
                    Allowed Gmail Accounts (comma-separated)
                  </label>
                  <textarea
                    rows={2}
                    value={allowedEmailsStr}
                    onChange={(e) => setAllowedEmailsStr(e.target.value)}
                    placeholder="friend1@gmail.com, friend2@gmail.com, ..."
                    className="w-full px-3 py-2 rounded-none border-2 border-[#111111] dark:border-[#FFFFFF] bg-white dark:bg-[#0E1013] text-[#111111] dark:text-[#FFFFFF] text-xs font-mono focus:outline-none focus:border-[#E63329] transition"
                  />
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-mono font-black uppercase tracking-wider text-[#888888]">
                      Static Passcode / Secret Access Token
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateToken}
                      className="text-[10px] font-mono font-black uppercase text-[#1A3A6B] dark:text-[#F5C800] hover:underline"
                    >
                      + Generate Random Token
                    </button>
                  </div>
                  <input
                    type="text"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="e.g. BALI-2026-TRIP-SECRET"
                    className="w-full px-3 py-2 rounded-none border-2 border-[#111111] dark:border-[#FFFFFF] bg-white dark:bg-[#0E1013] text-[#111111] dark:text-[#FFFFFF] text-xs font-mono font-bold focus:outline-none focus:border-[#E63329] transition uppercase"
                  />
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t-2 border-[#111111] dark:border-[#FFFFFF] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleRequestClose}
                className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-[#111111] dark:text-[#FFFFFF] bg-white dark:bg-[#111111] border-2 border-[#111111] dark:border-[#FFFFFF] hover:bg-[#111111] hover:text-white dark:hover:bg-[#FFFFFF] dark:hover:text-[#111111] rounded-none transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 text-xs font-black uppercase tracking-wider text-[#111111] bg-[#F5C800] border-2 border-[#111111] dark:border-[#FFFFFF] hover:bg-[#111111] hover:text-[#F5C800] rounded-none transition"
              >
                {isEditing ? 'Save Changes' : 'Initialize Roulette'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        title={isEditing ? 'Update Roulette Confirmation' : 'Create Roulette Confirmation'}
        message={
          isEditing
            ? `Are you sure you want to update the roulette "${title}"?`
            : `Are you sure you want to create the roulette "${title}" with ${items.length} candidate item(s)?`
        }
        actionType={isEditing ? 'edit' : 'create'}
        confirmText={isEditing ? 'Save Changes' : 'Create Roulette'}
        isLoading={isSubmitting}
        onConfirm={handleConfirmSave}
        onCancel={() => setShowConfirm(false)}
      />

      <ConfirmModal
        isOpen={showDiscardConfirm}
        title="Discard Unsaved Changes"
        message="You have unsaved changes in this roulette configuration. Are you sure you want to discard them?"
        actionType="delete"
        confirmText="Discard Changes"
        cancelText="Keep Editing"
        onConfirm={() => {
          setShowDiscardConfirm(false);
          onClose();
        }}
        onCancel={() => setShowDiscardConfirm(false)}
      />
    </>
  );
};
