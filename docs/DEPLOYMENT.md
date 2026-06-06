# Deployment Playbook

A staged rollout that minimises the risk of breaking the production
site while progressively raising the security posture from baseline to
gold-standard.

## Stage 1 &mdash; Baseline (deploy immediately, low risk)

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` (or `SAMEORIGIN` if you self-frame)
- `Referrer-Policy: strict-origin-when-cross-origin`
- Deny-by-default `Permissions-Policy`

These have negligible breakage risk and immediately close clickjacking,
MIME-sniffing, and referrer-leakage vectors.

**Threshold to proceed:** `curl -sI` on apex, www, and a 404 path all
show the four headers.

## Stage 2 &mdash; Transport hardening (after confirming full HTTPS)

Deploy `Strict-Transport-Security: max-age=31536000; includeSubDomains`,
ramping from a short `max-age` while monitoring. Only after every
subdomain is verified permanently HTTPS-capable, raise to
`max-age=63072000; includeSubDomains; preload` and submit to
<https://hstspreload.org>.

**Threshold to proceed:** a DNS subdomain audit confirms 100% HTTPS
coverage and a valid certificate chain. Do **not** add `preload` before
this.

## Stage 3 &mdash; CSP rollout (highest value, highest effort)

Begin in `Content-Security-Policy-Report-Only` mode with:

```
default-src 'self';
script-src 'nonce-{RND}' 'strict-dynamic';
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
report-to csp-endpoint
```

Triage violation reports for 2&ndash;4 weeks. Refactor inline event
handlers (`onclick="…"`) to `addEventListener`. When the report stream
contains only known-benign noise, flip from `Content-Security-Policy-Report-Only`
to `Content-Security-Policy`.

**Threshold to enforce:** violation reports drop to noise only.

## Stage 4 &mdash; Trusted Types and continuous assurance

Add `require-trusted-types-for 'script'` (report-only first) to
eliminate DOM-XSS sinks, deploy SRI on every CDN script, and wire
SecurityHeaders.com / Mozilla Observatory / Google CSP Evaluator into
CI so a header regression fails the build.

**Benchmark:** sustained A+ on both scanners and zero
CSP / Trusted-Types violations in production telemetry.

## Triggers to revisit

- A drop below Observatory grade A.
- A new third-party script or CDN added to the page.
- A new subdomain (re-validate HSTS and preload coverage).
- A Helmet major version upgrade (re-verify defaults &mdash; they evolve).
