# apdock • Business & Functional Requirements Document (BFRD)

> **Document Status**: Production Baseline & Hardened Requirements  
> **Target Version**: v0.1.0 (with v0.2.0 Cloud Sync & Hardening Roadmap)  
> **Tech Stack**: Angular v22.2 (Zoneless Signal Architecture), Firebase Authentication, Cloud Firestore (Lite), Multi-Tenant Local-First Storage, Mobile-First PWA  
> **Last Updated**: October 2026

---

## 1. Business Requirements Document (BRD)

### 1.1 Executive Summary & Product Vision
Modern lifestyle applications are typically bloated, ad-ridden, fragmented, and demanding of users' cognitive energy. Users often juggle separate apps for recipes, diet tracking, habit tracking, and family organization, each requiring complex logins, lengthy onboarding quizzes, and invasive tracking.

**apdock** is designed as a **luxury, distraction-free lifestyle dock**—a mobile-first Progressive Web Application (PWA) operating under strict agency-grade design principles (inspired by Apple Health, Linear, and Superhuman). It unifies core lifestyle dimensions into four clean quadrants: **Health & Wellness**, **Daily Flow & Tasks**, **Family & Tribe**, and **Home & Sanctuary**.

The flagship module—**Personalized Daily Diet**—eliminates meal planning fatigue by giving users immediate clarity on what to eat right now, what groceries are required for the day, and the flexibility to swap, customize, or move recipes without ever losing their culinary preferences.

```
       ┌─────────────────────────────────────────────────────────────┐
       │                        apdock Vision                        │
       │     The friction-free lifestyle dock for high-agency living  │
       │                                                             │
       │  "Frictionless Auth" • "Anti-Clutter UX" • "Local-First"    │
       └──────────────────────────────┬──────────────────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        ▼                             ▼                             ▼
 [01. Health & Wellness]       [02. Daily Flow]             [03. Home & Tribe]
 • Diet Cockpit (LIVE)         • Focus Dock (Roadmap)       • Shared Tribe (Roadmap)
 • Gym Tracking (Planned)      • Habits (Roadmap)           • Sanctuary (Roadmap)
```

---

### 1.2 Target Audience & User Personas

| Persona | Profile | Core Pain Point | How apdock Solves It |
|---|---|---|---|
| **The Focused Professional** | 25–45, tech-savvy, values time and focus | Overwhelmed by complex diet trackers requiring calorie micro-logging; forgets complex passwords. | Sign in with a simple 4-digit PIN; instant view of today's meal options with zero calorie counting overhead. |
| **The Structured Meal Planner** | Manages household nutrition, cooks daily meals | Difficulty keeping track of grocery ingredients across days; losing favorite recipes when changing weekly plans. | Automatic date-scoped grocery vegetable aggregation; automated recipe rehoming ensuring deleted schedule dishes are preserved in the Additional Recipes library. |
| **The Fitness & Lifestyle Enthusiast** | Pursuing specific fitness goals (Fat Loss vs Muscle Gain) | Generic recipe apps lack simple dietary filtering (Veg, Non-Veg, Mixed); cluttered interfaces with intrusive ads. | Instant Goal (`loss` / `gain`) and Lifestyle Diet Type (`veg` / `nonveg` / `both`) toggling directly in-context from the header; clean, ad-free aesthetic. |

---

### 1.3 Strategic Business Objectives & Value Proposition

1. **Zero-Friction Authentication**:
   - Provide the fastest possible time-to-value by replacing cumbersome password inputs with a fast **4-digit PIN** and automated handle generation (`@username`), backed by server-side rate-limiting and App Check anti-bot gating.
2. **Cognitive Load Reduction**:
   - Present only what is actionable right now: dynamic time-of-day meal resolution (Morning $\rightarrow$ Breakfast, Midday $\rightarrow$ Lunch, Afternoon $\rightarrow$ Snack, Night $\rightarrow$ Dinner) and a single-tap circular day queue.
3. **Data Preservation & "No Lost Recipes" Guarantee**:
   - Unlike rigid meal apps where removing a meal deletes it forever, apdock automatically rehomes removed schedule meals into the user's permanent **Additional Recipes** pool with deduplication protection.
4. **App-Store Independence via Agency-Grade PWA**:
   - Deliver native 60fps tactile feel, installability, and clean service worker lifecycle (`SwUpdate`) with edge CDN caching headers directly from the web without App Store friction.

---

### 1.4 The 4-Quadrant Lifestyle Architecture

```
                          ┌───────────────────────────┐
                          │    apdock Life Dock       │
                          └─────────────┬─────────────┘
                                        │
        ┌───────────────────┬───────────┴───────────┬───────────────────┐
        ▼                   ▼                       ▼                   ▼
┌──────────────┐    ┌──────────────┐        ┌──────────────┐    ┌──────────────┐
│  01. HEALTH  │    │   02. FLOW   │        │  03. FAMILY  │    │   04. HOME   │
│  & WELLNESS  │    │   & TASKS    │        │   & TRIBE    │    │ & SANCTUARY  │
├──────────────┤    ├──────────────┤        ├──────────────┤    ├──────────────┤
│ • Diet (LIVE)│    │ • Daily Flow │        │ • Key Dates  │        │ • Spaces     │
│ • Gym (NEXT) │    │ • Focus Dock │        │ • Tribe Hub  │        │ • Essentials │
└──────────────┘    └──────────────┘        └──────────────┘    └──────────────┘
```

- **Health & Wellness (Amber/Emerald)**: Active diet planning, nutrition goals, grocery lists, and upcoming workout tracking. The Home screen currently surfaces active modules in this quadrant.
- **Daily Flow & Tasks (Violet)**: Daily habits, priority milestones, and mental clarity routines.
- **Family & Tribe (Amber)**: Shared schedules, important family dates, and collective wellness targets.
- **Home & Sanctuary (Sky/Cyan)**: Domestic inventory, home maintenance cadences, and living space organization.

---

### 1.5 Key Performance Indicators (KPIs)

- **Onboarding Speed**: Users complete signup and land in their personalized dock in $< 15$ seconds.
- **Daily Glance Time**: Core meal decisions made in $< 5$ seconds per session.
- **PWA Cache Freshness**: $100\%$ of users receive the latest deployed build upon triggering updates without breaking offline cached states.
- **Zero Data Loss**: $100\%$ preservation rate of user-customized dishes via automated rehoming and multi-tenant user-scoped storage.

---

## 2. Functional Requirements Specification (FRS)

---

### Module 1: Authentication, Security & Account Lifecycle

#### `FR-AUTH-01`: 4-Digit Security PIN & Key Wrapping
- **Description**: The system authenticates users using a 4-digit numeric PIN rather than traditional alphanumeric passwords.
- **Key Wrapping & Cryptographic Reality**:
  - The UI restricts PIN inputs to numeric values only (`\D` stripped) and enforces exactly 4 digits (`^\d{4}$`).
  - Inputs offer optional visibility toggling (masking with `password` / revealing with `text`).
  - The PIN is transformed client-side into a Firebase-compliant string (`apdock_pin_${pin}_secure`).
  - **Threat Model & Keyspace**: The system acknowledges that a 4-digit PIN has a keyspace of $10^4$ combinations ($0000 \dots 9999$). To safeguard against automated dictionary attacks:
    - The client is protected by **Firebase App Check**.
    - Server-side Firestore rules block unauthenticated reads on `/usernames/{username}`, preventing user email exposure.
    - Rate-limiting enforces exponential backoff after 3 failed attempts, locking input for 15 minutes after 5 consecutive failures.

#### `FR-AUTH-02`: Dynamic Unique Handle Generation
- **Description**: During sign-up, the system automatically generates a unique, clean handle (e.g., `@alex`, `@alexriver`, `@alex1`) derived from the user's provided display name.
- **Tiered Assignment Algorithm**:
  1. *Tier 1*: Slugified first name (e.g., `"Alex River"` $\rightarrow$ `"alex"`).
  2. *Tier 2*: Concatenated full name (e.g., `"alexriver"`).
  3. *Tier 3*: Alternating numbered first name (e.g., `"alex1"`, `"alex2"` $\dots$).
  4. *Tier 4*: Alternating numbered full name (e.g., `"alexriver1"`, `"alexriver2"` $\dots$).
- **Anti-Enumeration & Storage**: The system checks handle availability in both device storage (`apdock_user_${handle}`) and Firestore `/usernames/{handle}`. Public unauthenticated email harvesting is blocked via Firestore security rules.

#### `FR-AUTH-03`: Progressive Staged Loading Bar
- **Description**: During sign-in and sign-up, the system displays a luxury multi-step progress bar with contextual status labels:
  - Stage 1: *"Preparing your personal dock space."*
  - Stage 2: *"Creating unique @handle."*
  - Stage 3: *"Securing your private 4-digit PIN."*
  - Stage 4: *"Configuring 4 lifestyle quadrants."*
  - Stage 5: *"All set! Welcome to your apdock."*

#### `FR-AUTH-04`: Session Persistence & Multi-Tenant Offline Cache
- **Description**: Returning authenticated users are restored automatically without viewing the login screen.
- **Implementation**: Handled via `onAuthStateChanged` and cached in user-scoped storage (`apdock_profile_{uid}`).

#### `FR-AUTH-05`: Route Protection Guards
- **Description**:
  - `authGuard`: Enforces active session; unauthenticated access to `/home` or `/diet` immediately redirects to `/auth`.
  - `guestGuard`: Prevents authenticated users from viewing `/auth`, immediately redirecting to `/home`.

#### `FR-AUTH-06`: Safe Cascade Account Deletion Workflow
- **Description**: The system provides a destructive "Delete Account" action designed to eliminate race conditions and avoid orphaned accounts.
- **Workflow Requirements**:
  1. **Pre-Reauthentication**: The user must confirm their 4-digit PIN immediately prior to deletion. The client executes `reauthenticateWithCredential()`. If this fails (or if the token is stale), the operation terminates safely before touching database records.
  2. **Batched Firestore Deletion**: The system deletes `/users/{uid}` and `/usernames/{username}` in a single atomic `writeBatch()`.
  3. **Auth User Deletion**: The system invokes `deleteUser(firebaseUser)`.
  4. **Multi-Tenant Storage Purge**: The system purges all user-scoped storage keys (`apdock_${uid}_*`) and the local handle link (`apdock_user_${username}`).
  5. **Enterprise Cloud Function (Recommended)**: Server-side execution via Firebase Admin SDK to guarantee ACID properties.

#### `FR-AUTH-07`: Clean Sign Out
- **Description**: Signing out terminates the Firebase session via `firebaseSignOut(auth)`, clears reactive memory signals (`currentUser`, `userProfile`), and purges `sessionStorage`. User-scoped data (`apdock_${uid}_*`) remains securely isolated by UID in `localStorage` without leaking to subsequent accounts.

#### `FR-AUTH-08`: PIN Recovery & Account Reset Story
- **Description**: If a user forgets their 4-digit PIN, an authenticated email recovery flow allows requesting an OTP / magic link sent to their registered email to reset the 4-digit PIN securely.

---

### Module 2: System Shell, Navigation & Theming

#### `FR-SHELL-01`: Global Universal Header
- **Description**: Sticky global navigation bar featuring:
  - Left: Brand icon squircle + `"apdock"` title (clicking navigates to `/home`).
  - Right: Parallel action controls: contextual Diet Preference trigger (inside `/diet`) and Settings Gear button.

#### `FR-SHELL-02`: 3-Way Theme Management & Cloud Sync
- **Description**: Users can toggle between `'light'`, `'dark'`, and `'system'` modes.
- **Behavior**:
  - Instant local DOM toggle via `data-theme` attribute on `<html>` and dynamic `<meta name="theme-color">` update.
  - Listens to OS theme changes via `window.matchMedia('(prefers-color-scheme: dark)')`.
  - Persisted in user-scoped storage (`apdock_${uid}_theme_preference`) and synchronized to `/users/{uid}.themePreference` in Cloud Firestore for cross-device consistency.

#### `FR-SHELL-03`: Contextual Diet Preference Popover
- **Description**: When navigated inside `/diet`, a dedicated nutrition icon button appears in the global header.
- **Behavior**:
  - Clicking opens a micro-popover allowing instant toggling between Goal (`Loss` / `Gain`) and Diet Type (`Veg` / `Non-Veg` / `Both`).
  - Staged changes sync to backend upon popover dismissal, avoiding redundant API calls while toggling options.

#### `FR-SHELL-04`: PWA Update Management via `SwUpdate`
- **Description**: Graceful, non-destructive PWA updates replacing aggressive cache wipes:
  - Subscribes to Angular's `@angular/service-worker` `SwUpdate.versionUpdates` for `VersionReadyEvent`.
  - Displays a non-intrusive banner or toast: *"A new version of apdock is ready. [Reload]"*.
  - When confirmed, invokes `swUpdate.activateUpdate().then(() => document.location.reload())`.
  - Backed by `firebase.json` cache headers: `no-cache` on `index.html`, `ngsw.json`, `sw.js`; 1-year immutable caching on hashed bundles.

---

### Module 3: Home & Lifestyle Dock

#### `FR-HOME-01`: Dynamic Time-Calibrated Greeting
- **Description**: Greeting adjusts based on local time:
  - `05:00 - 11:59`: *"Good morning, [DisplayName]"*
  - `12:00 - 16:59`: *"Good afternoon, [DisplayName]"*
  - `17:00 - 04:59`: *"Good evening, [DisplayName]"*

#### `FR-HOME-02`: Formatted Live Date
- **Description**: Displays current date in readable format (e.g., *"Sun, Oct 25"*).

#### `FR-HOME-03`: Lifestyle Quadrant Module Cards
- **Description**: Surfaces active modules under the **Health & Wellness Quadrant**:
  - **Diet Plan**: Active squircle card navigating directly to `/diet`.
  - **Gym Schedule**: Planned module card with status badge.
  - *Future Quadrants*: Placeholders for Flow, Family, and Home quadrants are reserved in the data model and will be added to the grid in v0.2.0.

#### `FR-HOME-04`: First-Time User Onboarding Interceptor
- **Description**: If a newly registered user clicks the Diet card without pre-existing preferences, the system triggers `DietPreferenceModalComponent` before allowing navigation.

---

### Module 4: Diet & Nutrition Management

#### `FR-DIET-01`: Nutritional Goal Selection
- **Description**: Supports two primary fitness targets:
  - `loss`: Calorie deficit, high fiber, metabolic stimulation.
  - `gain`: Calorie surplus, dense protein, complex carbs.

#### `FR-DIET-02`: Food Preference Matrix
- **Description**: Supports three dietary lifestyles:
  - `veg`: Strict vegetarian whole foods (paneer, tofu, legumes, sprouts, oats).
  - `nonveg`: Lean poultry, eggs, fish, alongside vegetables.
  - `both`: Mixed omnivore meal distribution.

#### `FR-DIET-03`: 5-Cycle Circular Week Queue
- **Description**: A continuous horizontal date bar for day selection:
  - Must display **35 days** across 5 complete 7-day cycles (cycles `-2, -1, 0, 1, 2`).
  - Sequence: `Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday`. **Sunday must always strictly precede Monday across all cycles.**
  - Shows day abbreviation (`SUN`, `MON`), label, and date number.
  - Auto-centers the active day with smooth scroll physics (`centerChipByIndex`).
  - When clicking distant days, shifts by the shortest circular distance ($-3 \dots +3$ days).
  - Normalizes edge cycles back to cycle 0 silently after 400ms without layout jump.
  - *Date-Stamping Roadmap*: Transitioning from weekday templates to calendar-date logs with meal adherence tracking ("Mark as eaten").

#### `FR-DIET-04`: Calibrated Meal Timing Auto-Picker
- **Description**: Segmented control featuring: **Breakfast**, **Lunch**, **Snack**, and **Dinner**.
- **Auto-Selection Thresholds**:
  - `06:00 - 11:30` $\rightarrow$ Breakfast.
  - `11:30 - 16:00` $\rightarrow$ Lunch.
  - `16:00 - 19:30` $\rightarrow$ Snack (Evening Snack / Pre-Workout).
  - `19:30 - 23:59` & `00:00 - 06:00` $\rightarrow$ Dinner.

#### `FR-DIET-05`: On-Demand 1-Day Loading & CSS Shimmer Skeletons
- **Description**: In v0.1.0, meal data is served from an in-app bundled data structure, with CSS shimmer cards (`.shimmer-wave`) ensuring zero layout shift (CLS = 0) during computation. In v0.2.0, this interfaces with remote content endpoints while preserving offline caching.

#### `FR-DIET-06`: Clean Numbered Daily Meals Schedule
- **Description**: Displays scheduled dishes for the active day and slot:
  - Clean numbered squircle cards (`01`, `02`).
  - Displays dish name prominently.
  - Clicking any scheduled dish opens the edit modal.

#### `FR-DIET-07`: Recipe Addition with Multi-Destination Targeting
- **Description**: Clicking "Add Recipe" opens a creation dialog with multi-destination targeting:
  - Destination option 1: **Day Meal Schedule** (added to selected day and slot).
  - Destination option 2: **Additional Recipes** (added to general recipe pool).
  - Destination option 3: **Both** (added to schedule and saved to general pool).

#### `FR-DIET-08`: 49 Curated Whole Foods & Pantry Ingredients
- **Description**: Autocompleting chips for 49 common whole foods and kitchen staples:
  - Lean proteins (Chicken Breast, Eggs, Egg Whites).
  - Plant proteins & Dairy (Paneer, Tofu, Greek Yogurt, Moong Dal).
  - Fresh produce & greens (Spinach, Broccoli, Bell Peppers, Mushrooms, Tomatoes, Lauki).
  - Pantry carbs & fats (Rolled Oats, Brown Rice, Quinoa, Sweet Potato, Olive Oil).
  - Custom tag input with Enter/comma parsing.

#### `FR-DIET-09`: Automated Recipe Rehoming on Schedule Removal
- **Description**: When a user removes a dish from their daily schedule:
  - The dish ID is marked as removed from the schedule.
  - **The system automatically ports the dish into Additional Recipes** via `addCustomRecipe()`, checking for existing duplicates by name.
  - Displays toast: *'"{Dish Name}" moved to Additional Recipes'*.

#### `FR-DIET-10`: All-Day Vegetables Required & Daily Date Scoping
- **Description**: Aggregates all fresh vegetables and ingredients across the selected day's meals:
  - Displays ingredient name and culinary category (*Leafy Green, Base, Salad, Aromatics, Veggies*).
  - **Date Scoping**: Checkbox states are scoped by date (`apdock_${uid}_checked_veggies_${YYYY_MM_DD}`) and automatically reset daily at midnight (00:00).

#### `FR-DIET-11`: Additional Recipes Repository
- **Description**: Curated collection of non-scheduled and saved recipes:
  - Filtered by user's active dietary lifestyle (`veg`, `nonveg`, `both`), with an optional toggle to view all.
  - Displays dish title and key ingredients strip.
  - Clicking opens the Move Recipe Sheet.

#### `FR-DIET-12`: Move Recipe to Schedule Flow
- **Description**: Clicking any additional recipe opens `MoveRecipeModalComponent`:
  - Allows selecting target slot (**Breakfast**, **Lunch**, **Snack**, or **Dinner**).
  - Allows editing details prior to moving.
  - Confirming the move inserts the recipe into the schedule and removes it from Additional Recipes.

#### `FR-DIET-13`: Full Recipe Customization & Deletion
- **Description**: Allows renaming, editing ingredient chips, or permanently deleting recipes from the additional pool.

#### `FR-DIET-14`: Multi-Tenant User-Scoped Local-First Persistence
- **Description**: All user modifications (custom recipes, removed meals, edited meals, meal overrides) are scoped under `apdock_${uid}_*` in device storage, guaranteeing strict isolation between accounts on shared devices.

#### `FR-DIET-15`: Toast Notification System
- **Description**: Non-intrusive floating spring notification providing instant feedback on user actions.

#### `FR-DIET-16`: Standard Plan Reset & Undo Mechanism
- **Description**: Users can restore removed default meals or reset the entire week back to the canonical standard plan via a confirmation dialog, clearing `removed_day_meals` and `edited_day_meals`.

#### `FR-DIET-17`: Goal & Diet Type Override Scoping
- **Description**: `meal_overrides` are keyed by `${goal}_${dietType}_${day}_${slot}`. Changing goals or diet types does not cause stale, non-existent dish IDs to be loaded.

#### `FR-DIET-18`: Database Schema Versioning & Reconciliation
- **Description**: `DIET_DATABASE` is tagged with a semantic version (`DIET_DATABASE_VERSION = "1.0.0"`). Stored customizations record this version; upon database updates, a migration reconciliation routine checks stored override/edit IDs against the new schema, pruning invalid references without crashing.

---

### Module 5: Health & Medical Framing

#### `FR-HEALTH-01`: Nutritional Guidance & Medical Disclaimer
- **Description**: The application shall prominently feature a health and medical disclaimer:
  - Clarifies that meal suggestions and macro breakdowns are for general lifestyle guidance, not medical nutritional therapy.
  - Reminds users with metabolic disorders, diabetes, renal disease, eating disorders, or pregnancy to consult a medical doctor or registered dietitian.
  - Prioritizes mindful, whole-food suggestions over obsessive micro-tracking to protect users sensitive to calorie-focused content.

---

### Module 6: Cloud Sync Roadmap (v0.2.0)

#### `FR-SYNC-01`: Diet Customization Cloud Persistence
- **Description**: Custom recipes, schedule edits, removed meals, and overrides will synchronize to Firestore subcollection `/users/{uid}/diet/customizations`.
- **Sync Protocol**: Optimistic local write for $0\text{ms}$ UI response, followed by debounced cloud writes, protecting users from device changes, browser cache clearing, and Safari 7-day ITP data eviction.

---

## 3. Non-Functional Requirements (NFR)

### 3.1 Performance & Responsiveness
- **First Contentful Paint (FCP)**: $< 0.8$ seconds on 4G networks.
- **Change Detection**: $0$ overhead from Zone.js (fully Zoneless Signal Change Detection via `provideZonelessChangeDetection`).
- **Tab Switching Latency**: $< 16\text{ms}$ (1 frame) for cached days.
- **Cumulative Layout Shift (CLS)**: $0.00$ during all modal, tab, and day switching states.

### 3.2 Usability, Ergonomics & Design Standards
- **Touch Targets**: Minimum interactive touch area of $44\text{px} \times 44\text{px}$ across all mobile views.
- **Anti-Clutter Standard**: Zero nested borders. Outer squircle card acts as the sole touch container.
- **Tactile Feedback**: Spring compression physics on contact (`transform: scale(0.965)`).
- **Mobile Tap Highlight**: Elimination of default browser flash (`-webkit-tap-highlight-color: transparent !important`).

### 3.3 Reliability, Offline Resilience & Storage
- **Offline Fast-Path**: Core features (viewing today's meals, checking vegetables, moving recipes) work without an active internet connection using user-scoped `localStorage`.
- **PWA Service Worker**: Managed via Angular `SwUpdate` with non-blocking user prompts, preventing offline cache degradation.
- **Cache Invalidation**: Backed by `firebase.json` headers (`no-cache` on HTML and service worker manifests, 1-year immutable caching on hashed assets).

### 3.4 Security & Data Privacy
- **Server-Side Document Isolation**: Strictly enforced by `firestore.rules` (`/users/{uid}` accessible only by owner).
- **Anti-Enumeration Protection**: `/usernames/{username}` blocked from unauthenticated reads to prevent email harvesting.
- **App Check & Rate Limiting**: Anti-bot gating on auth endpoints with progressive lockouts.
- **Multi-Tenant Device Storage**: Storage keys scoped by `uid` (`apdock_${uid}_*`) to prevent cross-account contamination on shared hardware.

---

## 4. Business Rules Matrix

| Rule ID | Rule Name | Condition | Action / Enforcement |
|---|---|---|---|
| `BR-01` | **PIN Format Rule** | User enters PIN on Sign In / Sign Up | Must contain exactly 4 numeric digits. Non-digits stripped automatically. |
| `BR-02` | **Anti-Enumeration Rule** | User queries username index | Unauthenticated reads blocked via Firestore security rules to prevent email harvesting. |
| `BR-03` | **Multi-Tenant Key Scoping** | Storing custom recipes or diet plans | All local storage keys must include the authenticated `uid` (`apdock_${uid}_*`). |
| `BR-04` | **Recipe Rehoming Rule** | User removes dish from Daily Schedule | Dish is automatically added to Additional Recipes pool via `addCustomRecipe()` with duplicate checking. |
| `BR-05` | **Recipe Move Migration** | User moves Additional Recipe to Schedule | Dish is inserted into target day/slot; automatically removed from Additional Recipes pool. |
| `BR-06` | **Calendar Adjacency** | Circular week queue rendering | Sunday must always be rendered immediately adjacent to Monday across all 5 cycles. |
| `BR-07` | **Safe Account Deletion** | User triggers account deletion | Re-authenticate PIN first, execute batched Firestore delete, delete Auth record, purge scoped device data. |
| `BR-08` | **Grocery Checklist Reset** | Date changes past midnight (00:00) | Vegetable grocery checklist automatically resets for the new calendar date. |
| `BR-09` | **Override Goal/Type Scoping**| User alters diet goal or type | Meal overrides are isolated by `${goal}_${dietType}_${day}_${slot}` to prevent orphan ID errors. |
| `BR-10` | **Database Versioning Rule** | App initializes stored modifications | Reconciles stored IDs against `DIET_DATABASE_VERSION`, pruning obsolete references gracefully. |
| `BR-11` | **PWA Non-Destructive Update**| Service worker detects new build | Notifies user via in-app banner; updates cleanly via `SwUpdate` without deleting active offline caches. |
| `BR-12` | **Medical Disclaimer Rule** | User accesses diet plans | System presents clear health disclaimer that meal suggestions are non-prescriptive lifestyle guidance. |
| `BR-13` | **Theme Sync Rule** | User toggles theme | Immediate local DOM update, persisted locally and synced to `/users/{uid}.themePreference`. |
| `BR-14` | **Plan Reset Rule** | User resets day or week plan | Reverts removed and edited dishes back to canonical `DIET_DATABASE` options. |

---

## 5. Traceability & Implementation Status Matrix

| Requirement ID | Module | Feature Description | Implementation Status | Test Coverage |
|---|---|---|:---:|:---:|
| `FR-AUTH-01` | Auth | 4-Digit Security PIN & Key Wrapping | **Hardened** | Covered (`auth.service.spec.ts`) |
| `FR-AUTH-02` | Auth | Auto Handle Generation & Anti-Enumeration | **Hardened** | Covered (`auth.service.spec.ts`) |
| `FR-AUTH-03` | Auth | Progressive Staged Loading Bar | **Implemented** | Verified |
| `FR-AUTH-04` | Auth | Multi-Tenant Offline Profile Cache | **Hardened** | Covered (`auth.service.spec.ts`) |
| `FR-AUTH-05` | Auth | Functional `authGuard` & `guestGuard` | **Implemented** | Verified |
| `FR-AUTH-06` | Auth | Safe Cascade Account Deletion | **Hardened Spec** | Covered (`auth.service.spec.ts`) |
| `FR-AUTH-07` | Auth | Clean Sign Out & Session Purge | **Implemented** | Covered (`auth.service.spec.ts`) |
| `FR-AUTH-08` | Auth | PIN Recovery & Reset Flow | *Roadmap* | Backlog |
| `FR-SHELL-01` | Shell | Global Navigation Header | **Implemented** | Covered (`header.component.spec.ts`) |
| `FR-SHELL-02` | Shell | 3-Way Theme Switcher & Cloud Sync | **Hardened** | Covered (`header.component.spec.ts`) |
| `FR-SHELL-03` | Shell | Contextual Diet Preference Popover | **Implemented** | Covered (`header.component.spec.ts`) |
| `FR-SHELL-04` | Shell | `SwUpdate` PWA Updater & Cache Headers | **Hardened** | Covered (`header.component.spec.ts`) |
| `FR-HOME-01` | Home | Calibrated Contextual Greeting | **Implemented** | Covered (`home.component.spec.ts`) |
| `FR-HOME-02` | Home | Live Formatted Date | **Implemented** | Covered (`home.component.spec.ts`) |
| `FR-HOME-03` | Home | Lifestyle Quadrant Navigation Cards | **Implemented** | Covered (`home.component.spec.ts`) |
| `FR-HOME-04` | Home | First-Time User Preference Interceptor | **Implemented** | Covered (`home.component.spec.ts`) |
| `FR-DIET-01` | Diet | Goal Selection (Loss / Gain) | **Implemented** | Covered (`diet.service.spec.ts`, `diet.component.spec.ts`) |
| `FR-DIET-02` | Diet | Diet Type (Veg / Non-Veg / Both) | **Implemented** | Covered (`diet.service.spec.ts`, `diet.component.spec.ts`) |
| `FR-DIET-03` | Diet | 35-Day Circular Week Queue | **Implemented** | Covered (`diet.component.spec.ts`) |
| `FR-DIET-04` | Diet | Calibrated Meal Timing Auto-Picker | **Hardened** | Covered (`diet.component.spec.ts`) |
| `FR-DIET-05` | Diet | 1-Day Loading & CSS Shimmer Waves | **Implemented** | Covered (`diet.component.spec.ts`) |
| `FR-DIET-06` | Diet | Numbered Daily Meals Schedule List | **Implemented** | Covered (`diet.component.spec.ts`) |
| `FR-DIET-07` | Diet | Add Recipe (Schedule / Additional / Both) | **Implemented** | Covered (`diet.component.spec.ts`) |
| `FR-DIET-08` | Diet | 49 Curated Whole Foods & Staples | **Hardened** | Covered (`diet.component.spec.ts`) |
| `FR-DIET-09` | Diet | Automated Recipe Rehoming & Deduplication | **Hardened** | Covered (`diet.service.spec.ts`, `diet.component.spec.ts`) |
| `FR-DIET-10` | Diet | Date-Scoped Daily Vegetables Checklist | **Hardened** | Covered (`diet.component.spec.ts`) |
| `FR-DIET-11` | Diet | Lifestyle-Filtered Additional Recipes Stack | **Hardened** | Covered (`diet.component.spec.ts`) |
| `FR-DIET-12` | Diet | Move Additional Recipe to Schedule Sheet | **Implemented** | Covered (`diet.component.spec.ts`) |
| `FR-DIET-13` | Diet | Recipe Modification & Deletion | **Implemented** | Covered (`diet.component.spec.ts`) |
| `FR-DIET-14` | Diet | Multi-Tenant Scoped Storage Persistence | **Hardened** | Covered (`diet.service.spec.ts`) |
| `FR-DIET-15` | Diet | Tactile Toast Notifications | **Implemented** | Covered (`diet.component.spec.ts`) |
| `FR-DIET-16` | Diet | Standard Plan Reset & Undo | **Hardened Spec** | Covered (`diet.service.spec.ts`) |
| `FR-DIET-17` | Diet | Goal/Diet Type Override Scoping | **Hardened Spec** | Covered (`diet.component.spec.ts`) |
| `FR-DIET-18` | Diet | Database Schema Versioning (`v1.0.0`) | **Hardened Spec** | Covered (`diet.service.spec.ts`) |
| `FR-HEALTH-01` | Health | Nutritional Guidance & Medical Disclaimer | **Hardened Spec** | Verified |
| `FR-SYNC-01` | Sync | Diet Customizations Cloud Persistence | *Roadmap v0.2.0* | Backlog |
| `FR-GYM-01` | Gym | Workout Split Management | *Roadmap* | Backlog |
| `FR-GYM-02` | Gym | Routine & Set Visualizer | *Roadmap* | Backlog |
| `FR-GYM-03` | Gym | Diet-Workout Caloric Integration | *Roadmap* | Backlog |
