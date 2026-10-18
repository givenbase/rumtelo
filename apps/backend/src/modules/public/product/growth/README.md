# Product: Groei

Raising earning power, as opposed to dividing what already arrived.

| Child | Owns |
|---|---|
| `lever/` | concrete actions that move income, with an estimated monthly effect |
| `milestone/` | income targets and when they were reached |
| `plan/` | the cascade year → quarter → month → week → day (`GrowthPlanItem`, area `growth.plan`); max 3 per slot, progress rolls up from the children |

Levers and milestones were originally modeled under `money/income`. They live here because the
question they answer is "how do I earn more", not "where does this month go".

Plan items are person-attributed (`PersonalHouseholdEntity`): who sees them follows the
household visibility rule. See `docs/engineering/growth-cascade-plan.md`.
