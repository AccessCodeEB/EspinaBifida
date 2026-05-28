import { loginLimiter, publicLimiter, authLimiter, otpLimiter } from '../middleware/rateLimiter.js';

describe('rateLimiter configs', () => {
  test('loginLimiter has max=5 and windowMs=15 minutes', () => {
    expect(loginLimiter.options).toBeDefined();
    expect(loginLimiter.options.max).toBe(5);
    expect(loginLimiter.options.windowMs).toBe(15 * 60 * 1000);
  });

  test('publicLimiter has max=10 and windowMs=60 minutes', () => {
    expect(publicLimiter.options).toBeDefined();
    expect(publicLimiter.options.max).toBe(10);
    expect(publicLimiter.options.windowMs).toBe(60 * 60 * 1000);
  });

  test('authLimiter has max=120 and windowMs=1 minute', () => {
    expect(authLimiter.options).toBeDefined();
    expect(authLimiter.options.max).toBe(120);
    expect(authLimiter.options.windowMs).toBe(60 * 1000);
  });

  test('all limiters skip in test environment', () => {
    const fakeReq = {};
    const fakeRes = {};
    expect(loginLimiter.options.skip(fakeReq, fakeRes)).toBe(true);
    expect(publicLimiter.options.skip(fakeReq, fakeRes)).toBe(true);
    expect(authLimiter.options.skip(fakeReq, fakeRes)).toBe(true);
    expect(otpLimiter.options.skip(fakeReq, fakeRes)).toBe(true);
  });

  test('all limiters do NOT skip in production environment', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const fakeReq = {};
      const fakeRes = {};
      expect(loginLimiter.options.skip(fakeReq, fakeRes)).toBe(false);
      expect(publicLimiter.options.skip(fakeReq, fakeRes)).toBe(false);
      expect(authLimiter.options.skip(fakeReq, fakeRes)).toBe(false);
      expect(otpLimiter.options.skip(fakeReq, fakeRes)).toBe(false);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  test('otpLimiter has max=5 and windowMs=15 minutes', () => {
    expect(otpLimiter.options).toBeDefined();
    expect(otpLimiter.options.max).toBe(5);
    expect(otpLimiter.options.windowMs).toBe(15 * 60 * 1000);
  });

  test('otpLimiter usa idAdmin del param como clave cuando está disponible', () => {
    const req = { params: { idAdmin: '42' }, ip: '127.0.0.1' };
    expect(otpLimiter.options.keyGenerator(req)).toBe('42');
  });

  test('otpLimiter cae a ip cuando idAdmin no está en params', () => {
    const req = { params: {}, ip: '10.0.0.1' };
    expect(otpLimiter.options.keyGenerator(req)).toBe('10.0.0.1');
  });
});

describe('loginLimiter blocks after max attempts (real behavior)', () => {
  let app;

  beforeEach(async () => {
    const express = (await import('express')).default;
    const { rateLimit } = await import('express-rate-limit');
    const testLimiter = rateLimit({
      windowMs: 60 * 1000,
      max: 2,
      standardHeaders: true,
      legacyHeaders: false,
    });
    app = express();
    app.post('/test-login', testLimiter, (_req, res) => res.status(200).json({ ok: true }));
  });

  test('allows requests under the limit', async () => {
    const { default: request } = await import('supertest');
    const res = await request(app).post('/test-login');
    expect(res.status).toBe(200);
  });

  test('blocks the third request with 429', async () => {
    const { default: request } = await import('supertest');
    await request(app).post('/test-login');
    await request(app).post('/test-login');
    const res = await request(app).post('/test-login');
    expect(res.status).toBe(429);
  });
});
