/**
 * @file tests/csp.test.js
 * @description Unit tests against the CSP serialiser. Independent of
 *              Express so they run fast.
 */

'use strict';

const { serializeCsp, buildCspDirectives } = require('../src/config/headers');

describe('CSP serialiser', () => {
  test('directive map includes the strict baseline', () => {
    const dirs = buildCspDirectives();
    expect(dirs['object-src']).toEqual(["'none'"]);
    expect(dirs['base-uri']).toEqual(["'self'"]);
    expect(dirs['frame-ancestors']).toEqual(["'none'"]);
    expect(dirs['require-trusted-types-for']).toEqual(["'script'"]);
  });

  test('serializeCsp injects the nonce into script-src', () => {
    const policy = serializeCsp('TESTNONCE');
    expect(policy).toMatch(/script-src 'nonce-TESTNONCE' 'strict-dynamic' 'self'/);
  });

  test('serializeCsp emits upgrade-insecure-requests without a value', () => {
    const policy = serializeCsp('x');
    expect(policy).toMatch(/upgrade-insecure-requests/);
    expect(policy).not.toMatch(/upgrade-insecure-requests [^;]/);
  });
});
