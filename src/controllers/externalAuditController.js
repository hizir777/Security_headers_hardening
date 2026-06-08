/**
 * @file controllers/externalAuditController.js
 * @description Proxy endpoint for the /audit page. The browser cannot read
 *              the security headers of cross-origin sites, so the server
 *              fetches on its behalf, grades the response, and returns
 *              structured findings + supplementary checks + the full raw
 *              header map.
 *
 *              URL handling is lenient: users can type "google.com" and the
 *              server normalises to "https://google.com".
 *
 *              SSRF protection (production only): rejects targets that
 *              resolve to private / loopback / link-local / CGNAT space.
 * @author Istinye University - Secure Web Development
 */

'use strict';

const dns = require('node:dns').promises;
const net = require('node:net');
const {
  gradeExternalHeaders,
  checkAdditionalHeaders,
  computeGrade,
} = require('../services/externalAuditor');
const { HTTP_STATUS } = require('../config/constants');
const config = require('../config');
const logger = require('../utils/logger');

const FETCH_TIMEOUT_MS = 10_000;

/**
 * RFC 1918 / loopback / link-local / CGNAT ranges.
 * @param {string} ip
 * @returns {boolean}
 */
function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    if (ip.startsWith('127.') || ip.startsWith('10.') || ip.startsWith('192.168.')) return true;
    if (ip === '0.0.0.0') return true;
    if (ip.startsWith('169.254.')) return true;
    const [a, b] = ip.split('.').map(Number);
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }
  if (net.isIPv6(ip)) {
    if (ip === '::1' || ip === '::') return true;
    if (/^f[cd]/i.test(ip)) return true;
    if (/^fe[89ab]/i.test(ip)) return true;
    return false;
  }
  return false;
}

/**
 * Resolve hostname; if any address is private, reject (production only).
 * @param {string} hostname
 */
async function assertPublicHost(hostname) {
  if (!config.isProd) return;
  const records = await dns.lookup(hostname, { all: true });
  for (const r of records) {
    if (isPrivateIp(r.address)) {
      throw new Error(`Refused: ${hostname} resolves to private address ${r.address}.`);
    }
  }
}

/**
 * Lenient URL parser: accepts "google.com" → "https://google.com".
 * @param {string} raw
 * @returns {URL}
 */
function parseTargetUrl(raw) {
  if (typeof raw !== 'string') throw new Error('URL is required.');
  let str = raw.trim();
  if (!str) throw new Error('URL is required.');

  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(str)) {
    str = 'https://' + str;
  }

  let u;
  try {
    u = new URL(str);
  } catch {
    throw new Error(`Invalid URL: ${raw}`);
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error('Only http and https URLs are supported.');
  }
  if (!u.hostname) throw new Error('URL must include a hostname.');
  return u;
}

/**
 * Convert a fetch Headers object into a lower-cased plain map.
 * @param {Headers} headers
 * @returns {Object<string,string>}
 */
function headersToObject(headers) {
  const out = {};
  for (const [k, v] of headers.entries()) out[k.toLowerCase()] = v;
  return out;
}

/**
 * Try HEAD; fall back to GET if the server rejects the method.
 * @param {URL} url
 */
async function fetchResponseHeaders(url) {
  const init = {
    redirect: 'follow',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { 'User-Agent': 'SecurityHeadersHardening-Audit/1.0' },
  };
  let res = await fetch(url.toString(), { ...init, method: 'HEAD' });
  if (res.status === 405 || res.status === 501) {
    res = await fetch(url.toString(), { ...init, method: 'GET' });
  }
  return res;
}

/**
 * POST /audit/external — body { url }
 * @type {import('express').RequestHandler}
 */
async function postExternalAudit(req, res) {
  const startedAt = Date.now();
  let url;
  try {
    url = parseTargetUrl(req.body && req.body.url);
    await assertPublicHost(url.hostname);
  } catch (e) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'invalid_target', detail: e.message });
    return;
  }

  try {
    const upstream = await fetchResponseHeaders(url);
    const headers = headersToObject(upstream.headers);
    const findings = gradeExternalHeaders(headers);
    const additionalChecks = checkAdditionalHeaders(headers);
    const grade = computeGrade(findings);
    const elapsedMs = Date.now() - startedAt;

    logger.info('audit.external', {
      target: url.toString(),
      status: upstream.status,
      grade: grade.grade,
      score: grade.score,
      elapsedMs,
    });

    res.json({
      target: url.toString(),
      hostname: url.hostname,
      finalUrl: upstream.url,
      status: upstream.status,
      statusText: upstream.statusText,
      fetchedAt: new Date().toISOString(),
      elapsedMs,
      grade,
      findings,
      additionalChecks,
      rawHeaders: headers,
    });
  } catch (e) {
    logger.warn('audit.external.failed', { target: url.toString(), error: e.message });
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'fetch_failed',
      detail: e.message,
      target: url.toString(),
    });
  }
}

module.exports = { postExternalAudit, _internals: { isPrivateIp, parseTargetUrl } };
