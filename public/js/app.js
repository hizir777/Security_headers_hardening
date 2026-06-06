/**
 * @file public/js/app.js
 * @description Small front-end behaviour shared across pages. Loaded with
 *              a per-response nonce attribute so the strict CSP allows it
 *              to execute. Avoids any DOM XSS sinks (no innerHTML on
 *              untrusted strings) so Trusted Types stays happy.
 * @author Istinye University - Secure Web Development
 */

(function initApp() {
  'use strict';

  /**
   * Highlight the active nav link based on the current location.
   */
  function highlightActiveNav() {
    const links = document.querySelectorAll('.site-header nav a');
    const path = window.location.pathname;
    links.forEach((link) => {
      if (link.getAttribute('href') === path) {
        link.setAttribute('aria-current', 'page');
        link.style.color = 'var(--color-accent-hover)';
      }
    });
  }

  /**
   * Emit a small console banner so a curious user lands on the docs.
   */
  function emitConsoleBanner() {
    const styles = 'color:#6e7bff;font-weight:700;font-size:13px;';
    console.log('%cSecurity Headers Hardening Template', styles);
    console.log('Inspect Network > Response Headers to verify the policy.');
  }

  document.addEventListener('DOMContentLoaded', () => {
    highlightActiveNav();
    emitConsoleBanner();
  });
})();
