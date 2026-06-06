# Changelog

All notable changes to this project are documented here. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial baseline of the Security Headers Hardening template.
- Strict CSP with `'strict-dynamic'`, per-request nonces, and Trusted Types.
- HSTS preload defaults (`max-age=63072000; includeSubDomains; preload`).
- Deny-by-default Permissions-Policy middleware.
- CSP violation receiver supporting both legacy `report-uri` JSON and
  the Reporting API body shape.
- Jest + supertest assertions for every required header.
- Curl-based `scripts/audit-headers.sh` audit, used by CI.
- Multi-stage distroless Dockerfile and hardened `docker-compose.yml`.
- GitHub Actions workflows for CodeQL, `npm audit`, and the live header
  verification.
- Live in-app `/audit` dashboard backed by `/readyz`.

### Security
- Disabled `X-Powered-By` via Helmet and explicit fingerprint stripper.
- Set `Cross-Origin-Embedder-Policy`, `Cross-Origin-Opener-Policy`, and
  `Cross-Origin-Resource-Policy` to defensive defaults.

## [1.0.0] - TBD

The first tagged release will coincide with the final project submission.
