---
name: responsive-pass
description: Styling-only phone/tablet pass on existing Rumtelo screens with Tailwind v4 tokens - overflow, stacking, spacing, touch targets, tables, jar meters - without touching logic, copy or routes. Use when a screen breaks or feels cramped on phone or tablet.
argument-hint: "[component or page path]"
---

# Responsive pass

Target: $ARGUMENTS

Rule `.claude/rules/frontend.md` applies; tokens and overlays: [`packages/ui/README.md`](/packages/ui/README.md), [`.cursor/rules/react-next-patterns.mdc`](/.cursor/rules/react-next-patterns.mdc).

**Agents:** `responsive-ui-engineer` (lead) → `wcag-compliance-auditor` (touch targets, focus, zoom) → `ux-ui-designer` if layout intent is unclear.

## Hard limits

- Only `className` / layout changes with Tailwind utilities on the `@theme` tokens (`packages/config/tailwind/theme.css`) and `@rumtelo/ui` props.
- No CSS files, CSS modules, inline `style`, or raw hex values.
- Do not change business logic, data fetching, copy, translations, routes; add no dependencies.
- Conditional classes through `cn` from `@rumtelo/utils`.

## 1. Audit at 320 / 375 / 768 / 1024 px

Per breakpoint: horizontal overflow, rows that do not stack, cramped spacing, unreadable text, touch targets < 44×44 px, tables without scroll, hover-only actions, long NL strings (Dutch runs longer than English).

Use the Browser pane (`.claude/launch.json` → `application` :3000, `website` :3001) when the app can run; it needs a backend and data, which live on staging — otherwise reason from markup and say so.

## 2. Fix mobile-first

| Problem | Pattern |
|---------|---------|
| Row breaks | `flex flex-col sm:flex-row gap-4` |
| Fixed grid | `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` |
| Wide table | wrapper `overflow-x-auto`, keep `min-w-*` on the table |
| Small tap target | `min-h-11 px-4` |
| Secondary detail | `hidden md:block` (non-essential only) |
| Hover-only action | visible and tappable on touch |

Keep the overspent-jar rule: a full red meter, never empty.

## Definition of done

No horizontal page scroll at 320 px; every action reachable and tappable; desktop unchanged; `pnpm lint` and `pnpm check-types` clean. Report issues per breakpoint, class changes, and confirm no logic or copy changed.
