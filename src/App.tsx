import React, { useState } from 'react';
import {
  BarChart3,
  Bot,
  Briefcase,
  Building2,
  Leaf,
  Moon,
  Sprout,
  Store,
  Sun,
} from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LANGUAGE_OPTIONS, ROLE_LABELS, SupportedLang, TRANSLATIONS } from './lib/i18n';
import { LandingPage, WorkspaceTab } from './components/LandingPage';
import { SmartAgriTech } from './components/modules/SmartAgriTech';
import { SmartCivicGovernance } from './components/modules/SmartCivicGovernance';
import { MsmeDigitization } from './components/modules/MsmeDigitization';
import { SkillEmployment } from './components/modules/SkillEmployment';
import { CleanUrban } from './components/modules/CleanUrban';
import { AnalyticsAdmin } from './components/modules/AnalyticsAdmin';
import { AiAssistantDrawer } from './components/AiAssistantDrawer';

const SECTOR_AI_MAP: Record<
  WorkspaceTab,
  'General' | 'AgriTech' | 'Civic Governance' | 'MSME' | 'Skilling & Jobs' | 'Clean Urban'
> = {
  agritech: 'AgriTech',
  civic: 'Civic Governance',
  msme: 'MSME',
  skills: 'Skilling & Jobs',
  urban: 'Clean Urban',
  analytics: 'General',
};

const AppShell: React.FC = () => {
  const {
    dbUser,
    loading,
    authError,
    regions,
    selectedRegion,
    setSelectedRegion,
    language,
    setLanguage,
    theme,
    toggleTheme,
    loginWithGoogle,
    logout,
  } = useAuth();

  const [view, setView] = useState<'landing' | 'workspace'>('landing');
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('agritech');
  const [aiOpen, setAiOpen] = useState(false);

  const t = TRANSLATIONS[language];

  const handleEnterWorkspace = (tab: WorkspaceTab) => {
    setActiveTab(tab);
    setView('workspace');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single clean wordmark */}
          <button
            type="button"
            onClick={() => setView('landing')}
            className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0 text-left"
          >
            {t.brandTitle}
          </button>

          {/* Zone 2: 5 concise single-line nav links */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300"
          >
            <button
              type="button"
              onClick={() => {
                setView('landing');
                setTimeout(() => document.getElementById('overview')?.scrollIntoView({ behavior: 'smooth' }), 40);
              }}
              className="hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 whitespace-nowrap shrink-0"
            >
              {t.navOverview}
            </button>
            <button
              type="button"
              onClick={() => {
                setView('landing');
                setTimeout(() => document.getElementById('sectors')?.scrollIntoView({ behavior: 'smooth' }), 40);
              }}
              className="hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 whitespace-nowrap shrink-0"
            >
              {t.navSectors}
            </button>
            <button
              type="button"
              onClick={() => handleEnterWorkspace('analytics')}
              className="hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 whitespace-nowrap shrink-0"
            >
              {t.navImpact}
            </button>
            <button
              type="button"
              onClick={() => handleEnterWorkspace('skills')}
              className="hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 whitespace-nowrap shrink-0"
            >
              {t.navOpportunities}
            </button>
            <button
              type="button"
              onClick={() => setView(view === 'workspace' ? 'landing' : 'workspace')}
              className="hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 whitespace-nowrap shrink-0"
            >
              {t.navWorkspace}
            </button>
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="shrink-0">
            {dbUser ? (
              <button
                type="button"
                onClick={view === 'landing' ? () => setView('workspace') : logout}
                className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-amber-600 text-white text-xs font-semibold hover:bg-slate-800 dark:hover:bg-amber-500 whitespace-nowrap shrink-0 transition-colors"
              >
                {view === 'landing' ? 'Open Console' : t.signOut}
              </button>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={loginWithGoogle}
                className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-amber-600 text-white text-xs font-semibold hover:bg-slate-800 dark:hover:bg-amber-500 disabled:opacity-60 whitespace-nowrap shrink-0 transition-colors"
              >
                {t.signIn}
              </button>
            )}
          </div>
        </div>
      </header>

      {authError && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4">
          <div className="p-3 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-xs text-red-800 dark:text-red-300">
            Authentication notice: {authError}
          </div>
        </div>
      )}

      <main className="flex-1">
        {view === 'landing' ? (
          <LandingPage
            onEnterWorkspace={handleEnterWorkspace}
            onOpenAi={() => setAiOpen(true)}
          />
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            {/* Workspace Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                <button
                  type="button"
                  onClick={() => setView('landing')}
                  className="font-medium text-slate-900 dark:text-slate-100 hover:underline whitespace-nowrap shrink-0"
                >
                  ← Back to Overview
                </button>
                <span aria-hidden="true">/</span>
                <span>
                  {dbUser
                    ? `${dbUser.displayName} · ${ROLE_LABELS[dbUser.role] || dbUser.role}`
                    : 'Public Visitor Mode'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  aria-label="Workspace District"
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  {regions.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.district}, {r.stateCode}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Workspace Language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as SupportedLang)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  {LANGUAGE_OPTIONS.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.nativeLabel}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={toggleTheme}
                  aria-label="Toggle Light/Dark theme"
                  className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                >
                  {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => setAiOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-amber-600 text-white text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Bot className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t.openAiAssistant}</span>
                </button>
              </div>
            </div>

            {/* Sidebar + Viewport Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <aside className="lg:col-span-3 space-y-1">
                {[
                  { id: 'agritech' as WorkspaceTab, label: '01. Smart AgriTech', icon: Sprout },
                  { id: 'civic' as WorkspaceTab, label: '02. Civic Governance', icon: Building2 },
                  { id: 'msme' as WorkspaceTab, label: '03. MSME Digital Desk', icon: Store },
                  { id: 'skills' as WorkspaceTab, label: '04. Skilling & Jobs', icon: Briefcase },
                  { id: 'urban' as WorkspaceTab, label: '05. Clean Urban', icon: Leaf },
                  { id: 'analytics' as WorkspaceTab, label: '06. Impact & Admin', icon: BarChart3 },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-left transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-slate-900 dark:bg-amber-600 text-white'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-900'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </aside>

              <div className="lg:col-span-9 min-w-0">
                {activeTab === 'agritech' && <SmartAgriTech onOpenAi={() => setAiOpen(true)} />}
                {activeTab === 'civic' && <SmartCivicGovernance onOpenAi={() => setAiOpen(true)} />}
                {activeTab === 'msme' && <MsmeDigitization onOpenAi={() => setAiOpen(true)} />}
                {activeTab === 'skills' && <SkillEmployment onOpenAi={() => setAiOpen(true)} />}
                {activeTab === 'urban' && <CleanUrban onOpenAi={() => setAiOpen(true)} />}
                {activeTab === 'analytics' && <AnalyticsAdmin />}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div>
            The Rise of New India · Starting with Indore &amp; Madhya Pradesh · Expandable across Bharat
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <a href="/api/openapi.json" target="_blank" rel="noreferrer" className="hover:underline">
              OpenAPI Spec
            </a>
            <span>DPDP Act 2023 Privacy Ready</span>
          </div>
        </div>
      </footer>

      <AiAssistantDrawer
        isOpen={aiOpen}
        onClose={() => setAiOpen(false)}
        activeSector={view === 'workspace' ? SECTOR_AI_MAP[activeTab] : 'General'}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
