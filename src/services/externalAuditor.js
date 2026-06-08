/**
 * @file services/externalAuditor.js
 * @description Graded audit for *external* sites. Unlike services/headerAuditor.js
 *              (which compares response headers byte-for-byte against this
 *              template's golden-standard policy), this auditor uses the looser,
 *              criterion-based rules that public scanners like SecurityHeaders.com
 *              and Mozilla HTTP Observatory apply.
 *
 *              Each finding has a level:
 *                - pass  — header present and configured well
 *                - warn  — present but suboptimal
 *                - fail  — missing or actively unsafe
 * @author Istinye University - Secure Web Development
 */

'use strict';

/**
 * Grade all six core security headers.
 * @param {Object<string,string>} headers Lower-cased header map from the response.
 * @returns {Array<{header:string, present:boolean, value:string|null, level:'pass'|'warn'|'fail', reason:string}>}
 */
function gradeExternalHeaders(headers) {
  return [
    gradeCsp(headers['content-security-policy']),
    gradeHsts(headers['strict-transport-security']),
    gradeXfo(headers['x-frame-options'], headers['content-security-policy']),
    gradeNosniff(headers['x-content-type-options']),
    gradeReferrer(headers['referrer-policy']),
    gradePermissions(headers['permissions-policy']),
  ];
}

/**
 * Content-Security-Policy: present + no unsafe-* + no wildcard = pass.
 * @param {string|undefined} value
 */
function gradeCsp(value) {
  if (!value) return finding('content-security-policy', null, 'fail', 'missing');
  const hasUnsafeInline = /'unsafe-inline'/.test(value);
  const hasUnsafeEval = /'unsafe-eval'/.test(value);
  const hasWildcard = /(?:^|\s)\*(?:\s|;|$)/.test(value);
  const hasDataScript = /script-src[^;]*\bdata:/.test(value);
  if (hasUnsafeEval || hasWildcard || hasDataScript) {
    return finding('content-security-policy', value, 'fail', 'weak directive (unsafe-eval / wildcard / data: in script-src)');
  }
  if (hasUnsafeInline) {
    return finding('content-security-policy', value, 'warn', "'unsafe-inline' present — consider nonce/hash + strict-dynamic");
  }
  return finding('content-security-policy', value, 'pass', 'present, no unsafe directives');
}

/**
 * Strict-Transport-Security: max-age >= 1 year + includeSubDomains.
 * @param {string|undefined} value
 */
function gradeHsts(value) {
  if (!value) return finding('strict-transport-security', null, 'fail', 'missing');
  const maxAgeMatch = value.match(/max-age=(\d+)/i);
  if (!maxAgeMatch) return finding('strict-transport-security', value, 'fail', 'no max-age directive');
  const seconds = parseInt(maxAgeMatch[1], 10);
  const hasSubdomains = /includeSubDomains/i.test(value);
  const hasPreload = /preload/i.test(value);
  if (seconds < 15552000) { // 6 months
    return finding('strict-transport-security', value, 'fail', `max-age=${seconds} below 6-month minimum`);
  }
  if (seconds < 31536000 || !hasSubdomains) {
    const reasons = [];
    if (seconds < 31536000) reasons.push(`max-age=${seconds} below 1 year`);
    if (!hasSubdomains) reasons.push('missing includeSubDomains');
    return finding('strict-transport-security', value, 'warn', reasons.join(', '));
  }
  return finding('strict-transport-security', value, 'pass', hasPreload ? 'preload-ready' : '1y+ with includeSubDomains');
}

/**
 * X-Frame-Options: DENY or SAMEORIGIN. CSP frame-ancestors is an acceptable substitute.
 * @param {string|undefined} value
 * @param {string|undefined} csp
 */
function gradeXfo(value, csp) {
  const fa = csp && /frame-ancestors\s+[^;]+/i.exec(csp);
  if (value) {
    const v = value.trim().toUpperCase();
    if (v === 'DENY' || v === 'SAMEORIGIN') {
      return finding('x-frame-options', value, 'pass', v);
    }
    if (/^ALLOW-FROM/i.test(v)) {
      return finding('x-frame-options', value, 'warn', 'ALLOW-FROM is deprecated and ignored by modern browsers');
    }
    return finding('x-frame-options', value, 'warn', 'unrecognised value');
  }
  if (fa) {
    return finding('x-frame-options', null, 'pass', `delegated to CSP frame-ancestors: ${fa[0]}`);
  }
  return finding('x-frame-options', null, 'fail', 'missing (no CSP frame-ancestors either)');
}

/**
 * X-Content-Type-Options: exactly "nosniff".
 * @param {string|undefined} value
 */
function gradeNosniff(value) {
  if (!value) return finding('x-content-type-options', null, 'fail', 'missing');
  if (value.trim().toLowerCase() === 'nosniff') {
    return finding('x-content-type-options', value, 'pass', 'nosniff');
  }
  return finding('x-content-type-options', value, 'warn', 'value other than nosniff is ignored');
}

/**
 * Referrer-Policy: strict-* or no-referrer or same-origin are safe.
 * @param {string|undefined} value
 */
function gradeReferrer(value) {
  if (!value) return finding('referrer-policy', null, 'warn', 'missing (browser default is strict-origin-when-cross-origin)');
  const v = value.trim().toLowerCase();
  const safe = ['no-referrer', 'same-origin', 'strict-origin', 'strict-origin-when-cross-origin'];
  const unsafe = ['unsafe-url', 'no-referrer-when-downgrade'];
  if (safe.includes(v)) return finding('referrer-policy', value, 'pass', v);
  if (unsafe.includes(v)) return finding('referrer-policy', value, 'fail', `${v} leaks Referer over HTTPS→HTTP downgrade`);
  return finding('referrer-policy', value, 'warn', 'origin-based policy — consider strict-origin variants');
}

/**
 * Permissions-Policy: any presence is better than none; check for ()-deny pattern.
 * @param {string|undefined} value
 */
function gradePermissions(value) {
  if (!value) return finding('permissions-policy', null, 'fail', 'missing');
  const denyCount = (value.match(/=\(\)/g) || []).length;
  if (denyCount >= 3) return finding('permissions-policy', value, 'pass', `${denyCount} features disabled`);
  return finding('permissions-policy', value, 'warn', 'present but few features explicitly disabled');
}

/**
 * Compute a 0-100 score from findings (rough SecurityHeaders.com-style).
 * @param {Array<{level:'pass'|'warn'|'fail'}>} findings
 * @returns {{score:number, grade:string, summary:{pass:number, warn:number, fail:number}}}
 */
function computeGrade(findings) {
  const summary = { pass: 0, warn: 0, fail: 0 };
  for (const f of findings) summary[f.level]++;
  const score = Math.max(0, Math.min(100, summary.pass * 16 + summary.warn * 6));
  let grade = 'F';
  if (score >= 95) grade = 'A+';
  else if (score >= 85) grade = 'A';
  else if (score >= 75) grade = 'B';
  else if (score >= 65) grade = 'C';
  else if (score >= 50) grade = 'D';
  return { score, grade, summary };
}

function finding(header, value, level, reason) {
  return { header, present: value !== null && value !== undefined, value: value || null, level, reason };
}

module.exports = { gradeExternalHeaders, computeGrade };
