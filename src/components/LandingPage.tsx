import React, { useEffect, useState } from 'react';
import { ArrowRight, Globe2, Moon, ShieldCheck, Sun } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { LANGUAGE_OPTIONS, SupportedLang, TRANSLATIONS } from '../lib/i18n';
import { ResilientImage } from './ResilientImage';

export type WorkspaceTab = 'agritech' | 'civic' | 'msme' | 'skills' | 'urban' | 'analytics';

interface LandingPageProps {
  onEnterWorkspace: (tab: WorkspaceTab) => void;
  onOpenAi: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterWorkspace, onOpenAi }) => {
  const {
    regions,
    selectedRegion,
    setSelectedRegion,
    language,
    setLanguage,
    theme,
    toggleTheme,
  } = useAuth();
  const t = TRANSLATIONS[language];

  const [analyticsSnapshot, setAnalyticsSnapshot] = useState<{
    registeredFarmers: number;
    civicComplaintsTotal: number;
    participatingMsmes: number;
    sustainabilityReports: number;
    activeOpportunities: number;
  } | null>(null);

  // Contact form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactSector, setContactSector] = useState('Smart Civic Governance');
  const [contactMessage, setContactMessage] = useState('');
  const [contactStatus, setContactStatus] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/analytics/overview?region=${encodeURIComponent(selectedRegion)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.liveDatabaseCounts) setAnalyticsSnapshot(data.liveDatabaseCounts);
      })
      .catch(() => {});
  }, [selectedRegion]);

  const activeRegion = regions.find((r) => r.code === selectedRegion) || {
    district: 'Indore',
    state: 'Madhya Pradesh',
    departments: ['Indore Municipal Corporation (IMC)', 'MP Agriculture & Farmer Welfare'],
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactStatus(null);
    setContactError(null);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: contactName,
          email: contactEmail,
          regionCode: selectedRegion,
          sector: contactSector,
          message: contactMessage,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed.');
      setContactStatus(`Inquiry #${data.inquiryId} logged for ${activeRegion.district} coordination desk.`);
      setContactName('');
      setContactEmail('');
      setContactMessage('');
    } catch (err) {
      setContactError(err instanceof Error ? err.message : 'Unable to send inquiry.');
    }
  };

  return (
    <div className="space-y-24 pb-20">
      {/* 1. HERO SECTION */}
      <section id="overview" className="pt-10 lg:pt-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Regional & Accessibility Utility Strip inside Hero (keeps Top Bar clean) */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-8 border-b border-slate-200 dark:border-slate-800">
          <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Active Regional Node: <span className="text-slate-900 dark:text-slate-100 font-semibold">{activeRegion.district}, {activeRegion.state}</span> · Expandable India-First Architecture
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
              <Globe2 className="w-3.5 h-3.5" aria-hidden="true" />
              <select
                aria-label="Select District"
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
              >
                {regions.length > 0 ? (
                  regions.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.district}, {r.stateCode}
                    </option>
                  ))
                ) : (
                  <option value="mp-indore">Indore, MP</option>
                )}
              </select>
            </label>

            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              {LANGUAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => setLanguage(opt.code as SupportedLang)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    language === opt.code
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  {opt.nativeLabel}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
              className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch pt-10">
          <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
            <h1 className="text-[clamp(2.25rem,4vw,3.5rem)] font-bold tracking-tight leading-[1.08] text-slate-900 dark:text-slate-100 text-balance">
              {t.heroTitle}
            </h1>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
              {t.heroSubtitle}
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => onEnterWorkspace('civic')}
                className="px-6 py-3 rounded-lg bg-slate-900 dark:bg-amber-600 text-white text-sm font-semibold hover:bg-slate-800 dark:hover:bg-amber-500 inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors"
              >
                <span>{t.heroPrimaryCta}</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
              <a
                href="#sectors"
                className="px-5 py-3 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 transition-colors"
              >
                {t.heroSecondaryCta}
              </a>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative h-full min-h-[280px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
              <ResilientImage
                src="/src/assets/images/hero_indore_smart_city_1795701179616.jpg"
                alt="Indore Smart City corridor blending heritage sandstone architecture, solar rooftops, and clean urban transit"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 text-white">
                <div className="text-xs font-medium text-amber-300">
                  Indore &amp; Madhya Pradesh Regional Blueprint
                </div>
                <div className="text-sm font-medium mt-1">
                  Integrated AgriTech, Civic Redressal, MSME Commerce, Youth Skilling &amp; Clean Urban Telemetry
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Full-width 4-column regional metric strip below hero split */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-10 pt-8 border-t border-slate-200 dark:border-slate-800">
          {[
            { label: 'Active Regional Nodes', value: `${regions.length || 5} Districts` },
            { label: 'Development Sectors', value: '5 Operational' },
            { label: 'Supported Languages', value: 'EN · हिं · తె' },
            {
              label: 'Live Citizen & Farm Records',
              value: analyticsSnapshot
                ? String(
                    analyticsSnapshot.registeredFarmers +
                      analyticsSnapshot.civicComplaintsTotal +
                      analyticsSnapshot.participatingMsmes +
                      analyticsSnapshot.sustainabilityReports
                  )
                : 'PostgreSQL Ready',
            },
          ].map((stat) => (
            <div key={stat.label} className="space-y-1">
              <div className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</div>
              <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. REGIONAL DEVELOPMENT OVERVIEW */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 py-10 border-y border-slate-200 dark:border-slate-800 items-center">
          <div className="lg:col-span-5 space-y-4">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
              01. Regional Development Architecture
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 text-balance">
              {t.overviewHeading}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Instead of hardcoding municipal workflows to a single city, every district configuration stores local departments, supported languages, and regional datasets in PostgreSQL—allowing seamless expansion from Indore across Madhya Pradesh and other Indian states.
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Ten role-based access levels—from Farmers, Citizens, and MSME Owners to Department Officers and Super Administrators—enforce permissions on the server while safeguarding personal data under India&apos;s DPDP Act, 2023.
            </p>
          </div>
          <div className="lg:col-span-7">
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 aspect-video">
              <ResilientImage
                src="/src/assets/images/indore_regional_overview_1795702770036.jpg"
                alt="Panoramic view of Indore Rajwada heritage square connected to green urban walkways and metro transit"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. FIVE INNOVATION SECTORS (Asymmetric Bento Grid) */}
      <section id="sectors" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
              02. Five Innovation Sectors
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
              {t.sectorsHeading}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onEnterWorkspace('agritech')}
            className="text-sm font-semibold text-slate-900 dark:text-amber-400 hover:underline whitespace-nowrap shrink-0"
          >
            Open Full Workspace →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Smart AgriTech (featured span) */}
          <article className="lg:col-span-2 rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2">
            <ResilientImage
              src="/src/assets/images/sector_smart_agritech_1795701179673.jpg"
              alt="Indian farmer inspecting healthy Malwa crops with soil health tablet beside drip irrigation"
              className="w-full h-64 sm:h-full object-cover"
            />
            <div className="p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  01 · Agriculture &amp; AgriTech
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Smart AgriTech &amp; Soil Intelligence
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Farmer soil NPK health records, live Open-Meteo meteorological telemetry, crop profit calculators, and Gemini-powered leaf disease screening with KVK safety disclaimers.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onEnterWorkspace('agritech')}
                className="self-start px-4 py-2 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white text-xs font-semibold hover:bg-slate-800 dark:hover:bg-emerald-500 transition-colors"
              >
                Launch AgriTech Module
              </button>
            </div>
          </article>

          {/* Card 2: Smart Civic Governance (with HD Command Center Photo) */}
          <article className="rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col">
            <ResilientImage
              src="/src/assets/images/sector_civic_governance_1795702769404.jpg"
              alt="Indore Smart City Civic Facilitation and Integrated Command Center helping a citizen"
              className="w-full h-48 object-cover"
            />
            <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  02 · Smart Civic Governance
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Transparent Civic Issue Tracking
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Submit ward complaints with photos, get unique tracking IDs, and track verified department resolutions without exposing PII.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onEnterWorkspace('civic')}
                className="self-start px-4 py-2 rounded-lg bg-slate-900 dark:bg-sky-600 text-white text-xs font-semibold hover:bg-slate-800 dark:hover:bg-sky-500 transition-colors"
              >
                Launch Civic Portal
              </button>
            </div>
          </article>

          {/* Card 3: MSME Digitization */}
          <article className="rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col">
            <ResilientImage
              src="/src/assets/images/sector_msme_workshop_1795701179757.jpg"
              alt="Indore MSME artisans managing digital inventory and packaged crafts"
              className="w-full h-48 object-cover"
            />
            <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  03 · MSME &amp; Small Business
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  MSME Digital Storefronts &amp; GST
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Launch storefronts, manage inventory SKUs, issue GST invoices, log expenses, and draft multilingual product copy.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onEnterWorkspace('msme')}
                className="self-start px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Open MSME Desk
              </button>
            </div>
          </article>

          {/* Card 4: Education & Skill Development */}
          <article className="rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col">
            <ResilientImage
              src="/src/assets/images/sector_youth_skilling_1795701180707.jpg"
              alt="Students collaborating in a Madhya Pradesh skill development innovation center"
              className="w-full h-48 object-cover"
            />
            <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  04 · Skilling &amp; Employment
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Career Roadmaps &amp; Local Jobs
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Skill assessments, resume builder, free and paid regional courses, and clearly labeled Verified, External, or Sample job openings.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onEnterWorkspace('skills')}
                className="self-start px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Open Skilling Hub
              </button>
            </div>
          </article>

          {/* Card 5: Clean Urban Infrastructure */}
          <article className="rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col">
            <ResilientImage
              src="/src/assets/images/sector_clean_urban_1795701181347.jpg"
              alt="Clean green Indore avenue with segregated recycling bins and electric bus"
              className="w-full h-48 object-cover"
            />
            <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  05 · Clean Urban &amp; Sustainability
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Sustainability &amp; Air Telemetry
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Live air quality feeds, documented weighted sustainability scoring, waste segregation, water conservation, and green drive reporting.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onEnterWorkspace('urban')}
                className="self-start px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Open Urban Tracker
              </button>
            </div>
          </article>
        </div>
      </section>

      {/* 4. AI-POWERED SERVICES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-3">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
              03. Modular AI Intelligence Layer
            </p>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {t.aiHeading}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Server-side Gemini integration answers regional queries in English, Hindi, and Telugu, screens uploaded leaf photographs, and drafts MSME marketing copy—while blocking prompt injections and separating AI drafts from verified government rules.
            </p>
          </div>
          <div className="lg:col-span-5 flex flex-wrap lg:justify-end gap-3">
            <button
              type="button"
              onClick={onOpenAi}
              className="px-5 py-3 rounded-lg bg-slate-900 dark:bg-amber-600 text-white text-sm font-semibold hover:bg-slate-800 dark:hover:bg-amber-500 whitespace-nowrap shrink-0 transition-colors"
            >
              {t.openAiAssistant}
            </button>
          </div>
        </div>
      </section>

      {/* 5 & 6. REGIONAL IMPACT & FEATURED OPPORTUNITIES */}
      <section id="impact" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="p-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
            04. Regional Impact Dashboard
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t.impactHeading}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Track live district counts stored in PostgreSQL alongside documented DEMO DATA participation benchmarks, filterable by district with one-click CSV export.
          </p>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <div className="text-xs text-slate-500">Registered Farmers</div>
              <div className="text-2xl font-bold tabular-nums">{analyticsSnapshot?.registeredFarmers ?? 0}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Civic Complaints</div>
              <div className="text-2xl font-bold tabular-nums">{analyticsSnapshot?.civicComplaintsTotal ?? 0}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">MSME Storefronts</div>
              <div className="text-2xl font-bold tabular-nums">{analyticsSnapshot?.participatingMsmes ?? 0}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Active Opportunities</div>
              <div className="text-2xl font-bold tabular-nums">{analyticsSnapshot?.activeOpportunities ?? 4}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onEnterWorkspace('analytics')}
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100"
          >
            Inspect Full Analytics &amp; Export CSV
          </button>
        </div>

        <div id="opportunities" className="p-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
          <p className="text-xs font-medium text-indigo-700 dark:text-indigo-400">
            05. Featured Opportunities
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t.opportunitiesHeading}
          </h2>
          <div className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
            {[
              { title: 'Junior Full-Stack Engineer (React + Node)', org: 'Crystal IT Park Unit · Sample Listing', pay: '₹4.2 – ₹6.0 LPA' },
              { title: 'AgriTech Field Data & Drone Survey Intern', org: 'Malwa Precision Collective · Sample Listing', pay: '₹12,000 / month' },
              { title: 'E-Commerce Catalog & Export Associate', org: 'Pithampur MSME Cluster · External Listing', pay: '₹2.8 – ₹3.6 LPA' },
            ].map((job) => (
              <div key={job.title} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{job.title}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{job.org}</div>
                </div>
                <div className="text-xs font-mono tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  {job.pay}
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onEnterWorkspace('skills')}
            className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-indigo-600 text-white text-xs font-semibold"
          >
            Explore All Courses &amp; Jobs
          </button>
        </div>
      </section>

      {/* 7 & 8. DOCUMENTED EVIDENCE & COMMUNITY PARTICIPATION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="p-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <p className="text-xs font-medium text-teal-700 dark:text-teal-400">
              06. Documented Frameworks
            </p>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {t.evidenceHeading}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Every regional metric separates live PostgreSQL citizen/farmer records from clearly labeled DEMO DATA baseline benchmarks, while external weather and air-quality telemetry are sourced directly from Open-Meteo public endpoints.
            </p>
          </div>

          <div className="p-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
              07. Community Participation
            </p>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {t.communityHeading}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Citizens can log ward-level cleanliness or plantation initiatives, track civic complaints to closure, and rate department resolution quality directly from desktop or mobile.
            </p>
            <button
              type="button"
              onClick={() => onEnterWorkspace('urban')}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100"
            >
              Report a Community Action
            </button>
          </div>
        </div>
      </section>

      {/* 9 & 10. ABOUT THE INITIATIVE + CONTACT & SUPPORT */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 p-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            <span>08. About &amp; DPDP Act 2023 Charter</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {t.aboutHeading}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Built with minimal data collection, explicit user consent, right-to-correction, and account erasure workflows aligned with the Digital Personal Data Protection Act, 2023. All API documentation is published at <span className="font-mono text-xs">/api/openapi.json</span>.
          </p>
          <ul className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
            <li>• Server-enforced 10-role RBAC &amp; Firebase ID token verification</li>
            <li>• Magic-byte image upload validation, SSRF URL guards &amp; Origin CSRF protection</li>
            <li>• Salted SHA-256 IP anonymization &amp; prompt-injection filtering on AI endpoints</li>
          </ul>
        </div>

        <form
          onSubmit={handleContactSubmit}
          className="lg:col-span-7 p-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
        >
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            09. Contact &amp; Regional Support
          </p>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {t.contactHeading}
          </h2>
          {contactStatus && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200">
              {contactStatus}
            </div>
          )}
          {contactError && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-xs text-red-800 dark:text-red-300">
              {contactError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Your Name"
              className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <input
              type="email"
              required
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="Email Address"
              className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <select
              value={contactSector}
              onChange={(e) => setContactSector(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option>Smart Civic Governance</option>
              <option>Agriculture &amp; AgriTech</option>
              <option>MSME Digitization</option>
              <option>Skilling &amp; Employment</option>
              <option>Clean Urban Sustainability</option>
            </select>
          </div>
          <textarea
            rows={2}
            required
            value={contactMessage}
            onChange={(e) => setContactMessage(e.target.value)}
            placeholder="Share district onboarding request, institutional partnership, or support question..."
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
          />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-slate-900 dark:bg-amber-600 text-white text-sm font-semibold hover:bg-slate-800 dark:hover:bg-amber-500 transition-colors"
          >
            Submit Inquiry
          </button>
        </form>
      </section>
    </div>
  );
};
