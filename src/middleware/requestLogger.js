/**
 * @file middleware/requestLogger.js
 * @description Lightweight request logger. Omits the Referer and Cookie
 *              headers from the log line to avoid leaking session
 *              material into stdout / log aggregators.
 * @author Istinye University - Secure Web Development
 */

'use strict';

const logger = require('../utils/logger');

/**
 * Express middleware factory: log method, path, status, and duration.
 * @returns {import('express').RequestHandler}
 */
function requestLogger() {
  return function logRequest(req, res, next) {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      logger.info('http.request', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
        ip: req.ip,
      });
    });
    next();
  };
}

module.exports = requestLogger;
