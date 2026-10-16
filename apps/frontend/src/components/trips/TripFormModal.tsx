'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ArrowUp, ArrowDown, MapPin, Calendar } from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';
import { fetchPlaces } from '@/lib/api';
import { useToast } from '../common/Toast';
import type { Trip, Place, TripPlaceItem } from '@/types';

interface TripFormModalProps {
  isOpen: boolean;
  tripToEdit?: Trip | null;
  onClose: () => void;
  onSave: (data: {
    name: string;
    description?: string;
    start_date?: string | null;
    end_date?: string | null;
    places: { place_id: string; order_index: number; visit_time?: string; notes?: string }[];
  }) => Promise<void>;
}

export const TripFormModal: React.FC<TripFormModalProps> = ({
  isOpen,
  tripToEdit,
  onClose,
  onSave,
}) => {
  const toast = useToast();
  const isEditing = !!tripToEdit;

  const [name, setName] = useState(tripToEdit?.name || '');
  const [description, setDescription] = useState(tripToEdit?.description || '');
  const [startDate, setStartDate] = useState(tripToEdit?.start_date || '');
  const [endDate, setEndDate] = useState(tripToEdit?.end_date || '');

  const [availablePlaces, setAvailablePlaces] = useState<Place[]>([]);
  const [selectedPlaces, setSelectedPlaces] = useState<
    { place_id: string; visit_time: string; notes: string; place?: Place }[]
  >([]);

  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchPlaces()
      .then((res) => setAvailablePlaces(res.places))
      .catch((err) => console.error(err));

    if (tripToEdit?.places) {
      setSelectedPlaces(
        tripToEdit.places.map((tp) => ({
          place_id: tp.place_id,
          visit_time: tp.visit_time || '',
          notes: tp.notes || '',
          place: tp.place,
        }))
      );
    } else {
      setSelectedPlaces([]);
    }
  }, [tripToEdit]);

  if (!isOpen) return null;

  const handleAddPlace = (placeId: string) => {
    if (!placeId) return;
    const found = availablePlaces.find((p) => p.id === placeId);
    setSelectedPlaces((prev) => [
      ...prev,
      {
        place_id: placeId,
        visit_time: '',
        notes: '',
        place: found,
      },
    ]);
  };

  const handleRemovePlace = (index: number) => {
    setSelectedPlaces((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMovePlace = (index: number, direction: 'up' | 'down') => {
    setSelectedPlaces((prev) => {
      const copy = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= copy.length) return copy;
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleUpdateNotes = (index: number, notes: string) => {
    setSelectedPlaces((prev) => {
      const copy = [...prev];
      copy[index].notes = notes;
      return copy;
    });
  };

  const handleUpdateVisitTime = (index: number, time: string) => {
    setSelectedPlaces((prev) => {
      const copy = [...prev];
      copy[index].visit_time = time;
      return copy;
    });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Trip name is required.');
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmSave = async () => {
    setIsSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        start_date: startDate || null,
        end_date: endDate || null,
        places: selectedPlaces.map((sp, idx) => ({
          place_id: sp.place_id,
          order_index: idx,
          visit_time: sp.visit_time,
          notes: sp.notes,
        })),
      });
      setShowConfirm(false);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save trip.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden my-6">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {isEditing ? 'Edit Trip Itinerary' : 'Create New Trip'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Organize zero to many places into an itinerary
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
            {/* Trip Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Trip Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Weekend Jakarta Culinary Tour, Bali Beach Hop"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Description / Purpose
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Notes for packing, overall itinerary summary..."
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                />
              </div>
            </div>

            {/* Places Association Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Itinerary Places ({selectedPlaces.length})
                </label>
                <div className="flex items-center gap-2">
                  <select
                    onChange={(e) => {
                      handleAddPlace(e.target.value);
                      e.target.value = '';
                    }}
                    defaultValue=""
                    className="text-xs px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800 rounded-lg focus:outline-none cursor-pointer"
                  >
                    <option value="" disabled>
                      + Add a Place to Itinerary...
                    </option>
                    {availablePlaces.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedPlaces.length > 0 ? (
                <div className="space-y-2 mt-2">
                  {selectedPlaces.map((item, index) => {
                    const place = item.place || availablePlaces.find((p) => p.id === item.place_id);
                    return (
                      <div
                        key={`${item.place_id}_${index}`}
                        className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center gap-3 transition"
                      >
                        <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                          {index + 1}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                            {place?.name || 'Unknown Place'}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1.5">
                            <input
                              type="text"
                              value={item.visit_time}
                              onChange={(e) => handleUpdateVisitTime(index, e.target.value)}
                              placeholder="Visit time (e.g. 10:00 AM)"
                              className="px-2.5 py-1 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-emerald-500"
                            />
                            <input
                              type="text"
                              value={item.notes}
                              onChange={(e) => handleUpdateNotes(index, e.target.value)}
                              placeholder="Notes (e.g. Book table, buy tickets)"
                              className="px-2.5 py-1 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                        </div>

                        {/* Order Controls */}
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleMovePlace(index, 'up')}
                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 rounded"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={index === selectedPlaces.length - 1}
                            onClick={() => handleMovePlace(index, 'down')}
                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 rounded"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemovePlace(index)}
                          className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center text-xs text-slate-400 dark:text-slate-500">
                  No places added yet. Select places above to build this trip itinerary.
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
                {isEditing ? 'Save Changes' : 'Create Trip'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        title={isEditing ? 'Update Trip Confirmation' : 'Create Trip Confirmation'}
        message={
          isEditing
            ? `Are you sure you want to update the trip "${name}"?`
            : `Are you sure you want to create the trip "${name}" with ${selectedPlaces.length} place(s)?`
        }
        actionType={isEditing ? 'edit' : 'create'}
        confirmText={isEditing ? 'Save Changes' : 'Create Trip'}
        isLoading={isSubmitting}
        onConfirm={handleConfirmSave}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
};
