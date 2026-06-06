/**
 * @file controllers/healthController.js
 * @description Lightweight liveness and readiness endpoints for
 *              container orchestrators. /healthz returns 200 as long as
 *              the event loop is responsive; /readyz returns 200 once the
 *              audit baseline matches expectations.
 * @author Istinye University - Secure Web Development
 */

'use strict';

const { auditHeaders } = require('../services/headerAuditor');
const { HTTP_STATUS } = require('../config/constants');

/**
 * GET /healthz — liveness probe.
 * @type {import('express').RequestHandler}
 */
function getLiveness(req, res) {
  res.status(HTTP_STATUS.OK).json({ status: 'ok', ts: Date.now() });
}

/**
 * GET /readyz — readiness probe. Runs a self-audit against the response's
 * own headers (Express already populated them by the time this handler
 * runs because Helmet ran earlier).
 * @type {import('express').RequestHandler}
 */
function getReadiness(req, res) {
  const headers = collectHeaderMap(res);
  const findings = auditHeaders(headers);
  const allPass = findings.every((f) => f.pass);
  res.status(allPass ? HTTP_STATUS.OK : HTTP_STATUS.SERVER_ERROR).json({
    status: allPass ? 'ready' : 'degraded',
    findings,
  });
}

/**
 * Return a lower-cased header map from an Express response. Working
 * around the fact that Node's response.getHeader is case-insensitive but
 * returns the originally-cased name.
 * @param {import('express').Response} res
 * @returns {Object<string,string>}
 */
function collectHeaderMap(res) {
  const out = {};
  for (const name of res.getHeaderNames()) {
    out[name.toLowerCase()] = String(res.getHeader(name));
  }
  return out;
}

module.exports = { getLiveness, getReadiness };
