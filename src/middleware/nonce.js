/**
 * @file middleware/nonce.js
 * @description Generates a fresh CSP nonce on every request and exposes it
 *              on res.locals so the view layer and the CSP middleware
 *              receive the *same* value within a single response cycle.
 * @author Istinye University - Secure Web Development
 */

'use strict';

const { generateNonce } = require('../utils/cryptoHelpers');

/**
 * Express middleware factory: attach res.locals.cspNonce.
 * @returns {import('express').RequestHandler}
 */
function nonceMiddleware() {
  return function attachNonce(req, res, next) {
    res.locals.cspNonce = generateNonce();
    next();
  };
}

module.exports = nonceMiddleware;
