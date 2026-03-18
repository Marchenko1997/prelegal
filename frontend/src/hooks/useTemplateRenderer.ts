"use client";

import { useEffect, useMemo, useState } from "react";
import { NdaFormData } from "@/types/nda";
import { renderCoverPage, renderStandardTerms } from "@/lib/templateRenderer";
import { fetchTemplate } from "@/lib/apiClient";

interface RenderedTemplates {
  coverpageHtml: string;
  termsHtml: string;
  isLoading: boolean;
  error: string | null;
}

export function useTemplateRenderer(formData: NdaFormData): RenderedTemplates {
  const [coverPageMd, setCoverPageMd] = useState<string>("");
  const [termsMd, setTermsMd] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load raw templates once on mount
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [cover, terms] = await Promise.all([
          fetchTemplate("coverpage"),
          fetchTemplate("terms"),
        ]);
        if (!cancelled) {
          setCoverPageMd(cover);
          setTermsMd(terms);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load templates");
          setIsLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Memoize rendered HTML so it only recomputes when form data or templates change,
  // not on every unrelated parent re-render.
  const coverpageHtml = useMemo(() => {
    if (!coverPageMd) return "";
    return renderCoverPage(formData, coverPageMd, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, coverPageMd]);

  const termsHtml = useMemo(() => {
    if (!termsMd) return "";
    return renderStandardTerms(formData, termsMd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, termsMd]);

  return { coverpageHtml, termsHtml, isLoading, error };
}
