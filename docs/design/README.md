# Design

Visual source of truth lives in the repo’s [`design/`](../../design/) folder (Claude Design / `.dc.html` exports and design-system assets).

This doc explains **how to use it** so product UI stays aligned with the real artboards.

---

## Critical rule

**The ~32 screens in `apps/application` were a reconstruction, not the design.**

Domain is correct (six jars, inbox, week check, month score, four portals). Layouts and visual language must be rebuilt against the real design — not against guessed tag names.

Full story and unblock steps: [`HANDOFF.md`](../../HANDOFF.md) §8.

---

## Unblock `design/` on macOS (if EPERM)

```bash
xattr -cr "/Users/givenloyiso/Desktop/DEV/rumtelo/design" && ls design
```

Or re-copy without attributes:

```bash
ditto --norsrc --noextattr --noacl \
  "/path/to/Finance app with Monopoly concept" \
  "/Users/givenloyiso/Desktop/DEV/rumtelo/design"
```

---

## Rebuild order

1. Read the complete `.dc.html` (all sections, including truncated tails).
2. Serve `design/` locally and **screenshot every artboard** — build against what is on screen.
3. Transform inline styles → Tailwind (4px scale, `--radius-*`, tokens from `@theme`).
4. Port `Button` from the design-system bundle as a Tailwind component.
5. Rebuild screens against real layouts.

**Tokens:** single source of truth is `packages/config/tailwind/theme.css` (deep teal accent, cool greys). Do not invent a second palette in app CSS.

What stays design-independent: monorepo, contracts, backend hierarchy, household scoping, DB schema, build pipeline.

---

## Brand visual notes

See [brand/positioning.md](../brand/positioning.md) for logo, color, and typography direction used with external designers.

---

## Related

- [Brand positioning](../brand/positioning.md)
- [Architecture](../engineering/architecture.md)
- [HANDOFF §8](../../HANDOFF.md)
