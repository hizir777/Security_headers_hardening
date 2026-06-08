/**
 * @file services/externalAuditor.js
 * @description Graded audit for external sites. Two-tier output:
 *
 *   - findings[]           — the six CORE security headers, levelled
 *                            pass / warn / fail. These feed the score.
 *   - additionalChecks[]   — supplementary headers (COOP/COEP/CORP,
 *                            X-XSS-Protection, X-Permitted-Cross-Domain-
 *                            Policies, Cache-Control, Server, X-Powered-By,
 *                            Reporting-Endpoints, etc). Levelled info / pass
 *                            / warn but NOT counted in the score.
 *   - rawHeaders{}         — full response header map for the "Raw" tab.
 *
 * Rules mirror SecurityHeaders.com and Mozilla HTTP Observatory.
 * @author Istinye University - Secure Web Development
 */

'use strict';

const CORE_HEADERS = [
  'content-security-policy',
  'strict-transport-security',
  'x-frame-options',
  'x-content-type-options',
  'referrer-policy',
  'permissions-policy',
];

/**
 * Grade all six core security headers.
 * @param {Object<string,string>} headers Lower-cased header map.
 * @returns {Array}
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
 * Check supplementary headers. These influence operator confidence but
 * are not weighted in the headline score.
 * @param {Object<string,string>} headers
 * @returns {Array}
 */
function checkAdditionalHeaders(headers) {
  const out = [];

  out.push(checkCoop(headers['cross-origin-opener-policy']));
  out.push(checkCoep(headers['cross-origin-embedder-policy']));
  out.push(checkCorp(headers['cross-origin-resource-policy']));
  out.push(checkOac(headers['origin-agent-cluster']));
  out.push(checkXxss(headers['x-xss-protection']));
  out.push(checkXpcdp(headers['x-permitted-cross-domain-policies']));
  out.push(checkServer(headers['server']));
  out.push(checkPoweredBy(headers['x-powered-by']));
  out.push(checkReportingEndpoints(headers['reporting-endpoints'] || headers['report-to']));
  out.push(checkCspReportOnly(headers['content-security-policy-report-only']));

  return out;
}

/* ────────────────────────── Core grading ────────────────────────── */

function gradeCsp(value) {
  if (!value) return finding('content-security-policy', null, 'fail', 'Missing — site has no CSP protection against XSS.');
  const hasUnsafeInline = /'unsafe-inline'/.test(value);
  const hasUnsafeEval = /'unsafe-eval'/.test(value);
  const hasWildcard = /(?:^|\s)\*(?:\s|;|$)/.test(value);
  const hasDataScript = /script-src[^;]*\bdata:/.test(value);
  const hasNonce = /'nonce-[A-Za-z0-9+/=]+'/.test(value);
  const hasStrictDynamic = /'strict-dynamic'/.test(value);

  if (hasUnsafeEval || hasWildcard || hasDataScript) {
    return finding('content-security-policy', value, 'fail',
      'Weak directive present (unsafe-eval, wildcard, or data: in script-src).');
  }
  if (hasUnsafeInline && !hasStrictDynamic) {
    return finding('content-security-policy', value, 'warn',
      "'unsafe-inline' present without strict-dynamic. Move to nonce/hash + 'strict-dynamic'.");
  }
  if (hasNonce && hasStrictDynamic) {
    return finding('content-security-policy', value, 'pass',
      'Strict policy with nonce + strict-dynamic.');
  }
  return finding('content-security-policy', value, 'pass',
    'Present without unsafe directives.');
}

function gradeHsts(value) {
  if (!value) return finding('strict-transport-security', null, 'fail',
    'Missing — site is vulnerable to SSL stripping.');
  const m = value.match(/max-age=(\d+)/i);
  if (!m) return finding('strict-transport-security', value, 'fail', 'No max-age directive.');
  const seconds = parseInt(m[1], 10);
  const hasSub = /includeSubDomains/i.test(value);
  const hasPre = /preload/i.test(value);

  if (seconds < 15552000) {
    return finding('strict-transport-security', value, 'fail',
      `max-age=${seconds}s is below the 6-month minimum.`);
  }
  if (seconds < 31536000 || !hasSub) {
    const reasons = [];
    if (seconds < 31536000) reasons.push(`max-age=${seconds}s below 1 year`);
    if (!hasSub) reasons.push('missing includeSubDomains');
    return finding('strict-transport-security', value, 'warn', reasons.join('; ') + '.');
  }
  return finding('strict-transport-security', value, 'pass',
    hasPre ? '≥1y with includeSubDomains and preload.' : '≥1y with includeSubDomains.');
}

function gradeXfo(value, csp) {
  const fa = csp && /frame-ancestors\s+[^;]+/i.exec(csp);
  if (value) {
    const v = value.trim().toUpperCase();
    if (v === 'DENY' || v === 'SAMEORIGIN') {
      return finding('x-frame-options', value, 'pass', `${v} — clickjacking blocked.`);
    }
    if (/^ALLOW-FROM/i.test(v)) {
      return finding('x-frame-options', value, 'warn',
        'ALLOW-FROM is deprecated and ignored by modern browsers.');
    }
    return finding('x-frame-options', value, 'warn', 'Unrecognised value.');
  }
  if (fa) return finding('x-frame-options', null, 'pass',
    `Delegated to CSP frame-ancestors: ${fa[0]}.`);
  return finding('x-frame-options', null, 'fail',
    'Missing and no CSP frame-ancestors — site is exposed to clickjacking.');
}

function gradeNosniff(value) {
  if (!value) return finding('x-content-type-options', null, 'fail',
    'Missing — browsers may MIME-sniff and execute user uploads.');
  if (value.trim().toLowerCase() === 'nosniff') {
    return finding('x-content-type-options', value, 'pass', 'nosniff.');
  }
  return finding('x-content-type-options', value, 'warn',
    'Any value other than "nosniff" is ignored by browsers.');
}

function gradeReferrer(value) {
  if (!value) return finding('referrer-policy', null, 'warn',
    'Missing — relies on the browser default (strict-origin-when-cross-origin in modern browsers).');
  const v = value.trim().toLowerCase();
  const safe = ['no-referrer', 'same-origin', 'strict-origin', 'strict-origin-when-cross-origin'];
  const unsafe = ['unsafe-url', 'no-referrer-when-downgrade'];
  if (safe.includes(v)) return finding('referrer-policy', value, 'pass', v + '.');
  if (unsafe.includes(v)) return finding('referrer-policy', value, 'fail',
    `${v} leaks the full URL on HTTPS→HTTP downgrade.`);
  return finding('referrer-policy', value, 'warn',
    'Origin-based policy. Consider strict-origin or strict-origin-when-cross-origin.');
}

function gradePermissions(value) {
  if (!value) return finding('permissions-policy', null, 'fail',
    'Missing — third-party iframes can silently use camera, mic, geolocation, etc.');
  const denyCount = (value.match(/=\(\)/g) || []).length;
  if (denyCount >= 3) return finding('permissions-policy', value, 'pass',
    `${denyCount} features explicitly disabled.`);
  return finding('permissions-policy', value, 'warn',
    'Present but few features are explicitly disabled.');
}

/* ────────────────────────── Additional checks ────────────────────────── */

function checkCoop(v) {
  if (!v) return finding('cross-origin-opener-policy', null, 'info', 'Not set. Recommended: same-origin.');
  if (/same-origin/i.test(v)) return finding('cross-origin-opener-policy', v, 'pass', 'same-origin isolation enabled.');
  return finding('cross-origin-opener-policy', v, 'info', 'Set but not same-origin.');
}

function checkCoep(v) {
  if (!v) return finding('cross-origin-embedder-policy', null, 'info', 'Not set. Required for cross-origin isolation.');
  if (/require-corp|credentialless/i.test(v)) return finding('cross-origin-embedder-policy', v, 'pass', 'Cross-origin isolation enabled.');
  return finding('cross-origin-embedder-policy', v, 'info', 'Set but not require-corp.');
}

function checkCorp(v) {
  if (!v) return finding('cross-origin-resource-policy', null, 'info', 'Not set. Recommended: same-origin or same-site.');
  return finding('cross-origin-resource-policy', v, 'pass', `Resource sharing limited to ${v}.`);
}

function checkOac(v) {
  if (!v) return finding('origin-agent-cluster', null, 'info', 'Not set.');
  if (/\?1|true/i.test(v)) return finding('origin-agent-cluster', v, 'pass', 'Process-isolated origin.');
  return finding('origin-agent-cluster', v, 'info', 'Set but not enabled.');
}

function checkXxss(v) {
  if (!v) return finding('x-xss-protection', null, 'info',
    'Not set. Modern browsers ignore this header; rely on CSP instead.');
  if (v === '0') return finding('x-xss-protection', v, 'pass',
    'Explicitly disabled (recommended — legacy XSS auditor is buggy, CSP is the modern replacement).');
  return finding('x-xss-protection', v, 'warn',
    'Legacy XSS auditor enabled; can be bypassed and may introduce vulnerabilities. Set to 0.');
}

function checkXpcdp(v) {
  if (!v) return finding('x-permitted-cross-domain-policies', null, 'info', 'Not set.');
  if (/^none$/i.test(v)) return finding('x-permitted-cross-domain-policies', v, 'pass', 'Adobe/Flash policy access blocked.');
  return finding('x-permitted-cross-domain-policies', v, 'info', `Allows policy: ${v}.`);
}

function checkServer(v) {
  if (!v) return finding('server', null, 'pass', 'Header absent — no server fingerprint leaked.');
  return finding('server', v, 'warn',
    `Server software identified: "${v}". Information disclosure — strip in production.`);
}

function checkPoweredBy(v) {
  if (!v) return finding('x-powered-by', null, 'pass', 'Header absent — no framework fingerprint leaked.');
  return finding('x-powered-by', v, 'warn',
    `Framework identified: "${v}". Information disclosure — strip in production.`);
}

function checkReportingEndpoints(v) {
  if (!v) return finding('reporting-endpoints', null, 'info',
    'No CSP/Reporting API endpoint configured. Violations are not collected.');
  return finding('reporting-endpoints', v, 'pass', 'Reporting endpoint configured.');
}

function checkCspReportOnly(v) {
  if (!v) return finding('content-security-policy-report-only', null, 'info', 'Not set.');
  return finding('content-security-policy-report-only', v, 'info',
    'Report-Only policy active (monitoring without enforcement).');
}

/* ────────────────────────── Score & grade ────────────────────────── */

/**
 * Score 0–100 from the SIX CORE findings only. Additional checks do
 * not influence the headline grade.
 * @param {Array} findings
 */
function computeGrade(findings) {
  const summary = { pass: 0, warn: 0, fail: 0 };
  for (const f of findings) {
    if (summary[f.level] !== undefined) summary[f.level]++;
  }
  const score = Math.max(0, Math.min(100, summary.pass * 16 + summary.warn * 6));
  let grade = 'F';
  if (score >= 95) grade = 'A+';
  else if (score >= 85) grade = 'A';
  else if (score >= 75) grade = 'B';
  else if (score >= 65) grade = 'C';
  else if (score >= 50) grade = 'D';
  return { score, grade, summary, total: findings.length };
}

function finding(header, value, level, reason) {
  return { header, present: value != null, value: value || null, level, reason };
}

module.exports = {
  gradeExternalHeaders,
  checkAdditionalHeaders,
  computeGrade,
  CORE_HEADERS,
};
