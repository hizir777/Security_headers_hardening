/**
 * @file controllers/reportController.js
 * @description Receives CSP violation reports from browsers. We accept
 *              the legacy report-uri JSON body and the newer Reporting
 *              API body shape, normalise both, and emit a structured log
 *              line. In a real deployment this would forward to an
 *              ingestion service (Loki, Datadog, etc.).
 * @author Istinye University - Secure Web Development
 */

'use strict';

const logger = require('../utils/logger');
const { HTTP_STATUS } = require('../config/constants');

/**
 * Normalise either a legacy report-uri body or a Reporting API entry into
 * a flat shape suitable for log aggregation.
 * @param {object} body Raw JSON body.
 * @returns {object|null} Normalised entry or null if shape is unknown.
 */
function normaliseReport(body) {
  if (!body || typeof body !== 'object') return null;

  if (body['csp-report']) {
    const r = body['csp-report'];
    return {
      shape: 'report-uri',
      documentUri: r['document-uri'],
      blockedUri: r['blocked-uri'],
      violatedDirective: r['violated-directive'],
      effectiveDirective: r['effective-directive'],
      originalPolicy: r['original-policy'],
    };
  }

  if (Array.isArray(body)) {
    return { shape: 'reporting-api', batchSize: body.length, entries: body };
  }

  return null;
}

/**
 * POST /csp-report — receiver endpoint.
 * @type {import('express').RequestHandler}
 */
function postCspReport(req, res) {
  const entry = normaliseReport(req.body);
  if (!entry) {
    res.status(HTTP_STATUS.BAD_REQUEST).end();
    return;
  }
  logger.warn('csp.violation', entry);
  res.status(HTTP_STATUS.NO_CONTENT).end();
}

module.exports = { postCspReport };
