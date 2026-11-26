import React, { useCallback, useEffect, useState } from 'react';
import { CloudSun, Leaf, Sprout, Upload } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface Advisory {
  id: number;
  title: string;
  category: string;
  summary: string;
  sourceName: string;
  isVerifiedSource: boolean;
}

interface CropRecord {
  id: number;
  cropName: string;
  season: string;
  sowingDate: string;
  areaAcres: number;
  expectedYieldQuintals: number;
  expensesInr: number;
  revenueInr: number;
  notes: string;
}

interface WeatherData {
  source: string;
  isLive: boolean;
  location: string;
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    precipitation: number;
    wind_speed_10m: number;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
  };
}

export const SmartAgriTech: React.FC<{ onOpenAi: () => void }> = ({ onOpenAi }) => {
  const { dbUser, selectedRegion, language, authFetch, loginWithGoogle } = useAuth();
  const [advisories, setAdvisories] = useState<Advisory[]>([]);
  const [crops, setCrops] = useState<CropRecord[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Farmer Profile Form
  const [village, setVillage] = useState('Depalpur Tehsil, Indore');
  const [landArea, setLandArea] = useState('4.5');
  const [soilType, setSoilType] = useState('Black Cotton (Vertisol)');
  const [irrigation, setIrrigation] = useState('Drip');
  const [soilN, setSoilN] = useState('235');
  const [soilP, setSoilP] = useState('19');
  const [soilK, setSoilK] = useState('315');
  const [soilPh, setSoilPh] = useState('7.3');

  // Crop Expense & Profit Logger
  const [cropName, setCropName] = useState('Sharbati Wheat');
  const [season, setSeason] = useState<'Kharif' | 'Rabi' | 'Zaid'>('Rabi');
  const [sowingDate, setSowingDate] = useState('2026-11-12');
  const [cropArea, setCropArea] = useState('2.5');
  const [expectedYield, setExpectedYield] = useState('48');
  const [expensesInr, setExpensesInr] = useState('38000');
  const [revenueInr, setRevenueInr] = useState('115000');

  // Disease Image Analysis
  const [leafCrop, setLeafCrop] = useState('Soybean');
  const [leafImageBase64, setLeafImageBase64] = useState('');
  const [leafMime, setLeafMime] = useState<'image/jpeg' | 'image/png' | 'image/webp'>('image/jpeg');
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [diseaseResult, setDiseaseResult] = useState<{
    observedSymptoms: string;
    likelyCondition: string;
    confidenceLevel: string;
    organicAndIpmSteps: string[];
    safetyWarning: string;
    disclaimer: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, weatherRes] = await Promise.all([
        authFetch(`/api/agritech/overview?region=${encodeURIComponent(selectedRegion)}`),
        fetch(`/api/agritech/weather?region=${encodeURIComponent(selectedRegion)}`),
      ]);
      if (overviewRes.ok) {
        const data = await overviewRes.json();
        setAdvisories(data.advisories || []);
        setCrops(data.cropRecords || []);
        if (data.farmerProfile) {
          setVillage(data.farmerProfile.villageOrTehsil);
          setLandArea(String(data.farmerProfile.landAreaAcres));
          setSoilType(data.farmerProfile.soilType);
          setIrrigation(data.farmerProfile.irrigationMethod);
          setSoilN(String(data.farmerProfile.soilN));
          setSoilP(String(data.farmerProfile.soilP));
          setSoilK(String(data.farmerProfile.soilK));
          setSoilPh(String(data.farmerProfile.soilPh));
        }
      }
      if (weatherRes.ok) {
        setWeather(await weatherRes.json());
      }
    } finally {
      setLoading(false);
    }
  }, [authFetch, selectedRegion]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const res = await authFetch('/api/agritech/profile', {
        method: 'POST',
        body: JSON.stringify({
          regionCode: selectedRegion,
          villageOrTehsil: village,
          landAreaAcres: Number(landArea),
          soilType,
          irrigationMethod: irrigation,
          primaryCrops: [cropName],
          soilN: Number(soilN),
          soilP: Number(soilP),
          soilK: Number(soilK),
          soilPh: Number(soilPh),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save farmer profile.');
      setStatusMessage('Farmer soil and irrigation profile saved to PostgreSQL.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Save failed.');
    }
  };

  const handleAddCrop = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const res = await authFetch('/api/agritech/crops', {
        method: 'POST',
        body: JSON.stringify({
          regionCode: selectedRegion,
          cropName,
          season,
          sowingDate,
          areaAcres: Number(cropArea),
          expectedYieldQuintals: Number(expectedYield),
          expensesInr: Number(expensesInr),
          revenueInr: Number(revenueInr),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not record crop cycle.');
      setCrops((prev) => [data.cropRecord, ...prev]);
      setStatusMessage('Crop expense and expected profit record saved.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Crop logging failed.');
    }
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrorMessage('Only JPEG, PNG, or WebP leaf photos are supported.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setErrorMessage('Image must be smaller than 4 MB.');
      return;
    }
    setLeafMime(file.type as 'image/jpeg' | 'image/png' | 'image/webp');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLeafImageBase64(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzeDisease = async () => {
    if (!leafImageBase64) return;
    setAnalyzingImage(true);
    setErrorMessage(null);
    try {
      const res = await authFetch('/api/agritech/disease-check', {
        method: 'POST',
        body: JSON.stringify({
          imageBase64: leafImageBase64,
          mimeType: leafMime,
          cropName: leafCrop,
          regionName: selectedRegion,
          language,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Image analysis failed.');
      setDiseaseResult(data.analysis);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Analysis failed.');
    } finally {
      setAnalyzingImage(false);
    }
  };

  const projectedNetProfit = Number(revenueInr || 0) - Number(expensesInr || 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
            Module 01 · Smart AgriTech Intelligence
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
            Soil Health, Crop Economics &amp; AI Disease Screening
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Verified meteorological data and KVK reference guidance are clearly separated from AI-generated crop recommendations.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenAi}
          className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium whitespace-nowrap shrink-0 transition-colors"
        >
          Ask AgriTech AI
        </button>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-sm text-emerald-900 dark:text-emerald-200">
          {statusMessage}
        </div>
      )}
      {errorMessage && (
        <div className="p-3.5 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-sm text-red-800 dark:text-red-300">
          {errorMessage}
        </div>
      )}

      {/* Weather + Advisories Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <CloudSun className="w-4 h-4 text-amber-600" aria-hidden="true" />
              <span>Regional Weather Feed</span>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {weather?.isLive ? 'Live API' : 'Fallback Baseline'}
            </span>
          </div>
          {weather ? (
            <>
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Temperature</div>
                  <div className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                    {weather.current.temperature_2m}°C
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Humidity</div>
                  <div className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                    {weather.current.relative_humidity_2m}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Precipitation</div>
                  <div className="text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {weather.current.precipitation} mm
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Wind Speed</div>
                  <div className="text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {weather.current.wind_speed_10m} km/h
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-3">
                Source: {weather.source} · {weather.location}
              </p>
            </>
          ) : (
            <div className="text-sm text-slate-500">Loading weather telemetry...</div>
          )}
        </div>

        <div className="lg:col-span-2 p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Regional Advisories, Schemes &amp; Mandi Checklists
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {advisories.length} items
            </span>
          </div>
          {loading ? (
            <div className="text-sm text-slate-500">Loading regional advisories...</div>
          ) : advisories.length === 0 ? (
            <div className="text-sm text-slate-500">No advisories configured for this district yet.</div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {advisories.map((item) => (
                <div key={item.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-slate-700 dark:text-slate-300 uppercase">
                      {item.category}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{item.sourceName}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.isVerifiedSource ? 'Public Portal Reference' : 'Demo Reference'}</span>
                  </div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {item.title}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.summary}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Interactive Farmer Forms (Authenticated) */}
      {!dbUser ? (
        <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Sign in to save your Farm Soil Profile, Crop Profit Ledger, and run AI Leaf Screening
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Your agricultural records are protected under your authenticated profile.
            </p>
          </div>
          <button
            type="button"
            onClick={loginWithGoogle}
            className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-amber-600 text-white text-sm font-medium whitespace-nowrap shrink-0"
          >
            Sign In with Google
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Soil Health & Profile */}
          <form
            onSubmit={handleSaveProfile}
            className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <div className="flex items-center gap-2">
              <Sprout className="w-4 h-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Farmer &amp; Soil Health Card
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Village / Tehsil
                <input
                  type="text"
                  required
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </label>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Land Area (Acres)
                <input
                  type="number"
                  step="0.1"
                  required
                  value={landArea}
                  onChange={(e) => setLandArea(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 tabular-nums"
                />
              </label>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Soil Type
                <select
                  value={soilType}
                  onChange={(e) => setSoilType(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                >
                  <option>Black Cotton (Vertisol)</option>
                  <option>Alluvial</option>
                  <option>Red Loam</option>
                  <option>Medium Clay Loam</option>
                </select>
              </label>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Irrigation Method
                <select
                  value={irrigation}
                  onChange={(e) => setIrrigation(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                >
                  <option>Drip</option>
                  <option>Sprinkler</option>
                  <option>Canal</option>
                  <option>Rainfed</option>
                </select>
              </label>
            </div>

            <div className="grid grid-cols-4 gap-2.5 pt-1">
              {[
                { label: 'N (kg/ha)', val: soilN, set: setSoilN },
                { label: 'P (kg/ha)', val: soilP, set: setSoilP },
                { label: 'K (kg/ha)', val: soilK, set: setSoilK },
                { label: 'Soil pH', val: soilPh, set: setSoilPh },
              ].map((field) => (
                <label key={field.label} className="block text-xs text-slate-600 dark:text-slate-400">
                  {field.label}
                  <input
                    type="number"
                    step="0.1"
                    value={field.val}
                    onChange={(e) => field.set(e.target.value)}
                    className="mt-1 w-full px-2.5 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 tabular-nums"
                  />
                </label>
              ))}
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white text-sm font-medium hover:bg-slate-800 dark:hover:bg-emerald-500 transition-colors"
            >
              Save Farm Profile
            </button>
          </form>

          {/* AI Crop Disease Photo Analyzer */}
          <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Leaf className="w-4 h-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  AI Crop Disease Photo Screening
                </h3>
              </div>
              <span className="text-xs text-amber-700 dark:text-amber-400">AI Screening Tool</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Crop Name
                <input
                  type="text"
                  value={leafCrop}
                  onChange={(e) => setLeafCrop(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </label>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Upload Leaf Photo (JPEG/PNG/WebP)
                <div className="mt-1 flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">
                    <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{leafImageBase64 ? 'Photo Selected' : 'Choose Image'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageFile}
                      className="sr-only"
                    />
                  </label>
                </div>
              </label>
            </div>

            <button
              type="button"
              disabled={!leafImageBase64 || analyzingImage}
              onClick={handleAnalyzeDisease}
              className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {analyzingImage ? 'Analyzing Leaf Image...' : 'Run AI Screening'}
            </button>

            {diseaseResult && (
              <div className="p-4 rounded-lg bg-stone-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  Condition: {diseaseResult.likelyCondition} · Confidence: {diseaseResult.confidenceLevel}
                </div>
                <p className="text-slate-600 dark:text-slate-300">{diseaseResult.observedSymptoms}</p>
                <ul className="list-disc pl-4 space-y-1 text-slate-700 dark:text-slate-300">
                  {diseaseResult.organicAndIpmSteps.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
                <p className="text-amber-800 dark:text-amber-400 font-medium pt-1">
                  {diseaseResult.disclaimer}
                </p>
              </div>
            )}
          </div>

          {/* Crop Expense & Profit Calculator + History */}
          <form
            onSubmit={handleAddCrop}
            className="lg:col-span-2 p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Crop Expense &amp; Profit Ledger
              </h3>
              <div className="text-sm font-mono tabular-nums text-slate-700 dark:text-slate-300">
                Projected Net Margin:{' '}
                <span className={projectedNetProfit >= 0 ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-red-600 font-semibold'}>
                  ₹{projectedNetProfit.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
              <label className="block text-xs text-slate-600 dark:text-slate-400 col-span-2 sm:col-span-1">
                Crop
                <input
                  type="text"
                  required
                  value={cropName}
                  onChange={(e) => setCropName(e.target.value)}
                  className="mt-1 w-full px-2.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </label>
              <label className="block text-xs text-slate-600 dark:text-slate-400">
                Season
                <select
                  value={season}
                  onChange={(e) => setSeason(e.target.value as 'Kharif' | 'Rabi' | 'Zaid')}
                  className="mt-1 w-full px-2.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                >
                  <option>Rabi</option>
                  <option>Kharif</option>
                  <option>Zaid</option>
                </select>
              </label>
              <label className="block text-xs text-slate-600 dark:text-slate-400">
                Sowing Date
                <input
                  type="date"
                  required
                  value={sowingDate}
                  onChange={(e) => setSowingDate(e.target.value)}
                  className="mt-1 w-full px-2.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 tabular-nums"
                />
              </label>
              <label className="block text-xs text-slate-600 dark:text-slate-400">
                Acres
                <input
                  type="number"
                  step="0.1"
                  required
                  value={cropArea}
                  onChange={(e) => setCropArea(e.target.value)}
                  className="mt-1 w-full px-2.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 tabular-nums"
                />
              </label>
              <label className="block text-xs text-slate-600 dark:text-slate-400">
                Yield (Qtl)
                <input
                  type="number"
                  step="0.5"
                  required
                  value={expectedYield}
                  onChange={(e) => setExpectedYield(e.target.value)}
                  className="mt-1 w-full px-2.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 tabular-nums"
                />
              </label>
              <label className="block text-xs text-slate-600 dark:text-slate-400">
                Expenses (₹)
                <input
                  type="number"
                  required
                  value={expensesInr}
                  onChange={(e) => setExpensesInr(e.target.value)}
                  className="mt-1 w-full px-2.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 tabular-nums"
                />
              </label>
              <label className="block text-xs text-slate-600 dark:text-slate-400">
                Revenue (₹)
                <input
                  type="number"
                  required
                  value={revenueInr}
                  onChange={(e) => setRevenueInr(e.target.value)}
                  className="mt-1 w-full px-2.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 tabular-nums"
                />
              </label>
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-amber-600 text-white text-sm font-medium hover:bg-slate-800 dark:hover:bg-amber-500 transition-colors"
            >
              Log Crop Cycle
            </button>

            {crops.length > 0 && (
              <div className="overflow-x-auto pt-3 border-t border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                      <th className="py-2 pr-4 font-medium">Crop</th>
                      <th className="py-2 pr-4 font-medium">Season</th>
                      <th className="py-2 pr-4 font-medium text-right">Acres</th>
                      <th className="py-2 pr-4 font-medium text-right">Expenses</th>
                      <th className="py-2 pr-4 font-medium text-right">Revenue</th>
                      <th className="py-2 font-medium text-right">Net Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {crops.map((c) => {
                      const net = c.revenueInr - c.expensesInr;
                      return (
                        <tr key={c.id} className="h-10">
                          <td className="py-2 pr-4 font-medium text-slate-900 dark:text-slate-100">{c.cropName}</td>
                          <td className="py-2 pr-4 text-slate-600 dark:text-slate-400">{c.season}</td>
                          <td className="py-2 pr-4 text-right tabular-nums">{c.areaAcres}</td>
                          <td className="py-2 pr-4 text-right tabular-nums">₹{c.expensesInr.toLocaleString('en-IN')}</td>
                          <td className="py-2 pr-4 text-right tabular-nums">₹{c.revenueInr.toLocaleString('en-IN')}</td>
                          <td className={`py-2 text-right tabular-nums font-medium ${net >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'}`}>
                            ₹{net.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
};
