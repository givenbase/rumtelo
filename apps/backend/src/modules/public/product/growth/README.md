# Product: Groei

Raising earning power, as opposed to dividing what already arrived.

| Child | Owns |
|---|---|
| `lever/` | concrete actions that move income, with an estimated monthly effect |
| `milestone/` | income targets and when they were reached |
| `course/` | Koers (Course): the cascade year → quarter → month → week → day (`GrowthCourseItem`, area `growth.course`), max 3 per slot, progress rolls up from the children or, with a counter, from routine ticks |
| `course/` › Rhythm | routines next to the 3 (`GrowthCourseRhythm`, `GrowthCourseRhythmTick`); proposals per week, never silent copies |
| `course/` › Schedule | `CourseScheduleService`: one read over Focus, Rhythm, week checks, month close (`GrowthCourseRitualSnooze`) and Energy sleep advice; writes nothing but a snooze |
| `course/` › Calendar | `CourseFeedService` + public `GET /calendar/:token.ics` (`GrowthCourseFeed`): one-way ICS mirror for Google, Apple, Outlook |

Levers and milestones were originally modeled under `money/income`. They live here because the
question they answer is "how do I earn more", not "where does this month go".

Plan items are person-attributed (`PersonalHouseholdEntity`): who sees them follows the
household visibility rule. See `docs/engineering/growth-cascade-plan.md`.
