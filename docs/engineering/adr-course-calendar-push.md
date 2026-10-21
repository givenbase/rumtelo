# ADR: Koers naar Google Calendar en Outlook pushen (Fase 6b)

20 oktober 2026 · status: **voorgesteld** · hoort bij [growth-cascade-plan.md](./growth-cascade-plan.md), Fase 6b

## Context

Fase 6a staat: elke persoon heeft een geheim ICS-adres (`GET /calendar/:token.ics`) dat Google, Apple en Outlook als abonnement lezen. Dat werkt zonder koppeling, maar heeft twee grenzen die we niet kunnen oplossen:

- Google ververst een geabonneerde agenda traag, van uren tot een dag, en negeert `VALARM`. Herinneringen zoals "plan je maandafsluiting" komen in Google dus niet aan.
- Afvinken in Koers is pas zichtbaar na de volgende verversing.

Push lost beide op: Rumtelo schrijft zelf afspraken in een eigen agenda "Rumtelo" in Google Calendar of Outlook, en past ze aan zodra iets in Koers verandert.

## Besluit (voorstel)

1. **Eén richting, eigen agenda.** Rumtelo maakt per gekoppeld account een aparte agenda "Rumtelo" en schrijft alleen daarin. Het leest en raakt nooit andere agenda's of afspraken aan. Ontkoppelen verwijdert die ene agenda.
2. **Smalste scopes.**
   - Google: `https://www.googleapis.com/auth/calendar.app.created`. Die geeft alleen toegang tot agenda's die de app zelf maakte.
   - Microsoft Graph: `Calendars.ReadWrite` en `offline_access`, gedelegeerd. Graph kent geen smallere scope; de regel "alleen onze eigen agenda" handhaven we in code.
3. **Koppelen via better-auth.** `auth.config.ts` kent nu alleen e-mail-OTP, organisatie en 2FA. We voegen de Google- en Microsoft-provider toe als *account-koppeling* (niet als login), zodat een bestaande gebruiker een agenda koppelt zonder zijn manier van inloggen te veranderen.
4. **Tokens versleuteld in de EU.** Refresh-tokens versleutelen we met AES-256-GCM en een aparte sleutel `CALENDAR_TOKEN_KEY` (32 bytes, Railway EU, niet `BETTER_AUTH_SECRET`). De database bewaart alleen versleutelde tokens.
5. **Dezelfde bron als 6a.** De push leest `CourseScheduleService.list` en dezelfde schakelaars per bron als de ICS-feed (`growth_course_feed`). Wat in de feed staat, staat in de push. Eén waarheid.
6. **Outbox met idempotente upsert.** Elke mutatie in Koers, Ritme of de rituelen zet een regel in een outbox. Een job (Nest `ScheduleModule`, elke minuut) rekent per persoon de rijen van vandaag − 28 tot vandaag + 56 opnieuw uit en vergelijkt ze met een koppeltabel `schedule key → externe event-id`. Nieuw wordt aangemaakt, gewijzigd wordt bijgewerkt, verdwenen wordt verwijderd. De `key` van een schema-rij (`focus-week:2026-W43:<account>`) is de idempotentiesleutel.

## Datamodel (voorstel)

| Tabel | Kolommen |
| --- | --- |
| `growth_course_push_account` | `account`, `provider` (`GOOGLE` · `MICROSOFT`), `externalCalendarId`, `refreshTokenCipher`, `scope`, `connectedAt`, `lastSyncedAt`, `lastError` |
| `growth_course_push_event` | `pushAccount`, `scheduleKey`, `externalEventId`, `contentHash`, `syncedAt`; uniek op (`pushAccount`, `scheduleKey`) |
| `growth_course_push_outbox` | `account`, `reason`, `createdAt`, `processedAt` |

## Overwogen alternatieven

| Optie | Waarom niet |
| --- | --- |
| Alleen ICS (6a) houden | geen herinneringen in Google, trage verversing |
| Twee richtingen synchroniseren | de agenda zou Koers kunnen overschrijven; botst met "geen tweede waarheid" |
| Volledige `calendar`-scope bij Google | te breed; vraagt een zwaardere verificatie en geeft toegang tot alle agenda's |
| Afspraken in de hoofdagenda zetten | moeilijk netjes op te ruimen bij ontkoppelen; mengt Rumtelo met privé-afspraken |

## Gevolgen

- **Google-verificatie.** Ook `calendar.app.created` is een gevoelige scope. De OAuth-app moet door Googles verificatie, met privacybeleid, domeinverificatie en een demovideo. Reken op een paar weken.
- **Microsoft.** Een app-registratie in Entra ID met redirect-URI's per omgeving.
- **Privacy.** Privacybeleid en de verwerkerslijst krijgen Google en Microsoft als ontvanger van wat iemand zelf aanzet.
- **Plan.** Voorstel uit de open vragen: push bij Plus en Max, het abonnement (6a) voor iedereen met Schema.
- **Kosten.** Graph en de Calendar API zijn gratis binnen de quota; de job draait in de bestaande backend.

## Wat nodig is voordat dit gebouwd kan worden

- [ ] Google Cloud-project met OAuth-client (web), toestemmingsscherm, scope `calendar.app.created`, verificatie aangevraagd
- [ ] Microsoft Entra-app met `Calendars.ReadWrite` en `offline_access`, redirect-URI's voor lokaal, staging en productie
- [ ] Secrets in Railway: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `CALENDAR_TOKEN_KEY`
- [ ] Privacybeleid bijgewerkt
- [ ] Besluit over het plan (Plus en Max voorgesteld)

## Acceptatie

Klaar als: afvinken of loslaten in Koers binnen een minuut in de gekoppelde agenda zichtbaar is; de maandafsluiting in Google drie dagen ervoor een melding geeft; en ontkoppelen de agenda "Rumtelo" verwijdert zonder iets anders aan te raken.
