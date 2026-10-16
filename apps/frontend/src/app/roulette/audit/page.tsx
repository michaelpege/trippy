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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/roulette"
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Roulettes</span>
            </Link>
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Execution Audit Trail</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Immutable log of every roulette spin execution and winning outcome
          </p>
        </div>

        {/* Immutability Banner */}
        <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/90 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs font-bold shadow-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Strictly Immutable &bull; Deletion Prohibited</span>
        </div>
      </div>

      {/* Audit Logs Table / List */}
      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400 dark:text-slate-500">Loading audit trail...</p>
          </div>
        </div>
      ) : logs.length > 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Showing {logs.length} recorded spin executions</span>
            <span>Total: {total}</span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {logs.map((log) => {
              const execDate = new Date(log.created_at);
              return (
                <div key={log.id} className="p-5 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                        <Trophy className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            {log.selected_item_title}
                          </h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 uppercase">
                            Winner
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Roulette: <span className="font-semibold text-slate-700 dark:text-slate-300">{log.roulette_title}</span> ({log.type})
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 self-start sm:self-auto">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        {execDate.toLocaleDateString()} {execDate.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  {/* Metadata Row */}
                  <div className="mt-3 pt-3 border-t border-slate-100/80 dark:border-slate-800 flex flex-wrap items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                      Executed By: <strong className="text-slate-700 dark:text-slate-300">{log.executed_by_identifier}</strong>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-300 ml-1">
                        {log.executed_by_type}
                      </span>
                    </span>

                    {log.ip_address && (
                      <span className="flex items-center gap-1 font-mono">
                        <Globe className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                        {log.ip_address}
                      </span>
                    )}

                    <span className="text-slate-400 dark:text-slate-500 font-mono ml-auto text-[10px]">
                      ID: {log.id}
                    </span>
                  </div>

                  {/* Candidate Pool Snapshot */}
                  {log.candidate_pool && log.candidate_pool.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-1 text-[10px]">
                      <span className="text-slate-400 dark:text-slate-500 font-medium">Pool:</span>
                      {log.candidate_pool.map((c, i) => (
                        <span
                          key={i}
                          className={`px-1.5 py-0.5 rounded border ${
                            c.item_id === log.selected_item_id
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700 font-bold'
                              : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {c.title} ({c.weight}x)
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
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto mb-3">
            <History className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No executions logged yet</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            When you or guests spin a roulette, every outcome and timestamp is written permanently here.
          </p>
          <Link
            href="/roulette"
            className="inline-block mt-4 px-4 py-2 bg-emerald-600 text-white font-semibold text-xs rounded-xl hover:bg-emerald-700 transition"
          >
            Go to Roulette
          </Link>
        </div>
      )}
    </div>
  );
}
