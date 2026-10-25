# apdock • PWA Baseline Audit (Phase A)

> **Date**: October 25, 2026  
> **Environment**: Angular 22.2 Zoneless Production Build (`ng build --configuration production`) served locally via static SPA server (`http://localhost:8085`)  
> **Audit Tool**: Lighthouse 13.5.0 Mobile (Chromium / Microsoft Edge 153, simulated throttling, mobile viewport emulation)  
> **Status**: Baseline Established (Zero application changes)

---

## 1. Executive Summary & Scores

| Category | Baseline Score | Target Score | Primary Gap / Bottleneck |
|---|---|---|---|
| **Performance** | **48 / 100** | $\ge \mathbf{90}$ | Monolithic eager bundle (740 kB main JS), inlined 2,000-line Diet database, unoptimized 751 kB `app-icon.png`, external blocking Google Fonts. |
| **Accessibility** | **91 / 100** | $\ge \mathbf{95}$ | `<meta name="viewport">` has `maximum-scale=1, user-scalable=no` which prevents zooming. |
| **Best Practices** | **73 / 100** | $\ge \mathbf{95}$ | Non-cached static assets, missing security headers, mixed content warnings. |
| **SEO** | **83 / 100** | $\ge \mathbf{90}$ | Missing structured meta descriptions and canonical hints. |
| **PWA / Installability** | **FAILED** | **PASS (100%)** | Zero Service Worker registered (`@angular/service-worker` missing), manifest missing `id`, maskable icons, shortcuts, safe padding. |

---

## 2. Core Web Vitals & Runtime Metrics

| Metric | Baseline Value | Status | Target |
|---|---|---|---|
| **First Contentful Paint (FCP)** | **9.5 s** | Poor | $\le 1.8\text{ s}$ |
| **Largest Contentful Paint (LCP)** | **11.1 s** | Poor | $\le 2.5\text{ s}$ |
| **Total Blocking Time (TBT)** | **340 ms** | Needs Improvement | $\le 200\text{ ms}$ |
| **Cumulative Layout Shift (CLS)** | **0.000** | Good | $\le 0.05$ |
| **Speed Index** | **9.5 s** | Poor | $\le 3.0\text{ s}$ |

---

## 3. Production Bundle & JavaScript Transferred per Route

### Initial Chunk Breakdown (`ng build --configuration production`)
- `main-FEUG26PV.js`: **740.13 kB raw** / **172.23 kB transferred**
- `styles-CPAPEJUO.css`: **11.64 kB raw** / **1.57 kB transferred**
- **Initial Total**: **751.77 kB raw** / **173.80 kB transferred**
- **Lazy Chunks**: **0 kB (None)**

### JS Transferred per Route
Because [`src/app/app.routes.ts`](../src/app/app.routes.ts) eagerly imports `HomeComponent`, `DietComponent`, and `AuthComponent`, and [`diet.service.ts`](../src/app/core/services/diet.service.ts) inlines the entire `DIET_DATABASE` (2,000+ lines), every route transfers the entire 740 kB monolithic bundle upfront:

| Route | Raw JS Size | Transferred JS Size | Code-Splitting Status |
|---|---|---|---|
| `/` (Redirect to `/home`) | 740.13 kB | 172.23 kB | None (Monolithic) |
| `/home` | 740.13 kB | 172.23 kB | None (Monolithic) |
| `/diet` | 740.13 kB | 172.23 kB | None (Monolithic) |
| `/auth` | 740.13 kB | 172.23 kB | None (Monolithic) |

---

## 4. Installability & PWA Audit Failures

| Requirement | Current Baseline Reality | Failure Detail |
|---|---|---|
| **Service Worker Registration** | **MISSING** | No service worker registered. App cannot function offline. |
| **Manifest `id`** | **MISSING** | `manifest.webmanifest` does not declare a unique app identity `id: "/"`. |
| **Maskable Icons** | **MISSING** | Manifest only provides a single `app-icon.png` (751 kB) with `purpose: "any"`. No maskable icon with safe-zone margin is present. |
| **Display Override** | **MISSING** | Manifest only has `display: "standalone"`, missing `display_override: ["standalone", "minimal-ui"]`. |
| **Orientation & Lang** | **MISSING** | Manifest does not declare `orientation: "portrait"` or `lang: "en"`. |
| **Shortcuts** | **MISSING** | No app shortcuts defined for direct navigation to `/diet` or `/home`. |
| **Categories** | **MISSING** | Manifest lacks store categorization (`["health", "lifestyle"]`). |
| **Viewport Scalability** | **FAIL** | `user-scalable=no` and `maximum-scale=1` in `<meta name="viewport">` violates accessibility guidelines. |
| **Apple Touch Icons** | **PARTIAL** | Points to unoptimized 751 kB icon without size specifications (`180x180`). |
| **Theme Color Metas** | **PARTIAL** | Single static `<meta name="theme-color" content="#05070c">`. Missing media queries for `(prefers-color-scheme: dark)` and `(prefers-color-scheme: light)`. |

---

## 5. Cold-Start Network Request Inventory

Captured on fresh cold boot (unauthenticated first visit):

| # | Request Path / URL | Resource Type | Size (Bytes) | HTTP Status | Role & Verification Notes |
|---|---|---|---|---|---|
| 1 | `/` | Document | 20,326 | 200 | Initial SPA HTML root (`index.html`) |
| 2 | `/main-FEUG26PV.js` | Script | 740,306 | 200 | Eager JavaScript bundle (Angular zoneless core, router, Firebase Auth SDK, Firestore Lite SDK, Diet database) |
| 3 | `/styles-CPAPEJUO.css` | Stylesheet | 11,811 | 200 | Global CSS design tokens and base styles |
| 4 | `/app-icon.png` | Image | 751,715 | 200 | Unoptimized app icon referenced in header and splash screen |
| 5 | `/manifest.webmanifest` | Manifest | 722 | 200 | Web App Manifest configuration |
| 6 | `https://fonts.gstatic.com/.../plusjakartasans...woff2` | Font | 27,890 | 200 | Plus Jakarta Sans font loaded from Google Fonts CDN |
| 7 | `https://fonts.gstatic.com/.../jetbrainsmono...woff2` | Font | 31,559 | 200 | JetBrains Mono font loaded from Google Fonts CDN |
| 8 | `https://content-firebaseappcheck.googleapis.com/.../exchangeDebugToken` | Fetch | 738 | 403 | Firebase App Check token exchange attempt (fails 403 in local dev) |
| 9 | `https://content-firebaseappcheck.googleapis.com/.../exchangeDebugToken` | Preflight | 0 | 200 | CORS Preflight for App Check |
| 10 | `https://www.google.com/recaptcha/api.js` | Script | 1,485 | 200 | Firebase Auth bot verification script |
| 11 | `https://apis.google.com/js/api.js?onload=...` | Script | 6,426 | 200 | Google Identity / Auth gapi loader |
| 12 | `https://www.gstatic.com/recaptcha/releases/.../recaptcha__en.js` | Script | 359,349 | 200 | Google reCAPTCHA Enterprise runtime script |
| 13 | `https://apis.google.com/_/scs/abc-static/_/js/k=gapi...` | Script | 35,493 | 200 | Google Auth iframe bridge client |
| 14 | `https://apdock.firebaseapp.com/__/auth/iframe?...` | Document | 567 | 200 | Firebase Auth hidden cross-origin iframe for session storage |
| 15 | `https://apdock.firebaseapp.com/__/auth/iframe.js` | Script | 95,323 | 200 | Firebase Auth session broker script |
| 16 | `https://www.google.com/recaptcha/api2/anchor?...` | Document | 29,722 | 200 | reCAPTCHA invisible anchor |
| 17 | `https://www.gstatic.com/recaptcha/.../styles__ltr.css` | Stylesheet | 36,095 | 200 | reCAPTCHA badge styling |
| 18 | `https://www.google.com/recaptcha/api2/webworker.js?...` | Script | 141 | 200 | reCAPTCHA background web worker |
| 19 | `https://www.google.com/recaptcha/api2/bframe?...` | Document | 2,254 | 200 | reCAPTCHA challenge iframe |
| 20 | `https://www.google.com/recaptcha/api2/reload?...` | XHR | 3,162 | 200 | reCAPTCHA token polling/refresh |
| 21 | `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getProjectConfig?...` | XHR | 381 | 200 | Firebase Auth project configuration handshake |
| 22 | `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getProjectConfig?...` | Preflight | 0 | 200 | CORS Preflight for Identity Toolkit handshake |
| 23 | `/app-icon.png` (Cached/Repeated) | Image | 751,715 | 200 | Repeated browser request for icon |
