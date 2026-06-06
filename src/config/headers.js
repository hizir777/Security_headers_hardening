/**
 * @file config/headers.js
 * @description Single source of truth for every security header value the
 *              app emits. Both Helmet config and the standalone audit
 *              script consume from here so source code and live response
 *              cannot drift apart.
 *
 *              Values track the "Golden-Standard Header Set" from
 *              docs/HEADERS.md (Section 3.1 of the project guide), which
 *              in turn derives from the OWASP Secure Headers Project,
 *              OWASP Cheat Sheet Series, and W3C CSP Level 3.
 *
 * @author Istinye University - Secure Web Development
 */

'use strict';

const { CSP_DIRECTIVES } = require('./constants');
const config = require('./index');

/**
 * Build the strict, nonce-aware CSP directive map. Per Google's "CSP Is
 * Dead, Long Live CSP!" (Weichselbaum et al., CCS 2016) a nonce +
 * strict-dynamic policy is bypassed in dramatically fewer real-world
 * deployments than host allowlists.
 * @returns {Object<string,string[]>}
 */
function buildCspDirectives() {
  return {
    [CSP_DIRECTIVES.DEFAULT_SRC]: ["'self'"],
    [CSP_DIRECTIVES.SCRIPT_SRC]: [
      "'strict-dynamic'",
      "'self'",
    ],
    [CSP_DIRECTIVES.STYLE_SRC]: ["'self'"],
    [CSP_DIRECTIVES.IMG_SRC]: ["'self'", 'data:'],
    [CSP_DIRECTIVES.CONNECT_SRC]: ["'self'"],
    [CSP_DIRECTIVES.FONT_SRC]: ["'self'"],
    [CSP_DIRECTIVES.OBJECT_SRC]: ["'none'"],
    [CSP_DIRECTIVES.BASE_URI]: ["'self'"],
    [CSP_DIRECTIVES.FORM_ACTION]: ["'self'"],
    [CSP_DIRECTIVES.FRAME_ANCESTORS]: ["'none'"],
    [CSP_DIRECTIVES.UPGRADE]: [],
    [CSP_DIRECTIVES.TRUSTED_TYPES]: ["'script'"],
    [CSP_DIRECTIVES.REPORT_URI]: [config.csp.reportUri],
  };
}

/**
 * Serialise a CSP directive map to the wire-format string. Inserts the
 * per-request nonce into script-src.
 * @param {string} nonce Base64 nonce for this response.
 * @returns {string} Header value.
 */
function serializeCsp(nonce) {
  const directives = buildCspDirectives();
  directives[CSP_DIRECTIVES.SCRIPT_SRC] = [
    `'nonce-${nonce}'`,
    ...directives[CSP_DIRECTIVES.SCRIPT_SRC],
  ];

  return Object.entries(directives)
    .map(([name, values]) => (values.length ? `${name} ${values.join(' ')}` : name))
    .join('; ');
}

/**
 * Serialise the HSTS header value from configuration.
 * @returns {string}
 */
function serializeHsts() {
  const parts = [`max-age=${config.hsts.maxAge}`];
  if (config.hsts.includeSubDomains) parts.push('includeSubDomains');
  if (config.hsts.preload) parts.push('preload');
  return parts.join('; ');
}

/**
 * Deny-by-default Permissions-Policy. Every powerful API is explicitly
 * disabled; widen on a per-route basis if a legitimate need emerges.
 * @returns {string}
 */
function buildPermissionsPolicy() {
  return [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
    'usb=()',
    'accelerometer=()',
    'gyroscope=()',
    'autoplay=()',
    'fullscreen=(self)',
    'interest-cohort=()',
  ].join(', ');
}

module.exports = {
  buildCspDirectives,
  serializeCsp,
  serializeHsts,
  buildPermissionsPolicy,
  XFO_VALUE: 'DENY',
  NOSNIFF_VALUE: 'nosniff',
  REFERRER_POLICY_VALUE: 'strict-origin-when-cross-origin',
};
