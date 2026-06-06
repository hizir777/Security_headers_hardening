# Security Policy

## Supported versions

This template is on a rolling release. Security fixes target `main`.

## Reporting a vulnerability

Please do **not** open a public GitHub issue. Instead, email the
maintainers via the address in the repository owner's GitHub profile, or
use GitHub's private vulnerability reporting flow under the **Security**
tab.

When reporting, include:

- The affected route or component.
- Reproduction steps with the minimum payload that demonstrates the
  issue.
- The impact in plain English (data exposure, authentication bypass,
  etc.).
- Your suggested CWE / OWASP classification, if you have one in mind.

We aim to acknowledge within **72 hours** and to publish a fix or
mitigation within **30 days** for high-severity issues.

## Out of scope

- Vulnerabilities that depend on a misconfigured deployment (for
  example, weakened CSP set via environment variables) where the default
  template ships secure.
- Findings against archived branches or example values in `docs/`.
- Theoretical issues without a concrete proof of concept.

## Hall of fame

We credit reporters in `CHANGELOG.md` once a fix ships, unless you ask
to remain anonymous.
