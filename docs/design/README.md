# Design

Visual source lives in the repo’s [`design/`](../../design/) folder: `Kluis Finance App.dc.html`,
`Kluis Landing.dc.html` (Claude Design exports) and design-system assets under `_ds/`.

---

## Honest state

**The screens in `apps/application` are a partial port, not a full rebuild.**

- Some components follow an artboard and cite it in their doc comment, e.g.
  `Kluis Finance App.dc.html:689-839` (jars), `:1236-1357` (net worth), `:2942` (nav), portal hub/widget.
- Most other screens were built from the domain (six jars, inbox, week check, month score, portals) without an artboard.
- The app has outgrown the design: Kluis is money-only. Growth (Course, learn, net worth), Energy, Soul,
  Practice, billing and settings have no artboard.

---

## Porting rules

1. Screenshot the artboard and build against what is on screen, not tag names.
2. Transform inline styles into Tailwind (4px scale, `rounded-*`, `ease-*` / `duration-*`, `@theme` tokens). Never copy inline styles.
3. Cite the source range (`Kluis Finance App.dc.html:<from>-<to>`) in the component doc comment.
4. Surfaces without an artboard follow already-ported screens and `@rumtelo/ui`.

**Tokens:** single source of truth is `packages/config/tailwind/theme.css` (deep teal accent, cool greys). Apps import
`@rumtelo/config/tailwind/globals.css`; do not invent a second palette in app CSS.

What stays design-independent: monorepo, contracts, backend hierarchy, household scoping, DB schema, build pipeline.

If `design/` ever returns `EPERM` on macOS (a `com.apple.macl` attribute copied from `Downloads`), clear it with
`xattr -cr design` — see [traps](../engineering/traps.md).

---

## Brand visual notes

See [brand/positioning.md](../brand/positioning.md) for logo, color, and typography direction used with external designers.

---

## Related

- [Brand positioning](../brand/positioning.md)
- [Architecture](../engineering/architecture.md)
- [HANDOFF §8](../../HANDOFF.md)
