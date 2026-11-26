import { NextFunction, Request, Response } from 'express';
import { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from '../lib/firebase-admin.ts';
import { getOrCreateUser, UserRole } from '../db/users.ts';

export interface DbUser {
  id: number;
  uid: string;
  email: string;
  displayName: string;
  role: string;
  regionCode: string;
  preferredLanguage: string;
  dpdpConsentGiven: boolean;
  dpdpConsentAt: Date | null;
  isDeleted: boolean;
}

export interface AuthRequest extends Request {
  firebaseUser?: DecodedIdToken;
  dbUser?: DbUser;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return res.status(401).json({ error: 'Authentication token is missing.' });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    req.firebaseUser = decoded;
    const dbUser = await getOrCreateUser(
      decoded.uid,
      decoded.email || `${decoded.uid}@user.local`,
      typeof decoded.name === 'string' ? decoded.name : undefined
    );
    if (dbUser.isDeleted) {
      return res.status(403).json({ error: 'Account has been deactivated per DPDP erasure request.' });
    }
    req.dbUser = dbUser;
    return next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({ error: 'Invalid or expired authentication session.' });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return next();
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    req.firebaseUser = decoded;
    req.dbUser = await getOrCreateUser(
      decoded.uid,
      decoded.email || `${decoded.uid}@user.local`,
      typeof decoded.name === 'string' ? decoded.name : undefined
    );
  } catch {
    // Public fallback when token is invalid on optional endpoints
  }
  return next();
};

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.dbUser) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    const role = req.dbUser.role as UserRole;
    if (role === 'super_admin' || allowedRoles.includes(role)) {
      return next();
    }
    return res.status(403).json({
      error: `Access denied. Required role: ${allowedRoles.join(' or ')}.`,
    });
  };
};
