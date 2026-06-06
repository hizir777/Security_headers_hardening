/**
 * @file server.js
 * @description Process entrypoint. Builds the Express app, binds it to
 *              the configured host:port, and wires graceful shutdown so
 *              container orchestrators can stop us cleanly.
 * @author Istinye University - Secure Web Development
 */

'use strict';

const createApp = require('./app');
const config = require('./config');
const logger = require('./utils/logger');

/**
 * Register signal handlers for graceful shutdown.
 * @param {import('http').Server} server
 */
function wireShutdown(server) {
  const shutdown = (signal) => {
    logger.info('server.shutdown', { signal });
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

/**
 * Boot the HTTP server.
 */
function main() {
  const app = createApp();
  const server = app.listen(config.port, config.host, () => {
    logger.info('server.started', {
      env: config.env,
      host: config.host,
      port: config.port,
    });
  });
  wireShutdown(server);
}

if (require.main === module) main();
module.exports = { main };
