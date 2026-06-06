/**
 * @file public/js/audit-ui.js
 * @description Front-end for the /audit page. Fetches /readyz, parses the
 *              JSON findings, and renders them into a table. Uses
 *              textContent (never innerHTML) so Trusted Types is satisfied.
 * @author Istinye University - Secure Web Development
 */

(function initAuditUi() {
  'use strict';

  /**
   * Render a single finding row into the audit table body.
   * @param {HTMLTableSectionElement} tbody
   * @param {{header:string, present:boolean, value:string|null, pass:boolean, reason:string}} finding
   */
  function renderRow(tbody, finding) {
    const tr = document.createElement('tr');
    const hdr = document.createElement('td');
    const present = document.createElement('td');
    const value = document.createElement('td');
    const status = document.createElement('td');

    hdr.textContent = finding.header;
    present.textContent = finding.present ? 'yes' : 'no';
    const code = document.createElement('code');
    code.textContent = finding.value || '(not set)';
    value.appendChild(code);
    status.textContent = finding.pass ? 'PASS' : 'FAIL';
    status.classList.add(finding.pass ? 'status-ok' : 'status-fail');

    tr.append(hdr, present, value, status);
    tbody.appendChild(tr);
  }

  /**
   * Clear and repopulate the audit table.
   * @param {Array} findings
   */
  function paintTable(findings) {
    const tbody = document.querySelector('#audit-table tbody');
    if (!tbody) return;
    while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
    findings.forEach((f) => renderRow(tbody, f));
  }

  /**
   * Fetch /readyz and refresh the table.
   * @returns {Promise<void>}
   */
  async function runAudit() {
    try {
      const res = await fetch('/readyz', { credentials: 'same-origin' });
      const json = await res.json();
      paintTable(Array.isArray(json.findings) ? json.findings : []);
    } catch (err) {
      console.error('audit-ui.fetch-failed', err);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('run-audit');
    if (btn) btn.addEventListener('click', runAudit);
    runAudit();
  });
})();
