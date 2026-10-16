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
    toast.success('Trip deleted successfully.');
    await loadTrips();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Trips</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Build multi-destination itineraries with ordered places and route directions
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/20 transition self-start sm:self-auto text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Trip</span>
        </button>
      </div>

      {/* Trips Grid */}
      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400 dark:text-slate-500">Loading trips...</p>
          </div>
        </div>
      ) : trips.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              onEdit={handleOpenEdit}
              onDelete={handleDeleteTrip}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto mb-3">
            <Route className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No trips planned yet</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Group your favorite places into an organized itinerary with scheduled times.
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white font-semibold text-xs rounded-xl hover:bg-emerald-700 transition"
          >
            Create Trip Now
          </button>
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
