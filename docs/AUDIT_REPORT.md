# Audit Report

A worked example of the ten-site audit matrix and one full
penetration-test finding, formatted for the final project submission.

## Ten-site audit matrix (template)

| # | Target URL              | CSP | HSTS | XFO | nosniff | Referrer | Permissions | Overall |
|---|-------------------------|-----|------|-----|---------|----------|-------------|---------|
| 1 | https://mullvad.net      | WARN| OK   | OK  | OK      | OK       | OK          | A       |
| 2 | https://google.com       | FAIL| FAIL | OK  | FAIL    | WARN     | FAIL        | F       |
| 3 | https://owasp.org        | FAIL| OK   | OK  | OK      | OK       | WARN        | C       |

Legend: **OK** present and correctly configured; **WARN** present but
weak; **FAIL** absent.

## Example penetration-test finding

> **Finding ID:** SH-2026-001
>
> **Title:** Missing clickjacking protection (no `X-Frame-Options` and no
> CSP `frame-ancestors`).
>
> **Severity:** Medium (CVSS v3.1 = 4.3,
> `AV:N/AC:L/PR:N/UI:R/S:U/C:N/I:L/A:N`).
>
> **Affected asset:** `https://target2.example/account/settings` (HTML
> responses).
>
> **Description:** The application does not return an `X-Frame-Options`
> header nor a Content-Security-Policy `frame-ancestors` directive on
> framable HTML responses. A browser will therefore permit any
> third-party origin to embed these pages in an `<iframe>`, enabling
> UI-redressing (clickjacking).
>
> **Evidence:**
>
> ```
> $ curl -sI https://target2.example/account/settings | grep -iE 'x-frame-options|content-security-policy'
> $   # no output - neither header present
> ```
>
> A proof-of-concept `<iframe src="https://target2.example/account/settings">`
> rendered the live page with no framing restriction.
>
> **Impact:** An attacker can overlay invisible controls atop decoy
> content to trick an authenticated user into performing state-changing
> actions (changing account settings, authorising payments) without
> their knowledge.
>
> **Likelihood:** Moderate &mdash; requires social-engineering the
> victim to visit an attacker page while authenticated, but the
> technique is well-understood and trivially deployed.
>
> **OWASP / CWE reference:** CWE-1021 (Improper Restriction of Rendered
> UI Layers or Frames); OWASP A05:2021 &mdash; Security Misconfiguration;
> OWASP Clickjacking Defense Cheat Sheet.
>
> **Recommendation / remediation:** Return both headers on all HTML
> responses (defence in depth):
>
> ```nginx
> add_header X-Frame-Options "DENY" always;
> add_header Content-Security-Policy "frame-ancestors 'none'" always;
> ```
>
> If specific trusted embedders are required, replace with
> `frame-ancestors https://trusted-partner.example;` and omit
> `X-Frame-Options DENY` to avoid conflict. Verify with `curl -sI` post
> deployment and re-scan via SecurityHeaders.com and Mozilla Observatory.
>
> **References:** RFC 7034; MDN `X-Frame-Options`; W3C CSP Level 3
> (`frame-ancestors`); OWASP Clickjacking Defense Cheat Sheet.
