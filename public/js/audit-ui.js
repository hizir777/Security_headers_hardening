/**
 * @file public/js/audit-ui.js
 * @description Front-end for the /audit page. Two modes:
 *                1. Self-audit — fetch /readyz and render the template's own headers
 *                2. External audit — POST /audit/external { url } and render graded
 *                   pass/warn/fail findings for any public URL
 *
 *              Results can be downloaded as JSON, CSV, or copied as a Markdown
 *              table row suitable for docs/AUDIT_REPORT.md.
 *
 *              Uses textContent (never innerHTML) so Trusted Types stays satisfied.
 * @author Istinye University - Secure Web Development
 */

(function initAuditUi() {
  'use strict';

  /** @type {object|null} Last successful audit payload (for downloads) */
  let lastResult = null;

  /* ────────────────────────── DOM helpers ────────────────────────── */

  function $(id) {
    return document.getElementById(id);
  }

  function clearChildren(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
  }

  function setStatus(message, level) {
    const el = $('audit-status');
    if (!el) return;
    el.textContent = message || '';
    el.dataset.level = level || '';
  }

  /* ────────────────────────── Render ────────────────────────── */

  /**
   * Render a single finding row.
   * @param {HTMLTableSectionElement} tbody
   * @param {{header:string, present:boolean, value:string|null, level?:string, pass?:boolean, reason:string}} f
   */
  function renderRow(tbody, f) {
    const tr = document.createElement('tr');
    const hdr = document.createElement('td');
    const present = document.createElement('td');
    const value = document.createElement('td');
    const status = document.createElement('td');
    const reason = document.createElement('td');

    const level = f.level || (f.pass ? 'pass' : 'fail');

    hdr.textContent = f.header;
    present.textContent = f.present ? 'yes' : 'no';
    const code = document.createElement('code');
    code.textContent = f.value || '(not set)';
    value.appendChild(code);
    status.textContent = level.toUpperCase();
    status.classList.add(`status-${level}`);
    reason.textContent = f.reason || '';

    tr.append(hdr, present, value, status, reason);
    tbody.appendChild(tr);
  }

  /**
   * Replace the table body with new findings.
   * @param {Array} findings
   */
  function paintTable(findings) {
    const tbody = document.querySelector('#audit-table tbody');
    if (!tbody) return;
    clearChildren(tbody);
    findings.forEach((f) => renderRow(tbody, f));
  }

  /**
   * Show the grade badge + metadata block for external audits.
   * @param {object} result
   */
  function paintSummary(result) {
    const wrap = $('audit-summary');
    if (!wrap) return;
    wrap.hidden = false;

    const badge = $('grade-badge');
    badge.textContent = result.grade.grade;
    badge.dataset.grade = result.grade.grade;

    $('meta-target').textContent = result.target;
    $('meta-final').textContent = result.finalUrl || result.target;
    $('meta-status').textContent = String(result.status);
    $('meta-score').textContent = String(result.grade.score);
    $('meta-counts').textContent =
      `${result.grade.summary.pass} / ${result.grade.summary.warn} / ${result.grade.summary.fail}`;
    $('meta-elapsed').textContent = String(result.elapsedMs);
  }

  function hideSummary() {
    const wrap = $('audit-summary');
    if (wrap) wrap.hidden = true;
  }

  /* ────────────────────────── Audits ────────────────────────── */

  /**
   * Run the self-audit against /readyz (this server's own headers).
   * @returns {Promise<void>}
   */
  async function runSelfAudit() {
    setStatus('Running self-audit…', 'info');
    hideSummary();
    try {
      const res = await fetch('/readyz', { credentials: 'same-origin' });
      const json = await res.json();
      const findings = Array.isArray(json.findings) ? json.findings : [];
      paintTable(findings);
      lastResult = {
        target: window.location.origin,
        finalUrl: window.location.origin,
        status: res.status,
        fetchedAt: new Date().toISOString(),
        findings,
        mode: 'self',
      };
      setStatus(`Self-audit complete — ${findings.length} headers checked.`, 'ok');
    } catch (err) {
      console.error('audit-ui.self-failed', err);
      setStatus(`Self-audit failed: ${err.message}`, 'fail');
    }
  }

  /**
   * Run a graded audit against an external URL via the server proxy.
   * @param {string} url
   * @returns {Promise<void>}
   */
  async function runExternalAudit(url) {
    setStatus(`Auditing ${url}…`, 'info');
    hideSummary();
    try {
      const res = await fetch('/audit/external', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();
      if (!res.ok) {
        setStatus(`Audit failed: ${json.error || res.status} — ${json.detail || ''}`, 'fail');
        paintTable([]);
        return;
      }
      paintTable(json.findings);
      paintSummary(json);
      lastResult = { ...json, mode: 'external' };
      setStatus(`Audit complete — grade ${json.grade.grade} (${json.grade.score}/100).`, 'ok');
    } catch (err) {
      console.error('audit-ui.external-failed', err);
      setStatus(`Audit failed: ${err.message}`, 'fail');
    }
  }

  /* ────────────────────────── Downloads ────────────────────────── */

  /**
   * Trigger a download for the given content.
   * @param {string} filename
   * @param {string} content
   * @param {string} mime
   */
  function downloadFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /**
   * Build a safe filename slug from a URL.
   * @param {string} url
   */
  function slugFromUrl(url) {
    try {
      const u = new URL(url);
      return u.hostname.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    } catch {
      return 'audit';
    }
  }

  /**
   * Convert findings array to CSV.
   * @param {Array} findings
   */
  function findingsToCsv(findings) {
    const header = ['header', 'present', 'value', 'level', 'reason'];
    const escape = (s) => `"${String(s == null ? '' : s).replace(/"/g, '""')}"`;
    const rows = [header.join(',')];
    for (const f of findings) {
      rows.push([
        escape(f.header),
        escape(f.present ? 'yes' : 'no'),
        escape(f.value),
        escape(f.level || (f.pass ? 'pass' : 'fail')),
        escape(f.reason),
      ].join(','));
    }
    return rows.join('\n');
  }

  /**
   * Build one row for the docs/AUDIT_REPORT.md ten-site matrix.
   * @param {object} result
   */
  function findingsToMarkdownRow(result) {
    const cell = (level) => {
      if (level === 'pass') return '✅';
      if (level === 'warn') return '⚠️';
      return '❌';
    };
    const by = {};
    for (const f of result.findings) by[f.header] = f.level || (f.pass ? 'pass' : 'fail');
    const target = result.target || '';
    return `| ${target} | ${cell(by['content-security-policy'])} | ${cell(by['strict-transport-security'])} | ${cell(by['x-frame-options'])} | ${cell(by['x-content-type-options'])} | ${cell(by['referrer-policy'])} | ${cell(by['permissions-policy'])} | ${result.grade ? result.grade.grade : '–'} |`;
  }

  function handleDownloadJson() {
    if (!lastResult) return;
    const slug = slugFromUrl(lastResult.target || 'audit');
    downloadFile(`audit-${slug}.json`, JSON.stringify(lastResult, null, 2), 'application/json');
  }

  function handleDownloadCsv() {
    if (!lastResult) return;
    const slug = slugFromUrl(lastResult.target || 'audit');
    downloadFile(`audit-${slug}.csv`, findingsToCsv(lastResult.findings), 'text/csv');
  }

  async function handleCopyMarkdown() {
    if (!lastResult) return;
    const row = findingsToMarkdownRow(lastResult);
    try {
      await navigator.clipboard.writeText(row);
      setStatus('Markdown row copied to clipboard.', 'ok');
    } catch (e) {
      setStatus(`Clipboard failed: ${e.message}. Row: ${row}`, 'warn');
    }
  }

  /* ────────────────────────── Wire up ────────────────────────── */

  document.addEventListener('DOMContentLoaded', () => {
    const form = $('audit-form');
    if (form) {
      form.addEventListener('submit', (evt) => {
        evt.preventDefault();
        const input = $('target-url');
        const url = (input && input.value || '').trim();
        if (url) runExternalAudit(url);
      });
    }
    const selfBtn = $('run-self');
    if (selfBtn) selfBtn.addEventListener('click', runSelfAudit);

    const dlJson = $('download-json');
    if (dlJson) dlJson.addEventListener('click', handleDownloadJson);
    const dlCsv = $('download-csv');
    if (dlCsv) dlCsv.addEventListener('click', handleDownloadCsv);
    const copyMd = $('copy-md');
    if (copyMd) copyMd.addEventListener('click', handleCopyMarkdown);

    // Auto-run self-audit on page load so the table is never empty.
    runSelfAudit();
  });
})();
