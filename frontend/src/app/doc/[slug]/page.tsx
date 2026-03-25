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
];

export function generateStaticParams() {
  return SLUGS.map((slug) => ({ slug }));
}

export default function DocPage({ params }: { params: { slug: string } }) {
  return <DocChatClient slug={params.slug} />;
}
