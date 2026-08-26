import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';
import {
  AUTH_COOKIE_NAME,
  createSessionToken,
  DEFAULT_SESSION_MAX_AGE_SECONDS,
} from '@/lib/auth-core';

const TEST_SECRET = 'a_very_secure_and_long_secret_key_at_least_32_chars!';

describe('Middleware Route Protection', () => {
  beforeEach(() => {
    vi.stubEnv('AUTH_SECRET', TEST_SECRET);
    vi.stubEnv('NODE_ENV', 'test');
  });

  describe('Public & Static Allowlist', () => {
    it('allows static assets through without authentication', async () => {
      const req = new NextRequest('http://localhost:3000/_next/static/chunks/main.js');
      const res = await middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('location')).toBeNull();
    });

    it('allows favicon.ico through without authentication', async () => {
      const req = new NextRequest('http://localhost:3000/favicon.ico');
      const res = await middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('location')).toBeNull();
    });

    it('allows unauthenticated requests to /login with no redirect loop', async () => {
      const req = new NextRequest('http://localhost:3000/login');
      const res = await middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('location')).toBeNull();
    });

    it('allows unauthenticated requests to POST /api/auth/login', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
      });
      const res = await middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('location')).toBeNull();
    });

    it('allows unauthenticated requests to GET /api/auth/login without redirect loop', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'GET',
      });
      const res = await middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('location')).toBeNull();
    });

    it('allows unauthenticated requests to POST /api/auth/logout', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
      });
      const res = await middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('location')).toBeNull();
    });

    it('allows unauthenticated requests to GET /api/auth/logout without redirect loop', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'GET',
      });
      const res = await middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('location')).toBeNull();
    });
  });

  describe('Unauthenticated Page Requests', () => {
    it('redirects unauthenticated root page / to /login without loop', async () => {
      const req = new NextRequest('http://localhost:3000/');
      const res = await middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/login');
    });

    it('redirects unauthenticated /dashboard/subpage to /login', async () => {
      const req = new NextRequest('http://localhost:3000/dashboard/reports');
      const res = await middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/login');
    });
  });

  describe('Unauthenticated Finance API Requests', () => {
    it('returns 401 JSON for unauthenticated GET /api/transactions without redirecting', async () => {
      const req = new NextRequest('http://localhost:3000/api/transactions');
      const res = await middleware(req);
      expect(res.status).toBe(401);
      expect(res.headers.get('location')).toBeNull();
      const body = await res.json();
      expect(body.error.code).toBe('unauthorized');
    });

    it('returns 401 JSON for unauthenticated POST /api/transactions/audio without redirecting', async () => {
      const req = new NextRequest('http://localhost:3000/api/transactions/audio', {
        method: 'POST',
      });
      const res = await middleware(req);
      expect(res.status).toBe(401);
      expect(res.headers.get('location')).toBeNull();
      const body = await res.json();
      expect(body.error.code).toBe('unauthorized');
    });

    it('returns 401 JSON for unauthenticated GET /api/reports/history without redirecting', async () => {
      const req = new NextRequest('http://localhost:3000/api/reports/history');
      const res = await middleware(req);
      expect(res.status).toBe(401);
      expect(res.headers.get('location')).toBeNull();
      const body = await res.json();
      expect(body.error.code).toBe('unauthorized');
    });
  });

  describe('Authenticated Requests with Valid Session Cookie', () => {
    it('allows authenticated requests to / with a valid cookie', async () => {
      const validToken = await createSessionToken(TEST_SECRET, DEFAULT_SESSION_MAX_AGE_SECONDS);
      const req = new NextRequest('http://localhost:3000/', {
        headers: {
          cookie: `${AUTH_COOKIE_NAME}=${validToken}`,
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('location')).toBeNull();
    });

    it('allows authenticated requests to finance APIs with a valid cookie', async () => {
      const validToken = await createSessionToken(TEST_SECRET, DEFAULT_SESSION_MAX_AGE_SECONDS);
      const req = new NextRequest('http://localhost:3000/api/transactions', {
        headers: {
          cookie: `${AUTH_COOKIE_NAME}=${validToken}`,
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('location')).toBeNull();
    });

    it('redirects authenticated user visiting /login to /', async () => {
      const validToken = await createSessionToken(TEST_SECRET, DEFAULT_SESSION_MAX_AGE_SECONDS);
      const req = new NextRequest('http://localhost:3000/login', {
        headers: {
          cookie: `${AUTH_COOKIE_NAME}=${validToken}`,
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/');
    });
  });

  describe('Invalid, Tampered, or Expired Session Cookies', () => {
    it('redirects to /login when page requested with tampered cookie', async () => {
      const validToken = await createSessionToken(TEST_SECRET, DEFAULT_SESSION_MAX_AGE_SECONDS);
      const tamperedToken = validToken.slice(0, -4) + 'abcd';
      const req = new NextRequest('http://localhost:3000/', {
        headers: {
          cookie: `${AUTH_COOKIE_NAME}=${tamperedToken}`,
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/login');
    });

    it('returns 401 JSON when API requested with tampered cookie', async () => {
      const validToken = await createSessionToken(TEST_SECRET, DEFAULT_SESSION_MAX_AGE_SECONDS);
      const tamperedToken = validToken.slice(0, -4) + 'abcd';
      const req = new NextRequest('http://localhost:3000/api/transactions', {
        headers: {
          cookie: `${AUTH_COOKIE_NAME}=${tamperedToken}`,
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(401);
      expect(res.headers.get('location')).toBeNull();
      const body = await res.json();
      expect(body.error.code).toBe('unauthorized');
    });

    it('redirects to /login when page requested with expired cookie', async () => {
      // Create a token expired 10 seconds ago
      const expiredToken = await createSessionToken(TEST_SECRET, -10);
      const req = new NextRequest('http://localhost:3000/', {
        headers: {
          cookie: `${AUTH_COOKIE_NAME}=${expiredToken}`,
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/login');
    });

    it('returns 401 JSON when API requested with expired cookie', async () => {
      const expiredToken = await createSessionToken(TEST_SECRET, -10);
      const req = new NextRequest('http://localhost:3000/api/transactions', {
        headers: {
          cookie: `${AUTH_COOKIE_NAME}=${expiredToken}`,
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error.code).toBe('unauthorized');
    });

    it('fails closed and treats session as unauthenticated when AUTH_SECRET is empty/missing', async () => {
      vi.stubEnv('AUTH_SECRET', '');
      const validToken = await createSessionToken(TEST_SECRET, DEFAULT_SESSION_MAX_AGE_SECONDS);
      const req = new NextRequest('http://localhost:3000/', {
        headers: {
          cookie: `${AUTH_COOKIE_NAME}=${validToken}`,
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/login');
    });
  });
});
