import React, { useCallback, useEffect, useState } from 'react';
import { BarChart3, Download, Globe2, ShieldCheck, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_LABELS } from '../../lib/i18n';

interface AnalyticsPayload {
  regionCode: string;
  liveDatabaseCounts: {
    registeredFarmers: number;
    cropRecordsLogged: number;
    civicComplaintsTotal: number;
    civicComplaintsResolved: number;
    resolutionRatePercent: number;
    participatingMsmes: number;
    registeredLearners: number;
    activeOpportunities: number;
    sustainabilityReports: number;
  };
  complaintCategories: Array<{ category: string; total: number }>;
  demoBenchmarks: {
    isDemoData: boolean;
    label: string;
    monthlyParticipationTrend: Array<{
      month: string;
      agritech: number;
      civic: number;
      msme: number;
      skilling: number;
      urban: number;
    }>;
  };
}

interface AdminOverview {
  users: Array<{
    id: number;
    displayName: string;
    email: string;
    role: string;
    regionCode: string;
    dpdpConsentGiven: boolean;
    isDeleted: boolean;
  }>;
  auditLogs: Array<{
    id: number;
    actorRole: string;
    action: string;
    resourceType: string;
    resourceId: string;
    details: string;
    createdAt: string;
  }>;
}

export const AnalyticsAdmin: React.FC = () => {
  const {
    dbUser,
    selectedRegion,
    setSelectedRegion,
    regions,
    language,
    setLanguage,
    authFetch,
    refreshProfile,
    logout,
    loginWithGoogle,
  } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [adminData, setAdminData] = useState<AdminOverview | null>(null);
  const [briefingBusy, setBriefingBusy] = useState(false);
  const [briefing, setBriefing] = useState<{ answer: string; actionItems: string[]; disclaimer: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // New Region Form (India-First Expansion)
  const [newCode, setNewCode] = useState('');
  const [newDistrict, setNewDistrict] = useState('');
  const [newState, setNewState] = useState('');
  const [newStateCode, setNewStateCode] = useState('');
  const [newDepts, setNewDepts] = useState('Municipal Corporation, District Agriculture Cell');

  const isAdminOrOfficer =
    dbUser && ['super_admin', 'regional_admin', 'dept_officer'].includes(dbUser.role);

  const loadAnalytics = useCallback(async () => {
    const res = await fetch(`/api/analytics/overview?region=${encodeURIComponent(selectedRegion)}`);
    if (res.ok) {
      setAnalytics(await res.json());
    }
    if (isAdminOrOfficer) {
      const aRes = await authFetch('/api/admin/overview');
      if (aRes.ok) {
        setAdminData(await aRes.json());
      }
    }
  }, [authFetch, isAdminOrOfficer, selectedRegion]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleGenerateBriefing = async () => {
    if (!analytics) return;
    setBriefingBusy(true);
    setError(null);
    try {
      const c = analytics.liveDatabaseCounts;
      const prompt = `Summarize the live regional development telemetry for ${analytics.regionCode}: ${c.registeredFarmers} farmers, ${c.cropRecordsLogged} crop records, ${c.civicComplaintsTotal} civic complaints (${c.resolutionRatePercent}% resolved), ${c.participatingMsmes} MSME storefronts, ${c.registeredLearners} learner profiles, ${c.activeOpportunities} opportunities, and ${c.sustainabilityReports} sustainability reports. Provide actionable regional governance priorities.`;
      const res = await authFetch('/api/ai/assistant', {
        method: 'POST',
        body: JSON.stringify({
          message: prompt,
          sector: 'General',
          regionCode: selectedRegion,
          language,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not generate regional briefing.');
      setBriefing(data.reply);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Briefing generation failed.');
    } finally {
      setBriefingBusy(false);
    }
  };

  const handleExportCsv = () => {
    if (!analytics) return;
    const rows = Object.entries(analytics.liveDatabaseCounts).map(([k, v]) => `${k},${v}`);
    const csv = `region_code,${analytics.regionCode}\nmetric,value\n${rows.join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rise-new-india-${analytics.regionCode}-impact.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRoleSwitch = async (role: string) => {
    setError(null);
    setMessage(null);
    try {
      const res = await authFetch('/api/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ role, regionCode: selectedRegion, preferredLanguage: language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Role update failed.');
      await refreshProfile();
      setMessage(`Active stakeholder profile updated to ${ROLE_LABELS[data.user.role] || data.user.role}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Profile update failed.');
    }
  };

  const handleDpdpConsent = async () => {
    setError(null);
    try {
      const res = await authFetch('/api/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ dpdpConsentGiven: true }),
      });
      if (!res.ok) throw new Error('Consent update failed.');
      await refreshProfile();
      setMessage('DPDP Act 2023 privacy consent recorded.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Consent update failed.');
    }
  };

  const handleAccountErasure = async () => {
    setError(null);
    try {
      const res = await authFetch('/api/auth/me', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Account deletion failed.');
      await logout();
      setMessage(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Account erasure failed.');
    }
  };

  const handleAddRegion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await authFetch('/api/regions', {
        method: 'POST',
        body: JSON.stringify({
          code: newCode.trim().toLowerCase(),
          district: newDistrict.trim(),
          state: newState.trim(),
          stateCode: newStateCode.trim().toUpperCase(),
          languages: ['en', 'hi'],
          departments: newDepts.split(',').map((d) => d.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add district.');
      setMessage(`Expanded platform to ${data.region.district}, ${data.region.state}.`);
      setNewCode('');
      setNewDistrict('');
      setNewState('');
      setNewStateCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Region expansion failed.');
    }
  };

  const handleAssignUserRole = async (userId: number, role: string) => {
    setError(null);
    try {
      const res = await authFetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Role assignment failed.');
      setMessage(`Updated user #${userId} role to ${role}.`);
      await loadAnalytics();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Role assignment failed.');
    }
  };

  const maxCategoryCount = Math.max(
    1,
    ...(analytics?.complaintCategories?.map((c) => c.total) || [1])
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Unified Analytics, Governance &amp; DPDP Act 2023 Compliance
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
            Regional Impact Dashboard &amp; RBAC Administration
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={briefingBusy || !analytics}
            onClick={handleGenerateBriefing}
            className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-amber-600 text-white text-sm font-medium disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {briefingBusy ? 'Generating...' : 'AI Regional Briefing'}
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span>Export CSV Report</span>
          </button>
        </div>
      </div>

      {briefing && (
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-sm">
          <div className="text-xs font-semibold text-amber-700 dark:text-amber-400">
            AI Executive Regional Briefing ({selectedRegion.toUpperCase()})
          </div>
          <p className="text-slate-700 dark:text-slate-200 leading-relaxed">{briefing.answer}</p>
          {briefing.actionItems?.length > 0 && (
            <ul className="list-disc pl-5 text-xs text-slate-600 dark:text-slate-300 space-y-1">
              {briefing.actionItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">{briefing.disclaimer}</p>
        </div>
      )}

      {message && (
        <div className="p-3.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-sm text-emerald-900 dark:text-emerald-200">
          {message}
        </div>
      )}
      {error && (
        <div className="p-3.5 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-sm text-red-800 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Live PostgreSQL Counts */}
      {analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Registered Farmers', val: analytics.liveDatabaseCounts.registeredFarmers },
              { label: 'Civic Complaints Filed', val: analytics.liveDatabaseCounts.civicComplaintsTotal },
              { label: 'MSME Storefronts', val: analytics.liveDatabaseCounts.participatingMsmes },
              { label: 'Sustainability Reports', val: analytics.liveDatabaseCounts.sustainabilityReports },
              { label: 'Crop Logs Recorded', val: analytics.liveDatabaseCounts.cropRecordsLogged },
              { label: 'Complaint Resolution Rate', val: `${analytics.liveDatabaseCounts.resolutionRatePercent}%` },
              { label: 'Skilling Profiles', val: analytics.liveDatabaseCounts.registeredLearners },
              { label: 'Open Opportunities', val: analytics.liveDatabaseCounts.activeOpportunities },
            ].map((item) => (
              <div
                key={item.label}
                className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
              >
                <div className="text-xs text-slate-500 dark:text-slate-400">{item.label}</div>
                <div className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                  {item.val}
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Live PostgreSQL Count
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Live Civic Category Breakdown */}
            <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Civic Complaint Categories (Live DB)
                </h3>
                <span className="text-xs text-slate-500">PostgreSQL Live</span>
              </div>
              {analytics.complaintCategories.length === 0 ? (
                <div className="text-sm text-slate-500 py-4">
                  No civic complaints categorized in this district yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {analytics.complaintCategories.map((row) => (
                    <div key={row.category} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-800 dark:text-slate-200">{row.category}</span>
                        <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400">
                          {row.total}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-sky-700 dark:bg-sky-500 rounded-full"
                          style={{ width: `${Math.round((row.total / maxCategoryCount) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* DEMO DATA Trend Chart */}
            <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-700 dark:text-amber-400" aria-hidden="true" />
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Cross-Sector Participation Trend
                  </h3>
                </div>
                <span className="text-xs font-medium text-amber-800 dark:text-amber-400">
                  {analytics.demoBenchmarks.label}
                </span>
              </div>

              <div className="grid grid-cols-6 gap-3 items-end h-44 pt-4">
                {analytics.demoBenchmarks.monthlyParticipationTrend.map((pt) => {
                  const total = pt.agritech + pt.civic + pt.msme + pt.skilling + pt.urban;
                  const heightPct = Math.min(100, Math.round((total / 260) * 100));
                  return (
                    <div key={pt.month} className="flex flex-col items-center gap-2 h-full justify-end">
                      <span className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400">
                        {total}
                      </span>
                      <div className="w-full max-w-[44px] rounded-t-md bg-slate-900 dark:bg-amber-600/90 transition-all" style={{ height: `${heightPct}%` }} />
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {pt.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stakeholder Profile, Language & DPDP Act 2023 Privacy Controls */}
      <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Account Role, Regional Settings &amp; DPDP Act 2023 Privacy Controls
          </h3>
        </div>

        {!dbUser ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Sign in to manage your stakeholder role, regional district preferences, and DPDP Act 2023 consent.
            </p>
            <button
              type="button"
              onClick={loginWithGoogle}
              className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-amber-600 text-white text-sm font-medium"
            >
              Sign In with Google
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Signed-in Identity</div>
                <div className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  {dbUser.displayName} ({dbUser.email})
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Active Role: <span className="font-medium text-slate-800 dark:text-slate-200">{ROLE_LABELS[dbUser.role] || dbUser.role}</span>
                </div>
              </div>

              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Active District
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {regions.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.district}, {r.state}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Preferred Language
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as 'en' | 'hi' | 'te')}
                  className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi (हिन्दी)</option>
                  <option value="te">Telugu (తెలుగు)</option>
                </select>
              </label>
            </div>

            {!['super_admin', 'regional_admin', 'dept_officer'].includes(dbUser.role) && (
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Switch Stakeholder Workspace Role (Server-Verified):
                </div>
                <div className="flex flex-wrap gap-2">
                  {['citizen', 'farmer', 'msme_owner', 'student_seeker', 'employer', 'training_institution'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleRoleSwitch(r)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        dbUser.role === r
                          ? 'bg-slate-900 dark:bg-amber-600 text-white border-slate-900 dark:border-amber-600'
                          : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {ROLE_LABELS[r]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-600 dark:text-slate-400">
                DPDP Act 2023 Consent Status:{' '}
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {dbUser.dpdpConsentGiven ? 'Consent Granted' : 'Pending Explicit Consent'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {!dbUser.dpdpConsentGiven && (
                  <button
                    type="button"
                    onClick={handleDpdpConsent}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-medium"
                  >
                    Grant DPDP Privacy Consent
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleAccountErasure}
                  className="px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 text-xs font-medium inline-flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Erase Account Data (DPDP)</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Admin & Officer Console */}
      {isAdminOrOfficer && adminData && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-sky-700 dark:text-sky-400" aria-hidden="true" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Expand Platform to New Indian District / State
              </h3>
            </div>
            <form onSubmit={handleAddRegion} className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <input
                type="text"
                required
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="code (e.g. mp-gwalior)"
                className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
              />
              <input
                type="text"
                required
                value={newDistrict}
                onChange={(e) => setNewDistrict(e.target.value)}
                placeholder="District"
                className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              <input
                type="text"
                required
                value={newState}
                onChange={(e) => setNewState(e.target.value)}
                placeholder="State"
                className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              <input
                type="text"
                required
                value={newStateCode}
                onChange={(e) => setNewStateCode(e.target.value)}
                placeholder="Code (e.g. MP)"
                className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 uppercase"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-sky-600 text-white text-sm font-medium"
              >
                Add District
              </button>
              <input
                type="text"
                required
                value={newDepts}
                onChange={(e) => setNewDepts(e.target.value)}
                placeholder="Regional departments (comma-separated)"
                className="sm:col-span-5 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </form>
          </div>

          <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              RBAC User Directory &amp; Sensitive Action Audit Trail
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="py-2 pr-4 font-medium">User</th>
                    <th className="py-2 pr-4 font-medium">District</th>
                    <th className="py-2 pr-4 font-medium">Role</th>
                    {dbUser?.role === 'super_admin' && <th className="py-2 font-medium">Assign Role</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {adminData.users.map((u) => (
                    <tr key={u.id} className="h-10">
                      <td className="py-2 pr-4 font-medium text-slate-900 dark:text-slate-100">
                        {u.displayName} ({u.email})
                      </td>
                      <td className="py-2 pr-4 text-slate-600 dark:text-slate-400">{u.regionCode}</td>
                      <td className="py-2 pr-4 text-slate-700 dark:text-slate-300">{u.role}</td>
                      {dbUser?.role === 'super_admin' && (
                        <td className="py-2">
                          <select
                            value={u.role}
                            onChange={(e) => handleAssignUserRole(u.id, e.target.value)}
                            className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                          >
                            {Object.keys(ROLE_LABELS).map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {adminData.auditLogs.length > 0 && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Recent Audit Logs
                </div>
                <div className="space-y-1 text-xs font-mono text-slate-600 dark:text-slate-400">
                  {adminData.auditLogs.slice(0, 8).map((log) => (
                    <div key={log.id} className="truncate">
                      {log.action} · {log.actorRole} · {log.resourceType}:{log.resourceId} — {log.details}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
