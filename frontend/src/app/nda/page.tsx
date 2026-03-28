"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { NdaFormData, defaultFormData } from "@/types/nda";
import { ChatMessage, ChatNdaFields, emptyFields, sendChatMessage } from "@/lib/chatApi";
import { useTemplateRenderer } from "@/hooks/useTemplateRenderer";
import { DocumentPreview } from "@/components/preview/DocumentPreview";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { SignatureModal } from "@/components/chat/SignatureModal";
import { NavBar } from "@/components/NavBar";
import { useAuth } from "@/lib/auth";
import { DISCLAIMER } from "@/lib/disclaimer";
import { saveDocument, getDocument } from "@/lib/documentsApi";

function fieldsToFormData(fields: ChatNdaFields): NdaFormData {
  const today = new Date().toISOString().split("T")[0];
  return {
    purpose: fields.purpose ?? defaultFormData.purpose,
    effectiveDate: fields.effective_date ?? defaultFormData.effectiveDate,
    mndaTermType: fields.mnda_term_type ?? defaultFormData.mndaTermType,
    mndaTermYears: fields.mnda_term_years ?? defaultFormData.mndaTermYears,
    confidentialityTermType: fields.confidentiality_term_type ?? defaultFormData.confidentialityTermType,
    confidentialityTermYears: fields.confidentiality_term_years ?? defaultFormData.confidentialityTermYears,
    governingLawState: fields.governing_law_state ?? "",
    jurisdiction: fields.jurisdiction ?? "",
    modifications: fields.modifications ?? "",
    party1: {
      signature: "",
      printName: fields.party1_print_name ?? "",
      title: fields.party1_title ?? "",
      company: fields.party1_company ?? "",
      noticeAddress: fields.party1_notice_address ?? "",
      date: today,
    },
    party2: {
      signature: "",
      printName: fields.party2_print_name ?? "",
      title: fields.party2_title ?? "",
      company: fields.party2_company ?? "",
      noticeAddress: fields.party2_notice_address ?? "",
      date: today,
    },
  };
}

function NdaPageInner() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentFields, setCurrentFields] = useState<ChatNdaFields>(emptyFields);
  const [isLoading, setIsLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [mobileTab, setMobileTab] = useState<"chat" | "preview">("chat");

  const formData = useMemo(() => fieldsToFormData(currentFields), [currentFields]);
  const { coverpageHtml, termsHtml } = useTemplateRenderer(formData);

  // Resume from saved document or greet on mount
  useEffect(() => {
    const resumeId = searchParams.get("resume");
    if (resumeId) {
      getDocument(Number(resumeId))
        .then((doc) => {
          setCurrentFields({ ...emptyFields, ...doc.fields } as ChatNdaFields);
          setMessages([{ role: "assistant", content: "Welcome back! Your saved document has been loaded. Continue chatting to make changes." }]);
        })
        .catch(() => {
          setChatError("Failed to load saved document. Starting fresh.");
        });
    } else {
      setIsLoading(true);
      sendChatMessage([], emptyFields)
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
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      const userMsg: ChatMessage = { role: "user", content: text };
      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      setIsLoading(true);
      setChatError(null);

      try {
        const res = await sendChatMessage(updatedMessages, currentFields);
        setMessages([...updatedMessages, { role: "assistant", content: res.reply }]);
        setCurrentFields(res.fields);
      } catch {
        setChatError("Something went wrong. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [messages, currentFields]
  );

  function handleSave() {
    const html = coverpageHtml + termsHtml;
    const fields = currentFields as unknown as Record<string, string | null>;
    setIsSaving(true);
    saveDocument({ doc_type: "mutual-nda", title: "Mutual Non-Disclosure Agreement", fields, html })
      .then(() => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      })
      .catch(() => setChatError("Failed to save document."))
      .finally(() => setIsSaving(false));
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
        title="Mutual NDA Creator"
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
              onClick={() => setShowModal(true)}
              className="bg-brand-purple text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90"
            >
              Download PDF
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
            <DocumentPreview coverpageHtml={coverpageHtml} termsHtml={termsHtml} />
          </div>
        </div>
      </div>

      {showModal && (
        <SignatureModal formData={formData} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}

export default function NdaPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-brand-gray text-sm">Loading...</p>
      </div>
    }>
      <NdaPageInner />
    </Suspense>
  );
}
