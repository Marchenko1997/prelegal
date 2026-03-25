"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

interface CatalogItem {
  name: string;
  description: string;
  filename: string;
}

// Documents that use a special dedicated route
const SPECIAL_ROUTES: Record<string, string> = {
  "Mutual Non-Disclosure Agreement": "/nda",
  "Mutual NDA Cover Page": "/nda",
};

function getRoute(item: CatalogItem): string {
  if (SPECIAL_ROUTES[item.name]) return SPECIAL_ROUTES[item.name];
  // Derive slug from template filename: "templates/CSA.md" → "csa"
  const slug = item.filename.replace("templates/", "").replace(".md", "").toLowerCase();
  return `/doc/${slug}`;
}

export default function HomePage() {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/catalog`)
      .then((r) => r.json())
      .then(setCatalog)
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-brand-navy text-white py-4 px-8 flex items-center justify-between">
        <span className="text-xl font-bold tracking-tight">Prelegal</span>
        <Link
          href="/login"
          className="text-sm text-brand-gray hover:text-white transition-colors"
        >
          Sign out
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-brand-navy mb-2">
          Document Templates
        </h1>
        <p className="text-brand-gray mb-8">
          Select a template to get started.
        </p>

        {catalog.length === 0 ? (
          <p className="text-brand-gray">Loading templates...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {catalog.map((item) => {
              const href = getRoute(item);
              return (
                <Link
                  key={item.name}
                  href={href}
                  className="block bg-white rounded-lg border border-gray-200 p-5 hover:border-brand-blue hover:shadow-md transition"
                >
                  <h2 className="font-semibold text-brand-navy mb-2 text-sm">
                    {item.name}
                  </h2>
                  <p className="text-xs text-brand-gray leading-relaxed">
                    {item.description}
                  </p>
                  <span className="mt-3 inline-block text-xs font-medium text-brand-blue">
                    Create →
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
