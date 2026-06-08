/**
 * @file tests/externalAuditor.test.js
 * @description Unit tests for the external-site grading rules.
 */

'use strict';

const { gradeExternalHeaders, computeGrade } = require('../src/services/externalAuditor');

describe('External auditor grading', () => {
  test('all six headers correctly configured → all pass', () => {
    const headers = {
      'content-security-policy':
        "default-src 'self'; script-src 'nonce-abc' 'strict-dynamic'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
      'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
      'x-frame-options': 'DENY',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    };
    const findings = gradeExternalHeaders(headers);
    expect(findings).toHaveLength(6);
    expect(findings.every((f) => f.level === 'pass')).toBe(true);
  });

  test('missing all six → all fail (Referrer-Policy is warn since missing = browser default)', () => {
    const findings = gradeExternalHeaders({});
    const map = Object.fromEntries(findings.map((f) => [f.header, f.level]));
    expect(map['content-security-policy']).toBe('fail');
    expect(map['strict-transport-security']).toBe('fail');
    expect(map['x-frame-options']).toBe('fail');
    expect(map['x-content-type-options']).toBe('fail');
    expect(map['referrer-policy']).toBe('warn');
    expect(map['permissions-policy']).toBe('fail');
  });

  test('CSP with unsafe-inline → warn', () => {
    const findings = gradeExternalHeaders({
      'content-security-policy': "default-src 'self'; script-src 'self' 'unsafe-inline'",
    });
    const csp = findings.find((f) => f.header === 'content-security-policy');
    expect(csp.level).toBe('warn');
  });

  test('CSP with unsafe-eval → fail', () => {
    const findings = gradeExternalHeaders({
      'content-security-policy': "default-src 'self'; script-src 'self' 'unsafe-eval'",
    });
    const csp = findings.find((f) => f.header === 'content-security-policy');
    expect(csp.level).toBe('fail');
  });

  test('HSTS with short max-age → fail', () => {
    const findings = gradeExternalHeaders({
      'strict-transport-security': 'max-age=600',
    });
    const hsts = findings.find((f) => f.header === 'strict-transport-security');
    expect(hsts.level).toBe('fail');
  });

  test('HSTS without includeSubDomains → warn', () => {
    const findings = gradeExternalHeaders({
      'strict-transport-security': 'max-age=31536000',
    });
    const hsts = findings.find((f) => f.header === 'strict-transport-security');
    expect(hsts.level).toBe('warn');
  });

  test('XFO missing but CSP frame-ancestors present → pass', () => {
    const findings = gradeExternalHeaders({
      'content-security-policy': "default-src 'self'; frame-ancestors 'none'",
    });
    const xfo = findings.find((f) => f.header === 'x-frame-options');
    expect(xfo.level).toBe('pass');
  });

  test('Referrer-Policy unsafe-url → fail', () => {
    const findings = gradeExternalHeaders({ 'referrer-policy': 'unsafe-url' });
    const rp = findings.find((f) => f.header === 'referrer-policy');
    expect(rp.level).toBe('fail');
  });

  test('Permissions-Policy with three or more =() entries → pass', () => {
    const findings = gradeExternalHeaders({
      'permissions-policy': 'camera=(), microphone=(), geolocation=()',
    });
    const pp = findings.find((f) => f.header === 'permissions-policy');
    expect(pp.level).toBe('pass');
  });

  test('computeGrade: all pass → A+', () => {
    const findings = [
      { level: 'pass' }, { level: 'pass' }, { level: 'pass' },
      { level: 'pass' }, { level: 'pass' }, { level: 'pass' },
    ];
    const { grade, score } = computeGrade(findings);
    expect(grade).toBe('A+');
    expect(score).toBe(96);
  });

  test('computeGrade: all fail → F', () => {
    const findings = [
      { level: 'fail' }, { level: 'fail' }, { level: 'fail' },
      { level: 'fail' }, { level: 'fail' }, { level: 'fail' },
    ];
    const { grade, score } = computeGrade(findings);
    expect(grade).toBe('F');
    expect(score).toBe(0);
  });
});
