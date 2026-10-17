'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Route, AlertCircle } from 'lucide-react';
import { TripCard } from '@/components/trips/TripCard';
import { TripFormModal } from '@/components/trips/TripFormModal';
import { fetchTrips, createTrip, updateTrip, deleteTrip } from '@/lib/api';
import { useToast } from '@/components/common/Toast';
import type { Trip } from '@/types';

export default function TripsPage() {
  const toast = useToast();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

  const loadTrips = async () => {
    setLoading(true);
    try {
      const res = await fetchTrips();
      setTrips(res.trips || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load trips.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrips();
  }, []);

  const handleOpenCreate = () => {
    setEditingTrip(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (trip: Trip) => {
    setEditingTrip(trip);
    setIsFormOpen(true);
  };

  const handleSaveTrip = async (data: {
    name: string;
    description?: string;
    start_date?: string | null;
    end_date?: string | null;
    places: { place_id: string; order_index: number; visit_time?: string; notes?: string }[];
  }) => {
    if (editingTrip) {
      const res = await updateTrip(editingTrip.id, data);
      toast.success(`Updated "${res.trip.name}" successfully.`);
    } else {
      const res = await createTrip(data);
      toast.success(`Created "${res.trip.name}" successfully.`);
    }
    await loadTrips();
  };

  const handleDeleteTrip = async (id: string) => {
    await deleteTrip(id);
    toast.success('Trip deleted.');
    await loadTrips();
  };

  return (
    <div className="space-y-8">
      {/* Page Header: Bauhaus Architectural Structure */}
      <div className="border-b-[3px] border-[#111111] dark:border-white pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-3 h-3 bg-[#1A3A6B]" />
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-[#888888]">
              ITINERARY // EXPEDITIONS
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-[#111111] dark:text-white leading-none">
            STRUCTURED TRIPS
          </h1>
          <p className="mt-2 text-xs text-[#555555] dark:text-[#A0A5B0]">
            Multi-stop itineraries linking curated places with continuous waypoint routing and schedule notes.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-5 py-2.5 bg-[#E63329] hover:bg-[#C22921] text-white text-xs font-black uppercase tracking-widest border-2 border-[#111111] dark:border-white transition-colors flex items-center gap-2 self-start md:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>CREATE NEW TRIP</span>
        </button>
      </div>

      {/* Trips Grid */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center border-2 border-dashed border-[#111111]/30 dark:border-white/30 p-12">
          <div className="w-8 h-8 border-3 border-[#1A3A6B] border-t-transparent animate-spin mb-4" />
          <p className="text-xs font-mono uppercase tracking-widest text-[#888888]">
            COMPILING ITINERARIES...
          </p>
        </div>
      ) : trips.length === 0 ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center border-[3px] border-[#111111] dark:border-white p-12 text-center bg-white dark:bg-[#16191E]">
          <div className="w-12 h-12 border-2 border-[#111111] dark:border-white bg-[#1A3A6B] text-white flex items-center justify-center mb-4 font-black">
            <Route className="w-6 h-6" />
          </div>
          <h3 className="text-base font-black uppercase tracking-wider text-[#111111] dark:text-white">
            NO TRIPS REGISTERED
          </h3>
          <p className="mt-1 text-xs text-[#555555] dark:text-[#A0A5B0] max-w-sm">
            Organize multiple places into a continuous route by creating your first trip itinerary.
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-6 px-5 py-2.5 bg-[#E63329] hover:bg-[#C22921] text-white text-xs font-black uppercase tracking-widest border-2 border-[#111111] dark:border-white transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>CREATE FIRST TRIP</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              onEdit={handleOpenEdit}
              onDelete={handleDeleteTrip}
            />
          ))}
        </div>
      )}

      {/* Trip Form Modal */}
      <TripFormModal
        isOpen={isFormOpen}
        tripToEdit={editingTrip}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveTrip}
      />
    </div>
  );
}
