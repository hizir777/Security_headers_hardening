# Contributing

Thanks for considering a contribution. This template is part of a
university coursework deliverable, but the security hardening work is
intended to be useful well beyond that, so improvements are welcome.

## Ground rules

1. **Never weaken a header default to make a feature easier.** If a
   strict CSP blocks a third-party integration, the right move is almost
   always to fix the integration (nonce, hash, or SRI), not to add
   `'unsafe-inline'`.
2. **Update the tests.** Every change to a header value must be reflected
   in `tests/headers.test.js` and `scripts/audit-headers.sh`.
3. **Update the docs.** If you change a header value, also update
   `docs/HEADERS.md` and `README.md` so the docs and the code stay in
   lock-step.
4. **Conventional Commits.** Use prefixes such as `feat(middleware): …`,
   `fix(csp): …`, `docs: …`, `test: …`, `chore: …`, `ci: …`.

## Local workflow

```bash
git switch -c feat/<short-description>
npm install
npm run lint
npm test
npm run test:headers   # boots the app and curls /
```

Once green, open a pull request describing the change, the threat the
change addresses, and any new external dependencies.

## Reporting security issues

Please follow the process in [SECURITY.md](SECURITY.md). Do **not** open
public issues for vulnerabilities.

## Code style

- Node.js, CommonJS modules (matches `package.json` `"type": "commonjs"`).
- ESLint v9 flat config in `eslint.config.js`; `npm run lint` must pass.
- JSDoc for every exported function. Comments should explain *why*, not
  *what*.

## Adding a new security header

1. Add the canonical value to `src/config/headers.js`.
2. Wire it into the appropriate middleware (Helmet or a small custom
   one).
3. Extend `services/headerAuditor.js` with a check and update
   `REQUIRED_HEADERS` in `src/config/constants.js`.
4. Add a Jest assertion to `tests/headers.test.js`.
5. Add a row to the table in `README.md` and to `docs/HEADERS.md`.
6. Open a PR.
