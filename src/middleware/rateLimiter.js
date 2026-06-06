/**
 * @file middleware/rateLimiter.js
 * @description Thin wrapper around express-rate-limit so the rate-limit
 *              configuration lives in one place. Defaults to 100 requests
 *              per 15 minutes per IP, which is the OWASP-recommended
 *              starting point for public endpoints.
 * @author Istinye University - Secure Web Development
 */

'use strict';

const rateLimit = require('express-rate-limit');
const config = require('../config');

/**
 * Build the rate-limiter middleware.
 * @returns {import('express').RequestHandler}
 */
function buildRateLimiter() {
  return rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'rate_limited' },
  });
}

module.exports = buildRateLimiter;
