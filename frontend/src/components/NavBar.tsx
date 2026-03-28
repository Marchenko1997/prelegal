"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, signout } from "@/lib/auth";

interface NavBarProps {
  title?: string;
  backHref?: string;
  rightSlot?: React.ReactNode;
}

export function NavBar({ title, backHref, rightSlot }: NavBarProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleSignout() {
    await signout();
    router.push("/login");
  }

  return (
    <header className="bg-brand-navy text-white px-4 md:px-6 py-3 flex items-center justify-between shrink-0 relative">
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        {backHref && (
          <Link href={backHref} className="text-xs text-brand-gray hover:text-white shrink-0">
            ← Back
          </Link>
        )}
        <Link href="/" className="font-semibold text-sm tracking-tight shrink-0">
          Prelegal
        </Link>
        {title && (
          <>
            <span className="text-brand-gray text-xs hidden sm:inline">/</span>
            <span className="text-sm truncate hidden sm:inline">{title}</span>
          </>
        )}
      </div>

      {/* Desktop actions */}
      <div className="hidden md:flex items-center gap-4">
        {rightSlot}
        {user && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-brand-gray">{user.email}</span>
            <button
              onClick={handleSignout}
              className="text-xs text-brand-gray hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </div>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="md:hidden text-white p-1"
        aria-label="Toggle menu"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          {menuOpen ? (
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          ) : (
            <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          )}
        </svg>
      </button>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="absolute top-full left-0 right-0 bg-brand-navy border-t border-white/10 p-4 flex flex-col gap-3 md:hidden z-50">
          {rightSlot && <div className="flex items-center gap-2" onClick={() => setMenuOpen(false)}>{rightSlot}</div>}
          {user && (
            <>
              <span className="text-xs text-brand-gray">{user.email}</span>
              <button
                onClick={handleSignout}
                className="text-xs text-brand-gray hover:text-white transition-colors text-left"
              >
                Sign out
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
}
