"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  DocChatMessage,
  fetchDocTemplate,
  generateDoc,
  sendDocChatMessage,
} from "@/lib/docChatApi";
import { renderGenericTemplate } from "@/lib/genericRenderer";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { printDocument } from "@/lib/printDocument";

const DOC_NAMES: Record<string, string> = {
  csa: "Cloud Service Agreement",
  sla: "Service Level Agreement",
  "design-partner-agreement": "Design Partner Agreement",
  psa: "Professional Services Agreement",
  dpa: "Data Processing Agreement",
  "partnership-agreement": "Partnership Agreement",
  "software-license-agreement": "Software License Agreement",
  "pilot-agreement": "Pilot Agreement",
  baa: "Business Associate Agreement",
  "ai-addendum": "AI Addendum",
};

interface Props {
  slug: string;
}

export function DocChatClient({ slug }: Props) {
  const docName = DOC_NAMES[slug] ?? slug;

  const [messages, setMessages] = useState<DocChatMessage[]>([]);
  const [currentFields, setCurrentFields] = useState<Record<string, string | null>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [templateMd, setTemplateMd] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Load template for live preview
  useEffect(() => {
    fetchDocTemplate(slug)
      .then(setTemplateMd)
      .catch(() => {});
  }, [slug]);

  // Greet user on mount
  useEffect(() => {
    async function greet() {
      setIsLoading(true);
      try {
        const res = await sendDocChatMessage(slug, [], {});
        setMessages([{ role: "assistant", content: res.reply }]);
        setCurrentFields(res.fields);
      } catch {
        setChatError("Failed to connect to the AI. Please refresh and try again.");
      } finally {
        setIsLoading(false);
      }
    }
    greet();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const handleSend = useCallback(
    async (text: string) => {
      const userMsg: DocChatMessage = { role: "user", content: text };
      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      setIsLoading(true);
      setChatError(null);

      try {
        const res = await sendDocChatMessage(slug, updatedMessages, currentFields);
        setMessages([...updatedMessages, { role: "assistant", content: res.reply }]);
        setCurrentFields(res.fields);
      } catch {
        setChatError("Something went wrong. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [messages, currentFields, slug]
  );

  const previewHtml = useMemo(() => {
    if (!templateMd) return "";
    return renderGenericTemplate(templateMd, currentFields);
  }, [templateMd, currentFields]);

  async function handleDownload() {
    setIsGenerating(true);
    try {
      const { html } = await generateDoc(slug, currentFields, docName);
      printDocument(html);
    } catch {
      setChatError("Failed to generate document. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-brand-navy text-white px-6 py-3 flex items-center justify-between shrink-0">
        <div>
          <Link href="/" className="text-xs text-brand-gray hover:text-white mr-3">
            ← Back
          </Link>
          <span className="font-semibold text-sm">{docName}</span>
        </div>
        <button
          onClick={handleDownload}
          disabled={isGenerating}
          className="bg-brand-purple text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {isGenerating ? "Generating..." : "Download PDF"}
        </button>
      </header>

      {/* Main split pane */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Chat */}
        <div className="w-2/5 flex flex-col border-r border-gray-200 bg-white">
          <div className="px-4 py-3 border-b border-gray-100 shrink-0">
            <p className="text-xs font-medium text-brand-navy">AI Assistant</p>
            <p className="text-xs text-brand-gray">Answers update the document preview live</p>
          </div>

          {chatError && (
            <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-b border-red-100">
              {chatError}
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            <ChatPanel messages={messages} isLoading={isLoading} onSend={handleSend} />
          </div>
        </div>

        {/* Right: Document preview */}
        <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
          <div className="px-6 py-3 border-b border-gray-200 shrink-0">
            <p className="text-xs font-medium text-brand-navy">Document Preview</p>
            <p className="text-xs text-brand-gray">Updates as you chat</p>
          </div>
          <div className="flex-1 overflow-auto p-6">
            {previewHtml ? (
              <div
                className="bg-white rounded-lg shadow-sm p-8 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-brand-gray text-sm">
                Loading document preview...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
