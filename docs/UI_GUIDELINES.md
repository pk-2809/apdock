# apdock • UI Design System & Component Guidelines

> **Design Philosophy**: apdock adheres to an agency-grade, luxury minimalist visual standard inspired by Apple Health, Linear, and Superhuman. Every interface element emphasizes clarity, spatial rhythm, tactile responsiveness, zero clutter, and flawless adaptation across system dark and light modes.

---

## 1. Core Visual Principles

1. **Anti-Clutter (Zero Nested Boxes)**:
   - Avoid nesting borders within borders (e.g., an icon container box inside an option card inside a section box).
   - The interactive container *itself* serves as the touch target, status indicator, and visual anchor.
2. **Contextual Progressive Disclosure**:
   - Show controls only where and when they are relevant.
   - Example: The **Diet Preference** trigger in the global header is dynamically rendered *only* when the user is navigated inside the Diet module (`/diet`), avoiding top-level navigation clutter on the Home feed.
3. **Tactile Spring Physics**:
   - Every interactive element responds to finger contact or mouse click with spring compression (`transform: scale(0.965)`) and smooth recovery.
   - Mobile tap highlight flash is universally eliminated (`-webkit-tap-highlight-color: transparent !important`).
4. **Adaptive Dark & Light Luminance**:
   - Dark mode uses deep obsidian layers (`#080b13` to `#0f1422`) with subtle frosted highlights (`inset 0 1px 0 rgba(255, 255, 255, 0.12)`).
   - Light mode uses crisp slate foundations (`#f8fafc` to `#ffffff`) with delicate border outlines (`rgba(0, 0, 0, 0.08)`).

---

## 2. Design Tokens & Palette

### 2.1 Lifestyle Quadrant Accents
Derived from the signature 4-quadrant application identity:

| Token | Name | HEX Code | Semantics & Usage |
|---|---|---|---|
| `--quad-amber` | Warm Amber | `#ff9f0a` | Weight Gain, Family quadrant, active warnings |
| `--quad-emerald` | Vivid Emerald | `#30d158` / `#10b981` | Vegetarian preference, Health quadrant, success states |
| `--quad-violet` | Deep Violet | `#5e5ce6` | Flow & Tasks quadrant, secondary accent |
| `--quad-coral` | Soft Coral | `#ff453a` | Non-Veg preference, Gym module, destructive actions |
| `--brand-sky` | Sapphire Sky | `#0084ff` | Primary brand blue, focus rings, link accents |
| `--brand-cyan` | Radiant Cyan | `#00c6ff` | Weight Loss, Both (mixed) diet preference, gradient endings |

### 2.2 Theme Tokens
```css
/* Dark Mode Tokens (Default & System dark) */
:root {
  --bg-deep: #080b13;
  --bg-surface: #0f1422;
  --bg-card: rgba(20, 27, 44, 0.72);
  --border-card: rgba(255, 255, 255, 0.09);
  --card-shadow: 0 16px 40px -8px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  --text-primary: #f8fafc;
  --text-secondary: rgba(248, 250, 252, 0.75);
  --text-muted: rgba(248, 250, 252, 0.48);
  --btn-bg: rgba(255, 255, 255, 0.06);
  --btn-border: rgba(255, 255, 255, 0.11);
  --btn-hover-bg: rgba(255, 255, 255, 0.11);
}

/* Light Mode Overrides ([data-theme='light']) */
[data-theme='light'] {
  --bg-deep: #f8fafc;
  --bg-surface: #ffffff;
  --bg-card: rgba(255, 255, 255, 0.85);
  --border-card: rgba(0, 0, 0, 0.08);
  --card-shadow: 0 20px 45px -12px rgba(0, 132, 255, 0.12), 0 8px 24px -4px rgba(0, 0, 0, 0.04);
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #64748b;
  --btn-bg: rgba(0, 0, 0, 0.05);
  --btn-border: rgba(0, 0, 0, 0.12);
  --btn-hover-bg: rgba(0, 0, 0, 0.09);
}
```

---

## 3. Typography Scale & Hierarchy

- **Primary Typeface**: `Plus Jakarta Sans`, -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif.
- **Monospace Typeface**: `JetBrains Mono`, Menlo, Monaco, monospace (for codes, PIN digits, timestamps).

| Level | Size | Weight | Line Height | Tracking | Application |
|---|---|---|---|---|---|
| **Display / Hero** | `28px - 34px` | 800 (Bold) | `1.15` | `-0.035em` | Splash titles, hero headers |
| **Greeting / Title** | `20px - 24px` | 750 (Semibold) | `1.2` | `-0.025em` | Home greeting, modal headings |
| **Card Header** | `16px - 17px` | 700 (Bold) | `1.3` | `-0.015em` | Module card titles |
| **Body Standard** | `14px - 15px` | 500 / 600 | `1.45` | `-0.01em` | Form labels, description text |
| **Micro Labels** | `10px - 11px` | 750 (Bold) | `1.2` | `+0.08em` | Section headers (`GOAL`, `DIET TYPE`), status tags |

---

## 4. Component Design Specifications

### 4.1 Header & Parallel Action Controls (`<app-header>`)
- **Structure**:
  - **Left**: App icon squircle (32x32px, `border-radius: 9px`) + brand title `"apdock"`.
  - **Right (`.header-actions`)**: Flex container with `gap: 8px`.
- **Parallel Trigger Buttons**:
  - Size: `38px x 38px`, `border-radius: 12px`.
  - Contextual Diet Preference Trigger (`#dietPrefTriggerBtn`):
    - Rendered only when `isDietModule()` is `true`.
    - Active state: Emerald background glow (`rgba(48, 209, 88, 0.12)`), border `#30d158`, box-shadow `0 0 12px rgba(48, 209, 88, 0.28)`.
  - Settings Trigger (`#settingsTriggerBtn`):
    - Active state: Rotates gear icon 60deg with spring pop transition.
- **Diet Preference Popover Menu (`.diet-pref-popover`)**:
  - Width: `285px`, `border-radius: 18px`, `backdrop-filter: blur(28px)`.
  - Drops down directly under trigger with `animation: dropdownEnter 0.22s var(--spring-pop) both`.
  - Contains:
    - **Header**: "Diet Preferences" with active emerald indicator dot.
    - **Goal Segmented Row**: 2-column grid (`[ 📉 Weight Loss ]` / `[ 📈 Weight Gain ]`).
    - **Diet Type Segmented Row**: 3-column grid (`[ 🌿 Veg ]` / `[ 🍗 Non-Veg ]` / `[ 🥗 Both ]`).
    - **Bottom Action**: "Full Customizer..." opening the full modal.

### 4.2 Diet Preference Modal (`<app-diet-preference-modal>`)
- **Layout**:
  - Mobile: Smooth bottom sheet sliding up (`sheetSlideUp 0.28s`).
  - Desktop: Centered card (`max-width: 420px`, `border-radius: 24px`, `modalScaleIn 0.25s`).
- **Interactive Tiles (`.pref-tile`)**:
  - Minimum height `68px`, squircle `border-radius: 16px`.
  - Grid: 2 equal-width columns for Goal, 3 equal-width columns for Diet Preference.
  - Active State Highlights:
    - **Weight Loss**: Cyan border `#00c6ff`, gradient backlight `linear-gradient(145deg, rgba(0, 198, 255, 0.15), rgba(0, 132, 255, 0.05))`, glow `0 0 20px -3px rgba(0, 198, 255, 0.32)`.
    - **Weight Gain**: Amber border `#ff9f0a`, gradient backlight `linear-gradient(145deg, rgba(255, 159, 10, 0.15), rgba(255, 115, 0, 0.05))`, glow `0 0 20px -3px rgba(255, 159, 10, 0.32)`.
    - **Vegetarian**: Emerald border `#30d158`, glow `0 0 20px -3px rgba(48, 209, 88, 0.32)`.
    - **Non-Veg**: Coral border `#ff453a`, glow `0 0 20px -3px rgba(255, 69, 58, 0.32)`.
    - **Both**: Cyan/Emerald synergy border `#00c6ff`.
- **CTA Continue Button**:
  - Height: `50px`, `border-radius: 14px`.
  - Gradient: `linear-gradient(135deg, #10b981 0%, #0084ff 100%)`.
  - Shadow: `0 8px 24px -4px rgba(0, 132, 255, 0.35)`.

### 4.3 Lifestyle Module Cards (`HomeComponent`)
- Squircle cards with staggered entry animations (`anim-stack-1`, `anim-stack-2`).
- Responsive square aspect ratio (`min-height: 148px`) with soft tinted ambient backgrounds.
- Icons housed in circular or squircle translucent bubbles with matching border tint.

---

## 5. Motion Design & Animation Curves

### 5.1 Easing Curves
```css
:root {
  /* Apple iOS standard interactive spring */
  --spring-apple: cubic-bezier(0.32, 0.72, 0, 1);
  /* Tactile pop with slight overshoot for menus and badges */
  --spring-pop: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

### 5.2 Keyframe Standards
- `overlayFadeIn`: `0.22s` opacity `0 -> 1`.
- `sheetSlideUp`: `0.28s` translateY `100% -> 0%`.
- `modalScaleIn`: `0.25s` scale `0.95 -> 1.0` and opacity `0 -> 1`.
- `dropdownEnter`: `0.22s` scale `0.92 -> 1.0` and translateY `-6px -> 0px`.

---

## 6. Accessibility & A11y Guidelines

1. **Color Contrast**: All primary text maintains a contrast ratio exceeding 4.5:1 against card and deep backgrounds across both light and dark themes.
2. **Keyboard Navigation**:
   - `Escape` key closes active dropdowns, popovers, and confirmation dialogs automatically.
   - `Tab` navigates through all interactive controls with custom `:focus-visible` rings (`outline: 2px solid var(--brand-sky); outline-offset: 2px`).
3. **Screen Readers & ARIA**:
   - Modals specify `role="dialog"` or `role="alertdialog"` with `aria-modal="true"`.
   - Triggers include `aria-haspopup="menu"` and reactive `[attr.aria-expanded]`.
   - Buttons without visible text include descriptive `aria-label` tags.
