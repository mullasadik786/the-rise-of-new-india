import React, { useCallback, useEffect, useState } from 'react';
import { Download, Trees, Wind } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ResilientImage } from '../ResilientImage';

interface SustainabilityMetric {
  id: number;
  metricKey: string;
  metricLabel: string;
  value: number;
  unit: string;
  targetValue: number;
  weightPercent: number;
  dataSource: string;
  isDemoData: boolean;
}

interface UrbanReport {
  id: number;
  category: string;
  ward: string;
  title: string;
  description: string;
  metricValue: string;
  status: string;
  createdAt: string;
}

export const CleanUrban: React.FC<{ onOpenAi: () => void }> = ({ onOpenAi }) => {
  const { dbUser, selectedRegion, authFetch, loginWithGoogle } = useAuth();
  const [metrics, setMetrics] = useState<SustainabilityMetric[]>([]);
  const [reports, setReports] = useState<UrbanReport[]>([]);
  const [scoreInfo, setScoreInfo] = useState<{ score: number; methodology: string; isDemoData: boolean } | null>(null);
  const [airQuality, setAirQuality] = useState<{
    source: string;
    isLive: boolean;
    location: string;
    current: { pm10: number; pm2_5: number; us_aqi: number };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedFilter, setFeedFilter] = useState('All');

  // Interactive Documented Score Simulator (What-if offsets per metric key)
  const [simBoosts, setSimBoosts] = useState<Record<string, number>>({});

  const [category, setCategory] = useState('Waste Management');
  const [ward, setWard] = useState('Ward 22 — Palasia, Indore');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [metricValue, setMetricValue] = useState('');

  const loadUrban = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, aqRes] = await Promise.all([
        fetch(`/api/urban/overview?region=${encodeURIComponent(selectedRegion)}`),
        fetch(`/api/urban/air-quality?region=${encodeURIComponent(selectedRegion)}`),
      ]);
      if (uRes.ok) {
        const data = await uRes.json();
        setMetrics(data.metrics || []);
        setReports(data.reports || []);
        setScoreInfo(data.documentedScore || null);
        setSimBoosts({});
      }
      if (aqRes.ok) {
        setAirQuality(await aqRes.json());
      }
    } finally {
      setLoading(false);
    }
  }, [selectedRegion]);

  useEffect(() => {
    loadUrban();
  }, [loadUrban]);

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const res = await authFetch('/api/urban/reports', {
        method: 'POST',
        body: JSON.stringify({
          regionCode: selectedRegion,
          category,
          ward,
          title,
          description,
          metricValue,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed.');
      setReports((prev) => [data.report, ...prev]);
      setTitle('');
      setDescription('');
      setMetricValue('');
      setMessage('Urban sustainability action logged.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Report failed.');
    }
  };

  const totalWeight = metrics.reduce((acc, m) => acc + m.weightPercent, 0);
  const simulatedScore =
    totalWeight > 0
      ? Math.round(
          metrics.reduce((acc, m) => {
            const val = m.value + (simBoosts[m.metricKey] || 0);
            const attainment = Math.min(1, Math.max(0, val) / Math.max(1, m.targetValue));
            return acc + attainment * m.weightPercent;
          }, 0) *
            (100 / totalWeight)
        )
      : scoreInfo?.score ?? 0;

  const handleExportUrbanCsv = () => {
    const escapeCsv = (val: string | number) => `"${String(val).replace(/"/g, '""')}"`;
    const rows = [
      ['MetricKey', 'Label', 'CurrentValue', 'TargetValue', 'Unit', 'WeightPercent', 'Source'],
      ...metrics.map((m) => [m.metricKey, m.metricLabel, m.value, m.targetValue, m.unit, m.weightPercent, m.dataSource]),
    ];
    const csv = rows.map((r) => r.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `urban-sustainability-${selectedRegion}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div className="rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-7 p-6 flex flex-col justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-teal-700 dark:text-teal-400">
              Module 05 · Clean Urban Infrastructure &amp; Sustainability
            </p>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
              Air Quality, Circular Waste, Water Reuse &amp; Documented Sustainability Index
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-2xl">
              Regional scores are computed transparently from documented weights and targets — baseline figures are clearly labeled DEMO DATA.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onOpenAi}
              className="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-600 text-white text-sm font-medium whitespace-nowrap shrink-0 transition-colors"
            >
              Ask Urban Sustainability AI
            </button>
            {metrics.length > 0 && (
              <button
                type="button"
                onClick={handleExportUrbanCsv}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>Export Metrics CSV</span>
              </button>
            )}
          </div>
        </div>
        <div className="lg:col-span-5 h-52 lg:h-auto">
          <ResilientImage
            src="/src/assets/images/sector_clean_urban_1795701181347.jpg"
            alt="Clean green Indore avenue with segregated recycling bins and electric public transport"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Documented Weighted Sustainability Score */}
        <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <Trees className="w-4 h-4 text-teal-700 dark:text-teal-400" aria-hidden="true" />
              <span>Weighted Sustainability Index</span>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {scoreInfo?.isDemoData ? 'DEMO DATA' : 'Live'}
            </span>
          </div>

          <div className="flex items-baseline gap-3">
            <div className="text-4xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {scoreInfo ? `${scoreInfo.score} / 100` : '--'}
            </div>
            {scoreInfo && simulatedScore !== scoreInfo.score && (
              <div className="text-sm font-semibold tabular-nums text-teal-700 dark:text-teal-400">
                Simulated: {simulatedScore} / 100
              </div>
            )}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {scoreInfo?.methodology || 'Loading documented scoring formula...'}
          </p>

          {airQuality && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200 inline-flex items-center gap-1.5">
                  <Wind className="w-3.5 h-3.5 text-teal-600" aria-hidden="true" />
                  Ambient Air Quality
                </span>
                <span className="text-slate-500">{airQuality.isLive ? 'Live API' : 'Demo Baseline'}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-slate-500">US AQI</div>
                  <div className="text-base font-bold tabular-nums">{airQuality.current.us_aqi}</div>
                </div>
                <div>
                  <div className="text-slate-500">PM2.5</div>
                  <div className="text-base font-bold tabular-nums">{airQuality.current.pm2_5}</div>
                </div>
                <div>
                  <div className="text-slate-500">PM10</div>
                  <div className="text-base font-bold tabular-nums">{airQuality.current.pm10}</div>
                </div>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{airQuality.source}</div>
            </div>
          )}
        </div>

        {/* Documented Metric Breakdown + Interactive Simulator */}
        <div className="lg:col-span-2 p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Documented Sustainability Metrics &amp; Target Simulator
            </h3>
            {Object.values(simBoosts).some((v) => v !== 0) && (
              <button
                type="button"
                onClick={() => setSimBoosts({})}
                className="text-xs font-medium text-teal-700 dark:text-teal-400 hover:underline"
              >
                Reset Simulation
              </button>
            )}
          </div>
          {loading ? (
            <div className="text-sm text-slate-500">Loading sustainability metrics...</div>
          ) : metrics.length === 0 ? (
            <div className="text-sm text-slate-500">
              No baseline sustainability metrics seeded for this district yet.
            </div>
          ) : (
            <div className="space-y-4">
              {metrics.map((m) => {
                const boost = simBoosts[m.metricKey] || 0;
                const currentSim = Math.min(m.targetValue, Math.max(0, m.value + boost));
                const pct = Math.min(100, Math.round((currentSim / Math.max(1, m.targetValue)) * 100));
                return (
                  <div key={m.id} className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {m.metricLabel}
                      </span>
                      <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {currentSim}{m.unit} / {m.targetValue}{m.unit} · Weight {m.weightPercent}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-teal-700 dark:bg-teal-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs text-slate-500 dark:text-slate-400">{m.dataSource}</span>
                      <label className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span>Simulate gain:</span>
                        <input
                          type="range"
                          min={0}
                          max={Math.max(0, Math.round(m.targetValue - m.value))}
                          value={boost}
                          onChange={(e) =>
                            setSimBoosts((prev) => ({
                              ...prev,
                              [m.metricKey]: Number(e.target.value),
                            }))
                          }
                          className="w-24 accent-teal-700"
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Community Sustainability Report Form + Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          {!dbUser ? (
            <div className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Sign in to report waste hotspots, water leaks, or green plantation drives
                </h3>
              </div>
              <button
                type="button"
                onClick={loginWithGoogle}
                className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-teal-600 text-white text-sm font-medium whitespace-nowrap shrink-0"
              >
                Sign In with Google
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitReport} className="space-y-4">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Log Urban Sustainability Action or Issue
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option>Waste Management</option>
                  <option>Water Conservation</option>
                  <option>Air Quality</option>
                  <option>Public Cleanliness</option>
                  <option>Green Plantation</option>
                  <option>Renewable Energy</option>
                  <option>Smart Transport</option>
                </select>
                <input
                  type="text"
                  required
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                  placeholder="Ward / Locality"
                  className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Community Rainwater Harvesting Pit Installed"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              <textarea
                rows={2}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details and measurable community observation..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={metricValue}
                  onChange={(e) => setMetricValue(e.target.value)}
                  placeholder="Optional metric (e.g., 45 saplings)"
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-teal-600 text-white text-sm font-medium"
                >
                  Submit Report
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Community Participation Feed
            </h3>
            <select
              aria-label="Filter community feed category"
              value={feedFilter}
              onChange={(e) => setFeedFilter(e.target.value)}
              className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="All">All Categories</option>
              <option value="Waste Management">Waste Management</option>
              <option value="Water Conservation">Water Conservation</option>
              <option value="Air Quality">Air Quality</option>
              <option value="Public Cleanliness">Public Cleanliness</option>
              <option value="Green Plantation">Green Plantation</option>
              <option value="Renewable Energy">Renewable Energy</option>
              <option value="Smart Transport">Smart Transport</option>
            </select>
          </div>
          {reports.filter((r) => feedFilter === 'All' || r.category === feedFilter).length === 0 ? (
            <div className="text-sm text-slate-500">
              No community reports logged for this filter yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {reports
                .filter((r) => feedFilter === 'All' || r.category === feedFilter)
                .map((r) => (
                <div key={r.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {r.category} · {r.ward} · {r.status}
                    {r.metricValue ? ` · ${r.metricValue}` : ''}
                  </div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {r.title}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{r.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
