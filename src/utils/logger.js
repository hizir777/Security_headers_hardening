/**
 * @file utils/logger.js
 * @description Minimal structured logger. Avoids a heavy dependency for a
 *              template project while still emitting JSON suitable for
 *              ingestion by Loki / CloudWatch / Datadog.
 * @author Istinye University - Secure Web Development
 */

'use strict';

const config = require('../config');

/** @readonly */
const LEVELS = Object.freeze({ debug: 10, info: 20, warn: 30, error: 40 });

/**
 * Decide whether a message at the given level should be emitted.
 * @param {keyof typeof LEVELS} level
 * @returns {boolean}
 */
function shouldLog(level) {
  const threshold = LEVELS[config.log.level] || LEVELS.info;
  return LEVELS[level] >= threshold;
}

/**
 * Emit a single JSON log line.
 * @param {keyof typeof LEVELS} level
 * @param {string} message
 * @param {object} [meta]
 */
function emit(level, message, meta = {}) {
  if (!shouldLog(level)) return;
  const entry = { ts: new Date().toISOString(), level, message, ...meta };
  process.stdout.write(`${JSON.stringify(entry)}\n`);
}

module.exports = {
  debug: (msg, meta) => emit('debug', msg, meta),
  info: (msg, meta) => emit('info', msg, meta),
  warn: (msg, meta) => emit('warn', msg, meta),
  error: (msg, meta) => emit('error', msg, meta),
};
