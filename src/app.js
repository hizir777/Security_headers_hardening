/**
 * @file app.js
 * @description Express application wiring. The order of middleware here
 *              is deliberate: nonce generation must precede Helmet (the
 *              CSP directive function reads res.locals.cspNonce);
 *              static assets are served *after* Helmet so security
 *              headers attach to them; the 404 + error handlers are
 *              registered last so they catch unhandled paths.
 * @author Istinye University - Secure Web Development
 */

'use strict';

const path = require('node:path');
const express = require('express');
const morgan = require('morgan');

const config = require('./config');
const nonceMiddleware = require('./middleware/nonce');
const { helmet, buildHelmetOptionsForEnv } = require('./middleware/helmetConfig');
const permissionsPolicyMiddleware = require('./middleware/permissionsPolicy');
const requestLogger = require('./middleware/requestLogger');
const buildRateLimiter = require('./middleware/rateLimiter');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const routes = require('./routes');
const { HEADERS_TO_REMOVE } = require('./config/constants');

/**
 * Strip fingerprint headers that some upstream (e.g., reverse proxy)
 * might re-add. Runs as a final guard before the response is flushed.
 * @returns {import('express').RequestHandler}
 */
function fingerprintStripper() {
  return function strip(req, res, next) {
    res.on('headers', () => {
      for (const name of HEADERS_TO_REMOVE) res.removeHeader(name);
    });
    next();
  };
}

/**
 * Build a fully-wired Express app. Exported as a function (rather than
 * the app instance) so unit tests can build a fresh instance per test
 * without leaking handler state.
 * @returns {import('express').Express}
 */
function createApp() {
  const app = express();

  if (config.trustProxy > 0) app.set('trust proxy', config.trustProxy);
  app.disable('x-powered-by');
  app.set('etag', 'strong');

  app.use(requestLogger());
  if (!config.isProd) app.use(morgan('dev'));

  app.use(nonceMiddleware());
  app.use(helmet(buildHelmetOptionsForEnv()));
  app.use(permissionsPolicyMiddleware());
  app.use(fingerprintStripper());
  app.use(buildRateLimiter());

  app.use(
    '/public',
    express.static(path.join(__dirname, '..', 'public'), {
      maxAge: '7d',
      immutable: false,
      etag: true,
    }),
  );

  app.use('/', routes);

  app.use(notFoundHandler());
  app.use(errorHandler());

  return app;
}

module.exports = createApp;
