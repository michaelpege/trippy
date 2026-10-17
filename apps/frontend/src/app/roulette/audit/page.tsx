'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  History,
  ShieldCheck,
  ArrowLeft,
  Trophy,
  User,
  Clock,
  Lock,
  Globe,
  Disc,
} from 'lucide-react';
import { fetchAuditLogs } from '@/lib/api';
import { useToast } from '@/components/common/Toast';
import type { RouletteAuditLog } from '@/types';

export default function RouletteAuditPage() {
  const toast = useToast();
  const [logs, setLogs] = useState<RouletteAuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLogs() {
      try {
        const res = await fetchAuditLogs();
        setLogs(res.logs || []);
        setTotal(res.total || 0);
      } catch (err: any) {
        toast.error(err.message || 'Failed to load audit logs.');
      } finally {
        setLoading(false);
      }
    }

    loadLogs();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-[#111111] dark:border-[#FFFFFF]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/roulette"
              className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#1A3A6B] dark:text-[#F5C800] hover:text-[#E63329] transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>[RETURN TO WHEEL]</span>
            </Link>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-[#111111] dark:text-[#FFFFFF]">
            Execution Audit Trail
          </h1>
          <p className="text-xs sm:text-sm text-[#888888] font-mono mt-1">
            Cryptographically sealed execution ledger of every roulette outcome
          </p>
        </div>

        {/* Immutability Banner */}
        <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#E63329] text-white border-2 border-[#111111] dark:border-[#FFFFFF] rounded-none text-xs font-mono font-black uppercase tracking-wider shadow-none">
          <ShieldCheck className="w-4 h-4 text-white flex-shrink-0" />
          <span>Strictly Immutable // Deletion Prohibited</span>
        </div>
      </div>

      {/* Audit Logs Table / List */}
      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-[3px] border-[#111111] dark:border-[#FFFFFF] border-t-[#E63329] animate-spin rounded-none" />
            <p className="text-xs font-mono font-black uppercase tracking-widest text-[#888888]">
              [READING LEDGER FROM WORKER...]
            </p>
          </div>
        </div>
      ) : logs.length > 0 ? (
        <div className="bg-[#FFFFFF] dark:bg-[#0E1013] rounded-none border-[3px] border-[#111111] dark:border-[#FFFFFF] overflow-hidden">
          <div className="p-4 bg-[#F7F5F0] dark:bg-[#111111] border-b-2 border-[#111111] dark:border-[#FFFFFF] flex items-center justify-between text-xs font-mono font-black uppercase text-[#111111] dark:text-[#FFFFFF]">
            <span>[EXECUTIONS LOGGED: {logs.length}]</span>
            <span>[TOTAL ARCHIVED: {total}]</span>
          </div>

          <div className="divide-y-2 divide-[#111111]/20 dark:divide-[#FFFFFF]/20">
            {logs.map((log) => {
              const execDate = new Date(log.created_at);
              return (
                <div key={log.id} className="p-5 hover:bg-[#F7F5F0]/60 dark:hover:bg-[#111111]/60 transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 border-2 border-[#111111] dark:border-[#FFFFFF] bg-[#F5C800] text-[#111111] flex items-center justify-center flex-shrink-0 font-bold">
                        <Trophy className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black uppercase tracking-tight text-[#111111] dark:text-[#FFFFFF]">
                            {log.selected_item_title}
                          </h3>
                          <span className="px-2 py-0.5 rounded-none text-[10px] font-mono font-black bg-[#E63329] text-white border border-[#111111] uppercase">
                            Winner
                          </span>
                        </div>
                        <p className="text-xs text-[#888888] font-mono mt-0.5">
                          Roulette: <span className="font-bold text-[#111111] dark:text-[#FFFFFF]">{log.roulette_title}</span> [{log.type.toUpperCase()}]
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-[#888888] self-start sm:self-auto">
                      <span className="flex items-center gap-1.5 px-2 py-1 bg-[#F7F5F0] dark:bg-[#111111] border border-[#111111] dark:border-[#FFFFFF]">
                        <Clock className="w-3.5 h-3.5 text-[#111111] dark:text-[#FFFFFF]" />
                        {execDate.toLocaleDateString()} {execDate.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  {/* Metadata Row */}
                  <div className="mt-3 pt-3 border-t border-[#111111]/20 dark:border-[#FFFFFF]/20 flex flex-wrap items-center gap-4 text-xs font-mono text-[#888888]">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#1A3A6B] dark:text-[#F5C800]" />
                      <span>OPERATOR:</span>
                      <strong className="text-[#111111] dark:text-[#FFFFFF]">{log.executed_by_identifier}</strong>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-[#111111] text-white dark:bg-white dark:text-[#111111] font-black ml-1">
                        {log.executed_by_type}
                      </span>
                    </span>

                    {log.ip_address && (
                      <span className="flex items-center gap-1 font-mono">
                        <Globe className="w-3.5 h-3.5 text-[#888888]" />
                        {log.ip_address}
                      </span>
                    )}

                    <span className="text-[#888888] font-mono ml-auto text-[10px]">
                      UUID: {log.id}
                    </span>
                  </div>

                  {/* Candidate Pool Snapshot */}
                  {log.candidate_pool && log.candidate_pool.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                      <span className="text-[#888888] font-black uppercase">POOL:</span>
                      {log.candidate_pool.map((c, i) => (
                        <span
                          key={i}
                          className={`px-2 py-0.5 rounded-none border ${
                            c.item_id === log.selected_item_id
                              ? 'bg-[#F5C800] text-[#111111] border-[#111111] font-black'
                              : 'bg-white dark:bg-[#111111] text-[#888888] border-[#111111]/40 dark:border-[#FFFFFF]/40'
                          }`}
                        >
                          {c.title} [{c.weight}x]
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-[#FFFFFF] dark:bg-[#0E1013] rounded-none border-2 border-dashed border-[#111111] dark:border-[#FFFFFF] p-12 text-center">
          <div className="w-12 h-12 border-2 border-[#111111] dark:border-[#FFFFFF] bg-[#F7F5F0] dark:bg-[#111111] text-[#111111] dark:text-[#FFFFFF] flex items-center justify-center mx-auto mb-3">
            <History className="w-6 h-6" />
          </div>
          <h3 className="text-base font-black uppercase tracking-tight text-[#111111] dark:text-[#FFFFFF]">
            No Executions Recorded
          </h3>
          <p className="text-xs text-[#888888] font-mono mt-1 max-w-sm mx-auto">
            When you or companions spin a roulette, every outcome is sealed here with its candidate weight distribution.
          </p>
          <Link
            href="/roulette"
            className="inline-block mt-4 px-5 py-2.5 bg-[#F5C800] text-[#111111] border-2 border-[#111111] dark:border-[#FFFFFF] font-black uppercase tracking-wider text-xs hover:bg-[#111111] hover:text-[#F5C800] transition rounded-none"
          >
            Go to Wheel
          </Link>
        </div>
      )}
    </div>
  );
}
