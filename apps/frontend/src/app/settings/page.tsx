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
      <div className="pb-4 border-b-2 border-[#111111] dark:border-[#FFFFFF]">
        <span className="font-mono text-[10px] font-black uppercase tracking-widest text-[#E63329]">
          [SYSTEM // PREFERENCES]
        </span>
        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-[#111111] dark:text-[#FFFFFF] mt-1">
          Settings
        </h1>
        <p className="text-xs sm:text-sm text-[#888888] font-mono mt-1">
          System topology, role-based access control (RBAC), and node runtime configuration
        </p>
      </div>

      {/* Main Settings Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* RBAC Sub-Page Card */}
        <Link
          href="/settings/rbac"
          className="bg-[#FFFFFF] dark:bg-[#0E1013] p-6 rounded-none border-[3px] border-[#111111] dark:border-[#FFFFFF] corner-rule-blue transition flex flex-col justify-between group hover:border-[#1A3A6B] relative"
        >
          <div>
            <div className="w-12 h-12 border-2 border-[#111111] dark:border-[#FFFFFF] bg-[#1A3A6B] text-white flex items-center justify-center mb-4">
              <Shield className="w-6 h-6" />
            </div>
            <span className="font-mono text-[10px] font-black uppercase tracking-widest text-[#1A3A6B] dark:text-[#F5C800]">
              [SECURITY SUBSYSTEM]
            </span>
            <h2 className="text-lg font-black uppercase tracking-tight text-[#111111] dark:text-[#FFFFFF] mt-1 group-hover:text-[#1A3A6B] dark:group-hover:text-[#F5C800] transition">
              Role-Based Access Control (RBAC)
            </h2>
            <p className="mt-2 text-xs text-[#888888] font-mono leading-relaxed">
              Define administrative roles, assign fine-grained permissions (Places, Trips, Roulette,
              Settings), and manage authorized Gmail lists.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t-2 border-[#111111] dark:border-[#FFFFFF] flex items-center justify-between text-xs font-black uppercase tracking-wider text-[#111111] dark:text-[#FFFFFF]">
            <span className="bg-[#F5C800] text-[#111111] px-2.5 py-1 border border-[#111111]">
              {roles.length} ACTIVE ROLES
            </span>
            <div className="flex items-center gap-1.5 group-hover:translate-x-1 transition-transform">
              <span>CONFIGURE</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </Link>

        {/* System & Owner Overview */}
        <div className="bg-[#FFFFFF] dark:bg-[#0E1013] p-6 rounded-none border-[3px] border-[#111111] dark:border-[#FFFFFF] corner-rule-yellow flex flex-col justify-between relative">
          <div>
            <div className="w-12 h-12 border-2 border-[#111111] dark:border-[#FFFFFF] bg-[#E63329] text-white flex items-center justify-center mb-4">
              <Server className="w-6 h-6" />
            </div>
            <span className="font-mono text-[10px] font-black uppercase tracking-widest text-[#E63329]">
              [NODE TOPOLOGY]
            </span>
            <h2 className="text-lg font-black uppercase tracking-tight text-[#111111] dark:text-[#FFFFFF] mt-1">
              System Architecture
            </h2>
            <p className="mt-2 text-xs text-[#888888] font-mono leading-relaxed">
              Edge serverless execution environment orchestrated on Cloudflare Workers and connected to Supabase PostgreSQL.
            </p>

            <div className="mt-5 space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between p-3 bg-[#F7F5F0] dark:bg-[#111111] border-2 border-[#111111] dark:border-[#FFFFFF]">
                <span className="text-[#888888] uppercase">System Owner:</span>
                <span className="font-black text-[#111111] dark:text-[#FFFFFF]">
                  {profile?.ownerEmail || profile?.email || 'REGISTERED'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#F7F5F0] dark:bg-[#111111] border-2 border-[#111111] dark:border-[#FFFFFF]">
                <span className="text-[#888888] uppercase">Your Permissions:</span>
                <span className="font-black text-[#1A3A6B] dark:text-[#F5C800]">
                  {profile?.isOwner ? 'SUPER ADMIN (*)' : `${profile?.permissions.length} GRANTED`}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t-2 border-[#111111] dark:border-[#FFFFFF] text-[10px] font-mono font-bold text-[#888888] uppercase">
            TARGET: CLOUDFLARE PAGES & WORKERS // V8 RUNTIME
          </div>
        </div>
      </div>
    </div>
  );
}
