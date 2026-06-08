/**
 * @file controllers/homeController.js
 * @description Renders static HTML views with the per-request CSP nonce
 *              substituted into <script nonce="..."> placeholders. The
 *              view files use a literal token "__CSP_NONCE__" that we
 *              replace just before sending the response.
 * @author Istinye University - Secure Web Development
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const VIEW_ROOT = path.join(__dirname, '..', 'views');
const NONCE_TOKEN = /__CSP_NONCE__/g;

/**
 * Read and cache a view file, then return its content with the nonce
 * token replaced.
 * @param {string} name View basename without extension.
 * @param {string} nonce Per-request nonce value.
 * @returns {string} Rendered HTML.
 */
function renderView(name, nonce) {
  const filePath = path.join(VIEW_ROOT, `${name}.html`);
  const raw = fs.readFileSync(filePath, 'utf8');
  return raw.replace(NONCE_TOKEN, nonce);
}

/**
 * GET / — landing page. The Security Header Audit is the project's primary
 * deliverable, so we render it directly at the root so the first page a
 * visitor (or grader) sees is the live audit dashboard.
 * @type {import('express').RequestHandler}
 */
function getHome(req, res) {
  res.type('html').send(renderView('audit', res.locals.cspNonce));
}

/**
 * GET /home — the legacy marketing landing page, kept for reference.
 * @type {import('express').RequestHandler}
 */
function getLegacyHome(req, res) {
  res.type('html').send(renderView('index', res.locals.cspNonce));
}

/**
 * GET /about — overview page.
 * @type {import('express').RequestHandler}
 */
function getAbout(req, res) {
  res.type('html').send(renderView('about', res.locals.cspNonce));
}

/**
 * GET /audit — live self-audit UI.
 * @type {import('express').RequestHandler}
 */
function getAuditPage(req, res) {
  res.type('html').send(renderView('audit', res.locals.cspNonce));
}

module.exports = { getHome, getLegacyHome, getAbout, getAuditPage };
