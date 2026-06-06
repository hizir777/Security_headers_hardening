/**
 * @file services/headerAuditor.js
 * @description Programmatic self-audit. The audit route hits this service
 *              so an operator can visually confirm the live response
 *              matches the policy declared in src/config/headers.js.
 *              Each check returns a structured result so the same data can
 *              feed a CI gate or a frontend dashboard.
 * @author Istinye University - Secure Web Development
 */

'use strict';

const { REQUIRED_HEADERS } = require('../config/constants');
const {
  serializeHsts,
  buildPermissionsPolicy,
  XFO_VALUE,
  NOSNIFF_VALUE,
  REFERRER_POLICY_VALUE,
} = require('../config/headers');

/**
 * Audit a parsed map of response headers against the expected baseline.
 * Returns a list of findings, one per header.
 * @param {Object<string,string>} headers Lower-cased header map.
 * @returns {Array<{header:string, present:boolean, value:string|null, pass:boolean, reason:string}>}
 */
function auditHeaders(headers) {
  const findings = [];

  findings.push(checkCsp(headers[REQUIRED_HEADERS.CSP]));
  findings.push(checkHsts(headers[REQUIRED_HEADERS.HSTS]));
  findings.push(checkXfo(headers[REQUIRED_HEADERS.XFO]));
  findings.push(checkNosniff(headers[REQUIRED_HEADERS.NOSNIFF]));
  findings.push(checkReferrer(headers[REQUIRED_HEADERS.REFERRER]));
  findings.push(checkPermissions(headers[REQUIRED_HEADERS.PERMISSIONS]));

  return findings;
}

/**
 * @param {string|undefined} value
 * @returns {{header:string, present:boolean, value:string|null, pass:boolean, reason:string}}
 */
function checkCsp(value) {
  if (!value) return finding('content-security-policy', null, false, 'missing');
  const weak = /'unsafe-inline'|'unsafe-eval'|\bdata:[^;]*script-src|\*\s/;
  if (weak.test(value)) return finding('content-security-policy', value, false, 'weak directive present');
  return finding('content-security-policy', value, true, 'strict policy');
}

/** @param {string|undefined} value */
function checkHsts(value) {
  if (!value) return finding('strict-transport-security', null, false, 'missing');
  const expected = serializeHsts();
  return finding('strict-transport-security', value, value === expected, value === expected ? 'matches' : `expected ${expected}`);
}

/** @param {string|undefined} value */
function checkXfo(value) {
  return finding('x-frame-options', value || null, value === XFO_VALUE, value === XFO_VALUE ? 'matches' : 'mismatch');
}

/** @param {string|undefined} value */
function checkNosniff(value) {
  return finding('x-content-type-options', value || null, value === NOSNIFF_VALUE, value === NOSNIFF_VALUE ? 'matches' : 'mismatch');
}

/** @param {string|undefined} value */
function checkReferrer(value) {
  return finding('referrer-policy', value || null, value === REFERRER_POLICY_VALUE, value === REFERRER_POLICY_VALUE ? 'matches' : 'mismatch');
}

/** @param {string|undefined} value */
function checkPermissions(value) {
  const expected = buildPermissionsPolicy();
  return finding('permissions-policy', value || null, value === expected, value === expected ? 'matches' : 'mismatch');
}

/**
 * Construct a uniform finding object.
 * @param {string} header
 * @param {string|null} value
 * @param {boolean} pass
 * @param {string} reason
 */
function finding(header, value, pass, reason) {
  return { header, present: value !== null, value, pass, reason };
}

module.exports = { auditHeaders };
