import { count } from 'drizzle-orm';
import { db } from './index.ts';
import {
  agritechAdvisories,
  courses,
  opportunities,
  regions,
  sustainabilityMetrics,
} from './schema.ts';

let seededOnce = false;

export async function ensureSeedData() {
  if (seededOnce) return;
  if (process.env.VITEST === 'true' && !process.env.SQL_HOST) return;
  try {
    const [{ value: regionCount }] = await db.select({ value: count() }).from(regions);
    if (regionCount === 0) {
      await db.insert(regions).values([
        {
          code: 'mp-indore',
          district: 'Indore',
          state: 'Madhya Pradesh',
          stateCode: 'MP',
          languages: ['en', 'hi'],
          departments: [
            'Indore Municipal Corporation (IMC)',
            'MP Agriculture & Farmer Welfare',
            'MSME Facilitation Centre Indore',
            'MP Skill Development Mission',
            'Indore Smart City Development Ltd.',
          ],
          isActive: true,
        },
        {
          code: 'mp-bhopal',
          district: 'Bhopal',
          state: 'Madhya Pradesh',
          stateCode: 'MP',
          languages: ['en', 'hi'],
          departments: [
            'Bhopal Municipal Corporation',
            'State Agriculture Directorate',
            'MP Startup & MSME Cell',
            'CRISP Skill Institute',
          ],
          isActive: true,
        },
        {
          code: 'mp-ujjain',
          district: 'Ujjain',
          state: 'Madhya Pradesh',
          stateCode: 'MP',
          languages: ['en', 'hi'],
          departments: [
            'Ujjain Smart City Cell',
            'Malwa Krishi Vigyan Kendra',
            'District Trade & Industries Centre',
          ],
          isActive: true,
        },
        {
          code: 'mh-pune',
          district: 'Pune',
          state: 'Maharashtra',
          stateCode: 'MH',
          languages: ['en', 'hi'],
          departments: [
            'Pune Municipal Corporation',
            'Maharashtra Agro Industries',
            'MIDC MSME Desk',
          ],
          isActive: true,
        },
        {
          code: 'tg-hyderabad',
          district: 'Hyderabad',
          state: 'Telangana',
          stateCode: 'TG',
          languages: ['en', 'hi', 'te'],
          departments: [
            'GHMC Civic Services',
            'Telangana Agri Innovation Hub',
            'TASK Skill Development',
          ],
          isActive: true,
        },
      ]);
    }

    const [{ value: advisoryCount }] = await db
      .select({ value: count() })
      .from(agritechAdvisories);
    if (advisoryCount === 0) {
      await db.insert(agritechAdvisories).values([
        {
          regionCode: 'mp-indore',
          title: 'Rabi Wheat (Sharbati & Lokwan) Sowing Window & Soil Moisture Advisory',
          category: 'irrigation',
          summary:
            'Black cotton soils in Indore & Malwa plateau retain optimal moisture for timely Rabi sowing. Prefer sprinkler irrigation at Crown Root Initiation (21 days) to conserve groundwater.',
          sourceName: 'DEMO REFERENCE — Based on KVK Indore Practice',
          isVerifiedSource: false,
        },
        {
          regionCode: 'mp-indore',
          title: 'Soybean & Gram Pod Borer Integrated Pest Management (IPM)',
          category: 'pest',
          summary:
            'Install 5 pheromone traps per hectare and neem-seed kernel extract (NSKE 5%) before escalating to targeted sprays. Always consult local KVK before chemical application.',
          sourceName: 'DEMO REFERENCE — IPM Guidelines',
          isVerifiedSource: false,
        },
        {
          regionCode: 'mp-indore',
          title: 'Bhavantar / e-NAM Mandi Price Discovery Checklist',
          category: 'msp',
          summary:
            'Check live Indore Laxmibai Nagar & Devi Ahilya Holkar mandi arrivals on official e-NAM portal prior to dispatch; grade moisture below 12% for better realization.',
          sourceName: 'Public Portal Reference — e-NAM / MP Krishi',
          isVerifiedSource: true,
        },
        {
          regionCode: 'mp-bhopal',
          title: 'PM-KUSUM Solar Pump Subsidy Information',
          category: 'scheme',
          summary:
            'Apply only via official MP Urja Vikas Nigam / PM-KUSUM state portal for standalone solar agriculture pumps. Never pay third-party agents.',
          sourceName: 'Public Portal Reference — PM-KUSUM',
          isVerifiedSource: true,
        },
      ]);
    }

    const [{ value: courseCount }] = await db.select({ value: count() }).from(courses);
    if (courseCount === 0) {
      await db.insert(courses).values([
        {
          title: 'Full-Stack Web & Cloud Engineering Foundation',
          provider: 'Indore Tech Skill Hub (Demo Partner)',
          regionCode: 'mp-indore',
          category: 'Software & Cloud',
          isFree: true,
          priceInr: 0,
          durationWeeks: 8,
          mode: 'Hybrid',
          certificationName: 'Regional Cloud Developer Certificate (Sample)',
          sourceType: 'Sample',
        },
        {
          title: 'Precision AgriTech & Soil Sensor Operations',
          provider: 'Malwa Agri Innovation Cell',
          regionCode: 'mp-indore',
          category: 'AgriTech',
          isFree: true,
          priceInr: 0,
          durationWeeks: 4,
          mode: 'In-Person',
          certificationName: 'AgriTech Field Specialist (Sample)',
          sourceType: 'Sample',
        },
        {
          title: 'ONDC & Digital GST Bookkeeping for MSMEs',
          provider: 'MP MSME Digital Desk',
          regionCode: 'mp-indore',
          category: 'Commerce & MSME',
          isFree: true,
          priceInr: 0,
          durationWeeks: 3,
          mode: 'Online',
          certificationName: 'Digital Vyapar Practitioner (Sample)',
          sourceType: 'External',
        },
        {
          title: 'Solar Rooftop & EV Charging Technician',
          provider: 'Central India Green Skills Academy',
          regionCode: 'mp-bhopal',
          category: 'Clean Energy',
          isFree: false,
          priceInr: 2500,
          durationWeeks: 6,
          mode: 'Hybrid',
          certificationName: 'Green Energy Technician (Sample)',
          sourceType: 'Sample',
        },
      ]);
    }

    const [{ value: oppCount }] = await db.select({ value: count() }).from(opportunities);
    if (oppCount === 0) {
      await db.insert(opportunities).values([
        {
          title: 'Junior Full-Stack Engineer (React + Node)',
          organization: 'Crystal IT Park Software Unit (Sample)',
          regionCode: 'mp-indore',
          type: 'Job',
          skillsRequired: ['TypeScript', 'React', 'PostgreSQL', 'REST APIs'],
          stipendOrSalary: '₹4.2 – ₹6.0 LPA',
          listingType: 'Sample',
          description:
            'Build civic and enterprise SaaS interfaces for Indore-based technology delivery teams. Sample listing for demonstration.',
        },
        {
          title: 'AgriTech Field Data & Drone Survey Intern',
          organization: 'Malwa Precision Farming Collective (Sample)',
          regionCode: 'mp-indore',
          type: 'Internship',
          skillsRequired: ['Soil Sampling', 'GIS Basics', 'Hindi & English'],
          stipendOrSalary: '₹12,000 / month',
          listingType: 'Sample',
          description:
            'Assist farmer producer organizations across Indore and Dewas tehsils with soil health card digitization.',
        },
        {
          title: 'E-Commerce Catalog & Export Operations Associate',
          organization: 'Pithampur MSME Packaging Cluster (Sample)',
          regionCode: 'mp-indore',
          type: 'Job',
          skillsRequired: ['Inventory Management', 'GST Billing', 'Digital Marketing'],
          stipendOrSalary: '₹2.8 – ₹3.6 LPA',
          listingType: 'External',
          description:
            'Support small manufacturers in Pithampur industrial belt onboarding onto ONDC and B2B export marketplaces.',
        },
        {
          title: 'Urban Waste-to-Energy & GIS Analyst Trainee',
          organization: 'Clean Urban Innovation Lab (Sample)',
          regionCode: 'mp-bhopal',
          type: 'Apprenticeship',
          skillsRequired: ['Data Analysis', 'Sustainability Metrics', 'Python'],
          stipendOrSalary: '₹15,000 / month',
          listingType: 'Sample',
          description:
            'Track ward-level waste segregation and solar microgrid telemetry across Madhya Pradesh smart cities.',
        },
      ]);
    }

    const [{ value: metricCount }] = await db
      .select({ value: count() })
      .from(sustainabilityMetrics);
    if (metricCount === 0) {
      await db.insert(sustainabilityMetrics).values([
        {
          regionCode: 'mp-indore',
          metricKey: 'waste_segregation',
          metricLabel: 'Door-to-Door Segregated Waste Recovery',
          value: 92,
          unit: '%',
          targetValue: 100,
          weightPercent: 30,
          dataSource: 'DEMO DATA — Modelled on Indore Swachh Survekshan Framework',
          isDemoData: true,
          recordedDate: '2026-11-01',
        },
        {
          regionCode: 'mp-indore',
          metricKey: 'water_reuse',
          metricLabel: 'Treated Wastewater Reuse Rate',
          value: 68,
          unit: '%',
          targetValue: 85,
          weightPercent: 25,
          dataSource: 'DEMO DATA — Municipal Water Conservation Benchmark',
          isDemoData: true,
          recordedDate: '2026-11-01',
        },
        {
          regionCode: 'mp-indore',
          metricKey: 'aqi_compliance',
          metricLabel: 'Clean Air Days (AQI < 100 Share)',
          value: 74,
          unit: '%',
          targetValue: 90,
          weightPercent: 20,
          dataSource: 'DEMO DATA — Regional Ambient Air Quality Index Baseline',
          isDemoData: true,
          recordedDate: '2026-11-01',
        },
        {
          regionCode: 'mp-indore',
          metricKey: 'green_canopy',
          metricLabel: 'Urban Green Cover & Plantation Target',
          value: 79,
          unit: '%',
          targetValue: 100,
          weightPercent: 15,
          dataSource: 'DEMO DATA — District Greening Initiative Tracker',
          isDemoData: true,
          recordedDate: '2026-11-01',
        },
        {
          regionCode: 'mp-indore',
          metricKey: 'clean_transit',
          metricLabel: 'Electric & CNG Public Transit Fleet Share',
          value: 64,
          unit: '%',
          targetValue: 80,
          weightPercent: 10,
          dataSource: 'DEMO DATA — Smart Urban Mobility Tracker',
          isDemoData: true,
          recordedDate: '2026-11-01',
        },
      ]);
    }

    seededOnce = true;
  } catch (error) {
    console.error('Seed data initialization failed:', error);
  }
}
