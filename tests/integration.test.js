/**
 * @file tests/integration.test.js
 * @description Higher-level tests covering routing, health, CSP violation
 *              receiver, and the audit endpoint.
 */

'use strict';

const request = require('supertest');
const createApp = require('../src/app');

describe('Application integration', () => {
  const app = createApp();

  test('GET / renders HTML with the nonce substituted', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/<script nonce="[A-Za-z0-9+/=]+"/);
    expect(res.text).not.toMatch(/__CSP_NONCE__/);
  });

  test('GET /healthz returns ok', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('GET /readyz returns audit findings', async () => {
    const res = await request(app).get('/readyz');
    expect(Array.isArray(res.body.findings)).toBe(true);
    const headers = res.body.findings.map((f) => f.header);
    expect(headers).toEqual(
      expect.arrayContaining([
        'content-security-policy',
        'x-frame-options',
        'x-content-type-options',
        'referrer-policy',
        'permissions-policy',
      ]),
    );
  });

  test('POST /csp-report accepts a legacy report-uri payload', async () => {
    const res = await request(app)
      .post('/csp-report')
      .set('Content-Type', 'application/csp-report')
      .send(JSON.stringify({
        'csp-report': {
          'document-uri': 'https://example.com/page',
          'violated-directive': 'script-src',
          'blocked-uri': 'https://evil.example/script.js',
        },
      }));
    expect(res.status).toBe(204);
  });

  test('POST /csp-report rejects an unknown shape', async () => {
    const res = await request(app)
      .post('/csp-report')
      .set('Content-Type', 'application/json')
      .send({ random: 'junk' });
    expect(res.status).toBe(400);
  });
});
