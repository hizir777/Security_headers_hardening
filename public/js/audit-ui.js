/**
 * @file public/js/audit-ui.js
 * @description Front-end for /audit. Two modes (self + external), three
 *              result tabs (Core / Additional / Raw), four downloads (JSON,
 *              CSV, Markdown, HTML) plus copy-matrix-row. URL input is
 *              lenient — protocol is auto-prepended client-side and again
 *              server-side.
 *
 *              All rendering goes through textContent / DOM APIs — never
 *              innerHTML — so Trusted Types stays satisfied.
 * @author Istinye University - Secure Web Development
 */

(function initAuditUi() {
  'use strict';

  /** @type {object|null} Last successful audit payload (for downloads) */
  let lastResult = null;

  /* ────────────────────── DOM helpers ────────────────────── */

  const $ = (id) => document.getElementById(id);

  function clearChildren(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
  }

  function el(tag, props, children) {
    const node = document.createElement(tag);
    if (props) for (const k in props) {
      if (k === 'class') node.className = props[k];
      else if (k === 'dataset') Object.assign(node.dataset, props[k]);
      else if (k === 'text') node.textContent = props[k];
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), props[k]);
      else node.setAttribute(k, props[k]);
    }
    if (children) for (const c of children) {
      if (c == null) continue;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return node;
  }

  /* ────────────────────── State / status surface ────────────────────── */

  function setStatus(level, message, withSpinner) {
    const bar = $('audit-status');
    if (!bar) return;
    clearChildren(bar);
    if (!level) {
      delete bar.dataset.level;
      return;
    }
    bar.dataset.level = level;
    if (withSpinner) bar.appendChild(el('span', { class: 'spinner', 'aria-hidden': 'true' }));
    bar.appendChild(document.createTextNode(message));
  }

  function showResult() {
    $('audit-result').hidden = false;
    $('audit-empty').style.display = 'none';
  }

  function showEmpty() {
    $('audit-result').hidden = true;
    $('audit-empty').style.display = 'block';
  }

  /* ────────────────────── URL normalisation ────────────────────── */

  function normaliseUrl(raw) {
    const s = String(raw || '').trim();
    if (!s) return '';
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) return s;
    return 'https://' + s;
  }

  /* ────────────────────── Render: hero ────────────────────── */

  function renderHero(result) {
    let url;
    try { url = new URL(result.target); } catch { url = null; }
    const hostname = url ? url.hostname : (result.hostname || result.target);

    $('site-hostname').textContent = hostname;

    const link = $('site-target-link');
    link.textContent = result.finalUrl || result.target;
    link.href = result.finalUrl || result.target;

    const letter = $('favicon-letter');
    if (letter) {
      letter.textContent = (hostname || '?').replace(/^www\./i, '').charAt(0) || '?';
    }

    $('meta-status').textContent = `HTTP ${result.status || '—'}${result.statusText ? ' ' + result.statusText : ''}`;
    $('meta-elapsed').textContent = `${result.elapsedMs ?? '—'} ms`;
    $('meta-time').textContent = new Date(result.fetchedAt || Date.now()).toLocaleString();

    const g = result.grade || {};
    const ring = document.querySelector('.grade-ring');
    if (ring) ring.dataset.grade = g.grade || '';
    $('grade-letter').textContent = g.grade || '—';
    $('grade-score').textContent  = (g.score ?? '—').toString();

    // Ring fill animation
    const CIRC = 326.7; // 2 * π * 52
    const fg = $('grade-ring-fg');
    if (fg) {
      const score = Math.max(0, Math.min(100, Number(g.score) || 0));
      fg.style.strokeDashoffset = String(CIRC - (CIRC * score) / 100);
    }

    $('stat-pass').textContent  = g.summary ? g.summary.pass : '—';
    $('stat-warn').textContent  = g.summary ? g.summary.warn : '—';
    $('stat-fail').textContent  = g.summary ? g.summary.fail : '—';
    $('stat-total').textContent = g.total || (result.findings || []).length;
  }

  /* ────────────────────── Render: findings ────────────────────── */

  function renderFinding(f) {
    const level = f.level || (f.pass ? 'pass' : 'fail');
    const card = el('li', { class: 'finding', dataset: { level } });

    const left = el('div', { class: 'finding-main' }, [
      el('div', { class: 'finding-header', text: f.header }),
      el('div', { class: 'finding-reason', text: f.reason || '' }),
    ]);
    const right = el('span', {
      class: 'finding-level',
      dataset: { level },
      text: level.toUpperCase(),
    });
    card.append(left, right);

    if (f.value) {
      card.append(el('div', { class: 'finding-value', text: f.value }));
    }
    return card;
  }

  function renderFindings(listId, findings) {
    const list = $(listId);
    clearChildren(list);
    for (const f of findings) list.appendChild(renderFinding(f));
  }

  /* ────────────────────── Render: raw headers ────────────────────── */

  function renderRaw(headers) {
    const wrap = $('raw-headers');
    clearChildren(wrap);
    const keys = Object.keys(headers || {}).sort();
    if (!keys.length) {
      wrap.appendChild(el('div', { text: '(no headers)' }));
      return;
    }
    for (const k of keys) {
      wrap.appendChild(el('div', { class: 'raw-row' }, [
        el('div', { class: 'raw-key', text: k + ':' }),
        el('div', { class: 'raw-value', text: headers[k] }),
      ]));
    }
  }

  /* ────────────────────── Tab switching ────────────────────── */

  function switchTab(name) {
    document.querySelectorAll('.tab').forEach((t) => {
      const active = t.dataset.tab === name;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('.tab-panel').forEach((p) => {
      const active = p.id === `panel-${name}`;
      p.classList.toggle('is-active', active);
      p.hidden = !active;
    });
  }

  /* ────────────────────── Audits ────────────────────── */

  async function runExternalAudit(rawUrl) {
    const url = normaliseUrl(rawUrl);
    if (!url) {
      setStatus('warn', 'Please type a URL.');
      return;
    }
    setStatus('loading', `Auditing ${url}…`, true);
    showResult();

    try {
      const res = await fetch('/audit/external', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();

      if (!res.ok) {
        setStatus('fail', `${json.error || res.status}: ${json.detail || 'unknown error'}`);
        return;
      }

      renderHero(json);
      renderFindings('findings-core', json.findings || []);
      renderFindings('findings-additional', json.additionalChecks || []);
      renderRaw(json.rawHeaders || {});

      $('tab-count-core').textContent       = (json.findings || []).length;
      $('tab-count-additional').textContent = (json.additionalChecks || []).length;
      $('tab-count-raw').textContent        = Object.keys(json.rawHeaders || {}).length;

      lastResult = { ...json, mode: 'external' };
      switchTab('core');
      setStatus('ok', `Audit complete — grade ${json.grade.grade} (${json.grade.score}/100) for ${json.hostname || url}.`);
    } catch (err) {
      console.error('audit-ui.external-failed', err);
      setStatus('fail', `Request failed: ${err.message}`);
    }
  }

  async function runSelfAudit() {
    setStatus('loading', 'Running self-audit on this server…', true);
    showResult();
    try {
      const res = await fetch('/readyz', { credentials: 'same-origin' });
      const json = await res.json();
      const findings = Array.isArray(json.findings) ? json.findings : [];

      const summary = { pass: 0, warn: 0, fail: 0 };
      for (const f of findings) {
        const level = f.level || (f.pass ? 'pass' : 'fail');
        if (summary[level] !== undefined) summary[level]++;
        f.level = level;
      }
      const score = Math.max(0, Math.min(100, summary.pass * 16 + summary.warn * 6));
      const grade =
        score >= 95 ? 'A+' :
        score >= 85 ? 'A'  :
        score >= 75 ? 'B'  :
        score >= 65 ? 'C'  :
        score >= 50 ? 'D'  : 'F';

      const payload = {
        target: window.location.origin,
        hostname: window.location.hostname,
        finalUrl: window.location.origin,
        status: res.status,
        statusText: 'OK',
        fetchedAt: new Date().toISOString(),
        elapsedMs: 0,
        grade: { score, grade, summary, total: findings.length },
        findings,
        additionalChecks: [],
        rawHeaders: {},
        mode: 'self',
      };
      renderHero(payload);
      renderFindings('findings-core', findings);
      renderFindings('findings-additional', []);
      renderRaw({});
      $('tab-count-core').textContent = findings.length;
      $('tab-count-additional').textContent = 0;
      $('tab-count-raw').textContent = 0;
      lastResult = payload;
      switchTab('core');
      setStatus('ok', `Self-audit complete — ${findings.length} headers checked.`);
    } catch (err) {
      console.error('audit-ui.self-failed', err);
      setStatus('fail', `Self-audit failed: ${err.message}`);
    }
  }

  /* ────────────────────── Downloads ────────────────────── */

  function download(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function slug(url) {
    try { return new URL(url).hostname.replace(/[^a-z0-9]/gi, '-').toLowerCase(); }
    catch { return 'audit'; }
  }

  function toCsv(findings) {
    const header = ['header', 'present', 'value', 'level', 'reason'];
    const esc = (s) => `"${String(s == null ? '' : s).replace(/"/g, '""')}"`;
    const rows = [header.join(',')];
    for (const f of findings) {
      const level = f.level || (f.pass ? 'pass' : 'fail');
      rows.push([esc(f.header), esc(f.present ? 'yes' : 'no'), esc(f.value), esc(level), esc(f.reason)].join(','));
    }
    return rows.join('\n');
  }

  function toMarkdown(result) {
    const lines = [];
    lines.push(`# Security Header Audit — ${result.hostname || result.target}`);
    lines.push('');
    lines.push(`- **Target:** ${result.target}`);
    if (result.finalUrl && result.finalUrl !== result.target) lines.push(`- **Final URL:** ${result.finalUrl}`);
    lines.push(`- **HTTP status:** ${result.status}`);
    lines.push(`- **Fetched at:** ${result.fetchedAt}`);
    lines.push(`- **Elapsed:** ${result.elapsedMs} ms`);
    lines.push(`- **Grade:** ${result.grade.grade} (${result.grade.score}/100)`);
    lines.push(`- **Pass / Warn / Fail:** ${result.grade.summary.pass} / ${result.grade.summary.warn} / ${result.grade.summary.fail}`);
    lines.push('');
    lines.push('## Core headers');
    lines.push('');
    lines.push('| Header | Status | Value | Reason |');
    lines.push('|---|---|---|---|');
    for (const f of result.findings || []) {
      const level = (f.level || (f.pass ? 'pass' : 'fail')).toUpperCase();
      const val = (f.value || '').replace(/\|/g, '\\|');
      lines.push(`| \`${f.header}\` | ${level} | ${val ? '`' + val.slice(0, 200) + (val.length > 200 ? '…' : '') + '`' : '(missing)'} | ${f.reason || ''} |`);
    }
    if (result.additionalChecks && result.additionalChecks.length) {
      lines.push('');
      lines.push('## Additional checks');
      lines.push('');
      lines.push('| Header | Status | Value | Reason |');
      lines.push('|---|---|---|---|');
      for (const f of result.additionalChecks) {
        const level = (f.level || 'info').toUpperCase();
        const val = (f.value || '').replace(/\|/g, '\\|');
        lines.push(`| \`${f.header}\` | ${level} | ${val ? '`' + val.slice(0, 200) + '`' : '(missing)'} | ${f.reason || ''} |`);
      }
    }
    return lines.join('\n');
  }

  function toMatrixRow(result) {
    const cell = (lvl) => lvl === 'pass' ? '✅' : lvl === 'warn' ? '⚠️' : '❌';
    const by = {};
    for (const f of result.findings || []) by[f.header] = f.level || (f.pass ? 'pass' : 'fail');
    return `| ${result.target} | ${cell(by['content-security-policy'])} | ${cell(by['strict-transport-security'])} | ${cell(by['x-frame-options'])} | ${cell(by['x-content-type-options'])} | ${cell(by['referrer-policy'])} | ${cell(by['permissions-policy'])} | ${result.grade ? result.grade.grade : '–'} |`;
  }

  function toHtmlReport(result) {
    // Render a printable static HTML report. textContent everywhere via
    // escapeHtml to avoid injection. Inline styles only — no external assets.
    const esc = (s) => String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    const row = (f, kind) => {
      const level = (f.level || (f.pass ? 'pass' : kind)).toUpperCase();
      const color = level === 'PASS' ? '#16a34a'
                  : level === 'WARN' ? '#ca8a04'
                  : level === 'FAIL' ? '#dc2626'
                  : '#6366f1';
      return `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:monospace;">${esc(f.header)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:${color};font-weight:700">${level}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:monospace;font-size:11px;word-break:break-all;max-width:520px;">${esc(f.value || '(missing)')}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${esc(f.reason)}</td>
        </tr>`;
    };
    const coreRows = (result.findings || []).map((f) => row(f, 'fail')).join('');
    const addRows  = (result.additionalChecks || []).map((f) => row(f, 'info')).join('');

    return `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<title>Audit — ${esc(result.hostname || result.target)}</title>
</head>
<body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111827;max-width:980px;margin:40px auto;padding:0 20px;">
<h1 style="margin:0 0 8px;">Security Header Audit</h1>
<div style="color:#6b7280;margin-bottom:24px;">Generated by Security Headers Hardening template — ${esc(result.fetchedAt)}</div>

<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:24px;display:flex;align-items:center;gap:24px;">
  <div style="font-size:48px;font-weight:800;color:#4f46e5;">${esc(result.grade.grade)}</div>
  <div>
    <div style="font-size:14px;color:#6b7280;">Target</div>
    <div style="font-family:monospace;font-size:18px;font-weight:700;">${esc(result.hostname || result.target)}</div>
    <div style="margin-top:6px;font-size:13px;color:#374151;">HTTP ${esc(result.status)} · ${esc(result.elapsedMs)} ms · ${esc(result.grade.score)}/100 · ${esc(result.grade.summary.pass)} pass / ${esc(result.grade.summary.warn)} warn / ${esc(result.grade.summary.fail)} fail</div>
  </div>
</div>

<h2 style="margin-top:32px;">Core headers</h2>
<table style="width:100%;border-collapse:collapse;font-size:14px;">
  <thead><tr style="background:#f3f4f6;">
    <th style="text-align:left;padding:8px 12px;">Header</th>
    <th style="text-align:left;padding:8px 12px;">Status</th>
    <th style="text-align:left;padding:8px 12px;">Value</th>
    <th style="text-align:left;padding:8px 12px;">Reason</th>
  </tr></thead>
  <tbody>${coreRows}</tbody>
</table>

${addRows ? `
<h2 style="margin-top:32px;">Additional checks</h2>
<table style="width:100%;border-collapse:collapse;font-size:14px;">
  <thead><tr style="background:#f3f4f6;">
    <th style="text-align:left;padding:8px 12px;">Header</th>
    <th style="text-align:left;padding:8px 12px;">Status</th>
    <th style="text-align:left;padding:8px 12px;">Value</th>
    <th style="text-align:left;padding:8px 12px;">Reason</th>
  </tr></thead>
  <tbody>${addRows}</tbody>
</table>
` : ''}

</body></html>`;
  }

  function handleDownloadJson() {
    if (!lastResult) return;
    download(`audit-${slug(lastResult.target)}.json`,
      JSON.stringify(lastResult, null, 2), 'application/json');
  }
  function handleDownloadCsv() {
    if (!lastResult) return;
    download(`audit-${slug(lastResult.target)}.csv`,
      toCsv([...(lastResult.findings || []), ...(lastResult.additionalChecks || [])]),
      'text/csv');
  }
  function handleDownloadMd() {
    if (!lastResult) return;
    download(`audit-${slug(lastResult.target)}.md`, toMarkdown(lastResult), 'text/markdown');
  }
  function handleDownloadHtml() {
    if (!lastResult) return;
    download(`audit-${slug(lastResult.target)}.html`, toHtmlReport(lastResult), 'text/html');
  }
  async function handleCopyMatrix() {
    if (!lastResult) return;
    const row = toMatrixRow(lastResult);
    try {
      await navigator.clipboard.writeText(row);
      setStatus('ok', 'Markdown matrix row copied to clipboard.');
    } catch (e) {
      setStatus('warn', `Clipboard blocked: ${e.message}`);
    }
  }

  /* ────────────────────── Wire up ────────────────────── */

  /**
   * Wire up listeners. Called once on DOMContentLoaded; safe to re-run
   * (each addEventListener is idempotent against this scope).
   */
  function boot() {
    console.info('[audit] UI booting — version 3');

    const input = $('target-url');
    const runBtn = $('run-external');
    const form = $('audit-form');

    // Helper that resolves the current input value and kicks off an audit.
    // Debounced so the three redundant entry points (form submit, button
    // click, Enter keydown) cannot fire the same audit twice in a row.
    let lastTrigger = 0;
    const triggerFromInput = () => {
      const now = Date.now();
      if (now - lastTrigger < 200) return;
      lastTrigger = now;
      const v = (input && input.value || '').trim();
      runExternalAudit(v);
    };

    // Redundant triggers — form submit, button click, Enter on input.
    if (form) form.addEventListener('submit', (e) => { e.preventDefault(); triggerFromInput(); });
    if (runBtn) runBtn.addEventListener('click', (e) => { e.preventDefault(); triggerFromInput(); });
    if (input) input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); triggerFromInput(); }
    });

    // Example chips
    const chip = (id, host) => {
      const b = $(id);
      if (b) b.addEventListener('click', () => {
        if (input) input.value = host;
        runExternalAudit(host);
      });
    };
    chip('run-example-google', 'google.com');
    chip('run-example-github', 'github.com');
    chip('run-example-istinye', 'istinye.edu.tr');
    const selfBtn = $('run-self');
    if (selfBtn) selfBtn.addEventListener('click', runSelfAudit);

    // Downloads
    const bind = (id, fn) => { const b = $(id); if (b) b.addEventListener('click', fn); };
    bind('download-json', handleDownloadJson);
    bind('download-csv', handleDownloadCsv);
    bind('download-md', handleDownloadMd);
    bind('download-html', handleDownloadHtml);
    bind('copy-mdrow', handleCopyMatrix);

    // Tabs
    document.querySelectorAll('.tab').forEach((t) => {
      t.addEventListener('click', () => switchTab(t.dataset.tab));
    });

    // First-visit experience: auto-run self-audit so the user sees the
    // dashboard populated with this server's own headers immediately,
    // confirming the UI is wired up correctly.
    showEmpty();
    runSelfAudit().catch((err) => console.error('[audit] self-audit on boot failed', err));
  }

  // DOMContentLoaded may already have fired by the time this script
  // runs (some browsers, some script load orders). Guard accordingly.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
