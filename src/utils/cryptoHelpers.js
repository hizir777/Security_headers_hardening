/**
 * @file utils/cryptoHelpers.js
 * @description Thin wrappers around node:crypto for the small set of
 *              primitives the app actually needs: a per-request CSP nonce
 *              and a constant-time string comparison for token routes.
 * @author Istinye University - Secure Web Development
 */

'use strict';

const crypto = require('node:crypto');

/**
 * Generate a cryptographically-strong nonce suitable for CSP. The W3C
 * recommendation is at least 128 bits of entropy per response, so we use
 * 16 bytes encoded as base64.
 * @returns {string} Base64-encoded nonce, ~24 chars.
 */
function generateNonce() {
  return crypto.randomBytes(16).toString('base64');
}

/**
 * Compute a sha256 hex digest of an arbitrary string. Used by the audit
 * service to fingerprint emitted policies for drift detection.
 * @param {string} input
 * @returns {string} Lowercase hex digest.
 */
function sha256Hex(input) {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * Constant-time string equality to avoid timing leaks when comparing
 * tokens. Falls back to false if lengths differ (which is itself safe to
 * leak because the attacker already knows the expected length).
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

module.exports = { generateNonce, sha256Hex, safeEqual };
