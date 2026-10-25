# apdock • Architecture Reality Matrix & Baseline Audit

> **Audit Date**: October 25, 2026  
> **Repository Baseline**: Angular 22.2.0 Zoneless PWA, Firebase Auth, Firestore Lite  
> **Status**: Phase 0 Reality Check Complete (Zero application code modified)

---

## 1. Executive Summary

This matrix audits every architectural claim documented in [`docs/ARCHITECTURE.md`](file:///Users/pranavkatiyar/Documents/NG/apdock/docs/ARCHITECTURE.md) against actual code implementations across the repository.

Status Classifications:
- **IMPLEMENTED**: Fully present, wired, and verified in active code.
- **PARTIAL**: Partially built or functioning under constrained/flawed assumptions; diverges from design.
- **PLANNED**: Documented as architecture or target state, but not yet present in codebase.

---

## 2. Comprehensive Claim-by-Claim Reality Matrix

### Section 1: System Overview & Tech Stack

| Architecture Claim | Claimed in Doc | Reality Status | File:Line Evidence & Verification Notes |
|---|---|---|---|
| **Angular 22.2 Zoneless** | Framework & runtime | **IMPLEMENTED** | [`package.json:17`](file:///Users/pranavkatiyar/Documents/NG/apdock/package.json#L17), [`app.config.ts:8`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/app.config.ts#L8) (`provideZonelessChangeDetection()`). Zero `zone.js` in bundle. |
| **Firebase Auth** | Identity provider | **IMPLEMENTED** | [`auth.service.ts:13`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/auth.service.ts#L13), [`auth.service.ts:103`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/auth.service.ts#L103). Email/Password provider used with PIN wrapper. |
| **Firestore Lite** | Database transport | **IMPLEMENTED** | [`auth.service.ts:23`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/auth.service.ts#L23), [`auth.service.ts:105`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/auth.service.ts#L105). Uses `firebase/firestore/lite` exclusively. |
| **Local-First Storage** | Instant $0\text{ms}$ UI state | **PARTIAL** | Local storage is used for UI speed, but keys are **global/unscoped** across all users on the device, violating multi-tenant isolation. |
| **Mobile-First PWA** | Installable offline app | **PARTIAL** | [`manifest.webmanifest`](file:///Users/pranavkatiyar/Documents/NG/apdock/public/manifest.webmanifest#L1) exists. However, `@angular/service-worker` is **not installed** ([`package.json`](file:///Users/pranavkatiyar/Documents/NG/apdock/package.json#L14)), [`ngsw-config.json`](file:///Users/pranavkatiyar/Documents/NG/apdock/ngsw-config.json) does **not exist**, and updates use destructive `caches.delete()`. |
| **App Check Anti-Bot Gating** | Enforce genuine client | **PLANNED** | Zero App Check code or SDK imports exist in [`app.config.ts`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/app.config.ts#L1) or [`firebase.config.ts`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/firebase.config.ts#L1). |
| **Strict Tenant Isolation** | DB security rules | **PARTIAL** | [`firestore.rules:19-25`](file:///Users/pranavkatiyar/Documents/NG/apdock/firestore.rules#L19-L25) isolates `/users/{userId}`, but `/usernames/{username}` exposes email & displayName to any authenticated user ([`firestore.rules:40`](file:///Users/pranavkatiyar/Documents/NG/apdock/firestore.rules#L40)). |

---

### Section 2: Frontend Architecture & Components

| Architecture Claim | Claimed in Doc | Reality Status | File:Line Evidence & Verification Notes |
|---|---|---|---|
| **Standalone Components** | 100% Standalone | **IMPLEMENTED** | All components have `standalone: true`. E.g., [`app.ts:7`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/app.ts#L7), [`header.component.ts:22`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/components/header/header.component.ts#L22). |
| **Functional Route Guards** | `authGuard`, `guestGuard` | **IMPLEMENTED** | [`auth.guard.ts:10-38`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/guards/auth.guard.ts#L10-L38), wired in [`app.routes.ts:9-11`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/app.routes.ts#L9-L11). |
| **SplashScreenComponent** | 4-quadrant boot animation | **IMPLEMENTED** | [`splash-screen.component.ts:1-75`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/components/splash-screen/splash-screen.component.ts#L1-L75). |
| **AuthComponent** | 4-digit PIN Sign In / Sign Up | **IMPLEMENTED** | [`auth.component.ts:1-205`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/pages/auth/auth.component.ts#L1-L205). |
| **HeaderComponent** | Universal sticky header | **PARTIAL** | Theme switcher, account delete modal, and diet popover are implemented. `SwUpdate` is **not implemented**; updates use `caches.delete()` in [`header.component.ts:241`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/components/header/header.component.ts#L241). |
| **HomeComponent** | Greeting, date, quadrants | **IMPLEMENTED** | [`home.component.ts:1-125`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/pages/home/home.component.ts#L1-L125). |
| **DietComponent** | Cockpit, slots, veggies | **IMPLEMENTED** | [`diet.component.ts:1-629`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/pages/diet/diet.component.ts#L1-L629). |
| **DietPreferenceModal** | Squircle modal for goal/type | **IMPLEMENTED** | [`diet-preference-modal.component.ts:1-85`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/components/diet-preference-modal/diet-preference-modal.component.ts#L1-L85). |
| **AddRecipeModal** | Recipe creator/editor, tags | **IMPLEMENTED** | [`add-recipe-modal.component.ts:1-352`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/components/add-recipe-modal/add-recipe-modal.component.ts#L1-L352). |
| **MoveRecipeModal** | Rehoming / transfer sheet | **IMPLEMENTED** | [`move-recipe-modal.component.ts:1-118`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/components/move-recipe-modal/move-recipe-modal.component.ts#L1-L118). |

---

### Section 3: Reactive State Management & Services

#### 3.1 AuthService
| Architecture Claim | Claimed in Doc | Reality Status | File:Line Evidence & Verification Notes |
|---|---|---|---|
| **PIN Key Wrapping** | `apdock_pin_${pin}_secure` | **IMPLEMENTED** | [`auth.service.ts:122-123`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/auth.service.ts#L122-L123). Keyspace remains $10,000$ without rate-limiting. |
| **Anti-Enumeration Rules** | Block unauthenticated reads | **PARTIAL / BROKEN** | [`firestore.rules:40`](file:///Users/pranavkatiyar/Documents/NG/apdock/firestore.rules#L40) blocks unauthenticated reads, but [`auth.service.ts:156`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/auth.service.ts#L156) & [`auth.service.ts:317`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/auth.service.ts#L317) execute unauthenticated reads on new devices! This causes sign-in on a fresh device to fail with "Database connection blocked". |
| **Rate Limiting & Lockout** | Exponential backoff, 5-fail lockout | **PLANNED** | No failed-attempt counter, no lockout state, and no client/server rate limiting exist in [`auth.service.ts`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/auth.service.ts). |
| **PIN Recovery Flow** | Magic link / OTP / recovery code | **PLANNED** | No password reset, magic link, OTP, or recovery code logic exists. |
| **Pre-Reauthentication Deletion** | Reauth PIN before deleting docs | **PLANNED** | [`auth.service.ts:382-441`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/auth.service.ts#L382-L441) calls `deleteDoc` and `deleteUser` directly without reauthenticating credentials first. |
| **Atomic Batched Deletion** | `writeBatch()` for user & username | **PARTIAL** | Uses two independent, sequential calls: `deleteDoc(userDocRef)` ([`auth.service.ts:399`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/auth.service.ts#L399)) and `deleteDoc(usernameDocRef)` ([`auth.service.ts:408`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/auth.service.ts#L408)). If step 2 or 3 fails, orphaned records remain. |
| **User LocalStorage Purge on Deletion**| Clear all `apdock_${uid}_*` keys | **PARTIAL** | Only removes `apdock_user_${username}` ([`auth.service.ts:415`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/auth.service.ts#L415)). Fails to remove `apdock_profile_${uid}` or any diet customization keys. |
| **Cloud Function Cascade** | `deleteAccountCascade` callable | **PLANNED** | Zero Cloud Functions exist in the repository. |
| **Sign-Out Protocol** | Kill session, isolate data | **PARTIAL** | Signs out Firebase Auth and clears `sessionStorage` ([`auth.service.ts:362-367`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/auth.service.ts#L362-L367)), but local diet data is stored globally, leaking to the next user. |

#### 3.2 ThemeService
| Architecture Claim | Claimed in Doc | Reality Status | File:Line Evidence & Verification Notes |
|---|---|---|---|
| **3 Theme Modes** | 'light', 'dark', 'system' | **IMPLEMENTED** | [`theme.service.ts:3, 9`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/theme.service.ts#L3-L9). |
| **HTML `data-theme` attribute**| Updates root element | **IMPLEMENTED** | [`theme.service.ts:18`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/theme.service.ts#L18). |
| **Dynamic `theme-color` meta** | Synchronize mobile status bar | **PLANNED** | Not present in [`theme.service.ts`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/theme.service.ts). |
| **OS matchMedia Listener** | Listen to system theme changes | **PLANNED** | Not present in [`theme.service.ts`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/theme.service.ts). |
| **Bidirectional Cloud Sync** | Sync to `/users/{uid}.themePreference`| **PLANNED** | Zero Firestore reads or writes in [`theme.service.ts`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/theme.service.ts). |
| **LocalStorage Caching** | Instant splash boot caching | **PLANNED** | Does not read or write `localStorage` ([`theme.service.ts:1-28`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/theme.service.ts#L1-L28)). Reverts to `'system'` on page refresh. |

#### 3.3 DietService
| Architecture Claim | Claimed in Doc | Reality Status | File:Line Evidence & Verification Notes |
|---|---|---|---|
| **Preference Management** | Goal (`loss`/`gain`) & diet type | **IMPLEMENTED** | [`diet.service.ts:9-12, 131-147`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/diet.service.ts#L9-L12). |
| **User-Scoped Storage (`apdock_{uid}_*`)** | Tenant-scoped keys | **PLANNED / FALSE** | All storage keys are global: `apdock_diet_preference`, `apdock_custom_recipes`, `apdock_custom_day_meals`, `apdock_removed_day_meals`, `apdock_edited_day_meals` ([`diet.service.ts:78-84`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/diet.service.ts#L78-L84)). |
| **Cloud Sync (`/users/{uid}/diet/customizations`)** | Sync recipes/edits | **PLANNED** | No Firestore sync exists for diet customizations; purely local. |
| **Calibrated Timing Windows** | 4 realistic slots + overnight dinner | **PARTIAL** | [`diet.service.ts:178-190`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/diet.service.ts#L178-L190) only handles 3 time windows (`< 12` breakfast, `< 18` lunch, else dinner). Snack and after-midnight (00:00-06:00) handling are not implemented in the time resolver. |
| **Database Schema Versioning** | `DIET_DATABASE_VERSION` + migration | **PLANNED** | No version constant or reconciliation routine exists in codebase. |
| **Goal/Type Override Scoping** | Keyed by `${goal}_${type}_${day}_${slot}` | **PLANNED / FALSE** | [`diet.component.ts:362-367`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/pages/diet/diet.component.ts#L362-L367) keys overrides only by `${day}_${slotId}` in global key `apdock_meal_overrides`. |
| **Veggie Checklist Date Scoping** | `checked_veggies_${YYYY_MM_DD}` | **PLANNED / FALSE** | Stored in global unscoped key `apdock_checked_veggies` ([`diet.component.ts:385`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/pages/diet/diet.component.ts#L385)). No date suffix, no midnight auto-reset. |
| **Reset Standard Plan & Rehoming** | Clear edits/removals, rehome dishes | **PARTIAL** | Removal from schedule rehomes to additional recipes ([`diet.service.ts:407-414`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/diet.service.ts#L407-L414)), but does not check for duplicate titles before inserting. |

---

### Section 4: Diet Module UI & Caching

| Architecture Claim | Claimed in Doc | Reality Status | File:Line Evidence & Verification Notes |
|---|---|---|---|
| **Circular Week Queue** | 35 items, 5 cycles, Sun-Sat | **IMPLEMENTED** | [`diet.component.ts:31-34, 185-197`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/pages/diet/diet.component.ts#L31-L34). |
| **Auto-Scroll & Shortest Path** | Centered chip & delta normalization | **IMPLEMENTED** | [`diet.component.ts:219-300`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/pages/diet/diet.component.ts#L219-L300). |
| **In-Memory Cache `cachedDayPlans`** | Map for $0\text{ms}$ day switching | **IMPLEMENTED** | [`diet.component.ts:47, 321-337`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/pages/diet/diet.component.ts#L47). |
| **Lazy-Load `DIET_DATABASE`** | Separate chunk to optimize bundle | **PLANNED** | Statically imported/embedded in [`diet.service.ts:900-2897`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/diet.service.ts#L900-L2897). Inlined directly into initial `main-*.js` chunk. |

---

### Section 5: Backend & Security Rules

| Architecture Claim | Claimed in Doc | Reality Status | File:Line Evidence & Verification Notes |
|---|---|---|---|
| **User Profile Isolation** | `/users/{userId}` isOwner check | **IMPLEMENTED** | [`firestore.rules:19-25`](file:///Users/pranavkatiyar/Documents/NG/apdock/firestore.rules#L19-L25). |
| **Username Reservation Index** | Unique handle reservation | **PARTIAL** | Exists in [`firestore.rules:39-46`](file:///Users/pranavkatiyar/Documents/NG/apdock/firestore.rules#L39-L46) and [`auth.service.ts:463-472`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/auth.service.ts#L463-L472). However: (1) stores `email` and `displayName`, leaking PII, (2) allows full collection `list` to any authenticated user, (3) blocks unauthenticated reads needed by sign-in on new devices. |
| **Document Schema Validation** | Validate keys, types, sizes | **PLANNED** | Zero schema/field/type/size validation rules in [`firestore.rules`](file:///Users/pranavkatiyar/Documents/NG/apdock/firestore.rules). |

---

### Section 6: PWA, Service Worker & Edge CDN Caching

| Architecture Claim | Claimed in Doc | Reality Status | File:Line Evidence & Verification Notes |
|---|---|---|---|
| **Angular Service Worker** | `@angular/service-worker` via `SwUpdate`| **PLANNED** | Package not in [`package.json`](file:///Users/pranavkatiyar/Documents/NG/apdock/package.json#L14). [`ngsw-config.json`](file:///Users/pranavkatiyar/Documents/NG/apdock/ngsw-config.json) does not exist. Not configured in [`angular.json`](file:///Users/pranavkatiyar/Documents/NG/apdock/angular.json#L17) or [`app.config.ts`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/app.config.ts#L5). |
| **Version Readiness Notification** | Non-intrusive update toast | **PLANNED** | Not implemented. Update trigger is an in-menu button calling destructive cache wipe. |
| **Cache Purge Avoidance** | Controlled activation without `caches.delete()` | **PLANNED / FALSE** | [`header.component.ts:238-245`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/components/header/header.component.ts#L238-L245) explicitly iterates `window.caches.keys()` and deletes every cache. |
| **Edge CDN Headers (`firebase.json`)** | `no-cache` on HTML, `immutable` on hashed assets | **PARTIAL** | [`firebase.json:9-46`](file:///Users/pranavkatiyar/Documents/NG/apdock/firebase.json#L9-L46). However, line 38-44 assigns `immutable, max-age=31536000` to unhashed icons (`app-icon.png`, `favicon.ico`), preventing clients from picking up icon updates. |

---

## 3. Actual `localStorage` Key Inventory

The codebase currently references **11 distinct key patterns**, all of which are documented below with their actual runtime scoping:

| Key Pattern in Code | Location | Intended Scope in ARCHITECTURE.md | Actual Runtime Scope | Security / Data Isolation Risk |
|---|---|---|---|---|
| `apdock_user_${cleanUser}` | [`auth.service.ts:148, 162, 233, 415`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/auth.service.ts#L148) | Fast-path local handle lookup | Per username (device-wide) | Leaks email-to-handle association across users on shared devices. |
| `apdock_profile_${user.uid}` | [`auth.service.ts:495, 508, 532, 556, 620`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/auth.service.ts#L495) | Scoped user profile cache | Scoped to UID | Properly scoped, but never purged upon account deletion. |
| `apdock_diet_preference` | [`diet.service.ts:78, 112, 122, 140, 153`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/diet.service.ts#L78) | `apdock_{uid}_diet_preference` | **Global (Unscoped)** | New user logging in inherits previous user's goal/diet type. |
| `apdock_custom_recipes` | [`diet.service.ts:79, 517, 546, 594, 638`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/diet.service.ts#L79) | `apdock_{uid}_custom_recipes` | **Global (Unscoped)** | All custom recipes created by User A are visible to User B. |
| `apdock_custom_day_meals` | [`diet.service.ts:80, 246, 315, 348, 399`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/diet.service.ts#L80) | `apdock_{uid}_custom_day_meals` | **Global (Unscoped)** | User A's custom day meals appear in User B's schedule. |
| `apdock_removed_day_meals` | [`diet.service.ts:81, 256, 388`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/diet.service.ts#L81) | `apdock_{uid}_removed_day_meals` | **Global (Unscoped)** | User A's removed meal exclusions apply to User B. |
| `apdock_edited_day_meals` | [`diet.service.ts:82, 266, 369`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/diet.service.ts#L82) | `apdock_{uid}_edited_day_meals` | **Global (Unscoped)** | User A's dish edits modify User B's schedule. |
| `apdock_removed_additional_recipes` | [`diet.service.ts:83, 276, 661`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/diet.service.ts#L83) | *Not documented* | **Global (Unscoped)** | User A's deletions hide recipes for User B. |
| `apdock_edited_additional_recipes` | [`diet.service.ts:84, 286, 612, 650`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/diet.service.ts#L84) | *Not documented* | **Global (Unscoped)** | User A's edits override User B's additional recipes. |
| `apdock_meal_overrides` | [`diet.component.ts:367, 612`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/pages/diet/diet.component.ts#L367) | `apdock_{uid}_meal_overrides_{goal}_{type}` | **Global (Unscoped)** | Overrides leak across users and are not scoped by goal/type. |
| `apdock_checked_veggies` | [`diet.component.ts:385, 622`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/pages/diet/diet.component.ts#L385) | `apdock_{uid}_checked_veggies_${date}` | **Global (Unscoped)** | Checklist state persists indefinitely without date scoping or midnight reset. |

---

## 4. Firestore Reads and Writes per Session

All remote calls in the application run through [`auth.service.ts`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/auth.service.ts) using `firebase/firestore/lite`. The diet module and theme service make zero Firestore calls in the current release.

### Session Lifecycle Breakdown

| Session Flow | Firestore Reads | Firestore Writes | Detailed Operation Breakdown |
|---|---|---|---|
| **Warm Boot / Returning User**<br/>*(Already authenticated in Auth)* | **1 read** | **0 writes** | - Read: `getDoc(/users/{uid})` on `onAuthStateChanged` ([`auth.service.ts:542`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/auth.service.ts#L542)).<br/>- Caches profile in `apdock_profile_${uid}`. |
| **Sign-In Flow (Existing User)** | **2–3 reads** | **1 write** | - Read 1 (Conditional): `getDoc(/usernames/{username})` ([`auth.service.ts:156`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/auth.service.ts#L156)) if username not in localStorage (fails under strict rules!).<br/>- Read 2: `getDoc(/users/{uid})` in `syncUserToBackend` ([`auth.service.ts:455`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/auth.service.ts#L455)).<br/>- Write 1: `updateDoc(/users/{uid})` with `lastLoginAt` ([`auth.service.ts:499`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/auth.service.ts#L499)).<br/>- Read 3 (Redundant): `getDoc(/users/{uid})` triggered by `onAuthStateChanged` listener ([`auth.service.ts:542`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/auth.service.ts#L542)). |
| **Sign-Up Flow (New User)** | **2–4+ reads** | **2 writes** | - Reads 1–N: `getDoc(/usernames/{candidate})` in `generateUniqueUsername` loop ([`auth.service.ts:317`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/auth.service.ts#L317)). Catches error and proceeds if unauthenticated!<br/>- Read N+1: `getDoc(/users/{uid})` checking if doc exists ([`auth.service.ts:455`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/auth.service.ts#L455)).<br/>- Write 1: `setDoc(/usernames/{username})` reserving handle ([`auth.service.ts:463`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/auth.service.ts#L463)).<br/>- Write 2: `setDoc(/users/{uid})` storing initial profile ([`auth.service.ts:492`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/auth.service.ts#L492)). |
| **Diet Preference Update** | **0 reads** | **1 write** | - Write 1: `setDoc(/users/{uid}, { dietPreference }, { merge: true })` ([`auth.service.ts:614`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/auth.service.ts#L614)) when popover closes. |
| **Theme Change / Diet Customizations** | **0 reads** | **0 writes** | - Stored solely in local storage; zero cloud sync in v0.1.0. |
| **Sign Out** | **0 reads** | **0 writes** | - Local session kill only. |
| **Account Deletion** | **0 reads** | **2 writes** | - Write 1: `deleteDoc(/users/{uid})` ([`auth.service.ts:399`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/auth.service.ts#L399)).<br/>- Write 2: `deleteDoc(/usernames/{username})` ([`auth.service.ts:408`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/auth.service.ts#L408)). Sequential; non-atomic. |

---

## 5. Bundle Size per Chunk (Production Build Baseline)

Generated via `npm run build` (`ng build --configuration production`) on October 25, 2026:

```
Initial chunk files | Names         |  Raw size | Estimated transfer size
main-VJ6MPBLI.js    | main          | 722.20 kB |               167.40 kB
styles-CPAPEJUO.css | styles        |  11.64 kB |                 1.57 kB

                    | Initial total | 733.84 kB |               168.97 kB
```

### Chunk Breakdown Analysis
- **`main-*.js` (722.20 kB raw / 167.40 kB transfer)**:
  - Contains Angular core framework, router, Firebase Auth SDK, Firestore Lite SDK, and all 3 application routes (`Home`, `Diet`, `Auth`) as eager static imports.
  - Contains `DIET_DATABASE` (lines 900–2897 in [`diet.service.ts`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/core/services/diet.service.ts#L900-L2897)), contributing ~100 kB+ of raw static meal data directly into the initial payload.
- **`styles-*.css` (11.64 kB raw / 1.57 kB transfer)**:
  - Clean vanilla CSS design system and tokens.
- **Lazy Chunks**: **0 kB (None)**. No dynamic imports or route-level code splitting are configured in [`app.routes.ts`](file:///Users/pranavkatiyar/Documents/NG/apdock/src/app/app.routes.ts#L7-L13).
