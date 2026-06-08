/**
 * @file controllers/externalAuditController.js
 * @description Proxy endpoint that lets the /audit page run a header audit
 *              against any public URL. The browser cannot read security headers
 *              of arbitrary cross-origin sites, so the server fetches on its
 *              behalf, parses the response headers, and returns graded findings.
 *
 *              SSRF protection: by default rejects requests to private/loopback
 *              address space in production. Disabled in development so the
 *              template can self-audit against localhost.
 * @author Istinye University - Secure Web Development
 */

'use strict';

const dns = require('node:dns').promises;
const net = require('node:net');
const { gradeExternalHeaders, computeGrade } = require('../services/externalAuditor');
const { HTTP_STATUS } = require('../config/constants');
const config = require('../config');
const logger = require('../utils/logger');

const FETCH_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;

/**
 * RFC 1918 / loopback / link-local / CGNAT ranges to block in production.
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
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }
  if (net.isIPv6(ip)) {
    if (ip === '::1' || ip === '::') return true;
    if (/^f[cd]/i.test(ip)) return true; // unique local
    if (/^fe[89ab]/i.test(ip)) return true; // link-local
    return false;
  }
  return false;
}

/**
 * Resolve hostname and reject if it points to private space (production only).
 * @param {string} hostname
 * @returns {Promise<void>}
 */
async function assertPublicHost(hostname) {
  if (!config.isProd) return;
  const records = await dns.lookup(hostname, { all: true });
  for (const r of records) {
    if (isPrivateIp(r.address)) {
      throw new Error(`refused: ${hostname} resolves to private address ${r.address}`);
    }
  }
}

/**
 * Validate and normalise a user-supplied URL.
 * @param {string} raw
 * @returns {URL}
 */
function parseTargetUrl(raw) {
  if (typeof raw !== 'string' || !raw.trim()) throw new Error('url required');
  let u;
  try {
    u = new URL(raw.trim());
  } catch {
    throw new Error('invalid URL');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error('only http and https are allowed');
  }
  return u;
}

/**
 * Convert Node fetch Headers into a lower-cased plain object.
 * @param {Headers} headers
 * @returns {Object<string,string>}
 */
function headersToObject(headers) {
  const out = {};
  for (const [k, v] of headers.entries()) out[k.toLowerCase()] = v;
  return out;
}

/**
 * Issue a HEAD request first; fall back to GET if the server rejects HEAD.
 * @param {URL} url
 * @returns {Promise<Response>}
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
 * POST /audit/external — body { url: string }
 * @type {import('express').RequestHandler}
 */
async function postExternalAudit(req, res) {
  const startedAt = Date.now();
  let url;
  try {
    url = parseTargetUrl(req.body && req.body.url);
    await assertPublicHost(url.hostname);
  } catch (e) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ error: e.message });
    return;
  }

  try {
    const upstream = await fetchResponseHeaders(url);
    const headers = headersToObject(upstream.headers);
    const findings = gradeExternalHeaders(headers);
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
      finalUrl: upstream.url,
      status: upstream.status,
      fetchedAt: new Date().toISOString(),
      elapsedMs,
      grade,
      findings,
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

module.exports = { postExternalAudit, _internals: { isPrivateIp, parseTargetUrl, MAX_REDIRECTS } };
