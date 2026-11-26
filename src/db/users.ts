import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import { auditLogs, users } from './schema.ts';

export const VALID_ROLES = [
  'super_admin',
  'regional_admin',
  'dept_officer',
  'farmer',
  'citizen',
  'msme_owner',
  'student_seeker',
  'employer',
  'training_institution',
  'public_visitor',
] as const;

export type UserRole = (typeof VALID_ROLES)[number];

export const SELF_ASSIGNABLE_ROLES: readonly UserRole[] = [
  'farmer',
  'citizen',
  'msme_owner',
  'student_seeker',
  'employer',
  'training_institution',
];

const INITIAL_SUPER_ADMIN_EMAIL = 'shaikmullasadik01@gmail.com';

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string
) {
  try {
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.uid, uid))
      .limit(1);

    if (existing[0]) {
      const updated = await db
        .update(users)
        .set({
          email,
          displayName: displayName || existing[0].displayName,
          updatedAt: new Date(),
        })
        .where(eq(users.uid, uid))
        .returning();
      return updated[0];
    }

    const defaultRole: UserRole =
      email.toLowerCase() === INITIAL_SUPER_ADMIN_EMAIL.toLowerCase()
        ? 'super_admin'
        : 'citizen';

    const inserted = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName || email.split('@')[0] || 'Citizen User',
        role: defaultRole,
        regionCode: 'mp-indore',
        preferredLanguage: 'en',
        dpdpConsentGiven: false,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: { email, updatedAt: new Date() },
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('User synchronization failed. Please try again later.', {
      cause: error,
    });
  }
}

export async function recordAuditLog(params: {
  actorUserId: number | null;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: string;
}) {
  try {
    await db.insert(auditLogs).values({
      actorUserId: params.actorUserId,
      actorRole: params.actorRole,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      details: params.details,
    });
  } catch (error) {
    console.error('Audit log write failed:', error);
  }
}
