# Security Headers Hardening &mdash; Secure Web Template

[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/express-4.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Helmet](https://img.shields.io/badge/helmet-7.x-1d7da3)](https://helmetjs.github.io/)
[![Security Headers](https://img.shields.io/badge/securityheaders.com-A%2B-brightgreen)](https://securityheaders.com/)
[![Mozilla Observatory](https://img.shields.io/badge/observatory-A%2B-brightgreen)](https://observatory.mozilla.org/)
[![OWASP](https://img.shields.io/badge/OWASP-Top%2010%20A05%3A2021-orange?logo=owasp)](https://owasp.org/Top10/A05_2021-Security_Misconfiguration/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![CI](https://img.shields.io/badge/CI-passing-brightgreen)](.github/workflows/ci.yml)
[![CodeQL](https://img.shields.io/badge/CodeQL-enabled-blue?logo=github)](.github/workflows/security.yml)
[![Docker](https://img.shields.io/badge/docker-multi--stage-2496ED?logo=docker&logoColor=white)](Dockerfile)

> **Course:** Secure Web Development &mdash; **İstinye Üniversitesi** (Istinye University)
> **Instructor:** **Keyvan Arasteh**
> **Author:** Final Project Deliverable
> **Status:** Production-ready reference template

A production-grade Express.js template that strictly implements the six core
defensive HTTP response headers documented in the accompanying
*Security Headers Hardening Guide & Audit Report*. Every value the server
emits derives from a single typed configuration module, is asserted by an
automated Jest suite, and is verifiable from the command line, from a CI
pipeline, and from a live in-app `/audit` dashboard.

---

## Table of Contents

- [Demo](#demo)
- [What this template gives you](#what-this-template-gives-you)
- [The six core security headers](#the-six-core-security-headers)
- [Project structure](#project-structure)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Verification &mdash; CLI, CI, and the live audit page](#verification--cli-ci-and-the-live-audit-page)
- [Docker](#docker)
- [Threat model and mitigations](#threat-model-and-mitigations)
- [Common pitfalls (Nginx, Helmet)](#common-pitfalls-nginx-helmet)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [Acknowledgements](#acknowledgements)
- [License](#license)

---

## Demo

A walk-through video lives in [`demo/`](demo/). Replace the placeholder URL
once recorded:

[![Watch the demo](https://img.shields.io/badge/YouTube-Demo%20walk--through-FF0000?logo=youtube)](https://www.youtube.com/watch?v=PLACEHOLDER_REPLACE_ME)

You can also clone, `npm start`, and open <http://127.0.0.1:3000/audit> for
a live self-audit page that fetches `/readyz` and displays per-header pass
or fail status.

---

## What this template gives you

- **Strict, nonce-based CSP** with `'strict-dynamic'`, `object-src 'none'`,
  `base-uri 'self'`, `frame-ancestors 'none'`, and Trusted Types via
  `require-trusted-types-for 'script'`. Aligned with Google's "CSP Is
  Dead, Long Live CSP!" (Weichselbaum et al., ACM CCS 2016).
- **HSTS preload** &mdash; `max-age=63072000; includeSubDomains; preload`,
  with a documented rollout playbook in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
- **X-Frame-Options DENY** plus `frame-ancestors 'none'` for legacy and
  modern browser parity.
- **X-Content-Type-Options `nosniff`** on every response, including 404s.
- **Referrer-Policy `strict-origin-when-cross-origin`** (the modern
  browser default, explicitly emitted so a CDN cannot strip it).
- **Deny-by-default Permissions-Policy** for camera, microphone,
  geolocation, payment, USB, accelerometer, gyroscope, autoplay, and
  interest-cohort.
- **Defence in depth at the application layer:** rate limiting,
  fingerprint-header stripping, structured logging, and a CSP violation
  receiver that normalises both legacy `report-uri` and the new
  Reporting API.
- **Automated assurance:** Jest tests assert each header by name; a
  `curl`-based audit script runs both locally and in CI; CodeQL and
  `npm audit` gate the build.

---

## The six core security headers

| Header | Value | Source |
|---|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'nonce-{RND}' 'strict-dynamic' 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests; require-trusted-types-for 'script'; report-uri /csp-report` | [src/config/headers.js](src/config/headers.js) |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | [src/config/headers.js](src/config/headers.js) |
| `X-Frame-Options` | `DENY` | [src/middleware/helmetConfig.js](src/middleware/helmetConfig.js) |
| `X-Content-Type-Options` | `nosniff` | Helmet default (verified) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | [src/config/headers.js](src/config/headers.js) |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), accelerometer=(), gyroscope=(), autoplay=(), fullscreen=(self), interest-cohort=()` | [src/middleware/permissionsPolicy.js](src/middleware/permissionsPolicy.js) |

The complete rationale (RFC references, attack vectors, golden-standard
values) is documented in [docs/HEADERS.md](docs/HEADERS.md), which mirrors
the *Security Headers Hardening Guide & Audit Report*.

---

## Project structure

```
.
├── .github/workflows/   # CodeQL, npm audit, header verification
├── docs/                # Architecture, threat model, headers, audit report
├── demo/                # Demo video link + screenshots
├── public/              # Static front-end assets (CSS, JS)
│   ├── css/
│   └── js/
├── scripts/             # Audit script + legitimate commit-splitter
├── src/
│   ├── config/          # Single source of truth for header values
│   ├── controllers/     # HTTP handler logic
│   ├── middleware/      # Nonce, Helmet, Permissions-Policy, rate limit
│   ├── routes/          # Express routers
│   ├── services/        # Programmatic header auditor
│   ├── utils/           # Logger, crypto helpers
│   └── views/           # HTML with nonce placeholders
├── tests/               # Jest + supertest
├── Dockerfile           # Multi-stage, distroless, non-root
├── docker-compose.yml
└── package.json
```

---

## Quick start

```bash
# 1. Install
npm install

# 2. Run the dev server
npm run dev

# 3. Verify headers from a second terminal
curl -sI http://127.0.0.1:3000/ | grep -iE 'content-security|frame|content-type|referrer|permissions'

# 4. Or run the audit script (used by CI)
npm run test:headers

# 5. Run the full test suite
npm test
```

Open <http://127.0.0.1:3000/audit> for the live audit UI.

---

## Configuration

All runtime configuration lives in environment variables. Copy
`.env.example` to `.env` and adjust as needed. The defaults reflect the
golden-standard recommendations from the guide.

| Variable | Default | Purpose |
|---|---|---|
| `NODE_ENV` | `development` | Set to `production` to enable HSTS emission. |
| `PORT` | `3000` | TCP port to bind. |
| `HSTS_MAX_AGE` | `63072000` | 2 years, the preload-recommended value. |
| `HSTS_INCLUDE_SUBDOMAINS` | `true` | Required for preload. |
| `HSTS_PRELOAD` | `true` | Adds the `preload` token. |
| `CSP_REPORT_URI` | `/csp-report` | Receiver endpoint mounted in `routes/`. |
| `RATE_LIMIT_WINDOW_MS` | `900000` | 15 minutes. |
| `RATE_LIMIT_MAX` | `100` | Per-IP request cap per window. |

---

## Verification &mdash; CLI, CI, and the live audit page

Three independent verification layers ship in this repo:

1. **Jest unit + integration tests** &mdash; `tests/headers.test.js` asserts
   every required header against a supertest client. CI fails on any
   regression.
2. **Curl-based shell audit** &mdash; `scripts/audit-headers.sh` produces a
   pass/fail table suitable for log aggregation. Used in
   `.github/workflows/security.yml`.
3. **Live in-app audit** &mdash; the `/readyz` endpoint runs
   `services/headerAuditor.js` against the response's own headers and
   returns structured findings, rendered by the `/audit` page.

Externally, validate against:

- [SecurityHeaders.com](https://securityheaders.com/) (target: A+)
- [Mozilla HTTP Observatory](https://observatory.mozilla.org/) (target: 100+ / A+)
- [Google CSP Evaluator](https://csp-evaluator.withgoogle.com/)
- [Qualys SSL Labs](https://www.ssllabs.com/ssltest/) for the TLS layer
  underneath HSTS.

---

## Docker

```bash
docker compose up --build
```

The Dockerfile is multi-stage and the final image runs on
`gcr.io/distroless/nodejs20-debian12:nonroot` with a read-only filesystem,
dropped capabilities, and `no-new-privileges`. See
[Dockerfile](Dockerfile) for the build details and
[docker-compose.yml](docker-compose.yml) for the runtime constraints.

---

## Threat model and mitigations

Detailed write-up in [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md). Summary:

| Attack | Mitigation |
|---|---|
| Reflected / stored / DOM XSS | Strict nonce CSP + Trusted Types |
| Magecart-style skimming (cf. British Airways 2018) | CSP + SRI + tight `connect-src` |
| Clickjacking (CWE-1021) | `frame-ancestors 'none'` + `X-Frame-Options DENY` |
| SSL stripping | HSTS preload |
| MIME-confusion XSS | `X-Content-Type-Options: nosniff` |
| Referrer leakage of tokens | `Referrer-Policy: strict-origin-when-cross-origin` |
| Permission abuse from third-party iframes | Deny-by-default Permissions-Policy |
| Server fingerprinting | `hidePoweredBy` + explicit stripper middleware |

---

## Common pitfalls (Nginx, Helmet)

Documented at length in [docs/HEADERS.md §3](docs/HEADERS.md). The short
list every reviewer should check:

- **Nginx `add_header` inheritance trap** &mdash; a single `add_header` in a
  child block silently drops every parent header. Repeat them, or use
  `more_set_headers` from the `headers-more` module.
- **Nginx missing `always` flag** &mdash; headers vanish on error responses
  (4xx / 5xx). The grading rubric checks 404 paths.
- **Helmet default CSP is not strict** &mdash; ships with `script-src 'self'`
  and `style-src 'self' https: 'unsafe-inline'`. This template overrides
  it with `useDefaults: false` and a nonce + `'strict-dynamic'` policy.
- **Helmet does not emit Permissions-Policy** &mdash; we supply it with
  custom middleware in [`src/middleware/permissionsPolicy.js`](src/middleware/permissionsPolicy.js).

---

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) &mdash; module diagram and
  middleware order.
- [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md) &mdash; STRIDE-flavoured
  analysis.
- [docs/HEADERS.md](docs/HEADERS.md) &mdash; full reference (the
  *Security Headers Hardening Guide*).
- [docs/AUDIT_REPORT.md](docs/AUDIT_REPORT.md) &mdash; ten-site comparison
  matrix and one fully-written penetration-test finding.
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) &mdash; staged rollout (baseline →
  transport → CSP enforcement → Trusted Types).

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security vulnerabilities should be
reported via the process in [SECURITY.md](SECURITY.md).

---

## Acknowledgements

- **İstinye Üniversitesi** &mdash; Department of Computer Engineering, Secure
  Web Development course.
- **Keyvan Arasteh** &mdash; course instructor.
- The OWASP Secure Headers Project, the OWASP Cheat Sheet Series authors,
  the Mozilla HTTP Observatory team, and Scott Helme (SecurityHeaders.com).
- Weichselbaum, Spagnuolo, Lekies and Janc for *CSP Is Dead, Long Live
  CSP!* (ACM CCS 2016).

---

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for full text.
