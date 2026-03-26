"use client";

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

  async function handleSignout() {
    await signout();
    router.push("/login");
  }

  return (
    <header className="bg-brand-navy text-white px-6 py-3 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        {backHref && (
          <Link href={backHref} className="text-xs text-brand-gray hover:text-white">
            ← Back
          </Link>
        )}
        <Link href="/" className="font-semibold text-sm tracking-tight">
          Prelegal
        </Link>
        {title && (
          <>
            <span className="text-brand-gray text-xs">/</span>
            <span className="text-sm">{title}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
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
    </header>
  );
}
