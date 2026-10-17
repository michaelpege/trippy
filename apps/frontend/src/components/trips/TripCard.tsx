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
      <div className="bg-white dark:bg-[#16191E] border-[3px] border-[#111111] dark:border-white p-6 relative overflow-hidden flex flex-col justify-between">
        {/* Constructivist Corner Accent Rule */}
        <div className="corner-rule-blue" />

        <div>
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest bg-[#1A3A6B] text-white border-2 border-[#111111] dark:border-white mb-2">
                <Route className="w-3 h-3" />
                {places.length} {places.length === 1 ? 'STOP' : 'STOPS'}
              </span>
              <h3 className="text-xl font-black uppercase tracking-tight text-[#111111] dark:text-white leading-tight">
                {trip.name}
              </h3>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onEdit(trip)}
                className="p-1.5 border-2 border-[#111111] dark:border-white text-[#111111] dark:text-white hover:bg-[#F5C800] hover:text-[#111111] transition-colors"
                title="Edit Trip"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="p-1.5 border-2 border-[#111111] dark:border-white text-[#111111] dark:text-white hover:bg-[#E63329] hover:text-white hover:border-[#E63329] transition-colors"
                title="Delete Trip"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Dates */}
          {(trip.start_date || trip.end_date) && (
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase text-[#888888] mb-3">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {trip.start_date || 'TBD'} &mdash; {trip.end_date || 'TBD'}
              </span>
            </div>
          )}

          {/* Description */}
          {trip.description && (
            <p className="text-xs text-[#444444] dark:text-[#A0A5B0] leading-relaxed line-clamp-3 mb-4">
              {trip.description}
            </p>
          )}

          {/* Itinerary Timeline */}
          {places.length > 0 && (
            <div className="mt-4 pt-4 border-t-2 border-[#111111]/10 dark:border-white/10">
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#888888] mb-2.5">
                WAYPOINT SEQUENCE
              </p>
              <div className="space-y-2">
                {places.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-2.5 bg-[#F7F5F0] dark:bg-[#20242B] border-2 border-[#111111] dark:border-white flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 truncate mr-2">
                      <span className="w-5 h-5 bg-[#111111] text-white dark:bg-white dark:text-[#111111] font-mono font-black text-[10px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="truncate">
                        <span className="font-bold uppercase tracking-wider text-[#111111] dark:text-white truncate block text-[11px]">
                          {item.place?.name || 'Place'}
                        </span>
                        {item.visit_time && (
                          <span className="text-[10px] font-mono text-[#888888] block">
                            SCHEDULE: {item.visit_time}
                          </span>
                        )}
                      </div>
                    </div>

                    {item.place && (
                      <div className="shrink-0">
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
        <div className="mt-6 pt-4 border-t-[3px] border-[#111111] dark:border-white flex items-center justify-between">
          <span className="text-[10px] font-mono text-[#888888] uppercase">
            CREATED: {new Date(trip.created_at || Date.now()).toLocaleDateString()}
          </span>

          {places.length > 0 && (
            <a
              href={buildMultiStopRouteUrl()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider px-3.5 py-1.5 bg-[#E63329] hover:bg-[#C22921] text-white border-2 border-[#111111] dark:border-white transition-colors"
            >
              <Route className="w-3.5 h-3.5" />
              <span>FULL GMAPS ROUTE</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
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
