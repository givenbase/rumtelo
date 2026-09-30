# `@rumtelo/ui`

Rumtelo design-system primitives (Tailwind v4 + Radix). Apps import from `@rumtelo/ui`.

## Tokens

Use **Rumtelo** color names: `fg`, `fg-muted`, `surface`, `raised`, `line`, `accent`, `accent-soft`, `danger`, …

Shadcn aliases (`foreground`, `muted-foreground`, `border`, `primary`, …) map to the same CSS vars in `packages/config/tailwind/theme.css` — light/dark still works. Prefer Rumtelo names in new chrome.

## Forms & overlays

| Primitive | Use for |
|-----------|---------|
| `DatePicker` / `Calendar` | Calendar dates — **not** native `Input type="date"` |
| `Select` | Menus (portal + scroll lock handled) |
| `SuggestionPanel` | Combobox-style suggestion lists under an anchor |

### Suggestion lists inside Sheet / Dialog

`SuggestionPanel` is a **Radix Popover with `modal`** (shadcn Combobox pattern). That keeps wheel/touch scroll working when the page is locked by Sheet/Dialog `RemoveScroll`.

Do **not** hand-roll `createPortal(…, document.body)` + a custom max-height clamp for this — full-page scroll will work, modal scroll will not.

## More

- Patterns for apps: `.cursor/rules/react-next-patterns.mdc`
- Agents: `.claude/agents/nextjs-frontend-engineer.md`, `wcag-compliance-auditor.md`
