import crypto from 'crypto';
import { User, UserRole } from '../types';

// In-memory failed attempt tracking for brute force prevention
interface FailedLoginAttempt {
  count: number;
  lastAttempt: number;
  lockedUntil: number;
}

const failedAttemptsMap = new Map<string, FailedLoginAttempt>();
const activeSessions = new Map<string, { userId: string; email: string; role: UserRole; expiresAt: number }>();

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes lockout
const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000; // 7 days session

/**
 * Hash a password with cryptographic salt using PBKDF2 (SHA-512)
 */
export function hashPassword(password: string, customSalt?: string): { hash: string; salt: string } {
  const salt = customSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

/**
 * Verify a plain text password against stored hash & salt
 */
export function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  if (!password || !storedHash || !salt) return false;
  try {
    const computedHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(storedHash, 'hex'));
  } catch (err) {
    return false;
  }
}

/**
 * Check if an IP or Email is currently rate-limited/locked out due to consecutive failed logins
 */
export function checkBruteForceLockout(identifier: string): { locked: boolean; remainingSeconds: number } {
  const record = failedAttemptsMap.get(identifier.toLowerCase());
  if (!record) return { locked: false, remainingSeconds: 0 };

  const now = Date.now();
  if (record.lockedUntil > now) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { locked: true, remainingSeconds };
  }

  // If lockout expired, reset
  if (record.lockedUntil > 0 && record.lockedUntil <= now) {
    failedAttemptsMap.delete(identifier.toLowerCase());
  }

  return { locked: false, remainingSeconds: 0 };
}

/**
 * Record a failed login attempt
 */
export function recordFailedLogin(identifier: string): { locked: boolean; remainingAttempts: number; remainingSeconds: number } {
  const key = identifier.toLowerCase();
  const now = Date.now();
  const record = failedAttemptsMap.get(key) || { count: 0, lastAttempt: now, lockedUntil: 0 };

  record.count += 1;
  record.lastAttempt = now;

  if (record.count >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
    failedAttemptsMap.set(key, record);
    return { locked: true, remainingAttempts: 0, remainingSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000) };
  }

  failedAttemptsMap.set(key, record);
  return { locked: false, remainingAttempts: MAX_FAILED_ATTEMPTS - record.count, remainingSeconds: 0 };
}

/**
 * Clear failed attempts upon successful login
 */
export function clearFailedLogin(identifier: string) {
  failedAttemptsMap.delete(identifier.toLowerCase());
}

const HMAC_SECRET = process.env.SESSION_SECRET || 'proshnosiddhi_secure_session_hmac_secret_2026';
const revokedTokens = new Set<string>();

/**
 * Create a secure cryptographically random session token
 */
export function createSessionToken(user: User): string {
  const expiresAt = Date.now() + SESSION_LIFETIME_MS;
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    expiresAt
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', HMAC_SECRET).update(payloadB64).digest('base64url');
  const token = `ps_tok_${payloadB64}.${signature}`;

  activeSessions.set(token, payload);
  return token;
}

/**
 * Validate a session token with HMAC fallback across restarts
 */
export function validateSessionToken(token: string): { valid: boolean; userId?: string; role?: UserRole } {
  if (!token) return { valid: false };
  if (revokedTokens.has(token)) return { valid: false };

  // Fast path: in-memory active session
  const session = activeSessions.get(token);
  if (session) {
    if (session.expiresAt < Date.now()) {
      activeSessions.delete(token);
      return { valid: false };
    }
    return { valid: true, userId: session.userId, role: session.role };
  }

  // Fallback path: HMAC signature verification across server restarts
  if (token.startsWith('ps_tok_')) {
    const raw = token.slice(7);
    const dotIndex = raw.lastIndexOf('.');
    if (dotIndex > 0) {
      const payloadB64 = raw.substring(0, dotIndex);
      const signature = raw.substring(dotIndex + 1);

      try {
        const expectedSig = crypto.createHmac('sha256', HMAC_SECRET).update(payloadB64).digest('base64url');
        if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
          const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
          if (payload.expiresAt && payload.expiresAt > Date.now() && payload.userId) {
            // Rehydrate session
            activeSessions.set(token, payload);
            return { valid: true, userId: payload.userId, role: payload.role };
          }
        }
      } catch (err) {
        // Invalid token structure
      }
    }
  }

  return { valid: false };
}

/**
 * Invalidate a session token on logout
 */
export function invalidateSessionToken(token: string) {
  activeSessions.delete(token);
  revokedTokens.add(token);
}

/**
 * Sanitize User object to ensure no sensitive credentials or internal hash leaks
 */
export function sanitizeUser(user: any): User {
  if (!user) return user;
  const { passwordHash, passwordSalt, ...safeUser } = user;
  return safeUser as User;
}
