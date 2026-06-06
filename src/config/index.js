/**
 * @file config/index.js
 * @description Loads, validates, and exposes runtime configuration sourced
 *              from environment variables. Throws on missing critical values
 *              in production so misconfiguration fails loudly at boot rather
 *              than silently downgrading security posture.
 * @author Istinye University - Secure Web Development
 */

'use strict';

require('dotenv').config();

/**
 * Parse a boolean-ish environment variable. Empty / missing returns the
 * supplied default; "true"/"1"/"yes" → true; anything else → false.
 * @param {string|undefined} value Raw env value.
 * @param {boolean} defaultValue Fallback when value is absent.
 * @returns {boolean}
 */
function parseBool(value, defaultValue) {
  if (value === undefined || value === '') return defaultValue;
  return /^(true|1|yes|on)$/i.test(value);
}

/**
 * Parse an integer environment variable with bounds checking.
 * @param {string|undefined} value Raw env value.
 * @param {number} defaultValue Fallback when value is absent or invalid.
 * @returns {number}
 */
function parseInteger(value, defaultValue) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

/**
 * Build and freeze the runtime config. Called exactly once at module load.
 * @returns {Readonly<object>}
 */
function buildConfig() {
  const env = process.env.NODE_ENV || 'development';
  const isProd = env === 'production';

  const config = {
    env,
    isProd,
    port: parseInteger(process.env.PORT, 3000),
    host: process.env.HOST || '0.0.0.0',
    origin: process.env.APP_ORIGIN || 'https://example.com',
    trustProxy: parseInteger(process.env.TRUST_PROXY, 0),

    hsts: {
      maxAge: parseInteger(process.env.HSTS_MAX_AGE, 63072000),
      includeSubDomains: parseBool(process.env.HSTS_INCLUDE_SUBDOMAINS, true),
      preload: parseBool(process.env.HSTS_PRELOAD, true),
    },

    csp: {
      reportUri: process.env.CSP_REPORT_URI || '/csp-report',
    },

    rateLimit: {
      windowMs: parseInteger(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
      max: parseInteger(process.env.RATE_LIMIT_MAX, 100),
    },

    log: {
      level: process.env.LOG_LEVEL || 'info',
    },
  };

  return Object.freeze(config);
}

module.exports = buildConfig();
