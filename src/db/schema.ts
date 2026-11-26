import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. India-First Regional Configuration
export const regions = pgTable('regions', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(), // e.g., 'mp-indore'
  district: text('district').notNull(),
  state: text('state').notNull(),
  stateCode: text('state_code').notNull(),
  languages: jsonb('languages').$type<string[]>().notNull(),
  departments: jsonb('departments').$type<string[]>().notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. Users & Role-Based Access Control (10 Roles + DPDP Act 2023 Consent)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  displayName: text('display_name').notNull().default('Citizen User'),
  role: text('role').notNull().default('citizen'), // super_admin | regional_admin | dept_officer | farmer | citizen | msme_owner | student_seeker | employer | training_institution | public_visitor
  regionCode: text('region_code').notNull().default('mp-indore'),
  preferredLanguage: text('preferred_language').notNull().default('en'),
  dpdpConsentGiven: boolean('dpdp_consent_given').notNull().default(false),
  dpdpConsentAt: timestamp('dpdp_consent_at'),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 3. Module A: Smart AgriTech
export const farmerProfiles = pgTable('farmer_profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  regionCode: text('region_code').notNull().default('mp-indore'),
  villageOrTehsil: text('village_or_tehsil').notNull(),
  landAreaAcres: doublePrecision('land_area_acres').notNull(),
  soilType: text('soil_type').notNull(), // Black Cotton (Vertisol), Alluvial, Red Loam
  irrigationMethod: text('irrigation_method').notNull(), // Drip, Sprinkler, Canal, Rainfed
  primaryCrops: jsonb('primary_crops').$type<string[]>().notNull(),
  soilN: integer('soil_n').notNull().default(240),
  soilP: integer('soil_p').notNull().default(18),
  soilK: integer('soil_k').notNull().default(310),
  soilPh: doublePrecision('soil_ph').notNull().default(7.2),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const cropRecords = pgTable('crop_records', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  regionCode: text('region_code').notNull().default('mp-indore'),
  cropName: text('crop_name').notNull(),
  season: text('season').notNull(), // Kharif, Rabi, Zaid
  sowingDate: text('sowing_date').notNull(),
  areaAcres: doublePrecision('area_acres').notNull(),
  expectedYieldQuintals: doublePrecision('expected_yield_quintals').notNull(),
  expensesInr: integer('expenses_inr').notNull(),
  revenueInr: integer('revenue_inr').notNull(),
  notes: text('notes').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const agritechAdvisories = pgTable('agritech_advisories', {
  id: serial('id').primaryKey(),
  regionCode: text('region_code').notNull(),
  title: text('title').notNull(),
  category: text('category').notNull(), // weather | pest | msp | scheme | irrigation
  summary: text('summary').notNull(),
  sourceName: text('source_name').notNull(),
  isVerifiedSource: boolean('is_verified_source').notNull().default(true),
  publishedAt: timestamp('published_at').defaultNow().notNull(),
});

// 4. Module B: Smart Civic Governance
export const civicComplaints = pgTable('civic_complaints', {
  id: serial('id').primaryKey(),
  trackingId: text('tracking_id').notNull().unique(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  regionCode: text('region_code').notNull().default('mp-indore'),
  category: text('category').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  locationWard: text('location_ward').notNull(),
  coordinates: text('coordinates').default(''),
  photoDataUrl: text('photo_data_url').default(''),
  status: text('status').notNull().default('Submitted'), // Submitted | Verified | Assigned | In Progress | Resolved | Citizen Feedback
  assignedDepartment: text('assigned_department').notNull().default('Municipal General Cell'),
  resolutionNotes: text('resolution_notes').default(''),
  satisfactionRating: integer('satisfaction_rating'),
  feedbackText: text('feedback_text').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const complaintTimeline = pgTable('complaint_timeline', {
  id: serial('id').primaryKey(),
  complaintId: integer('complaint_id')
    .references(() => civicComplaints.id, { onDelete: 'cascade' })
    .notNull(),
  status: text('status').notNull(),
  note: text('note').notNull(),
  updatedByRole: text('updated_by_role').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 5. Module C: MSME Digital Transformation
export const msmeBusinesses = pgTable('msme_businesses', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  regionCode: text('region_code').notNull().default('mp-indore'),
  businessName: text('business_name').notNull(),
  category: text('category').notNull(),
  udyamSelfReported: text('udyam_self_reported').default('Self-Declared (Unverified)'),
  storefrontSlug: text('storefront_slug').notNull().unique(),
  description: text('description').notNull(),
  city: text('city').notNull().default('Indore'),
  exportReadinessLevel: text('export_readiness_level').notNull().default('Foundation'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const msmeProducts = pgTable('msme_products', {
  id: serial('id').primaryKey(),
  businessId: integer('business_id')
    .references(() => msmeBusinesses.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  sku: text('sku').notNull(),
  category: text('category').notNull(),
  priceInr: integer('price_inr').notNull(),
  stockQty: integer('stock_qty').notNull(),
  unit: text('unit').notNull().default('unit'),
  description: text('description').notNull(),
  isAiGeneratedDescription: boolean('is_ai_generated_description').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const msmeInvoices = pgTable('msme_invoices', {
  id: serial('id').primaryKey(),
  businessId: integer('business_id')
    .references(() => msmeBusinesses.id, { onDelete: 'cascade' })
    .notNull(),
  invoiceNumber: text('invoice_number').notNull(),
  customerName: text('customer_name').notNull(),
  itemsJson: jsonb('items_json').$type<Array<{ name: string; qty: number; rateInr: number }>>().notNull(),
  subtotalInr: integer('subtotal_inr').notNull(),
  gstInr: integer('gst_inr').notNull(),
  totalInr: integer('total_inr').notNull(),
  status: text('status').notNull().default('Issued'), // Draft | Issued | Paid
  issuedAt: timestamp('issued_at').defaultNow().notNull(),
});

export const msmeExpenses = pgTable('msme_expenses', {
  id: serial('id').primaryKey(),
  businessId: integer('business_id')
    .references(() => msmeBusinesses.id, { onDelete: 'cascade' })
    .notNull(),
  category: text('category').notNull(),
  description: text('description').notNull(),
  amountInr: integer('amount_inr').notNull(),
  expenseDate: text('expense_date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 6. Module D: Skill Development & Employment
export const learnerProfiles = pgTable('learner_profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  regionCode: text('region_code').notNull().default('mp-indore'),
  headline: text('headline').notNull(),
  skills: jsonb('skills').$type<string[]>().notNull(),
  education: text('education').notNull(),
  experienceSummary: text('experience_summary').notNull(),
  portfolioUrl: text('portfolio_url').default(''),
  assessmentScore: integer('assessment_score').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const courses = pgTable('courses', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  provider: text('provider').notNull(),
  regionCode: text('region_code').notNull().default('mp-indore'),
  category: text('category').notNull(),
  isFree: boolean('is_free').notNull().default(true),
  priceInr: integer('price_inr').notNull().default(0),
  durationWeeks: integer('duration_weeks').notNull(),
  mode: text('mode').notNull(), // Online | Hybrid | In-Person
  certificationName: text('certification_name').notNull(),
  sourceType: text('source_type').notNull().default('Sample'), // Verified | External | Sample
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const opportunities = pgTable('opportunities', {
  id: serial('id').primaryKey(),
  postedByUserId: integer('posted_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  organization: text('organization').notNull(),
  regionCode: text('region_code').notNull().default('mp-indore'),
  type: text('type').notNull(), // Job | Internship | Apprenticeship
  skillsRequired: jsonb('skills_required').$type<string[]>().notNull(),
  stipendOrSalary: text('stipend_or_salary').notNull(),
  listingType: text('listing_type').notNull().default('Sample'), // Verified | External | Sample
  description: text('description').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const opportunityApplications = pgTable('opportunity_applications', {
  id: serial('id').primaryKey(),
  opportunityId: integer('opportunity_id')
    .references(() => opportunities.id, { onDelete: 'cascade' })
    .notNull(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  status: text('status').notNull().default('Applied'),
  coverNote: text('cover_note').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 7. Module E: Clean Urban Infrastructure & Sustainability
export const urbanReports = pgTable('urban_reports', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  regionCode: text('region_code').notNull().default('mp-indore'),
  category: text('category').notNull(),
  ward: text('ward').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  metricValue: text('metric_value').default(''),
  status: text('status').notNull().default('Reported'), // Reported | Action Scheduled | Verified Complete
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const sustainabilityMetrics = pgTable('sustainability_metrics', {
  id: serial('id').primaryKey(),
  regionCode: text('region_code').notNull(),
  metricKey: text('metric_key').notNull(),
  metricLabel: text('metric_label').notNull(),
  value: doublePrecision('value').notNull(),
  unit: text('unit').notNull(),
  targetValue: doublePrecision('target_value').notNull(),
  weightPercent: integer('weight_percent').notNull(),
  dataSource: text('data_source').notNull(),
  isDemoData: boolean('is_demo_data').notNull().default(true),
  recordedDate: text('recorded_date').notNull(),
});

// 8. Governance Audit Logs & Contact Inquiries
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  actorUserId: integer('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  actorRole: text('actor_role').notNull(),
  action: text('action').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id').notNull(),
  details: text('details').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const contactInquiries = pgTable('contact_inquiries', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  regionCode: text('region_code').notNull(),
  sector: text('sector').notNull(),
  message: text('message').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  farmerProfile: one(farmerProfiles, { fields: [users.id], references: [farmerProfiles.userId] }),
  learnerProfile: one(learnerProfiles, { fields: [users.id], references: [learnerProfiles.userId] }),
  cropRecords: many(cropRecords),
  complaints: many(civicComplaints),
  businesses: many(msmeBusinesses),
  urbanReports: many(urbanReports),
}));

export const civicComplaintsRelations = relations(civicComplaints, ({ one, many }) => ({
  author: one(users, { fields: [civicComplaints.userId], references: [users.id] }),
  timeline: many(complaintTimeline),
}));

export const complaintTimelineRelations = relations(complaintTimeline, ({ one }) => ({
  complaint: one(civicComplaints, { fields: [complaintTimeline.complaintId], references: [civicComplaints.id] }),
}));

export const msmeBusinessesRelations = relations(msmeBusinesses, ({ one, many }) => ({
  owner: one(users, { fields: [msmeBusinesses.userId], references: [users.id] }),
  products: many(msmeProducts),
  invoices: many(msmeInvoices),
  expenses: many(msmeExpenses),
}));
