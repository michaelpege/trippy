'use client';

import React, { useState } from 'react';
import { Calendar, MapPin, Edit2, Trash2, Route, ExternalLink } from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';
import { DistanceBadge } from '../common/DistanceBadge';
import type { Trip } from '@/types';

interface TripCardProps {
  trip: Trip;
  onEdit: (trip: Trip) => void;
  onDelete: (id: string) => Promise<void>;
}

export const TripCard: React.FC<TripCardProps> = ({ trip, onEdit, onDelete }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const places = trip.places || [];

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await onDelete(trip.id);
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const buildMultiStopRouteUrl = () => {
    if (places.length === 0) return '#';
    const destinations = places
      .map((p) => {
        if (p.place?.latitude && p.place?.longitude) {
          return `${p.place.latitude},${p.place.longitude}`;
        }
        return encodeURIComponent(p.place?.name || '');
      })
      .filter(Boolean);

    if (destinations.length === 1) {
      return `https://www.google.com/maps/dir/?api=1&destination=${destinations[0]}&travelmode=driving`;
    }

    const origin = destinations[0];
    const destination = destinations[destinations.length - 1];
    const waypoints = destinations.slice(1, destinations.length - 1).join('|');

    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 mb-2">
                <Route className="w-3.5 h-3.5" />
                {places.length} {places.length === 1 ? 'place' : 'places'}
              </span>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{trip.name}</h3>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => onEdit(trip)}
                className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-xl transition"
                title="Edit Trip"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition"
                title="Delete Trip"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Dates */}
          {(trip.start_date || trip.end_date) && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-3">
              <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span>
                {trip.start_date || 'TBD'} &mdash; {trip.end_date || 'TBD'}
              </span>
            </div>
          )}

          {/* Description */}
          {trip.description && (
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3 mb-4">
              {trip.description}
            </p>
          )}

          {/* Itinerary Timeline */}
          {places.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5">
                Itinerary Schedule
              </p>
              <div className="space-y-2">
                {places.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 truncate mr-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <div className="truncate">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                          {item.place?.name || 'Place'}
                        </span>
                        {item.visit_time && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                            ⏰ {item.visit_time}
                          </span>
                        )}
                      </div>
                    </div>

                    {item.place && (
                      <div className="flex-shrink-0">
                        <DistanceBadge place={item.place} compact />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            Created: {new Date(trip.created_at || Date.now()).toLocaleDateString()}
          </span>

          {places.length > 0 && (
            <a
              href={buildMultiStopRouteUrl()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-sm transition active:scale-95"
            >
              <Route className="w-3.5 h-3.5" />
              <span>Full Route</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Trip Confirmation"
        message={`Are you sure you want to permanently delete the trip "${trip.name}"? This action cannot be reversed.`}
        actionType="delete"
        confirmText="Yes, Delete Trip"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteModal(false)}
      />
    </>
  );
};
