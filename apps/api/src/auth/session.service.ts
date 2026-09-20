import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

interface ActiveSession {
  sessionId: string;
  userId: string;
  issuedAt: Date;
}

/**
 * Enforces "one active phone/session per employee account" using in-memory
 * state, per the spec: with ~20 users, Redis/shared session storage is not
 * required for the first version. Restarting the API clears sessions
 * (acceptable per spec) — no business data is stored here, only the
 * currently-valid session id per user.
 */
@Injectable()
export class SessionService {
  // userId -> currently active session
  private activeSessions = new Map<string, ActiveSession>();

  /** Starts a new session for the user, invalidating any previous one. */
  startSession(userId: string): string {
    const sessionId = randomUUID();
    this.activeSessions.set(userId, {
      sessionId,
      userId,
      issuedAt: new Date(),
    });
    return sessionId;
  }

  /** True only if this is still the single currently-active session for the user. */
  isSessionActive(userId: string, sessionId: string): boolean {
    const current = this.activeSessions.get(userId);
    return !!current && current.sessionId === sessionId;
  }

  endSession(userId: string) {
    this.activeSessions.delete(userId);
  }
}
