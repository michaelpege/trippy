'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  MapPin,
  Route,
  Disc,
  Settings,
  LogOut,
  LogIn,
  ShieldCheck,
  User,
  Menu,
  X,
  Sun,
  Moon,
} from 'lucide-react';
import { getCurrentUser, clearSession, UserSession } from '@/lib/auth';
import { getCurrentUserProfile } from '@/lib/api';
import { useTheme } from './ThemeProvider';
import type { UserAccessProfile } from '@/types';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, toggleTheme } = useTheme();

  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [profile, setProfile] = useState<UserAccessProfile | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    function refreshUser() {
      const u = getCurrentUser();
      setUserSession(u);
      if (u) {
        getCurrentUserProfile()
          .then((res) => setProfile(res.user))
          .catch(() => setProfile(null));
      } else {
        setProfile(null);
      }
    }

    refreshUser();
    window.addEventListener('auth-state-changed', refreshUser);
    return () => window.removeEventListener('auth-state-changed', refreshUser);
  }, []);

  const handleLogout = () => {
    clearSession();
    router.push('/login');
  };

  const navLinks = [
    { href: '/places', label: 'Places', icon: MapPin },
    { href: '/trips', label: 'Trips', icon: Route },
    { href: '/roulette', label: 'Roulette', icon: Disc },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-[#16191E] transition-colors duration-150 border-b-[3px] border-[#111111] dark:border-white">
      {/* Bauhaus Color DNA Strip */}
      <div className="color-dna" aria-hidden="true">
        <div className="c1" />
        <div className="c2" />
        <div className="c3" />
        <div className="c4" />
        <div className="c5" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6 sm:gap-8">
            <Link href="/places" className="flex items-center gap-3 group">
              {/* Bauhaus Constructivist Logo Mark */}
              <div className="w-9 h-9 border-2 border-[#111111] dark:border-white bg-[#111111] dark:bg-white flex items-center justify-center relative overflow-hidden group-hover:bg-[#E63329] group-hover:border-[#E63329] transition-colors">
                <span className="w-3.5 h-3.5 rounded-full bg-[#F5C800] absolute -top-1 -right-1" />
                <span className="text-white dark:text-[#111111] font-black text-sm tracking-tight group-hover:text-white">
                  T
                </span>
                <span className="w-2 h-2 bg-[#E63329] dark:bg-[#1A3A6B] absolute -bottom-0.5 -left-0.5" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black tracking-[0.14em] uppercase text-[#111111] dark:text-white">
                  TRIPPY
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.2 bg-[#F5C800] text-[#111111] text-[9px] font-black uppercase tracking-widest border border-[#111111]">
                  ADMIN
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-6 ml-4">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-1.5 py-2 text-[11px] font-bold uppercase tracking-[0.14em] transition-all border-b-[3px] ${
                      isActive
                        ? 'border-[#E63329] text-[#111111] dark:text-white font-black'
                        : 'border-transparent text-[#888888] hover:text-[#111111] dark:hover:text-white hover:border-[#111111] dark:hover:border-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User Profile & Actions */}
          <div className="hidden md:flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle Theme"
              className="p-2 border-2 border-[#111111] dark:border-white text-[#111111] dark:text-white hover:bg-[#F5C800] hover:text-[#111111] hover:border-[#111111] transition-colors"
              title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-[#111111]" />
              )}
            </button>

            {profile?.isOwner && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-[#F5C800] text-[#111111] border border-[#111111]">
                <ShieldCheck className="w-3 h-3" />
                OWNER
              </span>
            )}

            {userSession ? (
              <div className="flex items-center gap-3 pl-3 border-l-2 border-[#111111] dark:border-white">
                <div className="flex items-center gap-2">
                  {userSession.picture ? (
                    <img
                      src={userSession.picture}
                      alt={userSession.name || 'User'}
                      className="w-7 h-7 rounded-none border border-[#111111] dark:border-white object-cover"
                    />
                  ) : (
                    <div className="w-7 h-7 bg-[#111111] dark:bg-white text-white dark:text-[#111111] flex items-center justify-center font-black text-xs">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div className="text-left text-xs">
                    <p className="font-bold text-[#111111] dark:text-white leading-tight uppercase tracking-wide text-[11px]">
                      {userSession.name || userSession.email.split('@')[0]}
                    </p>
                    <p className="text-[10px] text-[#888888] font-mono truncate max-w-[130px]">
                      {userSession.email}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  title="Sign out"
                  className="p-2 border-2 border-[#111111] dark:border-white text-[#111111] dark:text-white hover:bg-[#E63329] hover:text-white hover:border-[#E63329] transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider text-white bg-[#111111] dark:bg-white dark:text-[#111111] hover:bg-[#E63329] dark:hover:bg-[#E63329] dark:hover:text-white border-2 border-[#111111] dark:border-white transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>SIGN IN</span>
              </Link>
            )}
          </div>

          {/* Mobile Right Bar: Theme toggle + hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={toggleTheme}
              aria-label="Toggle Theme"
              className="p-2 border-2 border-[#111111] dark:border-white text-[#111111] dark:text-white hover:bg-[#F5C800] hover:text-black transition-colors"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-[#111111]" />
              )}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 border-2 border-[#111111] dark:border-white text-[#111111] dark:text-white hover:bg-[#111111] hover:text-white transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t-2 border-[#111111] dark:border-white bg-white dark:bg-[#16191E] px-4 pt-3 pb-5 space-y-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 text-xs font-bold uppercase tracking-wider border-l-4 ${
                  isActive
                    ? 'border-[#E63329] bg-[#F7F5F0] dark:bg-[#20242B] text-[#111111] dark:text-white font-black'
                    : 'border-transparent text-[#888888] hover:text-[#111111] dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}

          <div className="pt-3 border-t-2 border-[#111111] dark:border-white mt-2">
            {userSession ? (
              <div className="flex items-center justify-between">
                <div className="text-xs">
                  <p className="font-bold text-[#111111] dark:text-white">{userSession.email}</p>
                  <p className="text-[10px] text-[#888888] font-mono">
                    {profile?.isOwner ? 'SYSTEM OWNER' : 'ADMIN'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white bg-[#E63329] border border-[#111111]"
                >
                  SIGN OUT
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center w-full py-2.5 bg-[#111111] dark:bg-white text-white dark:text-[#111111] text-xs font-black uppercase tracking-wider border-2 border-[#111111] dark:border-white"
              >
                SIGN IN
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
