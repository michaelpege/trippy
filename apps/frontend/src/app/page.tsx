'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, MapPin, Route, Disc, Shield, Compass, Sparkles } from 'lucide-react';
import { checkSetupStatus } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';

export default function HomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function check() {
      try {
        const status = await checkSetupStatus();
        if (!status.isInitialized) {
          router.push('/setup');
          return;
        }

        const user = getCurrentUser();
        if (!user) {
          router.push('/login');
          return;
        }

        router.push('/places');
      } catch (err) {
        console.error('Error checking setup:', err);
        setChecking(false);
      }
    }

    check();
  }, [router]);

  return (
    <div className="space-y-12">
      {/* Hero Section: Bauhaus Asymmetric 40% / 60% Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 border-[3px] border-[#111111] dark:border-white overflow-hidden bg-white dark:bg-[#16191E]">
        {/* Left Column: Bauhaus Blue Architectural Block (lg:col-span-5) */}
        <div className="lg:col-span-5 bg-[#1A3A6B] p-8 sm:p-12 text-white relative overflow-hidden flex flex-col justify-between gap-8">
          {/* Geometric Composition Elements */}
          <div
            className="w-48 h-48 rounded-full bg-[#F5C800]/15 absolute -bottom-12 -right-12 pointer-events-none"
            aria-hidden="true"
          />
          <div
            className="w-24 h-24 border-2 border-white/10 absolute top-8 right-8 pointer-events-none"
            aria-hidden="true"
          />

          <div>
            <p className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-white/50 mb-4">
              01 // TRIP ARCHITECTURE
            </p>
            <h1 className="text-4xl sm:text-6xl font-black uppercase leading-[0.9] tracking-tight text-white">
              PLAN. <br />
              EXPLORE. <br />
              <span className="text-[#F5C800]">ROULETTE.</span>
            </h1>
          </div>

          <div className="pt-6 border-t border-white/20">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/60">
              FORM FOLLOWS FUNCTION. GRID IS LAW.
            </p>
          </div>
        </div>

        {/* Right Column: Architectural Content (lg:col-span-7) */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-between gap-8 bg-[#F7F5F0] dark:bg-[#0E1013] border-t-[3px] lg:border-t-0 lg:border-l-[3px] border-[#111111] dark:border-white">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 bg-[#E63329]" />
              <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[#888888]">
                SMART EXPEDITION SYSTEM
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#111111] dark:text-white leading-tight">
              CURATED ITINERARIES, MULTI-WAYPOINT ROUTING & WEIGHTED DECISIONS.
            </h2>
            <p className="mt-4 text-sm text-[#555555] dark:text-[#A0A5B0] leading-relaxed">
              Trippy organizes places by categories, calculates real-time driving/motorcycle distances,
              generates continuous multi-stop Google Maps routes, and resolves travel indecision through
              weighted probabilistic roulettes with verifiable audit logs.
            </p>
          </div>

          <div>
            {/* Adjacent CTA Buttons */}
            <div className="flex flex-wrap items-stretch gap-0">
              <Link
                href="/places"
                className="px-6 py-3.5 bg-[#E63329] hover:bg-[#C22921] text-white text-xs font-black uppercase tracking-widest border-2 border-[#E63329] hover:border-[#C22921] transition-colors flex items-center gap-2"
              >
                <span>OPEN PLACES</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/roulette"
                className="px-6 py-3.5 bg-white dark:bg-[#16191E] text-[#111111] dark:text-white hover:bg-[#111111] hover:text-white dark:hover:bg-white dark:hover:text-[#111111] text-xs font-black uppercase tracking-widest border-2 border-l-0 border-[#111111] dark:border-white transition-colors flex items-center gap-2"
              >
                <Disc className="w-4 h-4 text-[#E63329]" />
                <span>SPIN ROULETTE</span>
              </Link>
            </div>

            {/* Stats Row */}
            <div className="mt-8 pt-6 border-t-2 border-[#111111] dark:border-white grid grid-cols-3 gap-4">
              <div>
                <p className="text-2xl sm:text-3xl font-black text-[#111111] dark:text-white font-mono leading-none">
                  4
                </p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-[#888888] mt-1">
                  PLACE TYPES
                </p>
              </div>
              <div className="border-l-2 border-[#111111]/20 dark:border-white/20 pl-4">
                <p className="text-2xl sm:text-3xl font-black text-[#111111] dark:text-white font-mono leading-none">
                  100%
                </p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-[#888888] mt-1">
                  AUDITED SPINS
                </p>
              </div>
              <div className="border-l-2 border-[#111111]/20 dark:border-white/20 pl-4">
                <p className="text-2xl sm:text-3xl font-black text-[#111111] dark:text-white font-mono leading-none">
                  RBAC
                </p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-[#888888] mt-1">
                  EDGE PROTECTED
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid: Asymmetric 3-Cell Constructivist Layout */}
      <section className="grid grid-cols-1 md:grid-cols-12 border-[3px] border-[#111111] dark:border-white bg-[#111111] gap-0">
        {/* Cell 1: 2fr White Info Cell */}
        <div className="md:col-span-6 bg-white dark:bg-[#16191E] p-8 border-b-[3px] md:border-b-0 md:border-r-[3px] border-[#111111] dark:border-white flex flex-col justify-between">
          <div className="corner-rule-red" />
          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-[#888888]">
              MODULAR CAPABILITY // 01
            </span>
            <h3 className="text-xl font-black uppercase text-[#111111] dark:text-white mt-2">
              CURATE & MAP PLACES
            </h3>
            <p className="text-xs text-[#555555] dark:text-[#A0A5B0] mt-3 leading-relaxed">
              Categorize dining, commercial, public, and custom locations. Calculate exact driving
              and motorcycle transit times via Haversine geolocation, with 1-click Google Maps navigation.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-[#111111]/10 dark:border-white/10 flex items-center justify-between text-xs font-bold uppercase">
            <span className="text-[#E63329]">REST • MALL • PUBLIC • OTHER</span>
          </div>
        </div>

        {/* Cell 2: 1fr Red Accent Stat Cell */}
        <div className="md:col-span-3 bg-[#E63329] p-8 text-white border-b-[3px] md:border-b-0 md:border-r-[3px] border-[#111111] dark:border-white flex flex-col justify-between">
          <span className="text-[10px] font-mono font-bold uppercase text-white/60">
            METRIC // 02
          </span>
          <div>
            <p className="text-5xl font-black font-mono leading-none text-white">0s</p>
            <h3 className="text-sm font-black uppercase tracking-wide text-white mt-2">
              DECISION PARALYSIS
            </h3>
            <p className="text-[11px] text-white/80 mt-1 leading-relaxed">
              Weighted roulette spins resolve group indecision with immutable cryptographic audit history.
            </p>
          </div>
          <div className="text-[9px] font-mono uppercase text-white/60 pt-4 border-t border-white/20">
            PROBABILISTIC ENGINE
          </div>
        </div>

        {/* Cell 3: 1fr Yellow Action Cell */}
        <div className="md:col-span-3 bg-[#F5C800] p-8 text-[#111111] flex flex-col justify-between">
          <span className="text-[10px] font-mono font-bold uppercase text-black/60">
            GATEWAY // 03
          </span>
          <div>
            <h3 className="text-lg font-black uppercase leading-tight">
              PROTECTED SHARING
            </h3>
            <p className="text-xs text-[#111111]/80 mt-2 leading-relaxed">
              Share individual roulettes securely via authorized Google accounts or time-locked passcodes.
            </p>
          </div>
          <Link
            href="/roulette"
            className="mt-6 inline-flex items-center justify-between px-4 py-2.5 bg-[#111111] text-white text-[11px] font-black uppercase tracking-wider hover:bg-[#E63329] transition-colors"
          >
            <span>DISCOVER</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* Constructivist Method Rail */}
      <section className="grid grid-cols-1 md:grid-cols-12 border-[3px] border-[#111111] dark:border-white bg-white dark:bg-[#16191E]">
        {/* Vertical Type Column: 200px width equivalent */}
        <div className="md:col-span-2 bg-[#111111] dark:bg-white text-white dark:text-[#111111] p-6 flex items-center justify-center border-b-[3px] md:border-b-0 md:border-r-[3px] border-[#111111] dark:border-white">
          <span className="vertical-label text-2xl sm:text-3xl tracking-[0.25em]">
            SYSTEM
          </span>
        </div>

        {/* 3 Principles Columns */}
        <div className="md:col-span-10 grid grid-cols-1 md:grid-cols-3 divide-y-2 md:divide-y-0 md:divide-x-2 divide-[#111111]/10 dark:divide-white/10">
          <div className="p-6 sm:p-8">
            <span className="text-xs font-mono font-bold text-[#E63329] block mb-2">01. GEOMETRY</span>
            <h4 className="text-sm font-black uppercase text-[#111111] dark:text-white mb-2">
              Structured Organization
            </h4>
            <p className="text-xs text-[#555555] dark:text-[#A0A5B0] leading-relaxed">
              Every location, itinerary leg, and decision point is anchored to a strict relational model.
            </p>
          </div>

          <div className="p-6 sm:p-8">
            <span className="text-xs font-mono font-bold text-[#1A3A6B] dark:text-[#F5C800] block mb-2">
              02. VERIFIABILITY
            </span>
            <h4 className="text-sm font-black uppercase text-[#111111] dark:text-white mb-2">
              Permanent Audit Trail
            </h4>
            <p className="text-xs text-[#555555] dark:text-[#A0A5B0] leading-relaxed">
              Roulette runs record execution timestamps, user identities, and picked results permanently.
            </p>
          </div>

          <div className="p-6 sm:p-8">
            <span className="text-xs font-mono font-bold text-[#F5C800] block mb-2">
              03. GOVERNANCE
            </span>
            <h4 className="text-sm font-black uppercase text-[#111111] dark:text-white mb-2">
              Granular Edge RBAC
            </h4>
            <p className="text-xs text-[#555555] dark:text-[#A0A5B0] leading-relaxed">
              Cloudflare serverless edge middleware restricts capabilities by verified database permissions.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
