# Security Headers Hardening Guide & Audit Report
*A Secure Web Development Final Project Deliverable — Aligned with the OWASP Secure Headers Project, OWASP Cheat Sheet Series, MDN Web Docs, IETF RFCs, and W3C Specifications*
*Compiled June 6, 2026*

## TL;DR
- **The six core defensive headers and their golden-standard values are:** a strict nonce + `strict-dynamic` **Content-Security-Policy** (with `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, `form-action 'self'`, `upgrade-insecure-requests`, `require-trusted-types-for 'script'`); **HSTS** `max-age=63072000; includeSubDomains; preload`; **X-Frame-Options** `DENY`; **X-Content-Type-Options** `nosniff`; **Referrer-Policy** `strict-origin-when-cross-origin`; and a deny-by-default **Permissions-Policy**. This set, correctly deployed, achieves a SecurityHeaders.com and Mozilla Observatory A+.
- **Missing or misconfigured headers map directly to real, documented breaches** — most notably the 2018 British Airways Magecart skimming attack (no CSP/SRI; ~429,612 individuals affected; £20 million ICO fine), SSL-stripping downgrades, MIME-confusion XSS, and clickjacking (CWE-1021). These fall under **OWASP A05:2021 – Security Misconfiguration**.
- **Audit by combining `curl -I -L`, SecurityHeaders.com, Mozilla Observatory, Google CSP Evaluator, and Qualys SSL Labs**, flagging the canonical misconfigurations (unsafe-inline/eval, wildcard sources, short/absent HSTS, missing `nosniff`, weak referrer policy, and Nginx's `always`-flag / `add_header`-inheritance traps), and document findings in the standardized penetration-test format provided in §5.

---

## Key Findings

1. **A strict, nonce-based CSP is the single highest-value control.** Host-allowlist CSPs are fragile: Weichselbaum, Spagnuolo, Lekies & Janc ("*CSP Is Dead, Long Live CSP!*", Google, ACM CCS 2016) found "significant flaws in real-world deployments that result in bypasses in **94.72% of all distinct policies**" (and 75.81% via script whitelists). The modern remedy is `script-src 'nonce-{RANDOM}' 'strict-dynamic'` plus `object-src 'none'` and `base-uri 'none'/'self'`.
2. **Headers are defense-in-depth, not a substitute for secure coding.** They are browser-enforced policies; they do not fix server-side injection, broken auth, or business-logic flaws.
3. **`frame-ancestors` supersedes X-Frame-Options**, but both should be sent for legacy (IE11) coverage; `nosniff` has exactly one valid value; the modern default Referrer-Policy is already `strict-origin-when-cross-origin`.
4. **HSTS preloading is near-irreversible** and requires `max-age` ≥ 1 year, `includeSubDomains`, the `preload` token, a valid certificate, and a 301 HTTP→HTTPS redirect on the apex.
5. **Server-specific footguns dominate real-world failures** — Nginx's missing `always` flag (headers absent on error pages) and its `add_header` inheritance rule (a single `add_header` in a child block drops all parent headers), and Helmet's non-strict default CSP plus its omission of `Permissions-Policy`.

---

## 1. THEORETICAL FOUNDATION & KEYWORDS

### 1.1 Essential Terminology

- **MIME Sniffing (Content Sniffing):** Browser behavior of inspecting the first bytes ("magic bytes") of a response to guess its content type, overriding the server's declared `Content-Type`. Can transform a non-executable type into an executable one (MIME confusion).
- **Clickjacking / UI Redressing:** An attack overlaying an invisible/transparent iframe of a target site over decoy UI, so a victim's clicks are hijacked to perform unintended actions (CWE-1021).
- **Downgrade Attack:** Forcing a connection to use a weaker/insecure protocol (e.g., HTTPS→HTTP) so traffic can be intercepted.
- **SSL Stripping:** A specific downgrade MitM attack (demonstrated by Moxie Marlinspike with the `sslstrip` tool at Black Hat DC 2009) where an attacker rewrites HTTPS links/redirects to HTTP and relays cleartext.
- **Man-in-the-Middle (MitM) / Manipulator-in-the-Middle:** An attacker positioned between client and server who can read or alter traffic.
- **Cross-Site Scripting (XSS):** Injection of attacker-controlled script executed in the victim's browser. **Reflected** (payload echoed from the request), **Stored** (persisted server-side), and **DOM-based** (a client-side sink such as `innerHTML`/`eval` consumes a tainted source).
- **Cross-Site Request Forgery (CSRF):** Forcing an authenticated user's browser to issue an unwanted state-changing request; mitigated with anti-CSRF tokens and the `SameSite` cookie attribute.
- **Content Injection:** Insertion of unauthorized markup/resources into a page; CSP is the primary mitigation.
- **Mixed Content:** A secure (HTTPS) page loading sub-resources over insecure HTTP; mitigated by `upgrade-insecure-requests` / `block-all-mixed-content`.
- **Same-Origin Policy (SOP):** Foundational browser rule restricting how a document/script from one origin (scheme + host + port) interacts with resources of another.
- **CORS (Cross-Origin Resource Sharing):** Mechanism using `Access-Control-Allow-*` headers to relax SOP in a controlled way.
- **Nonce:** A cryptographically random "number used once," generated per HTTP response, placed in the CSP and matched against the `nonce` attribute on `<script>`/`<style>` elements.
- **Hash (sha256/384/512):** Base64 digest of an inline script/style; the browser hashes the element and executes only on match. Suited to static content.
- **strict-dynamic:** CSP keyword that propagates trust from a nonce/hash-approved root script to scripts it dynamically loads, ignoring host allowlists and `'self'`/`'unsafe-inline'`.
- **Subresource Integrity (SRI):** `integrity` attribute holding a hash so the browser refuses a CDN-hosted script/style if its content changes.
- **HSTS Preload List:** A list of HTTPS-only domains hardcoded into browsers (Chromium, Firefox, Safari, Edge), eliminating the first-visit "trust on first use" window.
- **Referrer Leakage:** Exposure of sensitive path/query data via the `Referer` header on outbound requests.
- **Iframe Sandboxing:** `sandbox` attribute restricting an embedded frame's capabilities (scripts, forms, popups, same-origin).
- **Feature/Permissions Delegation:** Controlling which powerful browser features (camera, mic, geolocation) a document and its iframes may use via `Permissions-Policy`.
- **Defense in Depth:** Layering independent controls so that the failure of one does not collapse overall security.
- **Trusted Types:** Browser API + CSP directive (`require-trusted-types-for 'script'`) that forces DOM XSS sink inputs through a vetted policy object, eliminating string-to-sink assignments.

### 1.2 Deep Dive: The Six Core Security Headers

#### Content-Security-Policy (CSP)
CSP is a defense-in-depth mechanism that declares, via directives, which sources the browser may load resources from, mitigating XSS and content/data injection. The browser parses the policy and **blocks** (or reports, in report-only mode) any resource load or script execution that violates it.

**Key directives:** `default-src` (fallback), `script-src`, `style-src`, `img-src`, `connect-src` (fetch/XHR/WebSocket/beacon), `frame-ancestors` (who may frame this page — supersedes X-Frame-Options), `form-action`, `base-uri` (restricts `<base>`), `object-src` (plugins/embeds), `report-uri`/`report-to` (violation reporting endpoints), `upgrade-insecure-requests`, `block-all-mixed-content`, and `require-trusted-types-for`.

**Nonces vs hashes vs strict-dynamic:** A nonce is a per-response random value echoed on trusted `<script>`/`<style>` tags; hashes match static inline content; `strict-dynamic` extends nonce/hash trust to dynamically inserted scripts and is the cornerstone of a modern "strict CSP." A strict policy such as `script-src 'nonce-{RANDOM}' 'strict-dynamic'; object-src 'none'; base-uri 'none'` is recommended by Google and OWASP over fragile host allowlists — which the Google research above found bypassable in 94.72% of real-world policies.

**CSP Level history:** CSP 1.0 (W3C, ~2012; Chrome 25+, Firefox 23+) introduced core fetch directives. CSP Level 2 (W3C Recommendation 2014–2015; Chrome 40+, Firefox 31+) added nonces, hashes, and `frame-ancestors`/`form-action`/`base-uri`. CSP Level 3 (Working Draft, rewritten atop the Fetch spec; partial support Chrome 59+, Firefox 58+, Safari 15.4+) added `strict-dynamic`, `worker-src`, hashes for external scripts, and integration with Trusted Types.

#### Strict-Transport-Security (HSTS)
Defined in **RFC 6797 (2012)**, HSTS instructs the browser to access a host only over HTTPS for a defined `max-age`, neutralizing SSL-stripping/downgrade attacks and disabling certificate-error "click-through."

**Directives:** `max-age=<seconds>` (required), `includeSubDomains` (extends to all subdomains), `preload` (signals consent for the preload list — not part of RFC 6797). On each HTTPS response carrying the header, the browser records the host as a "Known HSTS Host" and upgrades future `http://` URLs to `https://` before sending. The header is **ignored when delivered over plain HTTP** and when the TLS certificate is invalid (RFC 6797 §8.1), preventing a MitM from injecting `max-age=0`.

**TOFU and the preload list:** Because a browser cannot know a site's HSTS policy before its first visit, a "trust on first use" gap exists. The **hstspreload.org** list (created by the Chrome security team and shared by Firefox/Safari/Edge) closes it by baking HTTPS-only enforcement into the browser binary. Preload eligibility requires `max-age` ≥ 31536000 (1 year), `includeSubDomains`, the `preload` token, a valid certificate, and a 301 HTTP→HTTPS redirect on the apex. Removal is slow (months), so preloading is a near-irreversible commitment.

#### X-Frame-Options (XFO)
Specified in **RFC 7034 (2013, Informational)** by D. Ross (Microsoft) and T. Gondrom. Indicates whether a browser may render the page in a `<frame>`, `<iframe>`, `<embed>`, or `<object>`, defending against clickjacking. Three mutually exclusive values:
- **DENY** — never framed, by any origin (including same origin).
- **SAMEORIGIN** — framed only by same-origin pages.
- **ALLOW-FROM uri** — obsolete; never consistently implemented and ignored by modern browsers (which then leaves *no* framing protection if relied upon).

It is enforced only as an HTTP response header; a `<meta>` equivalent has no effect. **CSP `frame-ancestors` supersedes XFO** for supporting browsers; the two should be kept consistent, with XFO retained as a legacy fallback (e.g., for IE11, which lacks `frame-ancestors`).

#### X-Content-Type-Options
Single valid value: **`nosniff`**. Instructs the browser to honor the declared `Content-Type` and never MIME-sniff, closing MIME-confusion attacks. With `nosniff`, scripts load only with a JavaScript MIME type and styles only with `text/css`; any other value is treated as if the header were absent. It is particularly important for user-upload features and for blocking a same-origin CSP bypass in which an attacker uploads a text file containing JavaScript and references it via `<script src>`.

#### Referrer-Policy
Controls how much of the URL is sent in the `Referer` header. All eight values:
- `no-referrer` — never send.
- `no-referrer-when-downgrade` — full URL except on HTTPS→HTTP (legacy default; now treated as unsafe).
- `origin` — origin only, always.
- `origin-when-cross-origin` — full URL same-origin, origin only cross-origin.
- `same-origin` — full URL same-origin, nothing cross-origin.
- `strict-origin` — origin only, and nothing on HTTPS→HTTP.
- `strict-origin-when-cross-origin` — **the modern browser default**: full URL same-origin, origin only cross-origin (same security level), nothing on downgrade.
- `unsafe-url` — always full URL, including on downgrade (leaks TLS-protected path/query; avoid).

#### Permissions-Policy (formerly Feature-Policy)
Uses HTTP Structured-Fields syntax: `directive=allowlist`, comma-separated. Allowlist tokens: `*` (all origins), `()` (none — disable everywhere), `self`, and quoted origins. Example: `geolocation=(self "https://example.com"), camera=()`. A feature must appear in both the parent page's allowlist and an iframe's `allow` attribute for that iframe to use it; disabling is a one-way toggle. Common directives: `camera`, `microphone`, `geolocation`, `payment`, `usb`, `fullscreen`, `autoplay`, `accelerometer`, `gyroscope`, and the legacy `interest-cohort` (FLoC opt-out).

---

## 2. RISK ANALYSIS & ATTACK VECTORS

These weaknesses correspond to **OWASP A05:2021 – Security Misconfiguration**, which moved up from #6 in 2017; 90% of tested applications had some form of misconfiguration, with **208,387 total CWE occurrences (and 789 CVEs) across the 20 mapped CWEs** in this category.

### Content-Security-Policy
**If missing/weak:** XSS payloads execute freely; attacker scripts exfiltrate data to attacker-controlled domains; Magecart-style web-skimmers run on payment pages. In the **British Airways breach (Aug 21 – Sep 5, 2018)**, attackers (attributed to Magecart by RiskIQ) added **22 lines** to the checkout page that modified the self-hosted **Modernizr** JavaScript library so payment-form data was serialized and exfiltrated to the attacker-controlled domain **`baways.com`** (hosted in Romania). The ICO found ~429,612 individuals were affected and issued a **£20 million** fine on 16 October 2020 — reduced from the **£183.39 million** (≈1.5% of BA's 2017 turnover) that Information Commissioner Elizabeth Denham floated in July 2019, the reduction reflecting mitigating factors and the COVID-19 impact on IAG. A strict CSP restricting `script-src`/`connect-src` would have blocked the exfiltration endpoint. Permissive policies (`unsafe-inline`, `unsafe-eval`, wildcard `*`, or `data:`/`http:` in `script-src`) reintroduce XSS; missing `object-src 'none'` and `base-uri 'self'` enable plugin-based and base-tag injection bypasses.

### Strict-Transport-Security
**If missing:** An attacker on a hostile network performs SSL stripping (à la `sslstrip`), downgrading the victim to cleartext HTTP and harvesting credentials/session cookies. Without `includeSubDomains`, sibling subdomains remain attackable; without preload, the first-visit TOFU window is exploitable.

### X-Frame-Options / frame-ancestors
**If missing:** UI redressing/clickjacking — an invisible iframe of the target overlays decoy content, hijacking clicks to trigger fund transfers, OAuth consent, "delete account," or social actions (CWE-1021).

### X-Content-Type-Options
**If missing:** MIME sniffing lets a browser execute a user-uploaded "image" (e.g., `avatar.jpg` containing JS) or interpret `text/plain` as HTML, yielding stored XSS — and can bypass an allowlist CSP by sniffing a same-origin uploaded text file as script. Legacy Internet Explorer was the most aggressive sniffer.

### Referrer-Policy
**If weak (`unsafe-url`/`no-referrer-when-downgrade`):** Session IDs, password-reset tokens, or internal URLs embedded in paths/query strings leak to third parties and over downgraded connections.

### Permissions-Policy
**If missing:** Third-party iframes may silently access camera, microphone, geolocation, or payment APIs; permissive policies also widen the fingerprinting surface via sensors (accelerometer/gyroscope).

---

## 3. SECURE IMPLEMENTATION & HARDENING EXAMPLES

### 3.1 Golden-Standard Header Set

| Header | Recommended Value |
|---|---|
| Content-Security-Policy | `default-src 'self'; script-src 'nonce-{RANDOM}' 'strict-dynamic' 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests; require-trusted-types-for 'script'` |
| Strict-Transport-Security | `max-age=63072000; includeSubDomains; preload` |
| X-Frame-Options | `DENY` |
| X-Content-Type-Options | `nosniff` |
| Referrer-Policy | `strict-origin-when-cross-origin` (or `no-referrer` for high-security) |
| Permissions-Policy | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), accelerometer=(), gyroscope=(), autoplay=(), fullscreen=(self), interest-cohort=()` |

> **Note on `unsafe-inline` and grading:** A no-`unsafe` CSP earns Mozilla Observatory bonuses, and `default-src 'none'` plus no unsafe earns the maximum CSP bonus (+10). SecurityHeaders.com (Scott Helme / Snyk) relaxed its grading so `unsafe-inline` in **style-src only** no longer caps the grade below A+, and `unsafe-inline`/`unsafe-eval` alongside a nonce/hash no longer caps the grade.

### 3.2 Nginx (server/location block)

```nginx
server {
    listen 443 ssl;
    server_name example.com;

    add_header Content-Security-Policy "default-src 'self'; script-src 'strict-dynamic' 'nonce-$request_id'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests; require-trusted-types-for 'script'" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=(), accelerometer=(), gyroscope=(), autoplay=(), fullscreen=(self), interest-cohort=()" always;
}

server {
    listen 80;
    server_name example.com;
    return 301 https://$host$request_uri;
}
```

> **Nginx pitfalls:**
> 1. **The `always` flag** ensures headers apply to error responses (4xx/5xx); without it they appear only on 2xx/3xx (and select 3xx).
> 2. **Inheritance trap:** `add_header` directives are inherited from a parent block *only if no `add_header` exists at the current level*. A single `add_header` in a `location` block silently drops *all* server-level security headers — they must be repeated. The `headers-more` module's `more_set_headers` provides intuitive inheritance and is the recommended workaround.
> 3. **Per-server-block scope:** Each `server` block needs its own headers; the HTTP and HTTPS blocks do not share them.

### 3.3 Apache (.htaccess / httpd.conf)

```apache
<IfModule mod_headers.c>
    Header always set Content-Security-Policy "default-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests; require-trusted-types-for 'script'"
    Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
    Header always set X-Frame-Options "DENY"
    Header always set X-Content-Type-Options "nosniff"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=(), accelerometer=(), gyroscope=(), autoplay=(), fullscreen=(self), interest-cohort=()"
</IfModule>
```

> `mod_headers` must be enabled (`a2enmod headers`). `Header always set` applies to error responses too. Nonce-based CSP usually requires application-level generation, so the static Apache example above relies on `'self'`; combine it with application middleware for nonces.

### 3.4 Node.js / Express — Helmet.js v7+ (explicit) and equivalent middleware

```javascript
import express from "express";
import helmet from "helmet";
import crypto from "crypto";

const app = express();

// Per-request nonce
app.use((req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString("base64");
  next();
});

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'strict-dynamic'", (req, res) => `'nonce-${res.locals.cspNonce}'`],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        "require-trusted-types-for": ["'script'"],
        upgradeInsecureRequests: [],
      },
    },
    strictTransportSecurity: {
      maxAge: 63072000,
      includeSubDomains: true,
      preload: true,
    },
    xFrameOptions: { action: "deny" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    // X-Content-Type-Options: nosniff is on by default
  })
);

// Permissions-Policy (Helmet does not set this by default — spec still maturing)
app.use((req, res, next) => {
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), accelerometer=(), gyroscope=(), autoplay=(), fullscreen=(self), interest-cohort=()"
  );
  next();
});
```

**Equivalent hand-rolled middleware (`res.setHeader`)**:

```javascript
app.use((req, res, next) => {
  const nonce = crypto.randomBytes(16).toString("base64");
  res.locals.cspNonce = nonce;
  res.setHeader(
    "Content-Security-Policy",
    `default-src 'self'; script-src 'strict-dynamic' 'nonce-${nonce}'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests; require-trusted-types-for 'script'`
  );
  res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  next();
});
```

> **Helmet pitfalls:** `app.use(helmet())` sets a sensible default header set (and removes `X-Powered-By`), but its **default CSP includes `script-src 'self'` without a nonce and `style-src 'self' https: 'unsafe-inline'`** — not a strict CSP. Helmet **does not set `Permissions-Policy`** (the spec was still maturing), so add it manually. Helmet sets the legacy `X-XSS-Protection: 0` deliberately (the buggy auditor is disabled in favor of CSP). Keep Helmet up to date as defaults evolve.

---

## 4. AUDIT METHODOLOGY

### 4.1 Command-Line Verification

```bash
# Full headers, following redirects (apex -> www -> https)
curl -I -L https://example.com

# Isolate a single header (case-insensitive)
curl -sI https://example.com | grep -i 'strict-transport-security'

# Test apex AND www explicitly
curl -sI https://example.com     | grep -i -E 'content-security|strict-transport|x-frame|x-content|referrer|permissions'
curl -sI https://www.example.com | grep -i -E 'content-security|strict-transport|x-frame|x-content|referrer|permissions'

# Self-signed / lab certificate (skip TLS verification) -- testing only
curl -kI https://localhost

# Confirm HTTP->HTTPS uses a 301 (preload requirement)
curl -sI http://example.com | grep -i -E 'HTTP/|location'

# Confirm headers also present on error responses (the always/error-page test)
curl -sI https://example.com/nonexistent-404 | grep -i 'x-frame-options'
```

### 4.2 Automated Platforms
- **SecurityHeaders.com** (created by Scott Helme; acquired by Probely in June 2023; Probely acquired by Snyk in June 2025) — assigns an A+→F grade on response headers. *Note: Probely announced in April 2025 that the programmatic SecurityHeaders.com API will be discontinued in April 2026; the free web scanner remains live.*
- **Mozilla HTTP Observatory** (observatory.mozilla.org / MDN) — baseline score **100**; two-round scoring (penalties first, then bonuses only if the pre-bonus score is **≥ 90**); minimum **0**; current maximum **145** per MDN ("the highest possible score in the HTTP Observatory is currently 145" — note the GitHub `scoring.md` still states 135; versions diverge). Indicative modifiers from the canonical `grade.py`: missing CSP **−25**, CSP with `unsafe-inline`/`data:` in `script-src` **−20**, `unsafe-eval` **−10**, no-unsafe CSP **+5**, `default-src 'none'` + no unsafe **+10**; missing HSTS **−20**, `max-age` < 6 months **−10**, preloaded **+5**; missing X-Frame-Options **−20**, XFO via CSP `frame-ancestors` **+5**; missing `nosniff` **−5**; unsafe Referrer-Policy **−5**, private Referrer-Policy **+5** (a *missing* Referrer-Policy is 0 / no penalty). **Grade thresholds:** A+ = 100+, A = 90–99, A− = 85–89, B+ = 80–84, B = 70–79, B− = 65–69, C+ = 60–64, C = 50–59, C− = 45–49, D+ = 40–44, D = 30–39, D− = 25–29, F = 0–24.
- **Hardenize** — holistic host configuration (DNS, TLS, headers).
- **Google CSP Evaluator** (csp-evaluator.withgoogle.com) — flags `unsafe-inline`, missing `object-src`/`base-uri`, allowlist bypasses, and recommends Trusted Types.
- **Qualys SSL Labs** — TLS grade and HSTS presence/`max-age` verification.
- **webhint** — broad best-practices linting including headers.
- **Browser DevTools → Network tab** — inspect the Response Headers of a selected request; confirms what the browser actually received.

### 4.3 Common Misconfigurations an Auditor Must Flag
- CSP with `'unsafe-inline'` or `'unsafe-eval'` in `script-src`.
- CSP wildcard `*` in `script-src`/`default-src`.
- CSP `http:` or `data:` schemes in `script-src` (`data:` enables XSS).
- CSP missing `object-src 'none'` and `base-uri 'self'`.
- HSTS without `includeSubDomains`.
- HSTS `max-age` too short (< 1 year; 2 years recommended for preload).
- HSTS not preloaded in production.
- XFO present but CSP `frame-ancestors` absent (or the two conflicting — e.g., XFO `DENY` while `frame-ancestors` allows origins).
- `X-Content-Type-Options` absent or any value other than `nosniff`.
- `Referrer-Policy` set to `unsafe-url` or `no-referrer-when-downgrade`.
- `Permissions-Policy` missing or over-permissive.
- Nginx headers set without `always` (absent on error responses), or dropped by the `add_header` inheritance trap.
- Conflicting/duplicate headers.
- Headers present on HTTP but not HTTPS (or vice versa).

### 4.4 OWASP References
- **OWASP Secure Headers Project (OSHP)** — canonical add/remove header collections (also published as JSON for automation) plus a Venom validator test suite.
- **OWASP Cheat Sheet Series** — HTTP Headers, Content Security Policy, HTTP Strict Transport Security, and Clickjacking Defense cheat sheets.
- **OWASP ASVS v4.0.3 §V14.4** — HTTP Security Headers verification requirements.
- **OWASP Top 10 A05:2021** — Security Misconfiguration.

---

## 5. REPORT TEMPLATE & COMPARISON MATRIX

### 5.1 Ten-Site Audit Matrix (template)

| # | Target URL | CSP | HSTS | XFO | X-Content-Type-Options | Referrer-Policy | Permissions-Policy | Overall Score |
|---|---|---|---|---|---|---|---|---|
| 1 | https://target1.com | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | A+ |
| 2 | https://target2.com | ⚠️ | ✅ | ❌ | ✅ | ⚠️ | ❌ | B |
| 3 | https://target3.com | ❌ | ⚠️ | ✅ | ✅ | ✅ | ❌ | C |
| 4 | https://target4.com | | | | | | | |
| 5 | https://target5.com | | | | | | | |
| 6 | https://target6.com | | | | | | | |
| 7 | https://target7.com | | | | | | | |
| 8 | https://target8.com | | | | | | | |
| 9 | https://target9.com | | | | | | | |
| 10 | https://target10.com | | | | | | | |

Legend: ✅ Pass (present & correctly configured) · ⚠️ Misconfigured (present but weak) · ❌ Fail (absent).

### 5.2 Example Penetration-Test Finding (Professional Format)

> **Finding ID:** SH-2026-001
> **Title:** Missing Clickjacking Protection (No X-Frame-Options / CSP frame-ancestors)
> **Severity:** Medium (CVSS v3.1 ≈ 4.3, vector `AV:N/AC:L/PR:N/UI:R/S:U/C:N/I:L/A:N`)
> **Affected Asset:** `https://target2.com/account/settings` (HTML responses)
>
> **Description:** The application does not return an `X-Frame-Options` header nor a Content-Security-Policy `frame-ancestors` directive on framable HTML responses. A browser will therefore permit any third-party origin to embed these pages in an `<iframe>`, enabling UI-redressing (clickjacking).
>
> **Evidence:**
> ```
> $ curl -sI https://target2.com/account/settings | grep -iE 'x-frame-options|content-security-policy'
> $   # (no output — neither header present)
> ```
> A proof-of-concept `<iframe src="https://target2.com/account/settings">` rendered the live page with no framing restriction.
>
> **Impact:** An attacker can overlay invisible controls atop decoy content to trick an authenticated user into performing state-changing actions (e.g., changing account settings, authorizing payments) without their knowledge.
>
> **Likelihood:** Moderate — requires social-engineering the victim to visit an attacker page while authenticated, but the technique is well-understood and trivially deployed.
>
> **OWASP / CWE Reference:** CWE-1021 (Improper Restriction of Rendered UI Layers or Frames); OWASP A05:2021 – Security Misconfiguration; OWASP Clickjacking Defense Cheat Sheet.
>
> **Recommendation / Remediation:** Return both headers on all HTML responses (defense in depth — `frame-ancestors` for modern browsers, XFO for legacy):
> ```nginx
> add_header X-Frame-Options "DENY" always;
> add_header Content-Security-Policy "frame-ancestors 'none'" always;
> ```
> If specific trusted embedders are required, replace with `frame-ancestors https://trusted-partner.example;` and omit XFO `DENY` to avoid conflict. Verify with `curl -sI` post-deployment and re-scan via SecurityHeaders.com / Mozilla Observatory.
>
> **References:** RFC 7034; MDN X-Frame-Options; W3C CSP Level 3 (`frame-ancestors`); OWASP Clickjacking Defense Cheat Sheet.

---

## Recommendations

**Stage 1 — Baseline (deploy immediately, low risk):** Add `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` (or `SAMEORIGIN` if you self-frame), `Referrer-Policy: strict-origin-when-cross-origin`, and a deny-by-default `Permissions-Policy`. These have negligible breakage risk and immediately close clickjacking, MIME-sniffing, and referrer-leakage vectors. *Threshold to proceed:* `curl -sI` on apex, www, and a 404 path all show the four headers.

**Stage 2 — Transport hardening (after confirming full HTTPS):** Deploy `Strict-Transport-Security: max-age=31536000; includeSubDomains`, ramping from a short `max-age` while monitoring. Only after every subdomain is verified permanently HTTPS-capable, raise to `max-age=63072000; includeSubDomains; preload` and submit to hstspreload.org. *Threshold to proceed:* a DNS subdomain audit confirms 100% HTTPS coverage and a valid certificate chain; do **not** add `preload` before this.

**Stage 3 — CSP rollout (highest value, highest effort):** Begin in `Content-Security-Policy-Report-Only` mode with `default-src 'self'; script-src 'nonce-{RANDOM}' 'strict-dynamic'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'` and a `report-to`/`report-uri` endpoint. Triage violation reports for 2–4 weeks, refactor inline handlers to `addEventListener`, then switch to enforcing. *Threshold to enforce:* violation reports drop to only known-benign noise.

**Stage 4 — Trusted Types & continuous assurance:** Add `require-trusted-types-for 'script'` (report-only first) to eliminate DOM-XSS sinks, deploy SRI on all CDN scripts, and wire SecurityHeaders.com/Observatory/CSP-Evaluator into CI so a header regression fails the build. *Benchmark:* sustained A+ on both scanners and zero CSP/Trusted-Types violations in production telemetry.

**Triggers to revisit:** A drop below Observatory grade A, any new third-party script/CDN added to the page, any new subdomain (re-validate HSTS/preload), or a Helmet/server major-version upgrade (re-verify defaults).

---

## Caveats
- **Automated grades test only HTTP-layer configuration.** Mozilla Observatory and SecurityHeaders.com explicitly do not assess outdated software, SQL injection, authentication, or business-logic flaws; an A+ is not a clean bill of health.
- **A strict CSP with Trusted Types can break legacy inline scripts and third-party widgets.** Always deploy first in `Content-Security-Policy-Report-Only` mode and monitor violation reports before enforcing.
- **HSTS `preload` is effectively irreversible** (removal takes months across browser releases); never enable it until every subdomain is permanently HTTPS-capable.
- **Source/version discrepancies noted in the body:** Mozilla Observatory's maximum score is reported as 145 by current MDN but 135 by the (archived) GitHub `scoring.md`; the modifier values cited are from the canonical `grade.py`. The British Airways "affected individuals" figure varies by source (commonly reported as ~380,000–429,612) depending on whether all potentially-accessed records or only confirmed card-data records are counted; the ICO's investigation figure of ~429,612 is used here.
- **ALLOW-FROM and `X-XSS-Protection` are deprecated** and should not be relied upon; modern equivalents are CSP `frame-ancestors` and a strict CSP, respectively.