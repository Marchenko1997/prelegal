import { Suspense } from "react";
import { DocChatClient } from "./DocChatClient";

const SLUGS = [
  "csa",
  "sla",
  "design-partner-agreement",
  "psa",
  "dpa",
  "partnership-agreement",
  "software-license-agreement",
  "pilot-agreement",
  "baa",
  "ai-addendum",
  "mutual-nda-coverpage",
];

export function generateStaticParams() {
  return SLUGS.map((slug) => ({ slug }));
}

export default function DocPage({ params }: { params: { slug: string } }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-brand-gray text-sm">Loading...</p>
      </div>
    }>
      <DocChatClient slug={params.slug} />
    </Suspense>
  );
}
