# WARGAMES Design System

> **CANONICAL SOURCE OF TRUTH**
> All WARGAMES interfaces follow the WAR.MARKET NORAD design system.

## Brand: WARGAMES

**Tagline:** "Your agent sees prices. It doesn't see the world."

NORAD-inspired intelligence terminal for macro risk. Based on 1983 WarGames, military telemetry systems.

## Colors

| Use | Hex | Notes |
|-----|-----|-------|
| **Telemetry** | #36d4ff | System chrome, section titles (cyan) |
| **Signal** | #02ff81 | Execute, success (lime) |
| **Warning** | #f5a623 | Alerts (amber) |
| **Fault** | #ff6b6b | Errors (red) |
| **Intel** | #cfbeff | Meta info (purple) |
| **Background** | #070d14 | Page bg |
| **Surface** | #0e1822 | Panels |
| **Panel** | #101c28 | Cards, inputs |
| **Grid** | #234055 | Borders, lines |
| **Text primary** | #f1f8ff | Headings |
| **Text secondary** | #b8d0e0 | Body |
| **Text muted** | #7a9ab0 | Labels |

## Typography

| Element | Font | Size | Weight | Tracking |
|---------|------|------|--------|----------|
| Page title | Inter | 12px | 600 | 0.09em |
| Section title | JetBrains Mono | 11px | 500 | 0.1em |
| Label | JetBrains Mono | 10px | 500 | 0.08em |
| Data value | JetBrains Mono | 13px | 500 | normal |
| Body | Inter | 13px | 400 | normal |

**Section titles:** Cyan, uppercase, mono
**Labels:** Muted, uppercase, mono
**Data:** Primary color, mono

## Components

**Cards:** 1px solid #234055, background #0e1822
**Armed state:** 2px solid #02ff81 top border
**Status pills:** 10px mono, uppercase, bordered
**Grid overlay:** Linear gradients, cyan 0.08 opacity

## Principles

1. Mission control, not consumer app
2. Information density (show data)
3. Cyan = system, Lime = action
4. No flashy animations
5. Respect the operator

## Pages Using This

- `/dashboard/v2`
- `/dashboard/analytics`
- `/dashboard/predictions`
- `/integrations/proof`
- `/oracle/agents`
- `/pitch.html`

**Last updated:** 2026-02-05
