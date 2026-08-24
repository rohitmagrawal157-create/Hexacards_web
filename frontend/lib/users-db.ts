import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "crypto";
import type { UserDto, UserRow, UserSessionDto, UserSessionRow } from "@/lib/server/user-types";

// ── Mobile helpers ──────────────────────────────────────────────────────────

export function normalizeMobile(input: string): string {
  return input.replace(/\D/g, "").slice(-10);
}

export function isValidIndianMobile(mobile: string): boolean {
  return /^[6-9]\d{9}$/.test(normalizeMobile(mobile));
}

export function mobileFromBody(body: {
  mobile?: string;
}): string {
  return normalizeMobile(String(body.mobile ?? ""));
}

// ── Password helpers ────────────────────────────────────────────────────────

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  try {
    const hashBuf = Buffer.from(hash, "hex");
    const testBuf = scryptSync(password, salt, 64);
    return timingSafeEqual(hashBuf, testBuf);
  } catch {
    return false;
  }
}

// ── OTP helpers ─────────────────────────────────────────────────────────────

export function generateOtp(): string {
  // In development always returns 123456 so you can test without SMS
  if (process.env.NODE_ENV !== "production") {
    return "123456";
  }
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function otpExpiryIso(minutes = 5): string {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

export function isOtpExpired(expiry: string | null | undefined): boolean {
  if (!expiry) return true;
  return Date.now() > new Date(expiry).getTime();
}

// ── Session helpers ─────────────────────────────────────────────────────────

export function createSessionIds(): { sessionId: string; sessionToken: string } {
  return {
    sessionId: randomUUID(),
    sessionToken: randomBytes(32).toString("hex"),
  };
}

export function mapSession(row: UserSessionRow): UserSessionDto {
  return {
    id: Number(row.id),
    sessionId: row.session_id,
    sessionToken: row.session_token,
    datetime: row.datetime,
    userId: Number(row.user_id),
  };
}

// ── ID helper ───────────────────────────────────────────────────────────────

export function parseUserId(value: string | number | undefined): number | null {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

// ── Row → DTO mapper ────────────────────────────────────────────────────────

export function mapUser(row: UserRow): UserDto {
  return {
    userId:     Number(row.user_id),
    firstName:  row.first_name?.trim() || "",
    lastName:   row.last_name?.trim()  || "",
    mobile:     row.mobile,
    email:      row.email ?? null,
    createdBy:  row.created_by ? Number(row.created_by) : null,
    dateTime:   row.date_time,
    updateTime: row.update_time,
    isMobile:   Number(row.is_mobile) === 1,
    isEmail:    Number(row.is_email)  === 1,
    status:     Number(row.status)    === 1,
  };
}

// ── Column selector (never returns password or otp) ─────────────────────────

export const USER_SAFE_COLS =
  "user_id, first_name, last_name, mobile, email, created_by, date_time, update_time, is_mobile, is_email, status" as const;

export const USER_OTP_COLS =
  `${USER_SAFE_COLS}, otp, otp_expiry` as const;

export const SESSION_COLS =
  "id, session_id, session_token, datetime, user_id" as const;
