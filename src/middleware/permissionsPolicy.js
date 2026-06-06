/**
 * @file middleware/permissionsPolicy.js
 * @description Helmet v7 does not emit Permissions-Policy because the W3C
 *              spec was still maturing at release time. We supply it here
 *              with a deny-by-default allowlist that disables every
 *              powerful feature except self-fullscreen, which is harmless
 *              and useful for image lightboxes.
 * @author Istinye University - Secure Web Development
 */

'use strict';

const { buildPermissionsPolicy } = require('../config/headers');

/**
 * Express middleware factory: sets Permissions-Policy on every response.
 * @returns {import('express').RequestHandler}
 */
function permissionsPolicyMiddleware() {
  const value = buildPermissionsPolicy();
  return function setPermissionsPolicy(req, res, next) {
    res.setHeader('Permissions-Policy', value);
    next();
  };
}

module.exports = permissionsPolicyMiddleware;
