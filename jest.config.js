/**
 * @file jest.config.js
 * @description Jest configuration. Coverage thresholds keep the audit
 *              logic exercised. Branch threshold is intentionally low
 *              because the SSRF / network paths in externalAuditController
 *              are integration-tested live in CI (Security workflow) rather
 *              than mocked in Jest.
 */

'use strict';

module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/?(*.)+(test).js'],
  collectCoverageFrom: ['src/**/*.js'],
  coverageThreshold: {
    global: {
      lines: 55,
      statements: 55,
      functions: 50,
      branches: 35,
    },
  },
  verbose: true,
};
