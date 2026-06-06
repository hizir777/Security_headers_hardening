# Roadmap

A living plan for the Security Headers Hardening template. Items are
grouped by milestone, not by date — promotion to the next milestone is
gated on the previous one being green in CI and on the
SecurityHeaders.com / Mozilla Observatory grades being maintained at A+.

## v1.0 — Submission baseline (current)

Status: **shipped on `claude/gallant-turing-MzWaN`**.

- [x] Strict nonce + `strict-dynamic` CSP with Trusted Types.
- [x] HSTS preload defaults (`max-age=63072000; includeSubDomains; preload`).
- [x] `X-Frame-Options DENY` + `frame-ancestors 'none'` parity.
- [x] `X-Content-Type-Options: nosniff`, including on 404 responses.
- [x] `Referrer-Policy: strict-origin-when-cross-origin`.
- [x] Deny-by-default `Permissions-Policy`.
- [x] CSP violation receiver (legacy `report-uri` + Reporting API shapes).
- [x] Jest + supertest assertions for every header.
- [x] Curl-based `scripts/audit-headers.sh` audit, used by CI.
- [x] Live in-app `/audit` dashboard backed by `/readyz`.
- [x] Multi-stage distroless Dockerfile and hardened `docker-compose.yml`.
- [x] GitHub Actions: CodeQL, `npm audit`, lint+test, header verification.

## v1.1 — Documentation and audit deliverables

Status: **in progress** during the remaining submission window.

- [ ] Paste the long-form *Security Headers Hardening Guide* into
      [`docs/HEADERS.md`](docs/HEADERS.md).
- [ ] Complete the ten-site comparison matrix in
      [`docs/AUDIT_REPORT.md`](docs/AUDIT_REPORT.md) with real targets.
- [ ] Write two additional penetration-test findings using the SH-2026-001
      format (e.g., weak CSP, missing HSTS).
- [ ] Add an annotated `docs/nginx.conf.example` with the `always`-flag
      and inheritance pitfalls called out inline.
- [ ] Add an annotated `docs/httpd.conf.example` with the `mod_headers`
      configuration mirrored from the Nginx example.
- [ ] Record demo video; replace the placeholder YouTube link in
      [`README.md`](README.md) and [`demo/README.md`](demo/README.md).
- [ ] Screenshot the SecurityHeaders.com A+ and Mozilla Observatory 100+
      scores; commit them to `demo/`.

## v1.2 — Reporting and observability

- [ ] Reporting API endpoint (`Report-To` and `Reporting-Endpoints`) so
      browsers batch violations.
- [ ] Persist CSP violations to a SQLite file behind a feature flag.
- [ ] Add a `/metrics` Prometheus endpoint exposing audit pass/fail counts.
- [ ] Pin `helmet`, `express`, and `express-rate-limit` to exact versions
      via Renovate, with weekly auto-PRs.

## v1.3 — Additional headers and policies

- [ ] **Cross-Origin policies** — already emit COOP/COEP/CORP via Helmet;
      add a documented opt-out per route for embeddable widgets.
- [ ] **Document-Policy** — explore once Chrome ships a stable
      implementation.
- [ ] **Network Error Logging (NEL)** + `Report-To` endpoint.
- [ ] **`Cache-Control` baseline** — `no-store` on authenticated routes,
      `public, max-age, immutable` on hashed static assets.

## v2.0 — Beyond the headers layer

- [ ] Optional authentication module (Passport + OIDC) wired with a
      strict CSP-compatible login flow (no inline scripts).
- [ ] Optional Redis-backed rate limiter for multi-instance deploys.
- [ ] Terraform module for AWS CloudFront + ACM that mirrors the same
      header policy at the CDN edge (so the policy holds even on cached
      paths).
- [ ] End-to-end Playwright tests asserting browser-side CSP enforcement
      (a deliberately malicious inline `<script>` must be blocked).

## Continuous

These are not milestones but ongoing commitments — they apply to every
release.

- [ ] Maintain SecurityHeaders.com **A+** and Mozilla Observatory
      **≥ 100 (A+)** on the public deploy.
- [ ] Keep Helmet, Express, and rate-limit on the latest stable; re-verify
      Helmet defaults on every major bump (they evolve).
- [ ] Re-run [Google CSP Evaluator](https://csp-evaluator.withgoogle.com/)
      after every CSP change.
- [ ] Annual `hstspreload.org` status check; never relax `max-age`
      below 6 months.

## Out of scope

Listed here so contributors do not file these as bugs:

- Authentication, session, and authorisation logic. The template is
  intentionally a header-hardening starting point, not a full framework.
- Database hardening — no persistent store ships.
- Frontend framework integration (React/Vue/Svelte) — the nonce
  mechanism is framework-agnostic; integration examples may land in
  `examples/` under v2.0 but are not core scope.

## How to propose a change

Open an issue or a draft PR referencing this file and the milestone the
change targets. Follow [CONTRIBUTING.md](CONTRIBUTING.md) for commit
style and test expectations.
