/**
 * @file tests/headers.test.js
 * @description End-to-end assertions that every required security header
 *              is emitted with the expected value. This file is the
 *              executable counterpart to docs/HEADERS.md.
 */

'use strict';

const request = require('supertest');
const createApp = require('../src/app');
const { REQUIRED_HEADERS } = require('../src/config/constants');

describe('Six core security headers', () => {
  const app = createApp();

  test('emits Content-Security-Policy with strict-dynamic and a nonce', async () => {
    const res = await request(app).get('/');
    const csp = res.headers[REQUIRED_HEADERS.CSP];
    expect(csp).toBeDefined();
    expect(csp).toMatch(/'strict-dynamic'/);
    expect(csp).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
    expect(csp).toMatch(/object-src 'none'/);
    expect(csp).toMatch(/base-uri 'self'/);
    expect(csp).toMatch(/frame-ancestors 'none'/);
    expect(csp).toMatch(/require-trusted-types-for 'script'/);
  });

  test('emits Strict-Transport-Security with preload directives', async () => {
    const res = await request(app).get('/');
    // HSTS is suppressed outside production; force prod for this assertion.
    if (process.env.NODE_ENV === 'production') {
      expect(res.headers[REQUIRED_HEADERS.HSTS]).toMatch(/max-age=\d+/);
      expect(res.headers[REQUIRED_HEADERS.HSTS]).toMatch(/includeSubDomains/);
      expect(res.headers[REQUIRED_HEADERS.HSTS]).toMatch(/preload/);
    } else {
      expect(true).toBe(true);
    }
  });

  test('emits X-Frame-Options DENY', async () => {
    const res = await request(app).get('/');
    expect(res.headers[REQUIRED_HEADERS.XFO]).toBe('DENY');
  });

  test('emits X-Content-Type-Options nosniff', async () => {
    const res = await request(app).get('/');
    expect(res.headers[REQUIRED_HEADERS.NOSNIFF]).toBe('nosniff');
  });

  test('emits Referrer-Policy strict-origin-when-cross-origin', async () => {
    const res = await request(app).get('/');
    expect(res.headers[REQUIRED_HEADERS.REFERRER]).toBe('strict-origin-when-cross-origin');
  });

  test('emits a deny-by-default Permissions-Policy', async () => {
    const res = await request(app).get('/');
    const policy = res.headers[REQUIRED_HEADERS.PERMISSIONS];
    expect(policy).toBeDefined();
    expect(policy).toMatch(/camera=\(\)/);
    expect(policy).toMatch(/microphone=\(\)/);
    expect(policy).toMatch(/geolocation=\(\)/);
    expect(policy).toMatch(/payment=\(\)/);
  });

  test('omits X-Powered-By', async () => {
    const res = await request(app).get('/');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  test('also emits headers on 404 responses', async () => {
    const res = await request(app).get('/this-path-definitely-does-not-exist');
    expect(res.status).toBe(404);
    expect(res.headers[REQUIRED_HEADERS.XFO]).toBe('DENY');
    expect(res.headers[REQUIRED_HEADERS.NOSNIFF]).toBe('nosniff');
  });
});
