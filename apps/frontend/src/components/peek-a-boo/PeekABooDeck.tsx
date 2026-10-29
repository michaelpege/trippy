'use client';

import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Trophy,
  RotateCw,
  Eye,
  MapPin,
  Route,
  ExternalLink,
  X,
  Compass,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import type { RouletteItem } from '@/types';

interface PeekABooDeckProps {
  items: RouletteItem[];
  title?: string;
  type?: 'trips' | 'places';
  onSpinRequest: (pickedItem?: RouletteItem) => Promise<RouletteItem>;
  disabled?: boolean;
}

interface DeckCard {
  id: string; // Unique deck card identifier e.g. item_id_0
  item: RouletteItem;
  instanceIndex: number;
  flipped: boolean;
  shuffleDelay: number;
  assignedQuote: string;
}

export const PeekABooDeck: React.FC<PeekABooDeckProps> = ({
  items,
  title,
  type = 'places',
  onSpinRequest,
  disabled = false,
}) => {
  const [deck, setDeck] = useState<DeckCard[]>([]);
  const [liftedCardId, setLiftedCardId] = useState<string | null>(null);
  const [winningCardId, setWinningCardId] = useState<string | null>(null);
  const [winner, setWinner] = useState<RouletteItem | null>(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [revealedAll, setRevealedAll] = useState(false);
  const shuffleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Generate weighted duplicate cards and shuffle them
  const initializeDeck = () => {
    if (!items || items.length === 0) {
      setDeck([]);
      return;
    }

    const cards: DeckCard[] = [];
    items.forEach((item) => {
      const weight = Math.max(1, Math.min(50, Number(item.weight) || 1));
      const quotePool =
        item.quotes && item.quotes.length > 0
          ? item.quotes.map((q) => q.trim()).filter(Boolean)
          : item.quote?.trim()
          ? [item.quote.trim()]
          : [];

      for (let i = 0; i < weight; i++) {
        // Randomly pick one quote from the quotes pool for each card instance on shuffle
        const assignedQuote =
          quotePool.length > 0
            ? quotePool[Math.floor(Math.random() * quotePool.length)]
            : '';

        cards.push({
          id: `${item.item_id}__${i}__${Math.random().toString(36).substring(2, 6)}`,
          item,
          instanceIndex: i,
          flipped: false,
          shuffleDelay: Math.random() * 0.3,
          assignedQuote,
        });
      }
    });

    // Fisher-Yates Shuffle
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }

    setIsShuffling(true);
    setWinningCardId(null);
    setWinner(null);
    setShowWinnerModal(false);
    setRevealedAll(false);
    setLiftedCardId(null);
    setIsFlipping(false);
    setDeck(cards);

    if (shuffleTimeoutRef.current) clearTimeout(shuffleTimeoutRef.current);
    shuffleTimeoutRef.current = setTimeout(() => {
      setIsShuffling(false);
    }, 850);
  };

  useEffect(() => {
    initializeDeck();
    return () => {
      if (shuffleTimeoutRef.current) clearTimeout(shuffleTimeoutRef.current);
    };
  }, [items]);

  // Card interaction: Desktop click or Mobile second tap
  const handleCardClick = async (card: DeckCard) => {
    if (disabled || isFlipping || isShuffling) return;

    // If card is already flipped, re-open detail modal if it's the winner
    if (card.flipped) {
      if (winner && card.id === winningCardId) {
        setShowWinnerModal(true);
      }
      return;
    }

    // Mobile tap handling: if not lifted yet, lift and show highlight + quote
    if (liftedCardId !== card.id) {
      setLiftedCardId(card.id);
      return;
    }

    // Second tap (or click on lifted card): execute flip
    await executeFlip(card);
  };

  // Flip execution
  const executeFlip = async (card: DeckCard) => {
    setIsFlipping(true);

    try {
      // Execute backend audit spin with chosen candidate
      const spinResult = await onSpinRequest(card.item);
      const chosenItem = spinResult || card.item;

      // Update card flip state
      setDeck((prev) =>
        prev.map((c) => (c.id === card.id ? { ...c, flipped: true } : c))
      );
      setWinningCardId(card.id);
      setWinner(chosenItem);
      setLiftedCardId(null);

      // Trigger Confetti explosion
      confetti({
        particleCount: 100,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#E63329', '#1A3A6B', '#F5C800', '#111111', '#FFFFFF'],
      });

      // Fill page with detailed popup after card flip animation starts
      setTimeout(() => {
        setShowWinnerModal(true);
      }, 450);
    } catch (err) {
      console.error('Failed to execute card pick:', err);
    } finally {
      setIsFlipping(false);
    }
  };

  // Reveal all other remaining cards
  const handleRevealAll = () => {
    setDeck((prev) => prev.map((c) => ({ ...c, flipped: true })));
    setRevealedAll(true);
    setShowWinnerModal(false);
  };

  const totalCards = deck.length;
  const winningCard = deck.find((c) => c.id === winningCardId);
  const winningQuote =
    winningCard?.assignedQuote ||
    (winner?.quotes && winner.quotes[0]) ||
    winner?.quote;

  const gmapsSearchUrl = winner
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${winner.title} ${winner.subtitle || ''}`
      )}`
    : '#';

  return (
    <div className="space-y-6">
      {/* Deck Controls Bar */}
      <div className="p-4 bg-white dark:bg-[#16191E] border-[3px] border-[#111111] dark:border-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[4px_4px_0px_0px_#111111] dark:shadow-[4px_4px_0px_0px_#FFFFFF]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 border-2 border-[#111111] dark:border-white bg-[#F5C800] text-[#111111] flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#E63329]">
                [PEEK A BOO // CARD DECK]
              </span>
              <span className="text-[10px] font-mono font-bold text-[#888888]">
                {totalCards} CARDS TOTAL
              </span>
            </div>
            <p className="text-xs font-black uppercase tracking-wider text-[#111111] dark:text-white">
              {title || 'Card Probability Picker'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {winner && (
            <button
              onClick={() => setShowWinnerModal(true)}
              className="px-3.5 py-2 border-2 border-[#111111] dark:border-white bg-[#E63329] text-white text-xs font-black uppercase tracking-wider hover:bg-[#C22921] transition flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#111111]"
            >
              <Trophy className="w-3.5 h-3.5 text-[#F5C800]" />
              <span>VIEW WINNER POPUP</span>
            </button>
          )}

          {winner && !revealedAll && (
            <button
              onClick={handleRevealAll}
              className="px-3.5 py-2 border-2 border-[#111111] dark:border-white bg-[#1A3A6B] text-white text-xs font-black uppercase tracking-wider hover:bg-[#152e55] transition flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>REVEAL OTHER CARDS</span>
            </button>
          )}

          <button
            onClick={initializeDeck}
            disabled={isShuffling || isFlipping}
            className="px-4 py-2 border-2 border-[#111111] dark:border-white bg-[#F5C800] text-[#111111] hover:bg-[#111111] hover:text-[#F5C800] text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 disabled:opacity-40"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isShuffling ? 'animate-spin' : ''}`} />
            <span>{isShuffling ? 'SHUFFLING...' : 'RESHUFFLE & DEAL'}</span>
          </button>
        </div>
      </div>

      {/* Helper Prompt Banner */}
      <div className="p-3 bg-[#F7F5F0] dark:bg-[#111111] border-2 border-[#111111] dark:border-white text-xs font-mono text-[#888888] flex items-center justify-between">
        <span className="font-bold uppercase tracking-wider text-[#111111] dark:text-white flex items-center gap-2">
          <Compass className="w-4 h-4 text-[#E63329]" />
          <span>Tap/Hover to lift card & peek clue. Tap again to flip.</span>
        </span>
        <span className="hidden sm:inline text-[10px] text-[#888888]">
          [WEIGHTED RANDOM DEAL]
        </span>
      </div>

      {/* Cards Deck Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
        {deck.map((card, idx) => {
          const isLifted = liftedCardId === card.id;
          const isWinning = winningCardId === card.id;
          const isFlipped = card.flipped;

          return (
            <div
              key={card.id}
              onClick={() => handleCardClick(card)}
              onMouseEnter={() => {
                // On hover on desktop, set lifted to reveal quote seamlessly
                setLiftedCardId(card.id);
              }}
              onMouseLeave={() => {
                if (liftedCardId === card.id && !card.flipped) {
                  setLiftedCardId(null);
                }
              }}
              style={{
                perspective: '1000px',
                transitionDelay: isShuffling ? `${card.shuffleDelay}s` : '0s',
              }}
              className={`group relative aspect-[3/4.2] cursor-pointer select-none transition-all duration-300 ${
                isShuffling ? 'translate-y-2 opacity-50 scale-95' : ''
              } ${
                isLifted && !isFlipped
                  ? '-translate-y-3.5 scale-105 z-30'
                  : 'hover:-translate-y-2 z-10'
              }`}
            >
              {/* Card Container with 3D Flip */}
              <div
                style={{
                  transformStyle: 'preserve-3d',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                className={`w-full h-full relative rounded-none transition-all duration-200 ${
                  isWinning
                    ? 'shadow-[6px_6px_0px_0px_#E63329]'
                    : isLifted
                    ? 'shadow-[0_0_20px_rgba(245,200,0,0.7),6px_6px_0px_0px_#111111] dark:shadow-[0_0_25px_rgba(245,200,0,0.85),6px_6px_0px_0px_#FFFFFF]'
                    : 'shadow-[4px_4px_0px_0px_#111111] dark:shadow-[4px_4px_0px_0px_#FFFFFF]'
                }`}
              >
                {/* ============================================================== */}
                {/* CARD BACK (Face Down) */}
                {/* ============================================================== */}
                <div
                  style={{ backfaceVisibility: 'hidden' }}
                  className={`absolute inset-0 border-[3px] transition-all duration-200 p-3 flex flex-col justify-between overflow-hidden bg-[#16191E] text-white ${
                    isLifted && !isFlipped
                      ? 'border-[#F5C800] ring-4 ring-[#F5C800]/50 shadow-[inset_0_0_12px_rgba(245,200,0,0.4)]'
                      : 'border-[#111111] dark:border-white'
                  }`}
                >
                  {/* Bauhaus Geometric Card Back DNA */}
                  <div className="absolute inset-0 opacity-15 pointer-events-none">
                    <div className="w-full h-full bg-[radial-gradient(#F5C800_1.5px,transparent_1.5px)] [background-size:12px_12px]" />
                  </div>

                  {/* Corner Accent 1 */}
                  <div className="flex items-center justify-between relative z-10">
                    <span
                      className={`font-mono text-[9px] font-black tracking-widest ${
                        isLifted ? 'text-[#F5C800] scale-110' : 'text-[#F5C800]'
                      }`}
                    >
                      #{String(idx + 1).padStart(2, '0')}
                    </span>
                    <span
                      className={`w-2.5 h-2.5 ${
                        isLifted ? 'bg-[#F5C800] animate-pulse' : 'bg-[#E63329]'
                      }`}
                    />
                  </div>

                  {/* Center Constructivist Emblem */}
                  <div className="relative z-10 flex flex-col items-center justify-center my-auto text-center px-1">
                    <div
                      className={`w-12 h-12 border-2 ${
                        isLifted ? 'border-[#F5C800] bg-[#111111]' : 'border-white/60 bg-[#111111]'
                      } flex items-center justify-center relative mb-2 transition-colors`}
                    >
                      <span className="w-3 h-3 rounded-full bg-[#E63329] absolute -top-1 -right-1" />
                      <span className="w-2.5 h-2.5 bg-[#1A3A6B] absolute -bottom-1 -left-1" />
                      <Sparkles
                        className={`w-5 h-5 ${
                          isLifted ? 'text-[#F5C800] animate-spin' : 'text-[#F5C800]'
                        }`}
                      />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/90">
                      PEEK A BOO
                    </p>
                    <p className="text-[8px] font-mono text-white/50 tracking-wider">
                      {isLifted ? 'TAP TO FLIP' : 'TAP TO REVEAL'}
                    </p>
                  </div>

                  {/* Bottom Accent */}
                  <div className="flex items-center justify-between relative z-10">
                    <span className="w-2.5 h-2.5 bg-[#1A3A6B]" />
                    <span className="font-mono text-[8px] font-black uppercase tracking-widest text-white/40">
                      TRIPPY
                    </span>
                  </div>

                  {/* Hover / Tap Quote Reveal Overlay */}
                  <div
                    className={`absolute inset-0 bg-[#111111]/95 border-2 border-[#F5C800] p-3 flex flex-col justify-between transition-opacity duration-300 z-20 ${
                      isLifted && !isFlipped
                        ? 'opacity-100 pointer-events-auto'
                        : 'opacity-0 pointer-events-none group-hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-white/20 pb-1">
                      <span className="text-[8px] font-mono font-black uppercase tracking-widest text-[#F5C800]">
                        CLUE / QUOTE
                      </span>
                      <span className="text-[8px] font-mono text-white/60">
                        CARD #{idx + 1}
                      </span>
                    </div>

                    <div className="my-auto py-2">
                      <p className="text-xs sm:text-sm font-serif italic text-white text-center leading-snug">
                        “{card.assignedQuote || 'A mysterious destination awaits your turn to discover.'}”
                      </p>
                    </div>

                    <div className="pt-1.5 border-t border-white/20 text-center">
                      <span className="inline-block px-2.5 py-1 bg-[#E63329] text-white text-[9px] font-black uppercase tracking-wider animate-pulse border border-[#F5C800]">
                        CLICK TO FLIP
                      </span>
                    </div>
                  </div>
                </div>

                {/* ============================================================== */}
                {/* CARD FRONT (Face Up / Revealed) */}
                {/* ============================================================== */}
                <div
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                  className={`absolute inset-0 border-[3px] border-[#111111] dark:border-white p-3.5 flex flex-col justify-between overflow-hidden ${
                    isWinning
                      ? 'bg-[#F5C800] text-[#111111]'
                      : 'bg-white dark:bg-[#16191E] text-[#111111] dark:text-white'
                  }`}
                >
                  {/* Top Bar of Revealed Card */}
                  <div className="flex items-center justify-between border-b-2 border-current/20 pb-1.5">
                    <span className="font-mono text-[9px] font-black tracking-widest uppercase opacity-75">
                      #{String(idx + 1).padStart(2, '0')} // {card.item.type.toUpperCase()}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider border border-current ${
                        isWinning
                          ? 'bg-[#E63329] text-white'
                          : 'bg-[#1A3A6B] text-white'
                      }`}
                    >
                      {isWinning ? 'WINNER' : 'CANDIDATE'}
                    </span>
                  </div>

                  {/* Center Content: Title, Subtitle, Quote */}
                  <div className="my-auto py-2 text-center space-y-1.5">
                    <div className="w-9 h-9 mx-auto border-2 border-current flex items-center justify-center font-black">
                      {card.item.type === 'places' ? (
                        <MapPin className="w-5 h-5 text-[#E63329]" />
                      ) : (
                        <Route className="w-5 h-5 text-[#1A3A6B]" />
                      )}
                    </div>

                    <h4 className="text-xs sm:text-sm font-black uppercase tracking-tight line-clamp-3 leading-tight">
                      {card.item.title}
                    </h4>

                    {card.item.subtitle && (
                      <p className="text-[10px] font-mono opacity-75 line-clamp-2">
                        {card.item.subtitle}
                      </p>
                    )}

                    {card.assignedQuote && (
                      <p className="text-[10px] font-serif italic opacity-90 line-clamp-2 pt-1 border-t border-dashed border-current/30">
                        “{card.assignedQuote}”
                      </p>
                    )}
                  </div>

                  {/* Bottom Indicator */}
                  <div className="pt-1.5 border-t-2 border-current/20 text-center">
                    <span className="text-[9px] font-mono font-black uppercase tracking-widest">
                      {isWinning ? '★ SELECTED DESTINATION ★' : 'REVEALED'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ===================================================================== */}
      {/* FULL-PAGE WINNER POPUP MODAL */}
      {/* ===================================================================== */}
      {showWinnerModal && winner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-lg md:max-w-xl bg-white dark:bg-[#0E1013] border-[4px] border-[#111111] dark:border-white shadow-[8px_8px_0px_0px_#F5C800] dark:shadow-[8px_8px_0px_0px_#E63329] rounded-none overflow-hidden my-auto relative animate-in zoom-in-95 duration-200">
            {/* Bauhaus Color DNA Top Strip */}
            <div className="color-dna" aria-hidden="true">
              <div className="c1" />
              <div className="c2" />
              <div className="c3" />
              <div className="c4" />
              <div className="c5" />
            </div>

            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#F7F5F0] dark:bg-[#111111] border-b-2 border-[#111111] dark:border-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 border-2 border-[#111111] dark:border-white bg-[#F5C800] text-[#111111] flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-[#111111]" />
                </div>
                <div>
                  <span className="font-mono text-[9px] font-black uppercase tracking-widest text-[#E63329]">
                    [DESTINATION UNLOCKED // PEEK A BOO]
                  </span>
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#111111] dark:text-white">
                    Winning Destination
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
              {/* Giant Selected Card Display */}
              <div className="p-6 bg-[#F5C800] text-[#111111] border-[3px] border-[#111111] shadow-[4px_4px_0px_0px_#111111] space-y-4 relative">
                <div className="flex items-center justify-between border-b-2 border-[#111111]/20 pb-2">
                  <span className="font-mono text-[10px] font-black tracking-widest uppercase">
                    ★ WINNING FLIP ★
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
                </div>

                {/* Highlighted Quote Callout */}
                {winningQuote && (
                  <div className="p-4 bg-white border-2 border-[#111111] text-center shadow-[2px_2px_0px_0px_#111111]">
                    <span className="block font-mono text-[9px] font-black uppercase tracking-widest text-[#E63329] mb-1">
                      SELECTED CARD CLUE:
                    </span>
                    <p className="text-sm sm:text-base font-serif italic text-[#111111] leading-relaxed">
                      “{winningQuote}”
                    </p>
                  </div>
                )}

                {/* Action Link: Google Maps Search */}
                <div className="pt-2 text-center">
                  <a
                    href={gmapsSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#111111] text-white hover:bg-[#1A3A6B] text-xs font-black uppercase tracking-wider transition border border-[#111111]"
                  >
                    <span>OPEN IN GOOGLE MAPS</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Other Clues Pool (if multiple quotes were configured) */}
              {winner.quotes && winner.quotes.length > 1 && (
                <div className="p-4 bg-[#F7F5F0] dark:bg-[#16191E] border-2 border-[#111111] dark:border-white space-y-2">
                  <span className="block text-[10px] font-mono font-black uppercase tracking-widest text-[#888888]">
                    ALL CONFIGURED CLUES FOR THIS SPOT ({winner.quotes.length}):
                  </span>
                  <div className="space-y-1.5">
                    {winner.quotes.map((q, qIdx) => (
                      <div
                        key={qIdx}
                        className={`p-2 text-xs font-mono border ${
                          q.trim() === winningQuote?.trim()
                            ? 'bg-[#F5C800]/20 border-[#F5C800] text-[#111111] dark:text-white font-bold'
                            : 'bg-white dark:bg-[#111111] border-[#111111]/20 dark:border-white/20 text-[#888888]'
                        }`}
                      >
                        <span className="opacity-60 mr-1.5">#{qIdx + 1}</span>
                        “{q}”
                        {q.trim() === winningQuote?.trim() && (
                          <span className="ml-2 text-[9px] font-black text-[#E63329] uppercase">
                            [THIS CARD]
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 sm:p-5 bg-[#F7F5F0] dark:bg-[#111111] border-t-2 border-[#111111] dark:border-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <button
                onClick={() => setShowWinnerModal(false)}
                className="px-4 py-2.5 text-xs font-black uppercase tracking-wider text-[#111111] dark:text-white bg-white dark:bg-[#16191E] border-2 border-[#111111] dark:border-white hover:bg-[#111111] hover:text-white dark:hover:bg-white dark:hover:text-[#111111] transition text-center"
              >
                Inspect Board
              </button>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {!revealedAll && (
                  <button
                    onClick={handleRevealAll}
                    className="px-4 py-2.5 bg-[#1A3A6B] text-white text-xs font-black uppercase tracking-wider border-2 border-[#111111] dark:border-white hover:bg-[#152e55] transition flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Reveal Other Cards</span>
                  </button>
                )}

                <button
                  onClick={initializeDeck}
                  className="px-5 py-2.5 bg-[#F5C800] text-[#111111] text-xs font-black uppercase tracking-wider border-2 border-[#111111] dark:border-white hover:bg-[#111111] hover:text-[#F5C800] transition flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_0px_#111111]"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Reshuffle & Deal</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
