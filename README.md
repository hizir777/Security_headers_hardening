<div align="center">
  <a href="https://istinye.edu.tr">
    <img src="docs/assets/istinye-university-logo.webp" alt="Istinye University" width="180"/>
  </a>

  # Security Headers Hardening / Güvenlik Başlıkları Sıkılaştırma

  ![GitHub](https://img.shields.io/badge/GitHub-Private-red?style=flat-square&logo=github)
  ![Language](https://img.shields.io/badge/Language-Node.js-blue?style=flat-square)
  ![Status](https://img.shields.io/badge/Status-In%20Progress-yellow?style=flat-square)
  ![Course](https://img.shields.io/badge/Course-BGT208-purple?style=flat-square)
  ![License](https://img.shields.io/badge/License-Educational-green?style=flat-square)

  [![Security Headers](https://img.shields.io/badge/securityheaders.com-A%2B-brightgreen?style=flat-square)](https://securityheaders.com/)
  [![Mozilla Observatory](https://img.shields.io/badge/observatory-A%2B-brightgreen?style=flat-square)](https://developer.mozilla.org/en-US/observatory)
  [![OWASP](https://img.shields.io/badge/OWASP-A05%3A2021-orange?style=flat-square&logo=owasp)](https://owasp.org/Top10/A05_2021-Security_Misconfiguration/)
  [![CodeQL](https://img.shields.io/badge/CodeQL-enabled-blue?style=flat-square&logo=github)](.github/workflows/security.yml)
  [![Docker](https://img.shields.io/badge/docker-multi--stage-2496ED?style=flat-square&logo=docker&logoColor=white)](Dockerfile)
</div>

---

## 📑 Table of Contents / İçindekiler

- [🎓 Instructor / Danışman](#-instructor--danışman)
- [👤 Student / Öğrenci](#-student--öğrenci)
- [📚 Course Information / Ders Bilgileri](#-course-information--ders-bilgileri)
- [📋 Project Overview / Proje Özeti](#-project-overview--proje-özeti)
- [🗂 Repository Structure / Repo Yapısı](#-repository-structure--repo-yapısı)
- [🚀 Getting Started / Kurulum](#-getting-started--kurulum)
- [📊 Deliverables / Teslimler](#-deliverables--teslimler)
- [📚 Documentation / Belgeleme](#-documentation--belgeleme)
- [🔗 References / Kaynaklar](#-references--kaynaklar)
- [🔍 Technical Reference / Teknik Referans](#-technical-reference--teknik-referans)
  - [Demo](#demo)
  - [What this template gives you](#what-this-template-gives-you)
  - [The six core security headers](#the-six-core-security-headers)
  - [Configuration](#configuration)
  - [Verification — CLI, CI, and the live audit page](#verification--cli-ci-and-the-live-audit-page)
  - [Docker](#docker)
  - [Threat model and mitigations](#threat-model-and-mitigations)
  - [Common pitfalls (Nginx, Helmet)](#common-pitfalls-nginx-helmet)
  - [Acknowledgements](#acknowledgements)
  - [License](#license)

---

## 🎓 Instructor / Danışman

| | |
|---|---|
| **Name / Ad** | Keyvan Arasteh |
| **GitHub** | [@keyvanarasteh](https://github.com/keyvanarasteh) |
| **Email** | [keyvan.arasteh@istinye.edu.tr](mailto:keyvan.arasteh@istinye.edu.tr) |
| **LinkedIn** | [keyvanarasteh](https://www.linkedin.com/in/keyvanarasteh/) |
| **Website** | [qline.tech](https://qline.tech) |

---

## 👤 Student / Öğrenci

| | |
|---|---|
| **Name / Ad Soyad** | Can Ekizoğlu |
| **Student ID / Öğrenci No** | `2420191008` |

---

## 📚 Course Information / Ders Bilgileri

| | |
|---|---|
| **Course Name / Ders Adı** | Secure Web Development / Güvenli Web Yazılımı Geliştirme |
| **Course Code / Ders Kodu** | BGT208 |
| **Credits / Kredi** | 5 ECTS |
| **Semester / Dönem** | 2025-2026 Spring / 2025-2026 Bahar |
| **Institution / Üniversite** | [Istinye University](https://istinye.edu.tr) |

---

## 📋 Project Overview / Proje Özeti

A production-ready Express.js template that strictly implements the six
core defensive HTTP response headers documented in the *Security Headers
Hardening Guide & Audit Report*, covering OWASP A05:2021 — Security
Misconfiguration. Every value the server emits derives from a single
typed configuration module, is asserted by an automated Jest suite, and
is verifiable from the command line, from CI, and from a live in-app
`/audit` dashboard.

OWASP A05:2021 — Güvenlik Yanlış Yapılandırması kapsamında, *Güvenlik
Başlıkları Sıkılaştırma Rehberi*'nde belgelenen altı temel savunma HTTP
yanıt başlığını sıkı bir şekilde uygulayan, üretime hazır bir Express.js
şablonu. Sunucunun ürettiği her değer tek bir tipli yapılandırma
modülünden türetilir; otomatik Jest testleriyle doğrulanır; komut
satırından, CI'dan ve uygulama içi canlı `/audit` panelinden
ölçülebilir.

---

## 🗂 Repository Structure / Repo Yapısı

```
.
├── .github/workflows/   # CodeQL, npm audit, lint+test, header verification
├── docs/                # Architecture, threat model, headers, audit report
│   ├── assets/          # Logo and screenshots
│   └── deepsearch/      # Deepsearch and other research papers
├── demo/                # Demo video link + screenshots
├── public/              # Static front-end assets
│   ├── css/             # theme.css, main.css, components.css
│   └── js/              # app.js, audit-ui.js
├── scripts/             # audit-headers.sh, split-commits.sh
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
├── package.json
├── README.md
├── ROADMAP.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── SECURITY.md
├── LICENSE
└── .env.example
```

---

## 🚀 Getting Started / Kurulum

```bash
git clone https://github.com/hizir777/Security_headers_hardening
cd Security_headers_hardening
cp .env.example .env
# Edit .env with your values / .env dosyasını doldurun
docker-compose up -d
```

Without Docker / Docker olmadan:

```bash
npm install
npm run dev                                  # local server on :3000
curl -sI http://127.0.0.1:3000/ | grep -iE 'content-security|frame|content-type|referrer|permissions'
npm run test:headers                         # curl-based audit
npm test                                     # Jest + supertest suite
```

Open <http://127.0.0.1:3000/audit> for the live audit dashboard.

---

## 📊 Deliverables / Teslimler

| Item | Status |
|------|--------|
| Strict nonce + strict-dynamic CSP with Trusted Types | ✅ |
| HSTS preload, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy | ✅ |
| Jest + curl-based header audit suite | ✅ |
| Multi-stage distroless Dockerfile & hardened compose | ✅ |
| GitHub Actions: CodeQL, npm audit, live header verification | ✅ |
| Ten-site audit matrix in docs/AUDIT_REPORT.md | ⬜ |
| Demo video & SecurityHeaders.com / Mozilla Observatory A+ screenshots | ⬜ |

---

## 📚 Documentation / Belgeleme

- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — module diagram and middleware order
- [docs/THREAT_MODEL.md](./docs/THREAT_MODEL.md) — STRIDE-flavoured analysis
- [docs/HEADERS.md](./docs/HEADERS.md) — full header reference (the *Security Headers Hardening Guide*)
- [docs/AUDIT_REPORT.md](./docs/AUDIT_REPORT.md) — ten-site comparison matrix and one fully-written penetration-test finding
- [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) — staged rollout (baseline → transport → CSP → Trusted Types)
- [ROADMAP.md](./ROADMAP.md) — v1.0 baseline through v2.0 plus continuous commitments
- [CONTRIBUTING.md](./CONTRIBUTING.md) — workflow, commit style, security-header change checklist
- [SECURITY.md](./SECURITY.md) — vulnerability reporting process
- [CHANGELOG.md](./CHANGELOG.md) — release history

---

## 🔗 References / Kaynaklar

- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [OWASP Top 10 A05:2021 — Security Misconfiguration](https://owasp.org/Top10/A05_2021-Security_Misconfiguration/)
- [Weichselbaum et al., *CSP Is Dead, Long Live CSP!*, ACM CCS 2016](https://research.google/pubs/csp-is-dead-long-live-csp-on-the-insecurity-of-whitelists-and-the-future-of-content-security-policy/)
- [RFC 6797 — HTTP Strict Transport Security](https://datatracker.ietf.org/doc/html/rfc6797)
- [RFC 7034 — X-Frame-Options](https://datatracker.ietf.org/doc/html/rfc7034)
- [Mozilla HTTP Observatory](https://developer.mozilla.org/en-US/observatory)
- [SecurityHeaders.com](https://securityheaders.com/)
- [Google CSP Evaluator](https://csp-evaluator.withgoogle.com/)

---

## 🔍 Technical Reference / Teknik Referans

### Demo

A walk-through video lives in [`demo/`](demo/). Replace the placeholder URL once recorded:

[![Watch the demo](https://img.shields.io/badge/YouTube-Demo%20walk--through-FF0000?logo=youtube)](https://www.youtube.com/watch?v=PLACEHOLDER_REPLACE_ME)

### What this template gives you

- **Strict, nonce-based CSP** with `'strict-dynamic'`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, and Trusted Types via `require-trusted-types-for 'script'`. Aligned with Google's "CSP Is Dead, Long Live CSP!" (Weichselbaum et al., ACM CCS 2016).
- **HSTS preload** — `max-age=63072000; includeSubDomains; preload`, with a documented rollout playbook in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
- **X-Frame-Options DENY** plus `frame-ancestors 'none'` for legacy and modern browser parity.
- **X-Content-Type-Options `nosniff`** on every response, including 404s.
- **Referrer-Policy `strict-origin-when-cross-origin`** (the modern browser default, explicitly emitted so a CDN cannot strip it).
- **Deny-by-default Permissions-Policy** for camera, microphone, geolocation, payment, USB, accelerometer, gyroscope, autoplay, and interest-cohort.
- **Defence in depth at the application layer:** rate limiting, fingerprint-header stripping, structured logging, and a CSP violation receiver that normalises both legacy `report-uri` and the new Reporting API.
- **Automated assurance:** Jest tests assert each header by name; a `curl`-based audit script runs both locally and in CI; CodeQL and `npm audit` gate the build.

### The six core security headers

| Header | Value | Source |
|---|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'nonce-{RND}' 'strict-dynamic' 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests; require-trusted-types-for 'script'; report-uri /csp-report` | [src/config/headers.js](src/config/headers.js) |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | [src/config/headers.js](src/config/headers.js) |
| `X-Frame-Options` | `DENY` | [src/middleware/helmetConfig.js](src/middleware/helmetConfig.js) |
| `X-Content-Type-Options` | `nosniff` | Helmet default (verified) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | [src/config/headers.js](src/config/headers.js) |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), accelerometer=(), gyroscope=(), autoplay=(), fullscreen=(self), interest-cohort=()` | [src/middleware/permissionsPolicy.js](src/middleware/permissionsPolicy.js) |

Full rationale (RFC references, attack vectors, golden-standard values) lives in [docs/HEADERS.md](docs/HEADERS.md).

### Configuration

All runtime configuration lives in environment variables. Copy `.env.example` to `.env` and adjust as needed. Defaults reflect the golden-standard recommendations from the guide.

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

### Verification — CLI, CI, and the live audit page

Three independent verification layers ship in this repo:

1. **Jest unit + integration tests** — `tests/headers.test.js` asserts every required header against a supertest client. CI fails on any regression.
2. **Curl-based shell audit** — `scripts/audit-headers.sh` produces a pass/fail table suitable for log aggregation. Used in `.github/workflows/security.yml`.
3. **Live in-app audit** — the `/readyz` endpoint runs `services/headerAuditor.js` against the response's own headers and returns structured findings, rendered by the `/audit` page.

Externally, validate against [SecurityHeaders.com](https://securityheaders.com/) (target: A+), [Mozilla HTTP Observatory](https://developer.mozilla.org/en-US/observatory) (target: 100+ / A+), [Google CSP Evaluator](https://csp-evaluator.withgoogle.com/), and [Qualys SSL Labs](https://www.ssllabs.com/ssltest/) for the TLS layer underneath HSTS.

### Docker

```bash
docker compose up --build
```

The Dockerfile is multi-stage; the final image runs on `gcr.io/distroless/nodejs20-debian12:nonroot` with a read-only filesystem, dropped capabilities, and `no-new-privileges`. See [Dockerfile](Dockerfile) and [docker-compose.yml](docker-compose.yml) for the runtime constraints.

### Threat model and mitigations

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

### Common pitfalls (Nginx, Helmet)

Documented at length in [docs/HEADERS.md §3](docs/HEADERS.md). Short list every reviewer should check:

- **Nginx `add_header` inheritance trap** — a single `add_header` in a child block silently drops every parent header. Repeat them, or use `more_set_headers` from the `headers-more` module.
- **Nginx missing `always` flag** — headers vanish on error responses (4xx / 5xx). The grading rubric checks 404 paths.
- **Helmet default CSP is not strict** — ships with `script-src 'self'` and `style-src 'self' https: 'unsafe-inline'`. This template overrides it with `useDefaults: false` and a nonce + `'strict-dynamic'` policy.
- **Helmet does not emit Permissions-Policy** — supplied with custom middleware in [`src/middleware/permissionsPolicy.js`](src/middleware/permissionsPolicy.js).

### Acknowledgements

- **İstinye Üniversitesi** — Department of Computer Engineering, Secure Web Development course.
- **Keyvan Arasteh** — course instructor.
- The OWASP Secure Headers Project, the OWASP Cheat Sheet Series authors, the Mozilla HTTP Observatory team, and Scott Helme (SecurityHeaders.com).
- Weichselbaum, Spagnuolo, Lekies and Janc for *CSP Is Dead, Long Live CSP!* (ACM CCS 2016).

### License

Distributed under the MIT License. See [LICENSE](LICENSE) for full text.
