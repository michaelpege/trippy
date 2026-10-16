'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Compass, ArrowRight, ShieldCheck, Route, Disc, Sparkles } from 'lucide-react';
import Link from 'next/link';
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
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-xl shadow-emerald-500/25 mb-6 animate-bounce">
        <Compass className="w-8 h-8" />
      </div>

      <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
        Welcome to Trip<span className="text-emerald-600 dark:text-emerald-400">py</span>
      </h1>
      <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl mx-auto leading-relaxed">
        Your intelligent trip planner. Organize curated places, itineraries, and execute weighted
        roulettes with secure RBAC management.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/places"
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition"
        >
          <span>Explore Places</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/roulette"
          className="px-6 py-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-bold rounded-2xl shadow-sm transition flex items-center gap-2"
        >
          <Disc className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Spin Roulette</span>
        </Link>
      </div>
    </div>
  );
}
