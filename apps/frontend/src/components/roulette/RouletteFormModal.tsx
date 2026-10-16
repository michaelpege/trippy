'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Shield, Lock, Mail, Disc } from 'lucide-react';
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchPlaces()
      .then((res) => setAvailablePlaces(res.places))
      .catch((err) => console.error(err));
    fetchTrips()
      .then((res) => setAvailableTrips(res.trips))
      .catch((err) => console.error(err));

    if (rouletteToEdit) {
      setTitle(rouletteToEdit.title);
      setDescription(rouletteToEdit.description || '');
      setType(rouletteToEdit.type);
      setProtectionType(rouletteToEdit.protection_type);
      setAllowedEmailsStr(rouletteToEdit.allowed_emails.join(', '));
      setAccessToken(rouletteToEdit.access_token || '');
      setItems(rouletteToEdit.items || []);
    } else {
      setItems([]);
    }
  }, [rouletteToEdit]);

  if (!isOpen) return null;

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

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Roulette title is required.');
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden my-6">
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {isEditing ? 'Edit Roulette Wheel' : 'Configure New Roulette'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Trip or Place roulette with weighted random selection and shareable links
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleFormSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Roulette Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Where should we eat tonight? / Next Holiday Destination"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>

            {/* Mode: Trips or Places */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Roulette Mode <span className="text-rose-500">*</span>
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
                  className={`p-3 rounded-2xl border text-left transition flex items-center gap-3 ${
                    type === 'places'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-950 dark:text-emerald-300 shadow-sm'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                    📍
                  </div>
                  <div>
                    <p className="text-xs font-bold">Places Roulette</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Pick randomly between places
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
                  className={`p-3 rounded-2xl border text-left transition flex items-center gap-3 ${
                    type === 'trips'
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-950 dark:text-indigo-300 shadow-sm'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                    🗺️
                  </div>
                  <div>
                    <p className="text-xs font-bold">Trips Roulette</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Pick randomly between trips
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Candidate Items & Weights */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Candidate Pool & Relative Weights ({items.length})
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Higher weight increases probability
                  </p>
                </div>

                <select
                  onChange={(e) => {
                    handleAddItem(e.target.value);
                    e.target.value = '';
                  }}
                  defaultValue=""
                  className="text-xs px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none cursor-pointer"
                >
                  <option value="" disabled>
                    + Add {type === 'places' ? 'Place' : 'Trip'}...
                  </option>
                  {type === 'places'
                    ? availablePlaces.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.type})
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
                <div className="space-y-2 mt-2">
                  {items.map((item) => (
                    <div
                      key={item.item_id}
                      className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="truncate flex-1">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {item.title}
                        </p>
                        {item.subtitle && (
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {item.subtitle}
                          </p>
                        )}
                      </div>

                      {/* Weight Selector */}
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
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
                          className="w-16 px-2 py-1 text-xs font-bold text-center border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-emerald-500 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.item_id)}
                          className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center text-xs text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800">
                  No candidates added. Select items above to populate this roulette.
                </div>
              )}
            </div>

            {/* Shareable Link Protection */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Share-able Link Access Protection
              </span>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setProtectionType('google')}
                  className={`p-3 rounded-xl border text-left transition flex items-center gap-2 ${
                    protectionType === 'google'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-950 dark:text-emerald-300'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Mail className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="text-xs font-bold">Google Sign-In</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Whitelisted Gmail accounts
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setProtectionType('token')}
                  className={`p-3 rounded-xl border text-left transition flex items-center gap-2 ${
                    protectionType === 'token'
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-950 dark:text-indigo-300'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <p className="text-xs font-bold">Password / Token</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Static passcode check
                    </p>
                  </div>
                </button>
              </div>

              {protectionType === 'google' ? (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Allowed Gmail Accounts (comma-separated)
                  </label>
                  <textarea
                    rows={2}
                    value={allowedEmailsStr}
                    onChange={(e) => setAllowedEmailsStr(e.target.value)}
                    placeholder="friend1@gmail.com, friend2@gmail.com, ..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Static Passcode / Access Token
                  </label>
                  <input
                    type="text"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="e.g. bali-trip-secret-2026"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition"
              >
                {isEditing ? 'Save Changes' : 'Create Roulette'}
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
    </>
  );
};
