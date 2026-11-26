import React, { useState } from 'react';
import { Bot, Send, ShieldAlert, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { LANGUAGE_OPTIONS, SupportedLang } from '../lib/i18n';

interface AiReply {
  answer: string;
  disclaimer: string;
  isAiGenerated: boolean;
  language: string;
  actionItems: string[];
  requiresHumanConfirmation: boolean;
}

interface AiAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeSector: 'General' | 'AgriTech' | 'Civic Governance' | 'MSME' | 'Skilling & Jobs' | 'Clean Urban';
}

export const AiAssistantDrawer: React.FC<AiAssistantDrawerProps> = ({
  isOpen,
  onClose,
  activeSector,
}) => {
  const { selectedRegion, language, setLanguage, authFetch } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [sector, setSector] = useState(activeSector);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{ q: string; reply: AiReply }>>([]);

  React.useEffect(() => {
    setSector(activeSector);
  }, [activeSector]);

  if (!isOpen) return null;

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = prompt.trim();
    if (!cleaned || loading) return;

    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/ai/assistant', {
        method: 'POST',
        body: JSON.stringify({
          message: cleaned,
          sector,
          regionCode: selectedRegion,
          language,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to reach AI assistant.');
      }
      setHistory((prev) => [...prev, { q: cleaned, reply: data.reply }]);
      setPrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assistant request failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Regional AI Assistant"
    >
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-full flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <Bot className="w-5 h-5 text-amber-700 dark:text-amber-400" aria-hidden="true" />
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Regional AI Intelligence
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {selectedRegion.toUpperCase()} · Prompt-guarded · Human-verified advisory
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close AI Assistant"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3 bg-stone-50 dark:bg-slate-950/50">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
            <span>Sector</span>
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value as typeof activeSector)}
              className="text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-2 py-1.5 text-slate-900 dark:text-slate-100"
            >
              <option value="General">General</option>
              <option value="AgriTech">AgriTech</option>
              <option value="Civic Governance">Civic Governance</option>
              <option value="MSME">MSME</option>
              <option value="Skilling & Jobs">Skilling &amp; Jobs</option>
              <option value="Clean Urban">Clean Urban</option>
            </select>
          </label>

          <label className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
            <span>Language</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as SupportedLang)}
              className="text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-2 py-1.5 text-slate-900 dark:text-slate-100"
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.nativeLabel} ({opt.label})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {history.length === 0 && (
            <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <p className="font-medium text-slate-900 dark:text-slate-100">
                Ask practical regional questions in English, Hindi, or Telugu.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Example queries:
              </p>
              <div className="space-y-2">
                {[
                  'What irrigation schedule suits Rabi wheat on black cotton soil near Indore?',
                  'इंदौर में छोटे MSME व्यवसाय के लिए डिजिटल बिलिंग और ONDC की शुरुआत कैसे करें?',
                  'How can a final-year student in Madhya Pradesh build a portfolio for local tech jobs?',
                ].map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => setPrompt(sample)}
                    className="w-full text-left text-xs p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-amber-600 dark:hover:border-amber-500 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>
          )}

          {history.map((item, idx) => (
            <div key={idx} className="space-y-3 border-b border-slate-200 dark:border-slate-800 pb-4 last:border-b-0">
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                You: {item.q}
              </div>
              <div className="space-y-2.5 text-sm text-slate-700 dark:text-slate-200 bg-stone-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-xs font-medium text-amber-800 dark:text-amber-400">
                  AI-Generated Response · {item.reply.language.toUpperCase()}
                </div>
                <p className="leading-relaxed whitespace-pre-line">{item.reply.answer}</p>
                {item.reply.actionItems.length > 0 && (
                  <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                    {item.reply.actionItems.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ul>
                )}
                {item.reply.requiresHumanConfirmation && (
                  <div className="flex items-start gap-2 text-xs text-amber-900 dark:text-amber-300 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>Human verification required before financial, chemical, or official filing actions.</span>
                  </div>
                )}
                <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                  {item.reply.disclaimer}
                </p>
              </div>
            </div>
          ))}

          {error && (
            <div className="p-3 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-xs text-red-800 dark:text-red-300">
              {error}
            </div>
          )}
        </div>

        <form
          onSubmit={handleAsk}
          className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask about crops, civic services, MSMEs, skills, or urban sustainability..."
              aria-label="Ask Regional AI"
              className="flex-1 px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-600"
            />
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="px-4 py-2.5 rounded-lg bg-slate-900 dark:bg-amber-600 text-white text-sm font-medium hover:bg-slate-800 dark:hover:bg-amber-500 disabled:opacity-50 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
            >
              <Send className="w-4 h-4" aria-hidden="true" />
              <span>{loading ? 'Thinking...' : 'Send'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
