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
        <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-[#111111] dark:text-white bg-[#F7F5F0] dark:bg-[#20242B] border-2 border-[#111111] dark:border-white px-2.5 py-1">
          <div className="flex items-center gap-1 text-[#E63329]">
            <MapPin className="w-3.5 h-3.5" />
            <span>{estimate.distanceKm} KM</span>
          </div>
          <span className="text-[#888888]">/</span>
          <div
            className="flex items-center gap-1 text-[#1A3A6B] dark:text-[#F5C800]"
            title="Estimated time by car"
          >
            <Car className="w-3.5 h-3.5" />
            <span>{estimate.carMinutes}M CAR</span>
          </div>
          <span className="text-[#888888]">/</span>
          <div
            className="flex items-center gap-1 text-[#111111] dark:text-white"
            title="Estimated time by motorcycle"
          >
            <Bike className="w-3.5 h-3.5" />
            <span>{estimate.motorcycleMinutes}M MOTO</span>
          </div>
        </div>
      ) : locating ? (
        <span className="text-[10px] font-mono uppercase tracking-wider text-[#888888] animate-pulse flex items-center gap-1">
          <Navigation className="w-3 h-3 animate-spin" /> LOCATING...
        </span>
      ) : null}

      <a
        href={routeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider transition-colors border-2 ${
          compact
            ? 'px-2.5 py-1 bg-white dark:bg-[#16191E] text-[#111111] dark:text-white border-[#111111] dark:border-white hover:bg-[#F5C800] hover:text-[#111111]'
            : 'px-3 py-1.5 bg-[#111111] text-white dark:bg-white dark:text-[#111111] border-[#111111] dark:border-white hover:bg-[#E63329] dark:hover:bg-[#E63329] dark:hover:text-white hover:border-[#E63329]'
        }`}
        title="Open route directions in Google Maps"
      >
        <Navigation className="w-3.5 h-3.5" />
        <span>ROUTE</span>
        <ExternalLink className="w-3 h-3 opacity-60" />
      </a>
    </div>
  );
};
