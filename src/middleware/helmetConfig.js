/**
 * @file middleware/helmetConfig.js
 * @description Strict Helmet v7 configuration. Helmet's defaults emit a
 *              host-allowlist CSP that the Google CSP Evaluator flags as
 *              weak; this module replaces those defaults with a strict
 *              nonce + strict-dynamic policy and disables features we
 *              intentionally re-implement (X-Frame-Options is set
 *              explicitly to keep value parity with frame-ancestors).
 * @author Istinye University - Secure Web Development
 */

'use strict';

const helmet = require('helmet');
const {
  buildCspDirectives,
  serializeHsts,
  XFO_VALUE,
  REFERRER_POLICY_VALUE,
} = require('../config/headers');
const { CSP_DIRECTIVES } = require('../config/constants');
const config = require('../config');

/**
 * Inject the per-request nonce into the directive map Helmet expects.
 * Helmet accepts directive values as arrays of strings or as functions
 * (req, res) => string — we use a function so the nonce is bound at
 * response time.
 * @returns {object} Helmet contentSecurityPolicy.directives map
 */
function cspDirectivesWithNonce() {
  const base = buildCspDirectives();
  base[CSP_DIRECTIVES.SCRIPT_SRC] = [
    (_req, res) => `'nonce-${res.locals.cspNonce}'`,
    "'strict-dynamic'",
    "'self'",
  ];
  return base;
}

/**
 * Build a Helmet options object with every relevant control explicitly
 * enabled and tuned. Returned directly to express via app.use(helmet(...)).
 * @returns {object}
 */
function buildHelmetOptions() {
  const hsts = config.hsts;
  return {
    contentSecurityPolicy: {
      useDefaults: false,
      directives: cspDirectivesWithNonce(),
    },
    strictTransportSecurity: {
      maxAge: hsts.maxAge,
      includeSubDomains: hsts.includeSubDomains,
      preload: hsts.preload,
    },
    referrerPolicy: { policy: REFERRER_POLICY_VALUE },
    xFrameOptions: { action: XFO_VALUE.toLowerCase() },
    xContentTypeOptions: true,
    crossOriginEmbedderPolicy: { policy: 'require-corp' },
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    originAgentCluster: true,
    dnsPrefetchControl: { allow: false },
    ieNoOpen: true,
    hidePoweredBy: true,
    xPermittedCrossDomainPolicies: { permittedPolicies: 'none' },
    xXssProtection: false,
    xDnsPrefetchControl: { allow: false },
  };
}

/**
 * Bypass HSTS in non-prod so a locally-tested browser does not pin
 * localhost to HTTPS for two years and lock the developer out.
 * @returns {object}
 */
function buildHelmetOptionsForEnv() {
  const options = buildHelmetOptions();
  if (!config.isProd) {
    options.strictTransportSecurity = false;
  }
  // Expose serialised HSTS for tests that compare strings.
  options._serializedHsts = serializeHsts();
  return options;
}

module.exports = { buildHelmetOptions, buildHelmetOptionsForEnv, helmet };
