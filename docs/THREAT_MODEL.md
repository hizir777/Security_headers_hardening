# Threat Model

This document applies a lightweight **STRIDE** lens to the template and
maps each threat to a mitigation that already ships in the codebase.

## System boundary

The trust boundary is the Express process. Anything reachable over the
network (browser, CDN, reverse proxy, attacker) is untrusted; anything
inside the process (config, services, the audit service) is trusted.

```
  ┌────────────────┐    HTTPS    ┌──────────────────────────┐
  │  User browser  │ ──────────► │  Reverse proxy / CDN     │
  └────────────────┘             └──────────────┬───────────┘
                                                │ HTTP (loopback / mTLS)
                                                ▼
                                 ┌──────────────────────────┐
                                 │      Express app         │
                                 │  (this template)          │
                                 └──────────────────────────┘
```

## STRIDE analysis

| Category | Threat | Mitigation |
|---|---|---|
| **S**poofing | Attacker impersonates the server (downgrade) | HSTS preload, TLS at proxy, COOP/COEP/CORP |
| **T**ampering | XSS injects script into the rendered page | Strict nonce CSP + `'strict-dynamic'` + Trusted Types |
| **T**ampering | Magecart skimming via compromised CDN | Tight `script-src` / `connect-src`, SRI on third-party scripts |
| **R**epudiation | Lost evidence of a CSP violation | `/csp-report` receiver + structured logs |
| **I**nformation disclosure | Referer leak of session tokens | `Referrer-Policy: strict-origin-when-cross-origin` |
| **I**nformation disclosure | Server fingerprinting | `hidePoweredBy`, fingerprintStripper |
| **I**nformation disclosure | Verbose 5xx body in prod | `errorHandler` returns generic body when `NODE_ENV=production` |
| **D**enial of service | Floods on public endpoints | `express-rate-limit` with 15-minute 100-request window |
| **D**enial of service | Container privilege escalation | distroless runtime, dropped caps, `no-new-privileges`, read-only fs |
| **E**levation of privilege | Clickjacking (CWE-1021) | `X-Frame-Options DENY` + `frame-ancestors 'none'` |
| **E**levation of privilege | MIME confusion via uploads | `X-Content-Type-Options: nosniff` |
| **E**levation of privilege | Hostile iframe consumes powerful APIs | Deny-by-default Permissions-Policy |

## Non-goals

- **Authentication and session management** are deliberately not in
  scope for this template &mdash; mixing them in would muddy the focus
  on the header layer. Treat this as a starting point you compose with
  your own auth module (Passport, OIDC, etc.).
- **Database hardening** is out of scope. The template ships no
  persistent store.

## Residual risk

A strict CSP cannot protect against:

- Server-side injection (SQLi, SSRF, command injection).
- Business-logic flaws (authorisation bypass, race conditions).
- Compromise of the build pipeline that delivers `node_modules`.

Pair this template with proper input validation, parameterised queries,
SAST/DAST (CodeQL is already wired in `.github/workflows/security.yml`),
and dependency-pinning (`npm ci`, `npm audit`).
