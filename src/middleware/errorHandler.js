/**
 * @file middleware/errorHandler.js
 * @description Centralised Express error handlers. The 404 handler and the
 *              500 handler are both registered last in app.js so they
 *              catch anything routes leave unhandled. Note that we still
 *              emit security headers on these responses because the helmet
 *              and permissions-policy middlewares run earlier in the stack.
 * @author Istinye University - Secure Web Development
 */

'use strict';

const logger = require('../utils/logger');
const { HTTP_STATUS } = require('../config/constants');

/**
 * 404 handler: any request that falls past the routers ends up here.
 * @returns {import('express').RequestHandler}
 */
function notFoundHandler() {
  return function notFound(req, res) {
    res.status(HTTP_STATUS.NOT_FOUND).json({
      error: 'not_found',
      path: req.path,
    });
  };
}

/**
 * Generic error handler. Logs the full error but only emits a safe message
 * to the client in production.
 * @returns {import('express').ErrorRequestHandler}
 */
function errorHandler() {
  return function handle(err, req, res, _next) {
    logger.error('http.error', {
      message: err.message,
      stack: err.stack,
      path: req.path,
    });
    const status = err.status || HTTP_STATUS.SERVER_ERROR;
    const body = process.env.NODE_ENV === 'production'
      ? { error: 'server_error' }
      : { error: err.message, stack: err.stack };
    res.status(status).json(body);
  };
}

module.exports = { notFoundHandler, errorHandler };
