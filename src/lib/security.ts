import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';

const PRIVATE_HOST_REGEX =
  /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0|\[::1\]|172\.(1[6-9]|2\d|3[01])\.)/i;

export function isSafeHttpUrl(rawUrl: string): boolean {
  if (!rawUrl || !rawUrl.trim()) return true; // optional empty URL
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false;
    }
    if (PRIVATE_HOST_REGEX.test(parsed.hostname)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function stripDangerousMarkup(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
}

export function validateBase64Image(
  dataUrlOrBase64: string,
  expectedMime: 'image/jpeg' | 'image/png' | 'image/webp',
  maxBytes = 4 * 1024 * 1024
): { valid: boolean; cleanBase64: string; reason?: string } {
  if (!dataUrlOrBase64) {
    return { valid: true, cleanBase64: '' };
  }

  let declaredMime = expectedMime;
  let base64Part = dataUrlOrBase64.trim();

  const dataUrlMatch = base64Part.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (base64Part.startsWith('data:')) {
    if (!dataUrlMatch) {
      return { valid: false, cleanBase64: '', reason: 'Invalid image data URL format.' };
    }
    declaredMime = dataUrlMatch[1] as 'image/jpeg' | 'image/png' | 'image/webp';
    base64Part = dataUrlMatch[2];
  }

  const buffer = Buffer.from(base64Part, 'base64');
  if (buffer.length === 0 || buffer.length > maxBytes) {
    return {
      valid: false,
      cleanBase64: '',
      reason: `Image size must be between 1 byte and ${Math.round(maxBytes / 1024 / 1024)} MB.`,
    };
  }

  // Magic-byte signature verification
  const isJpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng =
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47;
  const isWebp =
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP';

  if (
    (declaredMime === 'image/jpeg' && !isJpeg) ||
    (declaredMime === 'image/png' && !isPng) ||
    (declaredMime === 'image/webp' && !isWebp)
  ) {
    return {
      valid: false,
      cleanBase64: '',
      reason: 'File content signature does not match declared image MIME type.',
    };
  }

  return { valid: true, cleanBase64: base64Part };
}

export function hashClientIp(ip: string | undefined): string {
  if (!ip) return 'unknown';
  return crypto.createHash('sha256').update(`new-india-salt:${ip}`).digest('hex').slice(0, 16);
}

export function verifyMutationOrigin(req: Request, res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  const origin = req.headers.origin;
  if (!origin) {
    return next();
  }
  try {
    const originHost = new URL(origin).host;
    const forwardedHost = req.headers['x-forwarded-host'];
    const hostHeader = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) || req.headers.host;

    const allowedHosts = new Set<string>(['localhost:3000', '127.0.0.1:3000']);
    if (hostHeader) allowedHosts.add(hostHeader);
    if (process.env.APP_URL) {
      try {
        allowedHosts.add(new URL(process.env.APP_URL).host);
      } catch {
        // ignore malformed APP_URL
      }
    }

    if (!allowedHosts.has(originHost)) {
      return res.status(403).json({ error: 'Cross-origin state mutation blocked by security policy.' });
    }
    return next();
  } catch {
    return res.status(403).json({ error: 'Malformed Origin header.' });
  }
}
