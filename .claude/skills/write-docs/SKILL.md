---
name: write-docs
description: Write or update Rumtelo docs so they match the code - module READMEs, docs/ (product, engineering, explain), HANDOFF.md, app AGENTS.md, docs/BACKLOG.md. Use after a feature or architecture change, when a README is stale, or when asked to document something.
argument-hint: "[module path, doc, or feature]"
---

# Write docs

Target: $ARGUMENTS

**Agents:** `docs-release-engineer` (lead); `brand-copywriter` for product/brand docs; `product-manager` for `docs/BACKLOG.md` priorities.

## Where things live

| Doc | Purpose |
|-----|---------|
| [`docs/README.md`](/docs/README.md) | Hub and read order |
| `docs/product/`, `docs/brand/`, `docs/explain/` | Product, voice, plain-language explainers |
| `docs/engineering/` | Architecture, traps, plans, PR gates |
| [`HANDOFF.md`](/HANDOFF.md) | Direction, decisions, traps (code wins when they disagree) |
| [`docs/BACKLOG.md`](/docs/BACKLOG.md) | Now / Next / Later with Priority + Size |
| `apps/*/AGENTS.md` | Agent guide per app (`CLAUDE.md` = `@AGENTS.md`) |
| `apps/*/README.md`, `packages/*/README.md`, `apps/backend/src/modules/README.md` | Human docs per app/package/plane |

## Process

1. Read the code you document (contract, service, UI) — behaviour, not intent.
2. Edit in place; link rather than duplicate. Repo-root links (`/apps/backend/...`).
3. Pick the type: how-to (steps), reference (procedures, fields), explanation (why).
4. Verify every command against `package.json` scripts before writing it.

## Style

- English; product words: household, pots (`jar` in code), goals, Course (never "plan" for Course), week check, month score.
- Lead with what it is and why it exists; short paragraphs, tables for reference.
- State plan gates (Basic / Plus / Max) and household-role limits explicitly.
- No real people, emails or bank data beyond the seeded demo personas.

## Definition of done

Every path, contract procedure and command you name exists; links resolve; nothing contradicts the code. Report files changed and any doc you found stale but did not fix.
