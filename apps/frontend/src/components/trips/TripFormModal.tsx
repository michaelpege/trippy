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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 overflow-y-auto animate-in fade-in duration-100">
        <div className="w-full max-w-2xl bg-white dark:bg-[#16191E] border-[3px] border-[#111111] dark:border-white relative overflow-hidden my-6 flex flex-col max-h-[90vh]">
          <div className="corner-rule-blue" />

          {/* Header */}
          <div className="p-6 border-b-[3px] border-[#111111] dark:border-white flex items-center justify-between bg-white dark:bg-[#16191E]">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#888888]">
                {isEditing ? 'REVISE ITINERARY' : 'NEW ITINERARY'}
              </span>
              <h2 className="text-xl font-black uppercase tracking-tight text-[#111111] dark:text-white">
                {isEditing ? `EDIT // ${tripToEdit?.name}` : 'CREATE TRIP'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 border-2 border-[#111111] dark:border-white text-[#111111] dark:text-white hover:bg-[#111111] hover:text-white dark:hover:bg-white dark:hover:text-[#111111] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleFormSubmit} className="p-6 overflow-y-auto space-y-5">
            {/* Name */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[#111111] dark:text-white mb-1.5">
                TRIP NAME <span className="text-[#E63329]">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="E.G. BERLIN ARCHITECTURE TOUR 2026"
                className="w-full px-4 py-2.5 bg-white dark:bg-[#20242B] border-2 border-[#111111] dark:border-white text-xs font-mono uppercase text-[#111111] dark:text-white placeholder-[#888888] focus:outline-none focus:bg-[#FFFDE6] dark:focus:bg-[#2A2E37]"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-[#888888] mb-1">
                  START DATE (OPTIONAL)
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-[#20242B] border-2 border-[#111111] dark:border-white text-xs font-mono text-[#111111] dark:text-white focus:outline-none focus:bg-[#FFFDE6]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-[#888888] mb-1">
                  END DATE (OPTIONAL)
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-[#20242B] border-2 border-[#111111] dark:border-white text-xs font-mono text-[#111111] dark:text-white focus:outline-none focus:bg-[#FFFDE6]"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[#111111] dark:text-white mb-1.5">
                EXPEDITION OVERVIEW / NOTES
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Objectives, logistics, team members, route overview..."
                className="w-full px-4 py-2.5 bg-white dark:bg-[#20242B] border-2 border-[#111111] dark:border-white text-xs font-mono text-[#111111] dark:text-white placeholder-[#888888] focus:outline-none focus:bg-[#FFFDE6] dark:focus:bg-[#2A2E37]"
              />
            </div>

            {/* Places Picker & Sequence */}
            <div className="border-2 border-[#111111] dark:border-white p-4 bg-[#F7F5F0] dark:bg-[#20242B]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#111111] dark:text-white flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#1A3A6B] dark:text-[#F5C800]" />
                  WAYPOINT ITINERARY SEQUENCE ({selectedPlaces.length})
                </span>

                <div className="flex items-center gap-2">
                  <select
                    onChange={(e) => {
                      handleAddPlace(e.target.value);
                      e.target.value = '';
                    }}
                    defaultValue=""
                    className="px-3 py-1.5 bg-white dark:bg-[#16191E] border border-[#111111] dark:border-white text-xs font-mono uppercase text-[#111111] dark:text-white focus:outline-none"
                  >
                    <option value="" disabled>
                      + ADD PLACE TO ROUTE
                    </option>
                    {availablePlaces.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedPlaces.length === 0 ? (
                <div className="p-6 border-2 border-dashed border-[#111111]/30 dark:border-white/30 text-center">
                  <p className="text-xs font-mono uppercase text-[#888888]">
                    NO WAYPOINTS ADDED YET. SELECT FROM DROPDOWN ABOVE.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedPlaces.map((sp, idx) => (
                    <div
                      key={sp.place_id + idx}
                      className="p-3 bg-white dark:bg-[#16191E] border-2 border-[#111111] dark:border-white flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="w-6 h-6 bg-[#111111] text-white dark:bg-white dark:text-[#111111] font-mono font-black text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="truncate">
                          <span className="font-bold uppercase tracking-wider text-xs text-[#111111] dark:text-white block truncate">
                            {sp.place?.name || sp.place_id}
                          </span>
                          <span className="text-[10px] font-mono text-[#888888]">
                            {sp.place?.type || 'PLACE'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={sp.visit_time}
                          onChange={(e) => handleUpdateVisitTime(idx, e.target.value)}
                          placeholder="TIME (E.G. 10:00)"
                          className="px-2 py-1 bg-[#F7F5F0] dark:bg-[#20242B] border border-[#111111] dark:border-white text-[11px] font-mono w-28 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={sp.notes}
                          onChange={(e) => handleUpdateNotes(idx, e.target.value)}
                          placeholder="NOTES"
                          className="px-2 py-1 bg-[#F7F5F0] dark:bg-[#20242B] border border-[#111111] dark:border-white text-[11px] font-mono w-32 focus:outline-none"
                        />

                        {/* Reorder & Remove Buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMovePlace(idx, 'up')}
                            className="p-1 border border-[#111111] dark:border-white disabled:opacity-30 hover:bg-[#111111] hover:text-white transition-colors"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === selectedPlaces.length - 1}
                            onClick={() => handleMovePlace(idx, 'down')}
                            className="p-1 border border-[#111111] dark:border-white disabled:opacity-30 hover:bg-[#111111] hover:text-white transition-colors"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemovePlace(idx)}
                            className="p-1 border border-[#111111] dark:border-white hover:bg-[#E63329] hover:text-white transition-colors text-[#E63329]"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-4 border-t-[3px] border-[#111111] dark:border-white flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-transparent border-2 border-[#111111] dark:border-white text-xs font-black uppercase tracking-wider text-[#111111] dark:text-white hover:bg-[#111111] hover:text-white dark:hover:bg-white dark:hover:text-[#111111] transition-colors"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#1A3A6B] hover:bg-[#132A4F] text-white text-xs font-black uppercase tracking-wider border-2 border-[#111111] dark:border-white transition-colors"
              >
                {isEditing ? 'SAVE TRIP' : 'CREATE TRIP'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        title={isEditing ? 'Save Trip Changes' : 'Create Trip'}
        message={`Confirm saving the trip "${name}" with ${selectedPlaces.length} waypoints?`}
        actionType={isEditing ? 'edit' : 'create'}
        confirmText={isEditing ? 'Yes, Save Trip' : 'Yes, Create Trip'}
        isLoading={isSubmitting}
        onConfirm={handleConfirmSave}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
};
