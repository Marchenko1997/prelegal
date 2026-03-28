"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  DocChatMessage,
  fetchDocTemplate,
  generateDoc,
  sendDocChatMessage,
} from "@/lib/docChatApi";
import { renderGenericTemplate } from "@/lib/genericRenderer";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { NavBar } from "@/components/NavBar";
import { useAuth } from "@/lib/auth";
import { saveDocument, getDocument } from "@/lib/documentsApi";
import { DISCLAIMER } from "@/lib/disclaimer";
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
  "mutual-nda-coverpage": "Mutual NDA Cover Page",
};

interface Props {
  slug: string;
}

export function DocChatClient({ slug }: Props) {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const docName = DOC_NAMES[slug] ?? slug;

  const [messages, setMessages] = useState<DocChatMessage[]>([]);
  const [currentFields, setCurrentFields] = useState<Record<string, string | null>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [templateMd, setTemplateMd] = useState<string>("");
  const [templateError, setTemplateError] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [mobileTab, setMobileTab] = useState<"chat" | "preview">("chat");

  function loadTemplate() {
    setTemplateError(false);
    fetchDocTemplate(slug)
      .then(setTemplateMd)
      .catch(() => setTemplateError(true));
  }

  useEffect(() => {
    loadTemplate();
  }, [slug]);

  // Resume from saved document or greet on mount
  useEffect(() => {
    const resumeId = searchParams.get("resume");
    if (resumeId) {
      getDocument(Number(resumeId))
        .then((doc) => {
          setCurrentFields(doc.fields as Record<string, string | null>);
          setMessages([{ role: "assistant", content: "Welcome back! Your saved document has been loaded. Continue chatting to make changes." }]);
        })
        .catch(() => {
          setChatError("Failed to load saved document. Starting fresh.");
        });
    } else {
      setIsLoading(true);
      sendDocChatMessage(slug, [], {})
        .then((res) => {
          setMessages([{ role: "assistant", content: res.reply }]);
          setCurrentFields(res.fields);
        })
        .catch(() => {
          setChatError("Failed to connect to the AI. Please refresh and try again.");
        })
        .finally(() => setIsLoading(false));
    }
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

  function handleSave() {
    setIsSaving(true);
    saveDocument({ doc_type: slug, title: docName, fields: currentFields, html: previewHtml })
      .then(() => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      })
      .catch(() => setChatError("Failed to save document."))
      .finally(() => setIsSaving(false));
  }

  async function handleDownload() {
    setIsGenerating(true);
    try {
      const { html } = await generateDoc(slug, currentFields, docName);
      saveDocument({ doc_type: slug, title: docName, fields: currentFields, html })
        .catch(() => {});
      await printDocument(html);
    } catch {
      setChatError("Failed to generate document. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-brand-gray text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <NavBar
        title={docName}
        backHref="/"
        rightSlot={
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-brand-blue text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {saved ? "Saved" : isSaving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={handleDownload}
              disabled={isGenerating}
              className="bg-brand-purple text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {isGenerating ? "Generating..." : "Download PDF"}
            </button>
          </div>
        }
      />

      {/* Disclaimer banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-1.5 text-xs text-amber-700 shrink-0">
        {DISCLAIMER}
      </div>

      {/* Mobile tab toggle */}
      <div className="flex md:hidden border-b border-gray-200 shrink-0">
        <button
          onClick={() => setMobileTab("chat")}
          className={`flex-1 py-2 text-xs font-semibold text-center ${mobileTab === "chat" ? "text-brand-blue border-b-2 border-brand-blue" : "text-brand-gray"}`}
        >
          Chat
        </button>
        <button
          onClick={() => setMobileTab("preview")}
          className={`flex-1 py-2 text-xs font-semibold text-center ${mobileTab === "preview" ? "text-brand-blue border-b-2 border-brand-blue" : "text-brand-gray"}`}
        >
          Preview
        </button>
      </div>

      {/* Main split pane */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Left: Chat */}
        <div className={`${mobileTab === "chat" ? "flex" : "hidden"} md:flex w-full md:w-2/5 flex-col border-r border-gray-200 bg-white flex-1 md:flex-initial`}>
          <div className="px-4 py-3 border-b border-gray-100 shrink-0 hidden md:block">
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
        <div className={`${mobileTab === "preview" ? "flex" : "hidden"} md:flex flex-1 flex-col bg-gray-50 overflow-hidden`}>
          <div className="px-6 py-3 border-b border-gray-200 shrink-0 hidden md:block">
            <p className="text-xs font-medium text-brand-navy">Document Preview</p>
            <p className="text-xs text-brand-gray">Updates as you chat</p>
          </div>
          <div className="flex-1 overflow-auto p-4 md:p-6">
            {templateError ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <p className="text-red-600 text-sm">Failed to load document template.</p>
                <button
                  onClick={loadTemplate}
                  className="bg-brand-blue text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90"
                >
                  Retry
                </button>
              </div>
            ) : previewHtml ? (
              <div
                className="bg-white rounded-lg shadow-sm p-4 md:p-8 doc-content"
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
