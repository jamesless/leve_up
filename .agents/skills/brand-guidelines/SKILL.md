---
name: brand-guidelines
description: Brand identity and design tokens for 找朋友升级 (Level Up). Applies the project's official colors, typography, and styling to any UI. Use when building pages, components, or any visual element that should follow the brand's look-and-feel.
license: Complete terms in LICENSE.txt
---

# 找朋友升级 — Brand Guidelines

## Brand Identity

**Name:** 找朋友升级 · Level Up
**Logo Mark:** 🃏
**Tagline:** 五人三副，找朋友升级

**Concept:** A premium Chinese card game experience. The visual identity draws from the green felt of a card table, the red and black of suit colors, and the gold of a winning hand. The light theme creates a bright, inviting game room atmosphere — clean, confident, and playful.

## Core Palette

Five signature colors define the brand:

| Token | Name | Hex | HSL | Role |
|-------|------|-----|-----|------|
| `jade` | Jade | `#0F766E` | `173 76% 26%` | Primary — card table green, CTAs, links |
| `crimson` | Crimson | `#DC2626` | `0 84% 50%` | Hearts & diamonds, alerts, emphasis |
| `gold` | Gold | `#D97706` | `38 92% 44%` | Wins, level-up, highlights, badges |
| `ink` | Ink | `#1B2133` | `224 30% 15%` | Text, spades & clubs, dark elements |
| `ivory` | Ivory | `#FAF9F6` | `40 33% 97%` | Background, card stock feel |

### Semantic Color Tokens (CSS Variables — HSL)

Light theme (default). Values are HSL channels only, consumed as `hsl(var(--token))`.

```css
@layer base {
  :root {
    /* Surface */
    --background: 40 20% 98%;
    --foreground: 224 30% 15%;
    --card: 0 0% 100%;
    --card-foreground: 224 30% 15%;
    --popover: 0 0% 100%;
    --popover-foreground: 224 30% 15%;

    /* Primary — Jade */
    --primary: 173 76% 26%;
    --primary-foreground: 0 0% 100%;

    /* Secondary — Warm Sand */
    --secondary: 40 18% 94%;
    --secondary-foreground: 224 20% 22%;

    /* Muted */
    --muted: 40 12% 92%;
    --muted-foreground: 220 10% 46%;

    /* Accent — subtle warm tint for hover states */
    --accent: 40 15% 95%;
    --accent-foreground: 224 20% 18%;

    /* Destructive — Crimson */
    --destructive: 0 84% 50%;
    --destructive-foreground: 0 0% 98%;

    /* Borders & Inputs */
    --border: 40 12% 87%;
    --input: 40 12% 87%;
    --ring: 173 76% 26%;

    --radius: 0.625rem;

    /* Brand Extended */
    --brand-jade: 173 76% 26%;
    --brand-crimson: 0 84% 50%;
    --brand-gold: 38 92% 44%;
    --brand-ink: 224 30% 15%;
    --brand-ivory: 40 20% 98%;

    /* Card Suits */
    --suit-red: 0 80% 48%;
    --suit-black: 230 12% 16%;

    /* Chart palette */
    --chart-1: 173 76% 26%;
    --chart-2: 0 84% 50%;
    --chart-3: 38 92% 44%;
    --chart-4: 199 89% 48%;
    --chart-5: 262 83% 58%;
  }
}
```

### Tailwind Color Scales

Custom brand scales extending Tailwind defaults:

```
jade:
  50:  #F0FDFA    100: #CCFBF1    200: #99F6E4
  300: #5EEAD4    400: #2DD4BF    500: #14B8A6
  600: #0D9488    700: #0F766E ← PRIMARY
  800: #115E59    900: #134E4A    950: #042F2E

crimson:
  50:  #FEF2F2    100: #FEE2E2    200: #FECACA
  300: #FCA5A5    400: #F87171    500: #EF4444
  600: #DC2626 ← PRIMARY           700: #B91C1C
  800: #991B1B    900: #7F1D1D    950: #450A0A

gold:
  50:  #FFFBEB    100: #FEF3C7    200: #FDE68A
  300: #FCD34D    400: #FBBF24    500: #F59E0B
  600: #D97706 ← PRIMARY           700: #B45309
  800: #92400E    900: #78350F    950: #451A03
```

## Typography

| Role | Font | Fallback | Weight |
|------|------|----------|--------|
| Display & Headings | **Sora** | Noto Sans SC, PingFang SC, sans-serif | 600–700 |
| Body | **DM Sans** | Noto Sans SC, PingFang SC, sans-serif | 400–500 |
| Monospace | **JetBrains Mono** | Menlo, monospace | 400 |

### Type Scale

| Class | Size | Line Height | Use |
|-------|------|-------------|-----|
| `text-xs` | 12px | 16px | Captions, badges |
| `text-sm` | 14px | 20px | Secondary text, labels |
| `text-base` | 16px | 24px | Body copy |
| `text-lg` | 18px | 28px | Lead paragraphs |
| `text-xl` | 20px | 28px | Section subheads |
| `text-2xl` | 24px | 32px | Section titles |
| `text-3xl` | 30px | 36px | Page headings |
| `text-4xl` | 36px | 40px | Hero text |
| `text-5xl` | 48px | 1 | Display / splash |

### Font Loading

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=DM+Sans:ital,wght@0,400;0,500;0,600;1,400&family=JetBrains+Mono:wght@400;500&family=Noto+Sans+SC:wght@400;500;700&display=swap"
  rel="stylesheet"
/>
```

## Spacing & Radius

- **Border Radius:** `--radius: 0.625rem` (10px). Cards and modals use `lg`, buttons use `md`, small badges use `sm`.
- **Spacing unit:** 4px base. Prefer multiples: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.
- **Container max-width:** 1200px (`max-w-6xl`), padded 20px on mobile.

## Shadows

```css
:root {
  --shadow-sm: 0 1px 2px 0 rgb(27 33 51 / 0.04);
  --shadow: 0 1px 3px 0 rgb(27 33 51 / 0.06), 0 1px 2px -1px rgb(27 33 51 / 0.06);
  --shadow-md: 0 4px 6px -1px rgb(27 33 51 / 0.06), 0 2px 4px -2px rgb(27 33 51 / 0.04);
  --shadow-lg: 0 10px 15px -3px rgb(27 33 51 / 0.06), 0 4px 6px -4px rgb(27 33 51 / 0.04);
  --shadow-card: 0 2px 8px -2px rgb(27 33 51 / 0.08), 0 0 0 1px rgb(27 33 51 / 0.03);
}
```

## Component Patterns

### Buttons

- **Primary:** `bg-primary text-primary-foreground hover:bg-jade-800` — jade green, white text
- **Secondary:** `bg-secondary text-secondary-foreground hover:bg-muted` — warm sand
- **Destructive:** `bg-destructive text-destructive-foreground` — crimson
- **Ghost:** `hover:bg-accent hover:text-accent-foreground` — subtle warm tint
- **Outline:** `border border-border bg-transparent hover:bg-accent`
- Buttons lift on hover: `hover:-translate-y-px transition-all`

### Cards

- `bg-card rounded-lg shadow-card` with 1px border from shadow
- Hover state for interactive cards: `hover:shadow-md transition-shadow`

### Badges / Level Indicators

- Level badge: `bg-gold-100 text-gold-800 border border-gold-200 rounded-full px-3 py-1 font-display font-semibold`
- Suit red: `text-[hsl(var(--suit-red))]`
- Suit black: `text-[hsl(var(--suit-black))]`

### Gradients

- Hero: `bg-gradient-to-br from-jade-50 via-ivory to-gold-50`
- Card table accent: `bg-gradient-to-r from-jade-700 to-jade-600`
- Win highlight: `bg-gradient-to-r from-gold-400 to-gold-600`

## Tailwind Config

```ts
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx,html}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        jade: {
          50: "#F0FDFA",
          100: "#CCFBF1",
          200: "#99F6E4",
          300: "#5EEAD4",
          400: "#2DD4BF",
          500: "#14B8A6",
          600: "#0D9488",
          700: "#0F766E",
          800: "#115E59",
          900: "#134E4A",
          950: "#042F2E",
        },
        crimson: {
          50: "#FEF2F2",
          100: "#FEE2E2",
          200: "#FECACA",
          300: "#FCA5A5",
          400: "#F87171",
          500: "#EF4444",
          600: "#DC2626",
          700: "#B91C1C",
          800: "#991B1B",
          900: "#7F1D1D",
          950: "#450A0A",
        },
        gold: {
          50: "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
          800: "#92400E",
          900: "#78350F",
          950: "#451A03",
        },
      },
      fontFamily: {
        display: ["Sora", "Noto Sans SC", "PingFang SC", "sans-serif"],
        body: ["DM Sans", "Noto Sans SC", "PingFang SC", "sans-serif"],
        mono: ["JetBrains Mono", "Menlo", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        card: "0 2px 8px -2px rgb(27 33 51 / 0.08), 0 0 0 1px rgb(27 33 51 / 0.03)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

## Usage Notes

- Body text defaults to `font-body`; headings and display elements use `font-display`.
- The gold scale is reserved for "level-up" and "win" states — don't use it for generic warnings.
- Crimson is the suit-red and danger color. Use `destructive` tokens for error states.
- Shadows are warm-tinted (ink-based rgba) to match the ivory background.
- Card suits: always use `--suit-red` for hearts/diamonds and `--suit-black` for spades/clubs to stay consistent across themes.
