'use client';

import React, { useRef, useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Trophy,
  Disc,
  RotateCw,
  MapPin,
  Route,
  ExternalLink,
  X,
} from 'lucide-react';
import type { RouletteItem } from '@/types';

interface RouletteWheelProps {
  items: RouletteItem[];
  onSpinRequest: () => Promise<RouletteItem>;
  disabled?: boolean;
}

// Bauhaus Primary Palette for Wheel Segments
const BAUHAUS_PALETTE = [
  '#E63329', // Bauhaus Red
  '#1A3A6B', // Bauhaus Blue
  '#F5C800', // Bauhaus Yellow
  '#111111', // Structure Black
  '#F7F5F0', // Off White
];

export const RouletteWheel: React.FC<RouletteWheelProps> = ({
  items,
  onSpinRequest,
  disabled = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<RouletteItem | null>(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const rotationRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  const getPlaceGmapsUrl = (place: { name: string; address?: string; gmaps_url?: string }) => {
    if (place.gmaps_url && place.gmaps_url.trim().startsWith('http')) {
      return place.gmaps_url.trim();
    }
    const query = [place.name, place.address].filter(Boolean).join(' ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  };

  const totalWeight = items.reduce((sum, it) => sum + (Math.max(1, Number(it.weight) || 1)), 0);

  // Draw the wheel on canvas
  const drawWheel = (currentAngle: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 16;

    ctx.clearRect(0, 0, width, height);

    if (items.length === 0) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = '#EEEEEE';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#111111';
      ctx.stroke();

      ctx.fillStyle = '#888888';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('NO ITEMS ASSIGNED', centerX, centerY + 4);
      return;
    }

    let startAngle = currentAngle;

    items.forEach((item, index) => {
      const weight = Math.max(1, Number(item.weight) || 1);
      const sliceAngle = (weight / totalWeight) * 2 * Math.PI;
      const endAngle = startAngle + sliceAngle;

      const fillColor = BAUHAUS_PALETTE[index % BAUHAUS_PALETTE.length];

      // Draw Slice
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();

      // Bold Bauhaus Slice Separator
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#111111';
      ctx.stroke();

      // Text inside slice
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'right';

      // Contrast text: Black text on Yellow & Off-white, White on Red/Blue/Black
      if (fillColor === '#F5C800' || fillColor === '#F7F5F0') {
        ctx.fillStyle = '#111111';
      } else {
        ctx.fillStyle = '#FFFFFF';
      }

      ctx.font = '900 11px sans-serif';
      const label = item.title.toUpperCase();
      const truncated = label.length > 14 ? label.slice(0, 12) + '..' : label;
      ctx.fillText(truncated, radius - 16, 4);
      ctx.restore();

      startAngle = endAngle;
    });

    // Outer Thick Rim Border
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#111111';
    ctx.stroke();

    // Bauhaus Constructivist Center Hub
    ctx.beginPath();
    ctx.arc(centerX, centerY, 24, 0, 2 * Math.PI);
    ctx.fillStyle = '#111111';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();

    // Center Color Dot (Bauhaus Yellow)
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
    ctx.fillStyle = '#F5C800';
    ctx.fill();
  };

  useEffect(() => {
    drawWheel(rotationRef.current);
  }, [items]);

  const handleSpin = async () => {
    if (spinning || items.length === 0 || disabled) return;
    setWinner(null);
    setSpinning(true);

    try {
      const pickedItem = await onSpinRequest();

      // Calculate slice angle range for the picked item
      let currentCumulativeWeight = 0;
      let targetStart = 0;
      let targetSliceAngle = 0;

      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const weight = Math.max(1, Number(it.weight) || 1);
        const sliceAngle = (weight / totalWeight) * 2 * Math.PI;

        if (it.item_id === pickedItem.item_id || it.title === pickedItem.title) {
          targetStart = (currentCumulativeWeight / totalWeight) * 2 * Math.PI;
          targetSliceAngle = sliceAngle;
          break;
        }
        currentCumulativeWeight += weight;
      }

      // Pointer is at TOP: 3*PI/2 (270 deg)
      const pointerAngle = (3 * Math.PI) / 2;
      const targetCenterAngle = targetStart + targetSliceAngle / 2;
      let desiredRotation = pointerAngle - targetCenterAngle;

      const extraRotations = (6 + Math.floor(Math.random() * 3)) * 2 * Math.PI;
      const totalRotationNeeded = extraRotations + (desiredRotation - (rotationRef.current % (2 * Math.PI)));

      const startRotation = rotationRef.current;
      const finalRotation = startRotation + totalRotationNeeded;
      const duration = 4500; // ms
      const startTime = performance.now();

      const easeOutDecel = (t: number) => {
        return 1 - Math.pow(1 - t, 4);
      };

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const currentRot = startRotation + totalRotationNeeded * easeOutDecel(progress);

        rotationRef.current = currentRot;
        drawWheel(currentRot);

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          rotationRef.current = finalRotation % (2 * Math.PI);
          drawWheel(rotationRef.current);
          setSpinning(false);
          setWinner(pickedItem);
          setShowWinnerModal(true);

          // Confetti celebration
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#E63329', '#1A3A6B', '#F5C800', '#111111'],
          });
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    } catch (err) {
      console.error('Spin error:', err);
      setSpinning(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-[#16191E] border-[3px] border-[#111111] dark:border-white relative overflow-hidden">
      <div className="corner-rule-red" />

      {/* Wheel Top Constructivist Pointer */}
      <div className="relative mb-2">
        <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[18px] border-t-[#E63329] z-20 relative -mb-3" />
      </div>

      {/* Canvas Wheel */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={340}
          height={340}
          className="max-w-full h-auto cursor-pointer"
          onClick={handleSpin}
        />
      </div>

      {/* Spin Button */}
      <button
        onClick={handleSpin}
        disabled={spinning || items.length === 0 || disabled}
        className="mt-6 px-8 py-3.5 bg-[#E63329] hover:bg-[#C22921] active:scale-95 text-white font-black text-xs uppercase tracking-widest border-2 border-[#111111] dark:border-white transition-all disabled:opacity-50 flex items-center gap-2"
      >
        <RotateCw className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`} />
        <span>{spinning ? 'SPINNING WHEEL...' : 'SPIN ROULETTE'}</span>
      </button>

      {/* Winner Display Banner */}
      {winner && (
        <div className="mt-6 w-full max-w-sm p-4 bg-[#F5C800] text-[#111111] border-[3px] border-[#111111] dark:border-white animate-in zoom-in-95 text-center relative shadow-[4px_4px_0px_0px_#111111] dark:shadow-[4px_4px_0px_0px_#FFFFFF]">
          <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#111111]/70 mb-1 flex items-center justify-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-[#111111]" />
            <span>ROULETTE RESULT PICKED</span>
          </div>
          <div className="text-xl font-black uppercase tracking-tight text-[#111111] leading-tight">
            {winner.title}
          </div>
          {winner.subtitle ? (
            <div className="mt-1 text-[10px] font-mono uppercase text-[#111111]/80">
              {winner.subtitle}
            </div>
          ) : (
            <div className="mt-1 text-[10px] font-mono uppercase text-[#111111]/80">
              CATEGORY: {winner.type}
            </div>
          )}

          <div className="mt-3 flex items-center justify-center gap-2">
            <button
              onClick={() => setShowWinnerModal(true)}
              className="px-3.5 py-1.5 bg-[#111111] text-white hover:bg-[#E63329] text-[10px] font-black uppercase tracking-wider transition border border-[#111111] flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3 text-[#F5C800]" />
              <span>VIEW FULL DETAILS & MAPS</span>
            </button>
          </div>
        </div>
      )}

      {/* Full-Screen / Pop-out Winner Modal */}
      {showWinnerModal && winner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-lg md:max-w-xl bg-white dark:bg-[#0E1013] border-[4px] border-[#111111] dark:border-white shadow-[8px_8px_0px_0px_#F5C800] dark:shadow-[8px_8px_0px_0px_#E63329] rounded-none overflow-hidden my-auto relative animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#F7F5F0] dark:bg-[#111111] border-b-2 border-[#111111] dark:border-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 border-2 border-[#111111] dark:border-white bg-[#F5C800] text-[#111111] flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-[#111111]" />
                </div>
                <div>
                  <span className="font-mono text-[9px] font-black uppercase tracking-widest text-[#E63329]">
                    [DESTINATION UNLOCKED // ROULETTE]
                  </span>
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#111111] dark:text-white">
                    Winning Result
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setShowWinnerModal(false)}
                className="p-1.5 border-2 border-[#111111] dark:border-white bg-white dark:bg-[#16191E] text-[#111111] dark:text-white hover:bg-[#E63329] hover:text-white transition rounded-none"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              <div className="p-6 bg-[#F5C800] text-[#111111] border-[3px] border-[#111111] shadow-[4px_4px_0px_0px_#111111] space-y-4 relative">
                <div className="flex items-center justify-between border-b-2 border-[#111111]/20 pb-2">
                  <span className="font-mono text-[10px] font-black tracking-widest uppercase">
                    ★ WINNING RESULT ★
                  </span>
                  <span className="px-2 py-0.5 bg-[#111111] text-[#F5C800] text-[9px] font-black uppercase tracking-wider">
                    {winner.type.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-1 text-center py-2">
                  <div className="w-14 h-14 mx-auto border-2 border-[#111111] bg-white flex items-center justify-center mb-3 shadow-[2px_2px_0px_0px_#111111]">
                    {winner.type === 'places' ? (
                      <MapPin className="w-7 h-7 text-[#E63329]" />
                    ) : (
                      <Route className="w-7 h-7 text-[#1A3A6B]" />
                    )}
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#111111] leading-tight">
                    {winner.title}
                  </h2>

                  {winner.subtitle && (
                    <p className="text-xs sm:text-sm font-mono font-bold text-[#111111]/80">
                      {winner.subtitle}
                    </p>
                  )}

                  {winner.description && (
                    <p className="text-xs font-mono text-[#111111]/90 max-w-md mx-auto pt-1 leading-relaxed">
                      {winner.description}
                    </p>
                  )}
                </div>

                {/* Single Place CTA */}
                {winner.type === 'places' && (
                  <div className="pt-2 text-center space-y-2">
                    {winner.address && (
                      <p className="text-xs font-mono text-[#111111]/80 flex items-center justify-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#E63329]" />
                        <span>{winner.address}</span>
                      </p>
                    )}
                    <a
                      href={getPlaceGmapsUrl({
                        name: winner.title,
                        address: winner.address,
                        gmaps_url: winner.gmaps_url,
                      })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#111111] text-white hover:bg-[#1A3A6B] text-xs font-black uppercase tracking-wider transition border-2 border-[#111111] shadow-[2px_2px_0px_0px_#111111]"
                    >
                      <span>OPEN IN GOOGLE MAPS</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>

              {/* Trip Detail: Itinerary & Places */}
              {winner.type === 'trips' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b-2 border-[#111111] dark:border-white pb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-[#111111] dark:text-white flex items-center gap-2">
                      <Route className="w-4 h-4 text-[#1A3A6B] dark:text-[#F5C800]" />
                      <span>ITINERARY & DESTINATIONS ({winner.trip_places?.length || 0} STOPS)</span>
                    </span>
                    <span className="text-[10px] font-mono text-[#888888]">
                      ORDERED ROUTE
                    </span>
                  </div>

                  {winner.trip_places && winner.trip_places.length > 0 ? (
                    <div className="space-y-3">
                      {winner.trip_places.map((place, pIdx) => (
                        <div
                          key={place.id || place.place_id || pIdx}
                          className="p-4 bg-[#F7F5F0] dark:bg-[#16191E] border-2 border-[#111111] dark:border-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[2px_2px_0px_0px_#111111] dark:shadow-[2px_2px_0px_0px_#FFFFFF]"
                        >
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-[#111111] text-[#F5C800] text-[10px] font-mono font-black">
                                STOP #{pIdx + 1}
                              </span>
                              <h4 className="text-sm font-black uppercase tracking-tight text-[#111111] dark:text-white truncate">
                                {place.name}
                              </h4>
                              {place.type && (
                                <span className="px-1.5 py-0.2 bg-[#E63329] text-white text-[9px] font-mono font-bold uppercase">
                                  {place.type}
                                </span>
                              )}
                            </div>

                            {place.address && (
                              <p className="text-xs font-mono text-[#888888] flex items-center gap-1.5">
                                <MapPin className="w-3 h-3 text-[#E63329] flex-shrink-0" />
                                <span className="truncate">{place.address}</span>
                              </p>
                            )}

                            {(place.visit_time || place.notes) && (
                              <div className="text-[11px] font-mono text-[#1A3A6B] dark:text-[#F5C800] flex flex-wrap items-center gap-2 pt-0.5">
                                {place.visit_time && (
                                  <span className="font-bold">⏰ {place.visit_time}</span>
                                )}
                                {place.notes && (
                                  <span className="italic">“{place.notes}”</span>
                                )}
                              </div>
                            )}

                            {place.description && (
                              <p className="text-xs font-mono text-[#111111]/70 dark:text-white/70 line-clamp-2 pt-0.5">
                                {place.description}
                              </p>
                            )}
                          </div>

                          <div className="flex-shrink-0 pt-2 sm:pt-0">
                            <a
                              href={getPlaceGmapsUrl(place)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#111111] dark:bg-white text-white dark:text-[#111111] hover:bg-[#E63329] dark:hover:bg-[#E63329] dark:hover:text-white text-xs font-black uppercase tracking-wider transition border-2 border-[#111111] dark:border-white shadow-[2px_2px_0px_0px_#111111] dark:shadow-[2px_2px_0px_0px_#FFFFFF]"
                            >
                              <span>OPEN IN GOOGLE MAPS</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-white dark:bg-[#16191E] border-2 border-dashed border-[#111111]/40 dark:border-white/40 text-center">
                      <p className="text-xs font-mono text-[#888888]">
                        No destination places configured for this trip yet.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-[#F7F5F0] dark:bg-[#111111] border-t-2 border-[#111111] dark:border-white flex justify-end">
              <button
                onClick={() => setShowWinnerModal(false)}
                className="px-5 py-2.5 bg-[#111111] text-white hover:bg-[#E63329] text-xs font-black uppercase tracking-wider transition border-2 border-[#111111]"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
