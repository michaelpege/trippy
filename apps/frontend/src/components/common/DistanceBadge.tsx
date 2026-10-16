'use client';

import React, { useEffect, useState } from 'react';
import { Navigation, Car, Bike, MapPin, ExternalLink } from 'lucide-react';
import {
  getUserLocation,
  calculateHaversineDistance,
  estimateTravelTimes,
  buildGoogleMapsRouteUrl,
  GeoCoordinates,
  TravelEstimate,
} from '@/lib/geo';

interface DistanceBadgeProps {
  place: {
    name: string;
    address?: string;
    gmaps_url?: string;
    latitude?: number | null;
    longitude?: number | null;
  };
  compact?: boolean;
}

export const DistanceBadge: React.FC<DistanceBadgeProps> = ({ place, compact = false }) => {
  const [userLoc, setUserLoc] = useState<GeoCoordinates | null>(null);
  const [estimate, setEstimate] = useState<TravelEstimate | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadLoc() {
      if (place.latitude && place.longitude) {
        setLocating(true);
        const loc = await getUserLocation();
        if (mounted && loc) {
          setUserLoc(loc);
          const dist = calculateHaversineDistance(loc, {
            latitude: place.latitude,
            longitude: place.longitude,
          });
          setEstimate(estimateTravelTimes(dist));
        }
        if (mounted) setLocating(false);
      }
    }

    loadLoc();
    return () => {
      mounted = false;
    };
  }, [place.latitude, place.longitude]);

  const routeUrl = buildGoogleMapsRouteUrl(place, userLoc);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {estimate ? (
        <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800 rounded-xl px-2.5 py-1.5 shadow-xs">
          <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold">
            <MapPin className="w-3.5 h-3.5" />
            <span>{estimate.distanceKm} km</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <div
            className="flex items-center gap-1 text-slate-600 dark:text-slate-300"
            title="Estimated time by car"
          >
            <Car className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
            <span>{estimate.carMinutes} min</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <div
            className="flex items-center gap-1 text-slate-600 dark:text-slate-300"
            title="Estimated time by motorcycle"
          >
            <Bike className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span>{estimate.motorcycleMinutes} min</span>
          </div>
        </div>
      ) : locating ? (
        <span className="text-xs text-slate-400 dark:text-slate-500 animate-pulse flex items-center gap-1">
          <Navigation className="w-3 h-3 animate-spin" /> Calculating route...
        </span>
      ) : null}

      <a
        href={routeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-xl transition shadow-sm ${
          compact
            ? 'px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800'
            : 'px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95'
        }`}
        title="Open route directions from current location in Google Maps"
      >
        <Navigation className="w-3.5 h-3.5" />
        <span>Directions</span>
        <ExternalLink className="w-3 h-3 opacity-70" />
      </a>
    </div>
  );
};
