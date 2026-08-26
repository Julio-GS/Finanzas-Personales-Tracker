import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as loginHandler, GET as loginGetHandler } from '@/app/api/auth/login/route';
import { POST as logoutHandler, GET as logoutGetHandler } from '@/app/api/auth/logout/route';
import { AUTH_COOKIE_NAME, verifySessionToken } from '@/lib/auth-core';

const TEST_SECRET = 'a_very_secure_and_long_secret_key_at_least_32_chars!';
const TEST_USER = 'admin';
const TEST_PASS = 'correct_horse_battery_staple_123';

describe('Auth Route Handlers', () => {
  beforeEach(() => {
    vi.stubEnv('AUTH_USERNAME', TEST_USER);
    vi.stubEnv('AUTH_PASSWORD', TEST_PASS);
    vi.stubEnv('AUTH_SECRET', TEST_SECRET);
    vi.stubEnv('AUTH_SESSION_MAX_AGE_SECONDS', '604800');
    vi.stubEnv('NODE_ENV', 'test');
  });

  describe('POST /api/auth/login', () => {
    it('sets signed session cookie and returns success on valid credentials', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: TEST_USER, password: TEST_PASS }),
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);

      const cookieHeader = res.headers.get('set-cookie');
      expect(cookieHeader).toBeTruthy();
      expect(cookieHeader).toContain(`${AUTH_COOKIE_NAME}=`);
      expect(cookieHeader).toContain('HttpOnly');
      expect(cookieHeader?.toLowerCase()).toContain('samesite=strict');

      // Verify the issued cookie token is cryptographically valid
      const match = cookieHeader?.match(new RegExp(`${AUTH_COOKIE_NAME}=([^;]+)`));
      const token = match?.[1];
      expect(token).toBeTruthy();

      const verification = await verifySessionToken(token!, TEST_SECRET);
      expect(verification.valid).toBe(true);
    });

    it('returns generic 401 and no cookie on wrong password', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: TEST_USER, password: 'wrong_password' }),
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(401);

      const body = await res.json();
      expect(body.error.code).toBe('invalid_credentials');
      expect(body.error.message).toBe('Invalid credentials');

      const cookieHeader = res.headers.get('set-cookie');
      expect(cookieHeader).toBeNull();
    });

    it('returns generic 401 and no cookie on wrong username', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'nonexistent_user', password: TEST_PASS }),
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(401);

      const body = await res.json();
      expect(body.error.code).toBe('invalid_credentials');
      expect(res.headers.get('set-cookie')).toBeNull();
    });

    it('returns 400 when body is invalid JSON', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json-content{',
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error.code).toBe('invalid_json');
    });

    it('returns 422 when payload is missing username or password', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: TEST_USER }),
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(422);

      const body = await res.json();
      expect(body.error.code).toBe('validation_error');
    });

    it('returns safe 500 auth_config_error when auth environment is missing or invalid', async () => {
      vi.stubEnv('AUTH_SECRET', ''); // Invalidate secret

      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: TEST_USER, password: TEST_PASS }),
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(500);

      const body = await res.json();
      expect(body.error.code).toBe('auth_config_error');
      // Must not leak internal stack or secrets
      expect(JSON.stringify(body)).not.toContain(TEST_SECRET);
      expect(JSON.stringify(body)).not.toContain(TEST_PASS);
    });

    it('sets Secure cookie in production environment', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: TEST_USER, password: TEST_PASS }),
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(200);

      const cookieHeader = res.headers.get('set-cookie');
      expect(cookieHeader).toContain('Secure');
    });

    it('returns 422 when username or password is an empty string', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: '', password: '' }),
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.error.code).toBe('validation_error');
    });

    it('returns 405 for GET method on login route', async () => {
      const res = await loginGetHandler();
      expect(res.status).toBe(405);
      const body = await res.json();
      expect(body.error.code).toBe('method_not_allowed');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('clears the session cookie on logout', async () => {
      const res = await logoutHandler();
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);

      const cookieHeader = res.headers.get('set-cookie');
      expect(cookieHeader).toBeTruthy();
      expect(cookieHeader).toContain(`${AUTH_COOKIE_NAME}=`);
      // Clearing cookie must set Max-Age=0 or past expires
      expect(cookieHeader).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/);
    });

    it('returns 405 for GET method on logout route', async () => {
      const res = await logoutGetHandler();
      expect(res.status).toBe(405);
    });
  });
});
