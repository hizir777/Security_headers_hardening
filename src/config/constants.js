/**
 * @file constants.js
 * @description Project-wide constants. Centralising these prevents "magic
 *              string" drift between middleware, audit script, and tests.
 *              Anything that the grading rubric or OWASP cheat sheet calls
 *              out by name lives here.
 * @author Istinye University - Secure Web Development
 */

'use strict';

/**
 * HTTP response headers we are required to emit. The audit script and the
 * Jest test suite both iterate over this list, so a missing header in
 * production is also a failing unit test.
 * @readonly
 * @enum {string}
 */
const REQUIRED_HEADERS = Object.freeze({
  CSP: 'content-security-policy',
  HSTS: 'strict-transport-security',
  XFO: 'x-frame-options',
  NOSNIFF: 'x-content-type-options',
  REFERRER: 'referrer-policy',
  PERMISSIONS: 'permissions-policy',
});

/**
 * Headers that, when present, indicate server fingerprint leakage and
 * should be unset. Helmet removes X-Powered-By by default; we strip the
 * rest defensively at the application layer.
 * @readonly
 */
const HEADERS_TO_REMOVE = Object.freeze([
  'x-powered-by',
  'server',
  'x-aspnet-version',
  'x-aspnetmvc-version',
]);

/**
 * Canonical CSP directive names used when assembling the policy string.
 * Naming matches the W3C CSP Level 3 specification verbatim.
 * @readonly
 */
const CSP_DIRECTIVES = Object.freeze({
  DEFAULT_SRC: 'default-src',
  SCRIPT_SRC: 'script-src',
  STYLE_SRC: 'style-src',
  IMG_SRC: 'img-src',
  CONNECT_SRC: 'connect-src',
  FONT_SRC: 'font-src',
  OBJECT_SRC: 'object-src',
  BASE_URI: 'base-uri',
  FORM_ACTION: 'form-action',
  FRAME_ANCESTORS: 'frame-ancestors',
  UPGRADE: 'upgrade-insecure-requests',
  TRUSTED_TYPES: 'require-trusted-types-for',
  REPORT_URI: 'report-uri',
});

/** @readonly */
const HTTP_STATUS = Object.freeze({
  OK: 200,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  TOO_MANY: 429,
  SERVER_ERROR: 500,
});

module.exports = {
  REQUIRED_HEADERS,
  HEADERS_TO_REMOVE,
  CSP_DIRECTIVES,
  HTTP_STATUS,
};
