'use client';

import React from 'react';
import Link from 'next/link';
import { Disc, Sliders, History, Sparkles } from 'lucide-react';

interface RouletteNavProps {
  activeTab: 'spinner' | 'manage' | 'audit' | 'detail';
  rightElement?: React.ReactNode;
}

export const RouletteNav: React.FC<RouletteNavProps> = ({ activeTab, rightElement }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b-2 border-[#111111] dark:border-white pb-3 mb-6">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/roulette"
          className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-2 transition-all flex items-center gap-2 ${
            activeTab === 'spinner'
              ? 'bg-[#111111] text-white dark:bg-white dark:text-[#111111] border-[#111111] dark:border-white shadow-[2px_2px_0px_0px_#E63329]'
              : 'bg-white dark:bg-[#16191E] text-[#111111] dark:text-white border-[#111111] dark:border-white hover:bg-[#F5C800] hover:text-[#111111]'
          }`}
        >
          <Disc className={`w-3.5 h-3.5 ${activeTab === 'spinner' ? 'text-[#E63329]' : ''}`} />
          <span>SPINNER WHEEL</span>
        </Link>

        <Link
          href="/roulette/manage"
          className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-2 transition-all flex items-center gap-2 ${
            activeTab === 'manage'
              ? 'bg-[#111111] text-white dark:bg-white dark:text-[#111111] border-[#111111] dark:border-white shadow-[2px_2px_0px_0px_#1A3A6B]'
              : 'bg-white dark:bg-[#16191E] text-[#111111] dark:text-white border-[#111111] dark:border-white hover:bg-[#F5C800] hover:text-[#111111]'
          }`}
        >
          <Sliders className={`w-3.5 h-3.5 ${activeTab === 'manage' ? 'text-[#F5C800]' : ''}`} />
          <span>MANAGEMENT CONSOLE</span>
        </Link>

        <Link
          href="/roulette/audit"
          className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-2 transition-all flex items-center gap-2 ${
            activeTab === 'audit'
              ? 'bg-[#111111] text-white dark:bg-white dark:text-[#111111] border-[#111111] dark:border-white shadow-[2px_2px_0px_0px_#F5C800]'
              : 'bg-white dark:bg-[#16191E] text-[#111111] dark:text-white border-[#111111] dark:border-white hover:bg-[#F5C800] hover:text-[#111111]'
          }`}
        >
          <History className={`w-3.5 h-3.5 ${activeTab === 'audit' ? 'text-[#1A3A6B]' : ''}`} />
          <span>IMMUTABLE AUDIT</span>
        </Link>

        {activeTab === 'detail' && (
          <div className="px-4 py-2 text-xs font-black uppercase tracking-wider border-2 bg-[#E63329] text-white border-[#111111] dark:border-white flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#F5C800]" />
            <span>ROULETTE DETAIL</span>
          </div>
        )}
      </div>

      {rightElement && <div className="flex items-center gap-2">{rightElement}</div>}
    </div>
  );
};
