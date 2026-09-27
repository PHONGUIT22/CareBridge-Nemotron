# CareBridge Ambient OS — Design System & Craftsmanship Guidelines

> **Living Design Specification**  
> *Engineered for glanceable ambient displays, high-contrast geriatric ergonomics, and calm clinical UX.*

---

## 1. Design Philosophy: "Ambient Calm & High-Contrast Clarity"

CareBridge Ambient OS is designed to live quietly on a senior's nightstand or kitchen counter 24 hours a day. It is neither a hospital telemetry monitor nor a cluttered smartphone application.

### The 4 Design Pillars
1. **Glanceable at 6 Feet:** Information architecture prioritizes the single most urgent question: *"Do I need to take a pill right now?"* Digits and primary statuses must be decipherable from across a dimly lit bedroom.
2. **Tremor & Arthritis Tolerance:** Touch hitboxes are oversized (minimum 56×56px), separated by generous whitespace, and accompanied by tactile `:active` state compression (`scale-98`).
3. **Calm Clinical Dignity:** Avoid alarming hospital-red alerts or cold industrial aesthetics. We combine deep dark teal surfaces with warm neon accents (Alexa Cyan, Medical Emerald, Soft Amber).
4. **Zero AI Slop:** No generic AI purple gradients, no low-contrast faded gray text, and no raw JSON payloads rendered in user-facing surfaces.

---

## 2. Color Palette & Design Tokens

The palette is anchored by deep oceanic teal surfaces that blend seamlessly into dark bedrooms while providing WCAG AAA contrast for glowing fluorescent text and indicators.

### 2.1 Surface & Background Tokens
| Token Name | Hex / CSS Value | Semantic Role |
| :--- | :--- | :--- |
| `ambient-root` | `#070D14` | Deepest root canvas tone. |
| `ambient-body` | `radial-gradient(circle at 50% 0%, #153243 0%, #0C1E29 45%, #071117 100%)` | Main screen viewport background. Soft top ambient glow. |
| `ambient-surface` | `#0B131B` | Header, bottom floating navigation, and modal backdrops. |
| `ambient-card` | `#131F2C` | Default medication and punch-card card surface. |
| `ambient-hover` | `#1A2A3C` | Interactive hover/focus state for cards and list items. |
| `border-subtle` | `rgba(255, 255, 255, 0.08)` | Default card borders for subtle edge definition. |
| `specular-top` | `rgba(255, 255, 255, 0.20)` | 1px top edge highlight creating physical glass elevation. |

### 2.2 Brand & Status Neons
| Token Name | Hex / CSS Value | Semantic Role |
| :--- | :--- | :--- |
| `alexa-cyan` | `#00CAFF` | Core Alexa brand accent, Senior Clock glowing numerals, primary action focus. |
| `alexa-cyan-glow` | `rgba(0, 202, 255, 0.45)` | Soft drop shadow glow around active elements (`0 0 25px`). |
| `neon-emerald` | `#10B981` | "Dose Taken" success confirmation, 100% adherence badge, normal vitals. |
| `neon-amber` | `#F59E0B` | Upcoming pending dose warning, moderate clinical triage, missed dose alert. |
| `neon-rose` | `#F43F5E` | Heart rate vitals, urgent triage warning, severe interaction notification. |

### 2.3 Text Hierarchy & Contrast Ratios
| Token | Hex | Target Background | WCAG Ratio | Usage |
| :--- | :--- | :--- | :--- | :--- |
| `text-primary` | `#FFFFFF` | `#071117` / `#131F2C` | **18.2:1 (AAA)** | Clock digits, medication titles, action buttons. |
| `text-body` | `#F1F5F9` | `#071117` / `#131F2C` | **15.8:1 (AAA)** | Clinical explanations, dosage instructions. |
| `text-secondary` | `#94A3B8` | `#131F2C` | **7.4:1 (AAA)** | Timestamps, dosage metadata, category labels. |
| `text-muted` | `#64748B` | `#131F2C` | **4.6:1 (AA)** | Non-critical helper hints (never use for critical dosage info). |

---

## 3. Typography Hierarchy: The Dual-Font Pairing

CareBridge combines **Geist** and **Inter** loaded natively via Next.js Google Fonts with CSS variables `--font-geist` and `--font-inter`.

```
Tailwind Config:
  fontFamily: {
    sans:    ['var(--font-inter)', 'sans-serif'],     // Default body font
    display: ['var(--font-geist)', 'sans-serif'],    // Headings, clock, digits & badges
  }
```

### Font Roles & Scale

| Element | Font Family | Size / Leading | Weight | Tracking | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Bedside Clock (HH:MM)** | `Geist (display)` | `text-7xl` to `text-8xl` (72–96px) | `font-black` (900) | `tracking-tight` | High-visibility digital readout with cyan drop-shadow. |
| **Pill Hero Header** | `Geist (display)` | `text-2xl` to `text-3xl` (24–30px) | `font-black` (900) | `tracking-wide` | Name of the upcoming medication in Desk Mode. |
| **Section Headings** | `Geist (display)` | `text-lg` to `text-xl` (18–20px) | `font-bold` (700) | `tracking-wide` | Card headers, modal titles, screen labels. |
| **Metric & Adherence Digits**| `Geist (display)` | `text-xl` to `text-2xl` (20–24px) | `font-extrabold` (800)| `font-mono` | Adherence percentages, blood pressure readings (`120/80`). |
| **Status Badges** | `Geist (display)` | `text-xs` (12px) | `font-bold` (700) | `tracking-wider uppercase` | "AMBIENT NIGHTSTAND", "TAKEN", "UPCOMING". |
| **Clinical Prose & Advice** | `Inter (sans)` | `text-sm` to `text-base` (14–16px)| `font-normal` (400) | `leading-relaxed` | Plain-English AI doctor explanation and symptom guidance. |
| **Prescription Metadata** | `Inter (sans)` | `text-xs` (12px) | `font-medium` (500) | `leading-normal` | "5mg with warm water", "Take with breakfast". |

---

## 4. Spatial Rhythm & Touch Ergonomics

- **Baseline Unit:** `8px` grid system (`gap-2` = 8px, `gap-4` = 16px, `gap-6` = 24px, `p-6` = 24px).
- **Geriatric Touch Targets:**
  - Minimum hit area for senior action buttons: **56px height** (e.g., `py-4 sm:py-5`, `h-14 w-14`).
  - Minimum button margin: **12px** separation between adjacent buttons to eliminate false touches from tremors.
- **Physical Feedback:**
  - Interactive cards feature `alexa-card-interactive` (`hover:-translate-y-0.5`, `active:scale-98`).
  - Active buttons trigger instant haptic/scale feedback before async server confirmation.

---

## 5. Surface Physics & Glassmorphic Elevation

CareBridge uses layered translucent glass surfaces styled with physical specular light reflection to create depth on modern OLED and IPS screens.

```css
/* Glass Card with Specular Top Highlight */
.alexa-card {
  background: linear-gradient(145deg, rgba(20, 40, 52, 0.75) 0%, rgba(11, 23, 31, 0.9) 100%);
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 1rem;
  box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.15);
}

/* Ambient Deep Dialog Glass */
.ambient-glass {
  background: rgba(11, 23, 31, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(0, 202, 255, 0.2);
  border-radius: 1.5rem;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.6);
}
```

---

## 6. Key Component Blueprints

### 6.1 Senior Nightstand Clock (`SeniorClock.tsx`)
- High-intensity, high-contrast digital display formatted as `HH:MM`.
- Blinking glowing cyan colon (`animate-pulse`).
- Formatted date underneath: `"Friday, October 24"` with an amber sun/moon icon indicating time of day.
- Visible up to 6 feet away in low bedroom lighting without glare.

### 6.2 The "I TOOK MY PILL" Hero Button (`DeskModeView.tsx`)
- Full-width hero action button styled in solid `bg-[#00CAFF]` with high-contrast `#030811` dark text.
- Prominent checkmark icon (`FontAwesomeIcon icon={faCheck}`).
- On tap: Triggers multi-colored celebratory confetti explosion (`canvas-confetti`), speaks audio praise via Alexa TTS, and immediately updates daily adherence percentage.

### 6.3 Elevated Alexa Voice Orb (`page.tsx`)
- Floats prominently in the center of the bottom navigation bar, elevated 20px above the dock.
- Gradient fill: `from-[#00CAFF] via-[#0096BE] to-[#0E2838]`.
- Glowing cyan shadow: `box-shadow: 0 0 35px rgba(0, 202, 255, 0.6)`.
- When voice recording is active: Expands by 110% (`scale-110`) with an animated pulsing halo (`animate-ping`).

### 6.4 Clinical Advice Rich Card (`ClinicalAdviceCard.tsx`)
- Emergency triage status pill: Green (Low Risk / Routine), Amber (Moderate / Monitor), Red (Urgent / Seek Care).
- Immediate Action Advice rendered in prominent high-contrast text.
- Plain-English clinical explanation generated by AWS Bedrock Anthropic Claude Haiku 4.5.
- Warning signs checklist with bullet points and caregiver notification badge.

### 6.6 Echo Show 10 Hardware Light Bar: Alexa Cyan Ambient Glow (`AlexaAmbientGlow.tsx`)
- Physical signature of Amazon Echo Show smart displays: a vibrant cyan (`#00CAFF`) to electric blue (`#0070F3`) light bar flush with the bottom display bezel.
- **Dual-Layer Emittance:**
  - Upward diffused light plume (`.alexa-aura-plume`): Soft radial gradient illuminating the lower 56px of the dark screen.
  - Razor-sharp 3.5px core laser light bar (`.alexa-lightbar`): Continuous animated gradient wave running along the screen's bottom radius.
- **Dynamic State Reflexes:**
  - *Listening:* High-intensity white-cyan focal pip pulsating in the center as voice is captured.
  - *Thinking (Bedrock Claude Haiku):* Shimmering photon beam sweeping back and forth (`.alexa-traveling-beam`).
  - *Speaking (AWS Polly Ruth):* Soft harmonic pulse mirroring vocal synthesis rhythm.

---

## 7. Motion & Animation Principles

| Animation | Class / Keyframe | Duration / Curve | Purpose |
| :--- | :--- | :--- | :--- |
| **Echo Show Light Bar** | `alexaCyanFlow` | 3s infinite ease-in-out | Authentic Amazon Echo Show signature ambient light bar along display edge. |
| **Ambient Aura Plume** | `alexaAuraPulse` | 2.4s ease-in-out infinite | Recreates physical LED ambient light reflecting onto nightstand/counter surfaces. |
| **Reasoning Shimmer** | `alexaLightSweep` | 2s linear infinite | Visual feedback while AWS Bedrock Claude models process clinical queries. |
| **Voice Orb Breathing** | `orb-breath` | 3s infinite ease-in-out | Subtly signals ambient intelligence is alive and listening. |
| **Voice Halo Pulse** | `ring-pulse` | 2s cubic-bezier | Radiates outward when user speaks. |
| **Dose Celebration** | `canvas-confetti` | 1.5s physics particle | Positive psychological reinforcement upon taking medications. |
| **Interactive Tap** | `active:scale-98` | 150ms ease-out | Confirms touch input instantly before network response. |

---

## 8. Anti-Patterns (Strictly Forbidden)

1. **NO Generic AI Purple Gradients:** Never introduce purple/indigo gradients (`#8B5CF6`, `#6366F1`). CareBridge uses the authentic Amazon Alexa Cyan (`#00CAFF`) and Dark Teal palette.
2. **NO Low-Contrast Gray Text:** Never use `#475569` or `#64748B` on `#071117` for instructional text. All senior-facing instructions must be `#F1F5F9` or `#FFFFFF` (WCAG AAA).
3. **NO Cramped Tap Targets:** Never render clickable buttons under 48×48px. Primary buttons must be 56px or taller.
4. **NO Raw JSON Dumps in Senior Views:** Raw JSON is strictly restricted to the developer's `AlexaAgentConsole`. Eleanor and Sarah only see formatted, human-first typography.
5. **NO Strobe or Panic Animations:** Emergency triage must remain calm, structured, and informative. Never flash red full-screen backgrounds.
