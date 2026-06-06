# Architecture

## Module map

```
┌──────────────────────────────────────────────────────────────────────┐
│                            src/server.js                              │
│                       (process entrypoint)                            │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                              src/app.js                              │
│         Express wiring + middleware order (see below)                │
└──────────────────────────────┬───────────────────────────────────────┘
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
┌────────────────┐   ┌────────────────────┐   ┌────────────────────┐
│ src/middleware │   │   src/routes/      │   │ src/controllers/   │
│  - nonce       │   │  - home            │   │  - homeController  │
│  - helmet cfg  │   │  - health          │   │  - healthController│
│  - perms-pol   │   │  - csp-report      │   │  - reportController│
│  - rate limit  │   └─────────┬──────────┘   └─────────┬──────────┘
│  - logger      │             │                        │
│  - errors      │             ▼                        ▼
└────────────────┘   ┌─────────────────────────────────────────┐
                     │           src/services/                 │
                     │            headerAuditor                │
                     └─────────────────────────────────────────┘
                                       │
                                       ▼
                     ┌─────────────────────────────────────────┐
                     │            src/config/                  │
                     │  index.js | headers.js | constants.js   │
                     │   (single source of truth)              │
                     └─────────────────────────────────────────┘
```

## Middleware order in `app.js`

Order matters because each middleware in the chain may depend on what an
earlier one attached to `res.locals` or to the response headers.

1. **`requestLogger`** &mdash; structured access log (avoids reading
   sensitive headers).
2. **`morgan('dev')`** &mdash; only in non-prod, for developer ergonomics.
3. **`nonceMiddleware`** &mdash; generates a fresh 128-bit nonce per
   request and writes it to `res.locals.cspNonce`. *Must precede Helmet
   so Helmet's CSP function can read it.*
4. **`helmet(...)`** &mdash; emits the strict CSP, HSTS, XFO, Referrer
   Policy, COOP/COEP/CORP, and assorted hardening headers.
5. **`permissionsPolicyMiddleware`** &mdash; adds the
   `Permissions-Policy` header Helmet does not ship.
6. **`fingerprintStripper`** &mdash; final guard that strips
   `X-Powered-By`, `Server`, and friends just before flush.
7. **`buildRateLimiter`** &mdash; per-IP rate limiting from
   `express-rate-limit`.
8. **`express.static('/public')`** &mdash; static assets, served *after*
   security middleware so the headers attach to them.
9. **`routes`** &mdash; the application's actual handlers.
10. **`notFoundHandler`** + **`errorHandler`** &mdash; registered last so
    they handle anything unmatched. Headers still apply because they
    were set earlier in the chain.

## Configuration flow

Every value the server emits is derived from `src/config/headers.js`,
which itself reads from `src/config/index.js` (env vars). The audit
service and the Jest suite import from the same module, so source code,
tests, and live response cannot drift.

## Error handling

- 404s land in `notFoundHandler` and return JSON.
- Synchronous and async errors are caught by `errorHandler`, which logs
  the full stack and, in production, returns a generic
  `{ "error": "server_error" }` body to avoid information leakage.

## Containerisation

The Dockerfile is two-stage. The build stage installs full dependencies,
runs lint and tests, prunes to production deps, and copies into a
distroless runtime image that runs as the `nonroot` user with no shell.
See `Dockerfile` and `docker-compose.yml` for the runtime constraints
(read-only filesystem, dropped capabilities, `no-new-privileges`).
