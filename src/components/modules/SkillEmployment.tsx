import React, { useCallback, useEffect, useState } from 'react';
import { Award, Briefcase, GraduationCap } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface CourseItem {
  id: number;
  title: string;
  provider: string;
  regionCode: string;
  category: string;
  isFree: boolean;
  priceInr: number;
  durationWeeks: number;
  mode: string;
  certificationName: string;
  sourceType: string;
}

interface OpportunityItem {
  id: number;
  title: string;
  organization: string;
  regionCode: string;
  type: string;
  skillsRequired: string[];
  stipendOrSalary: string;
  listingType: string;
  description: string;
}

export const SkillEmployment: React.FC<{ onOpenAi: () => void }> = ({ onOpenAi }) => {
  const { dbUser, selectedRegion, authFetch, loginWithGoogle } = useAuth();
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>([]);
  const [appliedIds, setAppliedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<'all' | 'free'>('all');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Learner Profile & Resume Builder
  const [headline, setHeadline] = useState('Full-Stack Developer & Cloud Trainee');
  const [skillsText, setSkillsText] = useState('TypeScript, React, SQL, Data Analysis');
  const [education, setEducation] = useState('B.Tech CSE — Indore');
  const [experienceSummary, setExperienceSummary] = useState('Built regional civic web dashboards and inventory prototypes.');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [quizAnswer1, setQuizAnswer1] = useState('parameterized');
  const [quizAnswer2, setQuizAnswer2] = useState('rbac');
  const [assessmentScore, setAssessmentScore] = useState(0);

  // Employer / Training Institution Opportunity Form
  const [oppTitle, setOppTitle] = useState('');
  const [oppOrg, setOppOrg] = useState('');
  const [oppType, setOppType] = useState<'Job' | 'Internship' | 'Apprenticeship'>('Internship');
  const [oppSalary, setOppSalary] = useState('₹14,000 / month');
  const [oppSkills, setOppSkills] = useState('React, SQL, Communication');
  const [oppDesc, setOppDesc] = useState('');

  const canPostOpportunities =
    dbUser && ['employer', 'training_institution', 'regional_admin', 'super_admin'].includes(dbUser.role);

  const loadSkills = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/skills/overview?region=${encodeURIComponent(selectedRegion)}`);
      if (res.ok) {
        const data = await res.json();
        setCourses(data.courses || []);
        setOpportunities(data.opportunities || []);
        if (data.learnerProfile) {
          setHeadline(data.learnerProfile.headline);
          setSkillsText((data.learnerProfile.skills || []).join(', '));
          setEducation(data.learnerProfile.education);
          setExperienceSummary(data.learnerProfile.experienceSummary);
          setPortfolioUrl(data.learnerProfile.portfolioUrl || '');
          setAssessmentScore(data.learnerProfile.assessmentScore || 0);
        }
        if (Array.isArray(data.myApplications)) {
          setAppliedIds(data.myApplications.map((a: { opportunityId: number }) => a.opportunityId));
        }
      }
    } finally {
      setLoading(false);
    }
  }, [authFetch, selectedRegion]);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const score = (quizAnswer1 === 'parameterized' ? 50 : 20) + (quizAnswer2 === 'rbac' ? 50 : 20);
    setAssessmentScore(score);
    try {
      const res = await authFetch('/api/skills/profile', {
        method: 'POST',
        body: JSON.stringify({
          regionCode: selectedRegion,
          headline,
          skills: skillsText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          education,
          experienceSummary,
          portfolioUrl,
          assessmentScore: score,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save learner profile.');
      setMessage(`Learner resume profile & skill assessment (${score}/100) saved.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    }
  };

  const handleApply = async (oppId: number) => {
    setError(null);
    try {
      const res = await authFetch(`/api/skills/opportunities/${oppId}/apply`, {
        method: 'POST',
        body: JSON.stringify({
          coverNote: `${headline} — ${education}. Skills: ${skillsText}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Application failed.');
      setAppliedIds((prev) => [...prev, oppId]);
      setMessage('Application submitted to regional opportunity.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Apply failed.');
    }
  };

  const handlePostOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await authFetch('/api/skills/opportunities', {
        method: 'POST',
        body: JSON.stringify({
          title: oppTitle,
          organization: oppOrg,
          regionCode: selectedRegion,
          type: oppType,
          skillsRequired: oppSkills.split(',').map((s) => s.trim()).filter(Boolean),
          stipendOrSalary: oppSalary,
          description: oppDesc,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Posting failed.');
      setOpportunities((prev) => [data.opportunity, ...prev]);
      setOppTitle('');
      setOppDesc('');
      setMessage('Opportunity published.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Post failed.');
    }
  };

  const filteredCourses = filterMode === 'free' ? courses.filter((c) => c.isFree) : courses;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <p className="text-xs font-medium text-indigo-700 dark:text-indigo-400">
            Module 04 · Education, Skill Development &amp; Employment
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
            Regional Skilling Roadmaps, Resume Builder &amp; Verified Listings
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Every course and job listing explicitly discloses its source classification: Verified, External, or Sample.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenAi}
          className="px-4 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white text-sm font-medium whitespace-nowrap shrink-0 transition-colors"
        >
          Ask AI Career Coach
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

      {/* Courses & Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-indigo-700 dark:text-indigo-400" aria-hidden="true" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Course &amp; Certification Discovery
              </h3>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md ${
                  filterMode === 'all'
                    ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('free')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md ${
                  filterMode === 'free'
                    ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Free Only
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-sm text-slate-500">Loading courses...</div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredCourses.map((c) => (
                <div key={c.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-indigo-700 dark:text-indigo-400">{c.sourceType}</span>
                    <span aria-hidden="true">·</span>
                    <span>{c.mode}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{c.durationWeeks} weeks</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums font-medium text-slate-800 dark:text-slate-200">
                      {c.isFree ? 'Free' : `₹${c.priceInr.toLocaleString('en-IN')}`}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {c.title}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    {c.provider} · Certification: {c.certificationName}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-700 dark:text-indigo-400" aria-hidden="true" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Jobs, Internships &amp; Apprenticeships
              </h3>
            </div>
            <span className="text-xs text-slate-500 tabular-nums">{opportunities.length} listings</span>
          </div>

          {loading ? (
            <div className="text-sm text-slate-500">Loading opportunities...</div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {opportunities.map((opp) => {
                const applied = appliedIds.includes(opp.id);
                return (
                  <div key={opp.id} className="py-3 first:pt-0 last:pb-0 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {opp.listingType} Listing
                          </span>{' '}
                          · {opp.type} · <span className="tabular-nums">{opp.stipendOrSalary}</span>
                        </div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {opp.title}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                          {opp.organization} · Skills: {opp.skillsRequired.join(', ')}
                        </div>
                      </div>
                      {dbUser && (
                        <button
                          type="button"
                          disabled={applied}
                          onClick={() => handleApply(opp.id)}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-indigo-600 text-white text-xs font-medium disabled:opacity-50 whitespace-nowrap shrink-0"
                        >
                          {applied ? 'Applied' : 'Apply'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Learner Profile, Resume Builder & Skill Assessment */}
      {!dbUser ? (
        <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Sign in to build your Resume Profile, take the Skill Assessment, and apply to regional listings
            </h3>
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
          <form
            onSubmit={handleSaveProfile}
            className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-700 dark:text-indigo-400" aria-hidden="true" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Resume Builder &amp; Skill Assessment
                </h3>
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400">
                Score: {assessmentScore}/100
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Career Headline
                <input
                  type="text"
                  required
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </label>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Education
                <input
                  type="text"
                  required
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </label>
            </div>

            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Skills (comma-separated)
              <input
                type="text"
                required
                value={skillsText}
                onChange={(e) => setSkillsText(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </label>

            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Portfolio / GitHub URL (HTTPS only, optional)
              <input
                type="url"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                placeholder="https://github.com/your-handle"
                className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </label>

            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Project Portfolio &amp; Experience Summary
              <textarea
                rows={2}
                required
                value={experienceSummary}
                onChange={(e) => setExperienceSummary(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <label className="block text-xs text-slate-600 dark:text-slate-400">
                Q1. Best defense against SQL injection?
                <select
                  value={quizAnswer1}
                  onChange={(e) => setQuizAnswer1(e.target.value)}
                  className="mt-1 w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value="parameterized">Parameterized Queries / ORM Bindings</option>
                  <option value="hide">Hiding form inputs in CSS</option>
                </select>
              </label>
              <label className="block text-xs text-slate-600 dark:text-slate-400">
                Q2. Where must RBAC authorization be enforced?
                <select
                  value={quizAnswer2}
                  onChange={(e) => setQuizAnswer2(e.target.value)}
                  className="mt-1 w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value="rbac">Server-side API middleware</option>
                  <option value="client">Frontend button visibility only</option>
                </select>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-indigo-600 text-white text-sm font-medium"
              >
                Save Profile &amp; Score Assessment
              </button>
              <button
                type="button"
                onClick={() => {
                  const content = [
                    `THE RISE OF NEW INDIA — LEARNER RESUME SUMMARY`,
                    `Name: ${dbUser?.displayName || 'Regional Learner'}`,
                    `Region: ${selectedRegion}`,
                    `Headline: ${headline}`,
                    `Education: ${education}`,
                    `Skills: ${skillsText}`,
                    `Portfolio: ${portfolioUrl || 'Not provided'}`,
                    `Skill Assessment Score: ${assessmentScore}/100`,
                    ``,
                    `Experience & Projects:`,
                    experienceSummary,
                  ].join('\n');
                  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `resume-${selectedRegion.toLowerCase()}.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Download Resume Summary
              </button>
            </div>
          </form>

          {canPostOpportunities ? (
            <form
              onSubmit={handlePostOpportunity}
              className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3"
            >
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Employer / Institution Opportunity Publisher
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  value={oppTitle}
                  onChange={(e) => setOppTitle(e.target.value)}
                  placeholder="Role Title"
                  className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
                <input
                  type="text"
                  required
                  value={oppOrg}
                  onChange={(e) => setOppOrg(e.target.value)}
                  placeholder="Organization Name"
                  className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
                <select
                  value={oppType}
                  onChange={(e) => setOppType(e.target.value as typeof oppType)}
                  className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option>Internship</option>
                  <option>Job</option>
                  <option>Apprenticeship</option>
                </select>
                <input
                  type="text"
                  required
                  value={oppSalary}
                  onChange={(e) => setOppSalary(e.target.value)}
                  placeholder="Stipend / Salary"
                  className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <input
                type="text"
                required
                value={oppSkills}
                onChange={(e) => setOppSkills(e.target.value)}
                placeholder="Required skills (comma-separated)"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              <textarea
                rows={2}
                required
                value={oppDesc}
                onChange={(e) => setOppDesc(e.target.value)}
                placeholder="Role responsibilities and location..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-indigo-600 text-white text-sm font-medium"
              >
                Publish Listing
              </button>
            </form>
          ) : (
            <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Role-Based Opportunity Publishing
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Your current role is <span className="font-semibold">{dbUser.role}</span>. Switch your stakeholder role to Employer or Training Institution in the Governance &amp; Profile panel to publish verified regional internships or jobs.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
