import React, { useCallback, useEffect, useState } from 'react';
import { Building2, CheckCircle2, Search, Upload } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface PublicComplaint {
  id: number;
  trackingId: string;
  regionCode: string;
  category: string;
  title: string;
  description: string;
  locationWard: string;
  status: string;
  assignedDepartment: string;
  resolutionNotes: string;
  satisfactionRating: number | null;
  feedbackText: string;
  createdAt: string;
  isMine: boolean;
}

const WORKFLOW_STAGES = [
  'Submitted',
  'Verified',
  'Assigned',
  'In Progress',
  'Resolved',
  'Citizen Feedback',
] as const;

export const SmartCivicGovernance: React.FC<{ onOpenAi: () => void }> = ({ onOpenAi }) => {
  const { dbUser, selectedRegion, authFetch, loginWithGoogle } = useAuth();
  const [complaints, setComplaints] = useState<PublicComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Complaint Form
  const [category, setCategory] = useState('Waste & Sanitation');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationWard, setLocationWard] = useState('Ward 47 — Vijay Nagar, Indore');
  const [coordinates, setCoordinates] = useState('22.7533, 75.8937');
  const [photoDataUrl, setPhotoDataUrl] = useState('');

  // Tracking Lookup
  const [trackQuery, setTrackQuery] = useState('');
  const [trackedDetail, setTrackedDetail] = useState<{
    complaint: PublicComplaint;
    timeline: Array<{ id: number; status: string; note: string; updatedByRole: string; createdAt: string }>;
  } | null>(null);

  // Feedback Modal State
  const [feedbackTargetId, setFeedbackTargetId] = useState<number | null>(null);
  const [rating, setRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');

  const isOfficerOrAdmin =
    dbUser && ['super_admin', 'regional_admin', 'dept_officer'].includes(dbUser.role);

  const loadComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/civic/complaints?region=${encodeURIComponent(selectedRegion)}`);
      if (res.ok) {
        const data = await res.json();
        setComplaints(data.complaints || []);
      }
    } finally {
      setLoading(false);
    }
  }, [authFetch, selectedRegion]);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 1_200_000) {
      setError('Attachment must be JPEG/PNG/WebP under 1.2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setPhotoDataUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const res = await authFetch('/api/civic/complaints', {
        method: 'POST',
        body: JSON.stringify({
          regionCode: selectedRegion,
          category,
          title,
          description,
          locationWard,
          coordinates,
          photoDataUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not submit civic complaint.');
      setComplaints((prev) => [data.complaint, ...prev]);
      setTitle('');
      setDescription('');
      setPhotoDataUrl('');
      setMessage(`Complaint submitted. Tracking ID: ${data.complaint.trackingId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission error.');
    }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackQuery.trim()) return;
    setError(null);
    try {
      const res = await fetch(`/api/civic/complaints/${encodeURIComponent(trackQuery.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Tracking ID not found.');
      setTrackedDetail(data);
    } catch (err) {
      setTrackedDetail(null);
      setError(err instanceof Error ? err.message : 'Tracking lookup failed.');
    }
  };

  const handleAdvanceStatus = async (complaint: PublicComplaint) => {
    const idx = WORKFLOW_STAGES.indexOf(complaint.status as (typeof WORKFLOW_STAGES)[number]);
    const nextStage = WORKFLOW_STAGES[idx + 1];
    if (!nextStage || nextStage === 'Citizen Feedback') return;

    setError(null);
    try {
      const res = await authFetch(`/api/civic/complaints/${complaint.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: nextStage,
          assignedDepartment:
            nextStage === 'Assigned'
              ? `${complaint.category} Nodal Department`
              : complaint.assignedDepartment,
          note: `Stage advanced to ${nextStage} by regional officer.`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Status update failed.');
      await loadComplaints();
      setMessage(`Complaint ${complaint.trackingId} updated to ${nextStage}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to advance workflow.');
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackTargetId) return;
    setError(null);
    try {
      const res = await authFetch(`/api/civic/complaints/${feedbackTargetId}/feedback`, {
        method: 'POST',
        body: JSON.stringify({ satisfactionRating: rating, feedbackText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Feedback submission failed.');
      setFeedbackTargetId(null);
      setFeedbackText('');
      await loadComplaints();
      setMessage('Citizen satisfaction feedback recorded.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Feedback failed.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <p className="text-xs font-medium text-sky-700 dark:text-sky-400">
            Module 02 · Smart Civic Governance
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
            Transparent Civic Grievance Redressal &amp; Public Tracking
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Workflow: Submitted → Verified → Assigned → In Progress → Resolved → Citizen Feedback. Private citizen identities are never displayed publicly.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenAi}
          className="px-4 py-2 rounded-lg bg-sky-700 hover:bg-sky-600 text-white text-sm font-medium whitespace-nowrap shrink-0 transition-colors"
        >
          Ask Civic Services AI
        </button>
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

      {/* Tracking Lookup + File Complaint */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-sky-700 dark:text-sky-400" aria-hidden="true" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Track by Unique Complaint ID
            </h3>
          </div>
          <form onSubmit={handleTrack} className="flex gap-2">
            <input
              type="text"
              value={trackQuery}
              onChange={(e) => setTrackQuery(e.target.value)}
              placeholder="IND-CIV-2026-XXXXX"
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-sky-600 text-white text-sm font-medium whitespace-nowrap shrink-0"
            >
              Track
            </button>
          </form>

          {trackedDetail && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {trackedDetail.complaint.title}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {trackedDetail.complaint.trackingId} · {trackedDetail.complaint.locationWard} ·{' '}
                {trackedDetail.complaint.assignedDepartment}
              </div>
              <div className="space-y-2 pt-1">
                {trackedDetail.timeline.map((step) => (
                  <div key={step.id} className="flex items-start gap-2 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {step.status}
                      </span>{' '}
                      <span className="text-slate-600 dark:text-slate-400">— {step.note}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-3 p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          {!dbUser ? (
            <div className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Sign in to submit a civic issue with photo &amp; ward geolocation
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Only verified users can file issues; citizen names and emails remain hidden from public views.
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
            <form onSubmit={handleSubmitComplaint} className="space-y-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-sky-700 dark:text-sky-400" aria-hidden="true" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Submit New Civic Complaint
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Category
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  >
                    <option>Waste &amp; Sanitation</option>
                    <option>Water Supply</option>
                    <option>Roads &amp; Drainage</option>
                    <option>Street Lighting</option>
                    <option>Public Health</option>
                    <option>Smart Transport</option>
                  </select>
                </label>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Ward / Locality
                  <input
                    type="text"
                    required
                    value={locationWard}
                    onChange={(e) => setLocationWard(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </label>
              </div>

              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Issue Title
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Broken stormwater grate near Vijay Nagar Square"
                  className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </label>

              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Description
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe exact landmark and civic impact..."
                  className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </label>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">
                    <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{photoDataUrl ? 'Photo Attached' : 'Attach Photo'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoUpload}
                      className="sr-only"
                    />
                  </label>
                  <input
                    type="text"
                    aria-label="Coordinates"
                    value={coordinates}
                    onChange={(e) => setCoordinates(e.target.value)}
                    className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-mono w-40"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-sky-600 text-white text-sm font-medium hover:bg-slate-800 dark:hover:bg-sky-500 transition-colors"
                >
                  Submit Complaint
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Public Sanitized Complaint Registry */}
      <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Regional Civic Issue Ledger (Public Privacy-Protected View)
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {complaints.length} records
          </span>
        </div>

        {loading ? (
          <div className="text-sm text-slate-500">Loading civic records...</div>
        ) : complaints.length === 0 ? (
          <div className="text-sm text-slate-500 py-4">
            No civic complaints filed in this district yet. Submit the first complaint above to test end-to-end tracking.
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {complaints.map((c) => (
              <div key={c.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {c.trackingId}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{c.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>{c.locationWard}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-medium text-sky-700 dark:text-sky-400">{c.status}</span>
                  </div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {c.title}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {c.description} · Assigned: {c.assignedDepartment}
                  </p>
                  {c.satisfactionRating && (
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">
                      Citizen Rating: {c.satisfactionRating}/5 — {c.feedbackText}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isOfficerOrAdmin &&
                    c.status !== 'Resolved' &&
                    c.status !== 'Citizen Feedback' && (
                      <button
                        type="button"
                        onClick={() => handleAdvanceStatus(c)}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
                      >
                        Advance Stage
                      </button>
                    )}
                  {c.isMine && c.status === 'Resolved' && (
                    <button
                      type="button"
                      onClick={() => setFeedbackTargetId(c.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-medium whitespace-nowrap"
                    >
                      Rate Resolution
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {feedbackTargetId && (
          <form
            onSubmit={handleSubmitFeedback}
            className="p-4 rounded-lg bg-stone-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3"
          >
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Submit Citizen Satisfaction Rating
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Rating (1–5)
                <select
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="ml-2 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n} / 5
                    </option>
                  ))}
                </select>
              </label>
              <input
                type="text"
                required
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Share resolution quality feedback..."
                className="flex-1 min-w-[200px] px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-medium"
              >
                Save Feedback
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
