'use client';

import React, { useRef, useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, Trophy, Disc, RotateCw } from 'lucide-react';
import type { RouletteItem } from '@/types';

interface RouletteWheelProps {
  items: RouletteItem[];
  onSpinRequest: () => Promise<RouletteItem>;
  disabled?: boolean;
}

const PALETTE = [
  '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6',
];

export const RouletteWheel: React.FC<RouletteWheelProps> = ({
  items,
  onSpinRequest,
  disabled = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<RouletteItem | null>(null);
  const rotationRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

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
    const radius = Math.min(centerX, centerY) - 15;

    ctx.clearRect(0, 0, width, height);

    if (items.length === 0) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = '#e2e8f0';
      ctx.fill();
      return;
    }

    let startAngle = currentAngle;

    items.forEach((item, index) => {
      const weight = Math.max(1, Number(item.weight) || 1);
      const sliceAngle = (weight / totalWeight) * 2 * Math.PI;
      const endAngle = startAngle + sliceAngle;

      // Slice background
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = PALETTE[index % PALETTE.length];
      ctx.fill();

      // Border between slices
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Text label inside slice
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 4;

      const title = item.title.length > 18 ? `${item.title.substring(0, 16)}...` : item.title;
      ctx.fillText(`${title} (${item.weight}x)`, radius - 20, 5);
      ctx.restore();

      startAngle = endAngle;
    });

    // Center circle / hub
    ctx.beginPath();
    ctx.arc(centerX, centerY, 36, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 10;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(centerX, centerY, 14, 0, 2 * Math.PI);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
  };

  useEffect(() => {
    drawWheel(rotationRef.current);
  }, [items]);

  const handleSpin = async () => {
    if (spinning || disabled || items.length === 0) return;
    setSpinning(true);
    setWinner(null);

    try {
      // 1. Fetch backend result (which also records immutable audit log!)
      const pickedItem = await onSpinRequest();

      // 2. Calculate the slice angle range for the picked item
      let pickedStartAngle = 0;
      let pickedSliceAngle = 0;
      let cumulative = 0;

      for (const it of items) {
        const w = Math.max(1, Number(it.weight) || 1);
        const slice = (w / totalWeight) * 2 * Math.PI;
        if (it.item_id === pickedItem.item_id) {
          pickedStartAngle = cumulative;
          pickedSliceAngle = slice;
          break;
        }
        cumulative += slice;
      }

      // Pointer is at the top (angle 3*PI/2 = 270 deg or -PI/2)
      // When wheel rotates by totalRotation, slice at (3*PI/2 - totalRotation) % (2*PI) must match
      const targetMid = pickedStartAngle + pickedSliceAngle / 2;
      const fullRotations = 6 + Math.floor(Math.random() * 3); // 6 to 8 full spins
      const targetAngle =
        fullRotations * 2 * Math.PI + (1.5 * Math.PI - targetMid);

      const startRotation = rotationRef.current % (2 * Math.PI);
      const totalDelta = targetAngle - startRotation;

      const duration = 5000; // 5 seconds spin
      const startTime = performance.now();

      const animate = (time: number) => {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Cubic ease out
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentRotation = startRotation + totalDelta * easeOut;

        rotationRef.current = currentRotation;
        drawWheel(currentRotation);

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          setSpinning(false);
          setWinner(pickedItem);

          // Blast confetti!
          try {
            confetti({
              particleCount: 90,
              spread: 70,
              origin: { y: 0.6 },
            });
          } catch {
            // ignore
          }
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    } catch (err) {
      console.error(err);
      setSpinning(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-900 rounded-3xl text-white shadow-2xl relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Wheel Wrapper */}
      <div className="relative mb-6">
        {/* Top Indicator Arrow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20 flex flex-col items-center">
          <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[22px] border-t-amber-400 drop-shadow-md" />
        </div>

        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className="rounded-full shadow-2xl border-4 border-slate-800 max-w-full h-auto aspect-square"
        />
      </div>

      {/* Spin Button */}
      <button
        type="button"
        disabled={spinning || disabled || items.length === 0}
        onClick={handleSpin}
        className="px-8 py-3.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 hover:from-emerald-600 hover:to-indigo-700 active:scale-95 text-white font-extrabold rounded-2xl shadow-xl shadow-emerald-500/25 flex items-center gap-2.5 transition disabled:opacity-50 disabled:cursor-not-allowed text-base tracking-wide"
      >
        <RotateCw className={`w-5 h-5 ${spinning ? 'animate-spin' : ''}`} />
        <span>{spinning ? 'Spinning the Wheel...' : 'Spin Roulette!'}</span>
        <Sparkles className="w-5 h-5 text-amber-300" />
      </button>

      {/* Winner Reveal Card */}
      {winner && (
        <div className="mt-6 p-5 bg-gradient-to-r from-amber-500/20 to-emerald-500/20 border border-amber-400/50 rounded-2xl text-center max-w-md w-full animate-in zoom-in-95 duration-200">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400 text-slate-950 font-black text-xs rounded-full uppercase tracking-widest mb-2 shadow-sm">
            <Trophy className="w-3.5 h-3.5" />
            Winning Selection
          </div>
          <h4 className="text-2xl font-black text-white tracking-tight">{winner.title}</h4>
          {winner.subtitle && <p className="text-xs text-slate-300 mt-1">{winner.subtitle}</p>}
          <p className="text-[11px] text-emerald-400 font-mono mt-2">
            ✓ Logged permanently in immutable audit trail
          </p>
        </div>
      )}
    </div>
  );
};
