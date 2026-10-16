'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Settings,
  Shield,
  Users,
  Database,
  ArrowRight,
  ShieldCheck,
  Server,
  Key,
} from 'lucide-react';
import { getCurrentUserProfile, fetchRoles } from '@/lib/api';
import type { UserAccessProfile, Role } from '@/types';

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserAccessProfile | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [profRes, rolesRes] = await Promise.all([
          getCurrentUserProfile().catch(() => null),
          fetchRoles().catch(() => ({ roles: [] })),
        ]);
        if (profRes) setProfile(profRes.user);
        setRoles(rolesRes.roles || []);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Settings</h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          System configuration, role-based access control (RBAC), and admin management
        </p>
      </div>

      {/* Main Settings Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* RBAC Sub-Page Card */}
        <Link
          href="/settings/rbac"
          className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-500/50 transition flex flex-col justify-between group"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition">
              Role-Based Access Control (RBAC)
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Define administrative roles, assign fine-grained permissions (Places, Trips, Roulette,
              Settings), and manage authorized Gmail lists.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <span>Manage {roles.length} Active Roles</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* System & Owner Overview */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
              <Server className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">System Information</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Cloudflare serverless edge runtime connected to Supabase free tier PostgreSQL.
            </p>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <span className="text-slate-500 dark:text-slate-400">System Owner:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                  {profile?.ownerEmail || profile?.email || 'Registered'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <span className="text-slate-500 dark:text-slate-400">Your Permissions:</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  {profile?.isOwner ? 'Full Super Admin (*)' : `${profile?.permissions.length} perms`}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500">
            Deployment target: Cloudflare Pages & Cloudflare Workers
          </div>
        </div>
      </div>
    </div>
  );
}
