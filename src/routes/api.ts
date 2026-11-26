import { Router, Response } from 'express';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { db } from '../db/index.ts';
import {
  agritechAdvisories,
  auditLogs,
  civicComplaints,
  complaintTimeline,
  contactInquiries,
  courses,
  cropRecords,
  farmerProfiles,
  learnerProfiles,
  msmeBusinesses,
  msmeExpenses,
  msmeInvoices,
  msmeProducts,
  opportunities,
  opportunityApplications,
  regions,
  sustainabilityMetrics,
  urbanReports,
  users,
} from '../db/schema.ts';
import { ensureSeedData } from '../db/seed.ts';
import {
  recordAuditLog,
  SELF_ASSIGNABLE_ROLES,
  UserRole,
  VALID_ROLES,
} from '../db/users.ts';
import {
  analyzeCropImageWithGemini,
  generateMsmeContentWithGemini,
  generateRegionalAssistantReply,
} from '../lib/gemini.ts';
import { AuthRequest, optionalAuth, requireAuth, requireRole } from '../middleware/auth.ts';

export const apiRouter = Router();

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests. Please wait a minute before trying again.' },
});

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many write requests. Please slow down.' },
});

// Ensure regional seed data exists on first API call (lazy, never at startup)
apiRouter.use(async (_req, _res, next) => {
  await ensureSeedData();
  next();
});

function handleRouteError(res: Response, error: unknown, fallbackMessage: string) {
  console.error(fallbackMessage, error);
  const message =
    error instanceof z.ZodError
      ? error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
      : error instanceof Error && error.message.includes('AI safety')
        ? error.message
        : fallbackMessage;
  const status = error instanceof z.ZodError ? 400 : 500;
  return res.status(status).json({ error: message });
}

// ============================================================================
// 0. HEALTH & OPENAPI DOCUMENTATION
// ============================================================================
apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'the-rise-of-new-india', timestamp: new Date().toISOString() });
});

apiRouter.get('/openapi.json', (_req, res) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'The Rise of New India API',
      version: '1.0.0',
      description:
        'REST API for regional growth, smart civic governance, AgriTech, MSME digitization, skilling, and clean urban infrastructure starting with Indore & Madhya Pradesh.',
    },
    paths: {
      '/api/regions': { get: { summary: 'List active Indian districts and states' }, post: { summary: 'Add new Indian district/state (Admin only)' } },
      '/api/auth/me': { get: { summary: 'Get authenticated user profile and RBAC role' }, patch: { summary: 'Update profile, language, or stakeholder role' }, delete: { summary: 'DPDP Act 2023 account deletion/anonymization' } },
      '/api/agritech/overview': { get: { summary: 'Get AgriTech advisories, farmer profile, and crop records' } },
      '/api/agritech/weather': { get: { summary: 'Fetch verified weather forecast for district' } },
      '/api/agritech/disease-check': { post: { summary: 'AI visual crop leaf analysis (Gemini)' } },
      '/api/civic/complaints': { get: { summary: 'Public sanitized civic complaints (no PII)' }, post: { summary: 'Submit civic complaint with unique tracking ID' } },
      '/api/civic/complaints/{id}/status': { patch: { summary: 'Advance civic complaint workflow stage (Officer/Admin only)' } },
      '/api/msme/overview': { get: { summary: 'Get MSME storefronts, products, invoices, and expenses' } },
      '/api/skills/overview': { get: { summary: 'Get courses, opportunities, and learner profile' } },
      '/api/urban/overview': { get: { summary: 'Get sustainability score, documented metrics, and urban reports' } },
      '/api/analytics/overview': { get: { summary: 'Unified regional impact analytics and CSV export' } },
      '/api/ai/assistant': { post: { summary: 'Multilingual AI Regional Assistant (English/Hindi/Telugu)' } },
    },
  });
});

// ============================================================================
// 1. REGIONS (INDIA-FIRST EXPANSION ARCHITECTURE)
// ============================================================================
apiRouter.get('/regions', async (_req, res) => {
  try {
    const rows = await db.select().from(regions).orderBy(regions.id);
    res.json({ regions: rows });
  } catch (error) {
    handleRouteError(res, error, 'Failed to load regions.');
  }
});

const createRegionSchema = z.object({
  code: z.string().regex(/^[a-z]{2}-[a-z0-9-]+$/).min(4).max(40),
  district: z.string().min(2).max(80),
  state: z.string().min(2).max(80),
  stateCode: z.string().min(2).max(4).toUpperCase(),
  languages: z.array(z.enum(['en', 'hi', 'te'])).min(1),
  departments: z.array(z.string().min(2).max(120)).min(1),
});

apiRouter.post(
  '/regions',
  writeLimiter,
  requireAuth,
  requireRole('super_admin', 'regional_admin'),
  async (req: AuthRequest, res) => {
    try {
      const data = createRegionSchema.parse(req.body);
      const [inserted] = await db.insert(regions).values(data).returning();
      await recordAuditLog({
        actorUserId: req.dbUser!.id,
        actorRole: req.dbUser!.role,
        action: 'CREATE_REGION',
        resourceType: 'region',
        resourceId: inserted.code,
        details: `Added district ${inserted.district}, ${inserted.state}`,
      });
      res.status(201).json({ region: inserted });
    } catch (error) {
      handleRouteError(res, error, 'Failed to create region.');
    }
  }
);

// ============================================================================
// 2. AUTH, RBAC & DPDP ACT 2023 PRIVACY WORKFLOWS
// ============================================================================
apiRouter.get('/auth/me', requireAuth, async (req: AuthRequest, res) => {
  res.json({ user: req.dbUser });
});

const updateProfileSchema = z.object({
  displayName: z.string().min(2).max(80).optional(),
  regionCode: z.string().min(3).max(40).optional(),
  preferredLanguage: z.enum(['en', 'hi', 'te']).optional(),
  role: z.enum(SELF_ASSIGNABLE_ROLES as unknown as [string, ...string[]]).optional(),
  dpdpConsentGiven: z.boolean().optional(),
});

apiRouter.patch('/auth/me', writeLimiter, requireAuth, async (req: AuthRequest, res) => {
  try {
    const data = updateProfileSchema.parse(req.body);
    const current = req.dbUser!;

    // Privileged roles cannot be self-demoted accidentally unless desired, and cannot self-escalate to admin/officer
    const nextRole =
      data.role && !['super_admin', 'regional_admin', 'dept_officer'].includes(current.role)
        ? data.role
        : current.role;

    const [updated] = await db
      .update(users)
      .set({
        displayName: data.displayName ?? current.displayName,
        regionCode: data.regionCode ?? current.regionCode,
        preferredLanguage: data.preferredLanguage ?? current.preferredLanguage,
        role: nextRole,
        dpdpConsentGiven: data.dpdpConsentGiven ?? current.dpdpConsentGiven,
        dpdpConsentAt:
          data.dpdpConsentGiven && !current.dpdpConsentGiven
            ? new Date()
            : current.dpdpConsentAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, current.id))
      .returning();

    await recordAuditLog({
      actorUserId: current.id,
      actorRole: updated.role,
      action: 'UPDATE_PROFILE',
      resourceType: 'user',
      resourceId: String(current.id),
      details: `Updated profile settings (region=${updated.regionCode}, lang=${updated.preferredLanguage}, role=${updated.role})`,
    });

    res.json({ user: updated });
  } catch (error) {
    handleRouteError(res, error, 'Failed to update profile.');
  }
});

apiRouter.delete('/auth/me', writeLimiter, requireAuth, async (req: AuthRequest, res) => {
  try {
    const current = req.dbUser!;
    await db
      .update(users)
      .set({
        displayName: 'Deleted Citizen',
        email: `deleted-${current.id}@erased.local`,
        isDeleted: true,
        dpdpConsentGiven: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, current.id));

    await recordAuditLog({
      actorUserId: current.id,
      actorRole: current.role,
      action: 'DPDP_ACCOUNT_ERASURE',
      resourceType: 'user',
      resourceId: String(current.id),
      details: 'User exercised DPDP Act 2023 right to erasure.',
    });

    res.json({ deleted: true, message: 'Personal data erased per DPDP Act 2023 workflow.' });
  } catch (error) {
    handleRouteError(res, error, 'Failed to process account deletion.');
  }
});

// ============================================================================
// 3. MODULE A: SMART AGRITECH
// ============================================================================
const REGION_COORDS: Record<string, { lat: number; lon: number; label: string }> = {
  'mp-indore': { lat: 22.7196, lon: 75.8577, label: 'Indore, Madhya Pradesh' },
  'mp-bhopal': { lat: 23.2599, lon: 77.4126, label: 'Bhopal, Madhya Pradesh' },
  'mp-ujjain': { lat: 23.1765, lon: 75.7885, label: 'Ujjain, Madhya Pradesh' },
  'mh-pune': { lat: 18.5204, lon: 73.8567, label: 'Pune, Maharashtra' },
  'tg-hyderabad': { lat: 17.385, lon: 78.4867, label: 'Hyderabad, Telangana' },
};

apiRouter.get('/agritech/overview', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const regionCode = typeof req.query.region === 'string' ? req.query.region : 'mp-indore';
    const advisories = await db
      .select()
      .from(agritechAdvisories)
      .where(eq(agritechAdvisories.regionCode, regionCode))
      .orderBy(desc(agritechAdvisories.publishedAt));

    let profile = null;
    let crops: Array<typeof cropRecords.$inferSelect> = [];
    if (req.dbUser) {
      const profiles = await db
        .select()
        .from(farmerProfiles)
        .where(eq(farmerProfiles.userId, req.dbUser.id))
        .limit(1);
      profile = profiles[0] ?? null;

      crops = await db
        .select()
        .from(cropRecords)
        .where(eq(cropRecords.userId, req.dbUser.id))
        .orderBy(desc(cropRecords.createdAt));
    }

    res.json({ advisories, farmerProfile: profile, cropRecords: crops });
  } catch (error) {
    handleRouteError(res, error, 'Failed to load AgriTech overview.');
  }
});

apiRouter.get('/agritech/weather', async (req, res) => {
  const regionCode = typeof req.query.region === 'string' ? req.query.region : 'mp-indore';
  const coords = REGION_COORDS[regionCode] || REGION_COORDS['mp-indore'];
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Asia%2FKolkata&forecast_days=3`;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) {
      throw new Error(`Open-Meteo HTTP ${response.status}`);
    }
    const data = await response.json();
    res.json({
      source: 'Open-Meteo Public Meteorological API (Live)',
      isLive: true,
      location: coords.label,
      current: data.current,
      daily: data.daily,
    });
  } catch {
    res.json({
      source: 'Regional Fallback Baseline (Open-Meteo unreachable)',
      isLive: false,
      location: coords.label,
      current: {
        temperature_2m: 27.4,
        relative_humidity_2m: 48,
        precipitation: 0,
        wind_speed_10m: 9.2,
      },
      daily: {
        time: ['Today', 'Tomorrow', 'Day 3'],
        temperature_2m_max: [29, 30, 28],
        temperature_2m_min: [15, 16, 15],
        precipitation_sum: [0, 0, 1.2],
      },
    });
  }
});

const farmerProfileSchema = z.object({
  regionCode: z.string().min(3).max(40),
  villageOrTehsil: z.string().min(2).max(120),
  landAreaAcres: z.number().positive().max(5000),
  soilType: z.string().min(2).max(60),
  irrigationMethod: z.string().min(2).max(60),
  primaryCrops: z.array(z.string().min(2).max(60)).min(1),
  soilN: z.number().int().min(0).max(1000).default(240),
  soilP: z.number().int().min(0).max(500).default(18),
  soilK: z.number().int().min(0).max(1000).default(310),
  soilPh: z.number().min(3.5).max(10).default(7.2),
});

apiRouter.post('/agritech/profile', writeLimiter, requireAuth, async (req: AuthRequest, res) => {
  try {
    const data = farmerProfileSchema.parse(req.body);
    const userId = req.dbUser!.id;
    const [saved] = await db
      .insert(farmerProfiles)
      .values({ userId, ...data })
      .onConflictDoUpdate({
        target: farmerProfiles.userId,
        set: data,
      })
      .returning();
    res.json({ farmerProfile: saved });
  } catch (error) {
    handleRouteError(res, error, 'Failed to save farmer profile.');
  }
});

const cropRecordSchema = z.object({
  regionCode: z.string().min(3).max(40),
  cropName: z.string().min(2).max(80),
  season: z.enum(['Kharif', 'Rabi', 'Zaid']),
  sowingDate: z.string().min(4).max(20),
  areaAcres: z.number().positive().max(2000),
  expectedYieldQuintals: z.number().nonnegative().max(100000),
  expensesInr: z.number().int().nonnegative().max(100000000),
  revenueInr: z.number().int().nonnegative().max(100000000),
  notes: z.string().max(500).optional(),
});

apiRouter.post('/agritech/crops', writeLimiter, requireAuth, async (req: AuthRequest, res) => {
  try {
    const data = cropRecordSchema.parse(req.body);
    const [inserted] = await db
      .insert(cropRecords)
      .values({ userId: req.dbUser!.id, ...data, notes: data.notes ?? '' })
      .returning();
    res.status(201).json({ cropRecord: inserted });
  } catch (error) {
    handleRouteError(res, error, 'Failed to save crop record.');
  }
});

const diseaseCheckSchema = z.object({
  imageBase64: z.string().min(20).max(6_000_000),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  cropName: z.string().min(2).max(80),
  regionName: z.string().min(2).max(80),
  language: z.enum(['en', 'hi', 'te']).default('en'),
});

apiRouter.post('/agritech/disease-check', aiLimiter, requireAuth, async (req, res) => {
  try {
    const data = diseaseCheckSchema.parse(req.body);
    const cleanBase64 = data.imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const analysis = await analyzeCropImageWithGemini({
      base64Data: cleanBase64,
      mimeType: data.mimeType,
      cropName: data.cropName,
      regionName: data.regionName,
      language: data.language,
    });
    res.json({ analysis });
  } catch (error) {
    handleRouteError(res, error, 'Crop image analysis could not be completed.');
  }
});

// ============================================================================
// 4. MODULE B: SMART CIVIC GOVERNANCE (ZERO PUBLIC PII)
// ============================================================================
const CIVIC_STATUS_FLOW = [
  'Submitted',
  'Verified',
  'Assigned',
  'In Progress',
  'Resolved',
  'Citizen Feedback',
] as const;

apiRouter.get('/civic/complaints', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const regionCode = typeof req.query.region === 'string' ? req.query.region : undefined;
    const rows = await db
      .select({
        id: civicComplaints.id,
        trackingId: civicComplaints.trackingId,
        regionCode: civicComplaints.regionCode,
        category: civicComplaints.category,
        title: civicComplaints.title,
        description: civicComplaints.description,
        locationWard: civicComplaints.locationWard,
        coordinates: civicComplaints.coordinates,
        photoDataUrl: civicComplaints.photoDataUrl,
        status: civicComplaints.status,
        assignedDepartment: civicComplaints.assignedDepartment,
        resolutionNotes: civicComplaints.resolutionNotes,
        satisfactionRating: civicComplaints.satisfactionRating,
        feedbackText: civicComplaints.feedbackText,
        createdAt: civicComplaints.createdAt,
        updatedAt: civicComplaints.updatedAt,
        userId: civicComplaints.userId,
      })
      .from(civicComplaints)
      .where(regionCode ? eq(civicComplaints.regionCode, regionCode) : undefined)
      .orderBy(desc(civicComplaints.createdAt))
      .limit(100);

    // Strip userId from public payload; expose only an ownership boolean to authenticated caller
    const sanitized = rows.map(({ userId, ...publicFields }) => ({
      ...publicFields,
      isMine: Boolean(req.dbUser && req.dbUser.id === userId),
    }));

    res.json({ complaints: sanitized });
  } catch (error) {
    handleRouteError(res, error, 'Failed to fetch civic complaints.');
  }
});

apiRouter.get('/civic/complaints/:trackingId', async (req, res) => {
  try {
    const trackingId = req.params.trackingId.trim().toUpperCase();
    const [complaint] = await db
      .select({
        id: civicComplaints.id,
        trackingId: civicComplaints.trackingId,
        regionCode: civicComplaints.regionCode,
        category: civicComplaints.category,
        title: civicComplaints.title,
        description: civicComplaints.description,
        locationWard: civicComplaints.locationWard,
        status: civicComplaints.status,
        assignedDepartment: civicComplaints.assignedDepartment,
        resolutionNotes: civicComplaints.resolutionNotes,
        satisfactionRating: civicComplaints.satisfactionRating,
        feedbackText: civicComplaints.feedbackText,
        createdAt: civicComplaints.createdAt,
        updatedAt: civicComplaints.updatedAt,
      })
      .from(civicComplaints)
      .where(eq(civicComplaints.trackingId, trackingId))
      .limit(1);

    if (!complaint) {
      return res.status(404).json({ error: 'No civic complaint found with that Tracking ID.' });
    }

    const timeline = await db
      .select({
        id: complaintTimeline.id,
        status: complaintTimeline.status,
        note: complaintTimeline.note,
        updatedByRole: complaintTimeline.updatedByRole,
        createdAt: complaintTimeline.createdAt,
      })
      .from(complaintTimeline)
      .where(eq(complaintTimeline.complaintId, complaint.id))
      .orderBy(complaintTimeline.createdAt);

    res.json({ complaint, timeline });
  } catch (error) {
    handleRouteError(res, error, 'Failed to track complaint.');
  }
});

const createComplaintSchema = z.object({
  regionCode: z.string().min(3).max(40),
  category: z.enum([
    'Water Supply',
    'Waste & Sanitation',
    'Roads & Drainage',
    'Street Lighting',
    'Public Health',
    'Smart Transport',
  ]),
  title: z.string().min(4).max(140),
  description: z.string().min(10).max(1500),
  locationWard: z.string().min(2).max(120),
  coordinates: z.string().max(60).optional(),
  photoDataUrl: z
    .string()
    .max(1_500_000)
    .refine(
      (val) => val === '' || /^data:image\/(jpeg|png|webp);base64,/.test(val),
      'Photo must be JPEG, PNG, or WebP image data.'
    )
    .optional(),
});

apiRouter.post('/civic/complaints', writeLimiter, requireAuth, async (req: AuthRequest, res) => {
  try {
    const data = createComplaintSchema.parse(req.body);
    const trackingId = `IND-CIV-${new Date().getFullYear()}-${Math.random()
      .toString(36)
      .slice(2, 7)
      .toUpperCase()}`;

    const [created] = await db
      .insert(civicComplaints)
      .values({
        trackingId,
        userId: req.dbUser!.id,
        regionCode: data.regionCode,
        category: data.category,
        title: data.title,
        description: data.description,
        locationWard: data.locationWard,
        coordinates: data.coordinates ?? '',
        photoDataUrl: data.photoDataUrl ?? '',
        status: 'Submitted',
        assignedDepartment: 'Central Citizen Facilitation Desk',
      })
      .returning();

    await db.insert(complaintTimeline).values({
      complaintId: created.id,
      status: 'Submitted',
      note: 'Complaint logged by citizen with unique tracking ID.',
      updatedByRole: req.dbUser!.role,
    });

    const { userId: _omit, ...safeRecord } = created;
    res.status(201).json({ complaint: { ...safeRecord, isMine: true } });
  } catch (error) {
    handleRouteError(res, error, 'Failed to submit civic complaint.');
  }
});

const updateComplaintStatusSchema = z.object({
  status: z.enum(['Verified', 'Assigned', 'In Progress', 'Resolved']),
  assignedDepartment: z.string().min(2).max(120).optional(),
  note: z.string().min(3).max(500),
});

apiRouter.patch(
  '/civic/complaints/:id/status',
  writeLimiter,
  requireAuth,
  requireRole('super_admin', 'regional_admin', 'dept_officer'),
  async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'Invalid complaint ID.' });
      }
      const data = updateComplaintStatusSchema.parse(req.body);

      const [existing] = await db
        .select()
        .from(civicComplaints)
        .where(eq(civicComplaints.id, id))
        .limit(1);
      if (!existing) {
        return res.status(404).json({ error: 'Complaint not found.' });
      }

      const currentIdx = CIVIC_STATUS_FLOW.indexOf(existing.status as (typeof CIVIC_STATUS_FLOW)[number]);
      const nextIdx = CIVIC_STATUS_FLOW.indexOf(data.status);
      if (nextIdx <= currentIdx) {
        return res.status(400).json({
          error: `Workflow transition must advance forward from "${existing.status}".`,
        });
      }

      const [updated] = await db
        .update(civicComplaints)
        .set({
          status: data.status,
          assignedDepartment: data.assignedDepartment ?? existing.assignedDepartment,
          resolutionNotes: data.status === 'Resolved' ? data.note : existing.resolutionNotes,
          updatedAt: new Date(),
        })
        .where(eq(civicComplaints.id, id))
        .returning();

      await db.insert(complaintTimeline).values({
        complaintId: id,
        status: data.status,
        note: data.note,
        updatedByRole: req.dbUser!.role,
      });

      await recordAuditLog({
        actorUserId: req.dbUser!.id,
        actorRole: req.dbUser!.role,
        action: 'UPDATE_CIVIC_COMPLAINT_STATUS',
        resourceType: 'civic_complaint',
        resourceId: existing.trackingId,
        details: `Transitioned ${existing.trackingId} from ${existing.status} to ${data.status}`,
      });

      const { userId: _omit, ...safeRecord } = updated;
      res.json({ complaint: safeRecord });
    } catch (error) {
      handleRouteError(res, error, 'Failed to update complaint status.');
    }
  }
);

const feedbackSchema = z.object({
  satisfactionRating: z.number().int().min(1).max(5),
  feedbackText: z.string().min(3).max(500),
});

apiRouter.post('/civic/complaints/:id/feedback', writeLimiter, requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid complaint ID.' });
    }
    const data = feedbackSchema.parse(req.body);
    const [existing] = await db
      .select()
      .from(civicComplaints)
      .where(eq(civicComplaints.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }
    if (existing.userId !== req.dbUser!.id) {
      return res.status(403).json({ error: 'Only the filing citizen can submit satisfaction feedback.' });
    }
    if (existing.status !== 'Resolved') {
      return res.status(400).json({ error: 'Feedback is enabled once the issue reaches Resolved status.' });
    }

    const [updated] = await db
      .update(civicComplaints)
      .set({
        status: 'Citizen Feedback',
        satisfactionRating: data.satisfactionRating,
        feedbackText: data.feedbackText,
        updatedAt: new Date(),
      })
      .where(eq(civicComplaints.id, id))
      .returning();

    await db.insert(complaintTimeline).values({
      complaintId: id,
      status: 'Citizen Feedback',
      note: `Citizen rated resolution ${data.satisfactionRating}/5: ${data.feedbackText}`,
      updatedByRole: req.dbUser!.role,
    });

    const { userId: _omit, ...safeRecord } = updated;
    res.json({ complaint: { ...safeRecord, isMine: true } });
  } catch (error) {
    handleRouteError(res, error, 'Failed to record citizen feedback.');
  }
});

// ============================================================================
// 5. MODULE C: MSME DIGITAL TRANSFORMATION
// ============================================================================
apiRouter.get('/msme/overview', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const regionCode = typeof req.query.region === 'string' ? req.query.region : undefined;
    const storefronts = await db
      .select({
        id: msmeBusinesses.id,
        regionCode: msmeBusinesses.regionCode,
        businessName: msmeBusinesses.businessName,
        category: msmeBusinesses.category,
        udyamSelfReported: msmeBusinesses.udyamSelfReported,
        storefrontSlug: msmeBusinesses.storefrontSlug,
        description: msmeBusinesses.description,
        city: msmeBusinesses.city,
        exportReadinessLevel: msmeBusinesses.exportReadinessLevel,
        userId: msmeBusinesses.userId,
      })
      .from(msmeBusinesses)
      .where(regionCode ? eq(msmeBusinesses.regionCode, regionCode) : undefined)
      .orderBy(desc(msmeBusinesses.createdAt))
      .limit(50);

    const allProducts = await db.select().from(msmeProducts).orderBy(desc(msmeProducts.createdAt)).limit(100);

    let myBusinesses: Array<typeof msmeBusinesses.$inferSelect> = [];
    let myInvoices: Array<typeof msmeInvoices.$inferSelect> = [];
    let myExpenses: Array<typeof msmeExpenses.$inferSelect> = [];

    if (req.dbUser) {
      myBusinesses = await db
        .select()
        .from(msmeBusinesses)
        .where(eq(msmeBusinesses.userId, req.dbUser.id));

      if (myBusinesses.length > 0) {
        const bizId = myBusinesses[0].id;
        myInvoices = await db
          .select()
          .from(msmeInvoices)
          .where(eq(msmeInvoices.businessId, bizId))
          .orderBy(desc(msmeInvoices.issuedAt));
        myExpenses = await db
          .select()
          .from(msmeExpenses)
          .where(eq(msmeExpenses.businessId, bizId))
          .orderBy(desc(msmeExpenses.createdAt));
      }
    }

    res.json({
      storefronts: storefronts.map(({ userId, ...rest }) => ({
        ...rest,
        isMine: Boolean(req.dbUser && req.dbUser.id === userId),
      })),
      products: allProducts,
      myBusinesses,
      myInvoices,
      myExpenses,
    });
  } catch (error) {
    handleRouteError(res, error, 'Failed to load MSME overview.');
  }
});

const msmeBusinessSchema = z.object({
  regionCode: z.string().min(3).max(40),
  businessName: z.string().min(2).max(120),
  category: z.string().min(2).max(80),
  udyamSelfReported: z.string().max(80).optional(),
  description: z.string().min(10).max(800),
  city: z.string().min(2).max(80),
  exportReadinessLevel: z.enum(['Foundation', 'Domestic Digital', 'Export Exploring']),
});

apiRouter.post('/msme/businesses', writeLimiter, requireAuth, async (req: AuthRequest, res) => {
  try {
    const data = msmeBusinessSchema.parse(req.body);
    const slugBase = data.businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 40);
    const storefrontSlug = `${slugBase || 'msme'}-${Math.random().toString(36).slice(2, 6)}`;

    const [created] = await db
      .insert(msmeBusinesses)
      .values({
        userId: req.dbUser!.id,
        ...data,
        udyamSelfReported: data.udyamSelfReported
          ? `${data.udyamSelfReported} (Self-Declared — Not Govt Verified)`
          : 'Self-Declared (Unverified)',
        storefrontSlug,
      })
      .returning();

    res.status(201).json({ business: created });
  } catch (error) {
    handleRouteError(res, error, 'Failed to create MSME digital storefront.');
  }
});

const msmeProductSchema = z.object({
  businessId: z.number().int().positive(),
  name: z.string().min(2).max(120),
  sku: z.string().min(2).max(40),
  category: z.string().min(2).max(60),
  priceInr: z.number().int().positive().max(10_000_000),
  stockQty: z.number().int().nonnegative().max(1_000_000),
  unit: z.string().min(1).max(30),
  description: z.string().min(5).max(1000),
  isAiGeneratedDescription: z.boolean().default(false),
});

apiRouter.post('/msme/products', writeLimiter, requireAuth, async (req: AuthRequest, res) => {
  try {
    const data = msmeProductSchema.parse(req.body);
    const [biz] = await db
      .select()
      .from(msmeBusinesses)
      .where(and(eq(msmeBusinesses.id, data.businessId), eq(msmeBusinesses.userId, req.dbUser!.id)))
      .limit(1);
    if (!biz) {
      return res.status(403).json({ error: 'Only the business owner can add products to this storefront.' });
    }
    const [product] = await db.insert(msmeProducts).values(data).returning();
    res.status(201).json({ product });
  } catch (error) {
    handleRouteError(res, error, 'Failed to add product.');
  }
});

const msmeInvoiceSchema = z.object({
  businessId: z.number().int().positive(),
  customerName: z.string().min(2).max(100),
  gstRatePercent: z.number().min(0).max(28).default(18),
  items: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        qty: z.number().int().positive().max(10000),
        rateInr: z.number().positive().max(10000000),
      })
    )
    .min(1),
});

apiRouter.post('/msme/invoices', writeLimiter, requireAuth, async (req: AuthRequest, res) => {
  try {
    const data = msmeInvoiceSchema.parse(req.body);
    const [biz] = await db
      .select()
      .from(msmeBusinesses)
      .where(and(eq(msmeBusinesses.id, data.businessId), eq(msmeBusinesses.userId, req.dbUser!.id)))
      .limit(1);
    if (!biz) {
      return res.status(403).json({ error: 'Only the business owner can issue invoices.' });
    }

    const subtotalInr = Math.round(
      data.items.reduce((sum, item) => sum + item.qty * item.rateInr, 0)
    );
    const gstInr = Math.round((subtotalInr * data.gstRatePercent) / 100);
    const totalInr = subtotalInr + gstInr;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const [invoice] = await db
      .insert(msmeInvoices)
      .values({
        businessId: data.businessId,
        invoiceNumber,
        customerName: data.customerName,
        itemsJson: data.items,
        subtotalInr,
        gstInr,
        totalInr,
        status: 'Issued',
      })
      .returning();

    res.status(201).json({ invoice });
  } catch (error) {
    handleRouteError(res, error, 'Failed to generate GST invoice.');
  }
});

const msmeExpenseSchema = z.object({
  businessId: z.number().int().positive(),
  category: z.string().min(2).max(60),
  description: z.string().min(2).max(200),
  amountInr: z.number().int().positive().max(100_000_000),
  expenseDate: z.string().min(4).max(20),
});

apiRouter.post('/msme/expenses', writeLimiter, requireAuth, async (req: AuthRequest, res) => {
  try {
    const data = msmeExpenseSchema.parse(req.body);
    const [biz] = await db
      .select()
      .from(msmeBusinesses)
      .where(and(eq(msmeBusinesses.id, data.businessId), eq(msmeBusinesses.userId, req.dbUser!.id)))
      .limit(1);
    if (!biz) {
      return res.status(403).json({ error: 'Only the business owner can log expenses.' });
    }
    const [expense] = await db.insert(msmeExpenses).values(data).returning();
    res.status(201).json({ expense });
  } catch (error) {
    handleRouteError(res, error, 'Failed to log business expense.');
  }
});

const msmeAiSchema = z.object({
  businessName: z.string().min(2).max(120),
  category: z.string().min(2).max(80),
  productName: z.string().min(2).max(120),
  goal: z.enum(['product_description', 'marketing_post', 'financial_plan']),
  language: z.enum(['en', 'hi', 'te']).default('en'),
  details: z.string().max(600).default(''),
});

apiRouter.post('/msme/ai-assist', aiLimiter, requireAuth, async (req, res) => {
  try {
    const data = msmeAiSchema.parse(req.body);
    const result = await generateMsmeContentWithGemini(data);
    res.json({ result });
  } catch (error) {
    handleRouteError(res, error, 'MSME AI assistant failed to generate content.');
  }
});

// ============================================================================
// 6. MODULE D: SKILL DEVELOPMENT & EMPLOYMENT
// ============================================================================
apiRouter.get('/skills/overview', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const regionCode = typeof req.query.region === 'string' ? req.query.region : undefined;
    const courseList = await db
      .select()
      .from(courses)
      .where(regionCode ? eq(courses.regionCode, regionCode) : undefined)
      .orderBy(desc(courses.createdAt));

    const opportunityList = await db
      .select()
      .from(opportunities)
      .where(regionCode ? eq(opportunities.regionCode, regionCode) : undefined)
      .orderBy(desc(opportunities.createdAt));

    let learnerProfile = null;
    let myApplications: Array<typeof opportunityApplications.$inferSelect> = [];
    if (req.dbUser) {
      const profiles = await db
        .select()
        .from(learnerProfiles)
        .where(eq(learnerProfiles.userId, req.dbUser.id))
        .limit(1);
      learnerProfile = profiles[0] ?? null;

      myApplications = await db
        .select()
        .from(opportunityApplications)
        .where(eq(opportunityApplications.userId, req.dbUser.id));
    }

    res.json({
      courses: courseList,
      opportunities: opportunityList,
      learnerProfile,
      myApplications,
    });
  } catch (error) {
    handleRouteError(res, error, 'Failed to load skill and employment overview.');
  }
});

const learnerProfileSchema = z.object({
  regionCode: z.string().min(3).max(40),
  headline: z.string().min(4).max(140),
  skills: z.array(z.string().min(1).max(60)).min(1),
  education: z.string().min(2).max(160),
  experienceSummary: z.string().min(4).max(1000),
  portfolioUrl: z.string().max(240).optional(),
  assessmentScore: z.number().int().min(0).max(100).optional(),
});

apiRouter.post('/skills/profile', writeLimiter, requireAuth, async (req: AuthRequest, res) => {
  try {
    const data = learnerProfileSchema.parse(req.body);
    const [saved] = await db
      .insert(learnerProfiles)
      .values({
        userId: req.dbUser!.id,
        regionCode: data.regionCode,
        headline: data.headline,
        skills: data.skills,
        education: data.education,
        experienceSummary: data.experienceSummary,
        portfolioUrl: data.portfolioUrl ?? '',
        assessmentScore: data.assessmentScore ?? 0,
      })
      .onConflictDoUpdate({
        target: learnerProfiles.userId,
        set: {
          regionCode: data.regionCode,
          headline: data.headline,
          skills: data.skills,
          education: data.education,
          experienceSummary: data.experienceSummary,
          portfolioUrl: data.portfolioUrl ?? '',
          assessmentScore: data.assessmentScore ?? 0,
          updatedAt: new Date(),
        },
      })
      .returning();

    res.json({ learnerProfile: saved });
  } catch (error) {
    handleRouteError(res, error, 'Failed to save learner profile.');
  }
});

const createOpportunitySchema = z.object({
  title: z.string().min(4).max(140),
  organization: z.string().min(2).max(120),
  regionCode: z.string().min(3).max(40),
  type: z.enum(['Job', 'Internship', 'Apprenticeship']),
  skillsRequired: z.array(z.string().min(1).max(60)).min(1),
  stipendOrSalary: z.string().min(2).max(80),
  description: z.string().min(10).max(1500),
});

apiRouter.post(
  '/skills/opportunities',
  writeLimiter,
  requireAuth,
  requireRole('employer', 'training_institution', 'regional_admin', 'super_admin'),
  async (req: AuthRequest, res) => {
    try {
      const data = createOpportunitySchema.parse(req.body);
      const listingType =
        req.dbUser!.role === 'super_admin' || req.dbUser!.role === 'regional_admin'
          ? 'Verified'
          : 'External';
      const [created] = await db
        .insert(opportunities)
        .values({
          postedByUserId: req.dbUser!.id,
          ...data,
          listingType,
        })
        .returning();
      res.status(201).json({ opportunity: created });
    } catch (error) {
      handleRouteError(res, error, 'Failed to post opportunity.');
    }
  }
);

const applyOpportunitySchema = z.object({
  coverNote: z.string().min(5).max(800),
});

apiRouter.post('/skills/opportunities/:id/apply', writeLimiter, requireAuth, async (req: AuthRequest, res) => {
  try {
    const oppId = Number(req.params.id);
    if (!Number.isInteger(oppId) || oppId <= 0) {
      return res.status(400).json({ error: 'Invalid opportunity ID.' });
    }
    const data = applyOpportunitySchema.parse(req.body);
    const [opp] = await db.select().from(opportunities).where(eq(opportunities.id, oppId)).limit(1);
    if (!opp) {
      return res.status(404).json({ error: 'Opportunity not found.' });
    }

    const [application] = await db
      .insert(opportunityApplications)
      .values({
        opportunityId: oppId,
        userId: req.dbUser!.id,
        coverNote: data.coverNote,
        status: 'Applied',
      })
      .returning();

    res.status(201).json({ application });
  } catch (error) {
    handleRouteError(res, error, 'Failed to submit application.');
  }
});

// ============================================================================
// 7. MODULE E: CLEAN URBAN INFRASTRUCTURE & SUSTAINABILITY
// ============================================================================
apiRouter.get('/urban/overview', async (req, res) => {
  try {
    const regionCode = typeof req.query.region === 'string' ? req.query.region : 'mp-indore';
    const metrics = await db
      .select()
      .from(sustainabilityMetrics)
      .where(eq(sustainabilityMetrics.regionCode, regionCode));

    const reports = await db
      .select({
        id: urbanReports.id,
        regionCode: urbanReports.regionCode,
        category: urbanReports.category,
        ward: urbanReports.ward,
        title: urbanReports.title,
        description: urbanReports.description,
        metricValue: urbanReports.metricValue,
        status: urbanReports.status,
        createdAt: urbanReports.createdAt,
      })
      .from(urbanReports)
      .where(eq(urbanReports.regionCode, regionCode))
      .orderBy(desc(urbanReports.createdAt))
      .limit(50);

    // Documented weighted sustainability calculation (never invented!)
    const totalWeight = metrics.reduce((acc, m) => acc + m.weightPercent, 0);
    const weightedScore =
      totalWeight > 0
        ? Math.round(
            metrics.reduce((acc, m) => {
              const attainmentRatio = Math.min(1, m.value / Math.max(1, m.targetValue));
              return acc + attainmentRatio * m.weightPercent;
            }, 0) *
              (100 / totalWeight)
          )
        : 0;

    res.json({
      regionCode,
      metrics,
      reports,
      documentedScore: {
        score: weightedScore,
        methodology:
          'Weighted ratio of current attainment vs target across Waste Segregation (30%), Wastewater Reuse (25%), Clean Air Days (20%), Green Cover (15%), and Clean Transit (10%).',
        isDemoData: metrics.some((m) => m.isDemoData),
      },
    });
  } catch (error) {
    handleRouteError(res, error, 'Failed to load urban sustainability overview.');
  }
});

apiRouter.get('/urban/air-quality', async (req, res) => {
  const regionCode = typeof req.query.region === 'string' ? req.query.region : 'mp-indore';
  const coords = REGION_COORDS[regionCode] || REGION_COORDS['mp-indore'];
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${coords.lat}&longitude=${coords.lon}&current=pm10,pm2_5,us_aqi&timezone=Asia%2FKolkata`;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) {
      throw new Error(`Air Quality API HTTP ${response.status}`);
    }
    const data = await response.json();
    res.json({
      source: 'Open-Meteo Air Quality API (Live)',
      isLive: true,
      location: coords.label,
      current: data.current,
    });
  } catch {
    res.json({
      source: 'DEMO BASELINE — Air Quality Fallback',
      isLive: false,
      location: coords.label,
      current: { pm10: 62.5, pm2_5: 34.1, us_aqi: 97 },
    });
  }
});

const urbanReportSchema = z.object({
  regionCode: z.string().min(3).max(40),
  category: z.enum([
    'Waste Management',
    'Water Conservation',
    'Air Quality',
    'Public Cleanliness',
    'Green Plantation',
    'Renewable Energy',
    'Smart Transport',
  ]),
  ward: z.string().min(2).max(100),
  title: z.string().min(4).max(140),
  description: z.string().min(8).max(1000),
  metricValue: z.string().max(60).optional(),
});

apiRouter.post('/urban/reports', writeLimiter, requireAuth, async (req: AuthRequest, res) => {
  try {
    const data = urbanReportSchema.parse(req.body);
    const [inserted] = await db
      .insert(urbanReports)
      .values({
        userId: req.dbUser!.id,
        ...data,
        metricValue: data.metricValue ?? '',
        status: 'Reported',
      })
      .returning();

    const { userId: _omit, ...safeReport } = inserted;
    res.status(201).json({ report: safeReport });
  } catch (error) {
    handleRouteError(res, error, 'Failed to submit urban sustainability report.');
  }
});

// ============================================================================
// 8. UNIFIED AI INTELLIGENCE LAYER (ENGLISH / HINDI / TELUGU)
// ============================================================================
const aiAssistantSchema = z.object({
  message: z.string().min(2).max(2000),
  sector: z.enum(['General', 'AgriTech', 'Civic Governance', 'MSME', 'Skilling & Jobs', 'Clean Urban']),
  regionCode: z.string().min(3).max(40).default('mp-indore'),
  language: z.enum(['en', 'hi', 'te']).default('en'),
});

apiRouter.post('/ai/assistant', aiLimiter, optionalAuth, async (req: AuthRequest, res) => {
  try {
    const data = aiAssistantSchema.parse(req.body);
    const [region] = await db
      .select()
      .from(regions)
      .where(eq(regions.code, data.regionCode))
      .limit(1);

    const regionName = region ? `${region.district}, ${region.state}` : 'Indore, Madhya Pradesh';
    const reply = await generateRegionalAssistantReply({
      message: data.message,
      sector: data.sector,
      regionName,
      language: data.language,
      userRole: req.dbUser?.role || 'public_visitor',
      contextSummary: region
        ? `Active Departments: ${region.departments.join(', ')}. Supported Languages: ${region.languages.join(', ')}.`
        : undefined,
    });

    res.json({ reply });
  } catch (error) {
    handleRouteError(res, error, 'AI assistant could not process the request.');
  }
});

// ============================================================================
// 9. UNIFIED REGIONAL ANALYTICS & EXPORT
// ============================================================================
apiRouter.get('/analytics/overview', async (req, res) => {
  try {
    const regionCode = typeof req.query.region === 'string' ? req.query.region : 'mp-indore';

    const [{ value: farmersCount }] = await db
      .select({ value: count() })
      .from(farmerProfiles)
      .where(eq(farmerProfiles.regionCode, regionCode));

    const [{ value: cropsCount }] = await db
      .select({ value: count() })
      .from(cropRecords)
      .where(eq(cropRecords.regionCode, regionCode));

    const [{ value: complaintsTotal }] = await db
      .select({ value: count() })
      .from(civicComplaints)
      .where(eq(civicComplaints.regionCode, regionCode));

    const [{ value: complaintsResolved }] = await db
      .select({ value: count() })
      .from(civicComplaints)
      .where(
        and(
          eq(civicComplaints.regionCode, regionCode),
          sql`${civicComplaints.status} IN ('Resolved', 'Citizen Feedback')`
        )
      );

    const [{ value: msmeCount }] = await db
      .select({ value: count() })
      .from(msmeBusinesses)
      .where(eq(msmeBusinesses.regionCode, regionCode));

    const [{ value: learnersCount }] = await db
      .select({ value: count() })
      .from(learnerProfiles)
      .where(eq(learnerProfiles.regionCode, regionCode));

    const [{ value: opportunitiesCount }] = await db
      .select({ value: count() })
      .from(opportunities)
      .where(eq(opportunities.regionCode, regionCode));

    const [{ value: urbanReportsCount }] = await db
      .select({ value: count() })
      .from(urbanReports)
      .where(eq(urbanReports.regionCode, regionCode));

    const categoryRows = await db
      .select({
        category: civicComplaints.category,
        total: count(),
      })
      .from(civicComplaints)
      .where(eq(civicComplaints.regionCode, regionCode))
      .groupBy(civicComplaints.category);

    res.json({
      regionCode,
      liveDatabaseCounts: {
        registeredFarmers: Number(farmersCount),
        cropRecordsLogged: Number(cropsCount),
        civicComplaintsTotal: Number(complaintsTotal),
        civicComplaintsResolved: Number(complaintsResolved),
        resolutionRatePercent:
          Number(complaintsTotal) > 0
            ? Math.round((Number(complaintsResolved) / Number(complaintsTotal)) * 100)
            : 0,
        participatingMsmes: Number(msmeCount),
        registeredLearners: Number(learnersCount),
        activeOpportunities: Number(opportunitiesCount),
        sustainabilityReports: Number(urbanReportsCount),
      },
      complaintCategories: categoryRows.map((r) => ({
        category: r.category,
        total: Number(r.total),
      })),
      demoBenchmarks: {
        isDemoData: true,
        label: 'DEMO DATA — Baseline Regional Target Benchmarks',
        monthlyParticipationTrend: [
          { month: 'Jun', agritech: 18, civic: 24, msme: 12, skilling: 31, urban: 15 },
          { month: 'Jul', agritech: 24, civic: 29, msme: 16, skilling: 36, urban: 19 },
          { month: 'Aug', agritech: 31, civic: 33, msme: 21, skilling: 42, urban: 25 },
          { month: 'Sep', agritech: 38, civic: 37, msme: 28, skilling: 49, urban: 31 },
          { month: 'Oct', agritech: 44, civic: 41, msme: 34, skilling: 56, urban: 37 },
          { month: 'Nov', agritech: 52, civic: 46, msme: 40, skilling: 63, urban: 42 },
        ],
      },
    });
  } catch (error) {
    handleRouteError(res, error, 'Failed to load regional analytics.');
  }
});

// ============================================================================
// 10. ADMIN CONSOLE (PROTECTED BY SERVER-SIDE RBAC)
// ============================================================================
apiRouter.get(
  '/admin/overview',
  requireAuth,
  requireRole('super_admin', 'regional_admin', 'dept_officer'),
  async (_req, res) => {
    try {
      const userList = await db
        .select({
          id: users.id,
          displayName: users.displayName,
          email: users.email,
          role: users.role,
          regionCode: users.regionCode,
          dpdpConsentGiven: users.dpdpConsentGiven,
          isDeleted: users.isDeleted,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(100);

      const logs = await db
        .select()
        .from(auditLogs)
        .orderBy(desc(auditLogs.createdAt))
        .limit(50);

      res.json({ users: userList, auditLogs: logs });
    } catch (error) {
      handleRouteError(res, error, 'Failed to load administrative overview.');
    }
  }
);

const assignRoleSchema = z.object({
  role: z.enum(VALID_ROLES as unknown as [string, ...string[]]),
});

apiRouter.patch(
  '/admin/users/:id/role',
  writeLimiter,
  requireAuth,
  requireRole('super_admin'),
  async (req: AuthRequest, res) => {
    try {
      const targetId = Number(req.params.id);
      if (!Number.isInteger(targetId) || targetId <= 0) {
        return res.status(400).json({ error: 'Invalid user ID.' });
      }
      const data = assignRoleSchema.parse(req.body);
      const [updated] = await db
        .update(users)
        .set({ role: data.role as UserRole, updatedAt: new Date() })
        .where(eq(users.id, targetId))
        .returning({
          id: users.id,
          displayName: users.displayName,
          role: users.role,
          regionCode: users.regionCode,
        });

      if (!updated) {
        return res.status(404).json({ error: 'User not found.' });
      }

      await recordAuditLog({
        actorUserId: req.dbUser!.id,
        actorRole: req.dbUser!.role,
        action: 'ASSIGN_ROLE',
        resourceType: 'user',
        resourceId: String(targetId),
        details: `Assigned role ${data.role} to user #${targetId}`,
      });

      res.json({ user: updated });
    } catch (error) {
      handleRouteError(res, error, 'Failed to update user role.');
    }
  }
);

// ============================================================================
// 11. PUBLIC CONTACT & COMMUNITY INQUIRY
// ============================================================================
const contactSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(120),
  regionCode: z.string().min(3).max(40),
  sector: z.string().min(2).max(80),
  message: z.string().min(10).max(1500),
});

apiRouter.post('/contact', writeLimiter, async (req, res) => {
  try {
    const data = contactSchema.parse(req.body);
    const [saved] = await db.insert(contactInquiries).values(data).returning();
    res.status(201).json({ inquiryId: saved.id, received: true });
  } catch (error) {
    handleRouteError(res, error, 'Failed to submit inquiry.');
  }
});
