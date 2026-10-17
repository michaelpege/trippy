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
        <div className="mt-6 w-full max-w-sm p-4 bg-[#F5C800] text-[#111111] border-[3px] border-[#111111] dark:border-white animate-in zoom-in-95 text-center relative">
          <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#111111]/70 mb-1">
            ROULETTE RESULT PICKED
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
        </div>
      )}
    </div>
  );
};
