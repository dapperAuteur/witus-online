# Calendar event conventions (WitUS ecosystem)

How people write Google Calendar events so WitUS apps can record data from them, which app reads
what, and the privacy rules around it. Status as of 2026-10-05. Anything marked **proposed** is a
plan, not shipped code; check the owning repo before relying on it.

## 1. Who owns the Google connection

**CentenarianOS owns the Google Calendar connection for the whole ecosystem.** It is one-way
(Google to CentenarianOS), read-only (`calendar.readonly`), supports several Google accounts per
user, and syncs daily plus on "Sync now" (CentenarianOS plan 59 Part 4; code in
`gemini/centenarian-os/lib/calendar/google-sync.ts`).

Other apps do **not** connect to Google themselves. A second OAuth connection would mean two copies
of the same tokens and two consent screens. Apps that need calendar data receive it from
CentenarianOS as signed events (proposed for RideWitUS, see §4).

## 2. The title grammar

The canonical grammar is the CentenarianOS parser: `lib/capture/tokens.ts` (word lists) and
`lib/capture/parse-tokens.ts` (rules), with tests in `tests/unit/parse-tokens.test.ts`. Change it
there first, then update this section. English and Spanish words are always accepted, whatever the
user's language setting.

### Kind tags

| Kind | Tags | Needs |
|---|---|---|
| Expense | `#expense`, `#gasto` | an amount |
| Income | `#income`, `#ingreso` | an amount |
| Trip | `#trip`, `#viaje` | a distance |
| Meal | `#meal`, `#comida` | nothing |
| Workout | `#workout`, `#entreno`, `#ejercicio` | nothing |
| Task | `#task`, `#tarea` | nothing |

A title with no kind tag is a plain task. The first kind tag wins; a second, different one is
flagged. Meal tags (`#lunch`, `#cena`, ...) set the meal type on any kind, and make a title a meal
when it has no kind tag. Any other `#word` is removed from the task name and flagged as unknown.

### Details

- **Amount** (expense, income): `$12.40`, `12.40`, `12,40`, `$1,200`. A `$` amount wins; else a
  number with decimals; else a whole number only when it is the one number left and does not look
  like a year (1900-2100). The `$` is a marker, not a currency: no conversion happens.
- **Distance** (trips): a number with `mi`, `mile(s)`, `milla(s)`, `km`, `kms`, `kilometer(s)`,
  `kilómetro(s)`, attached (`12km`) or spaced (`12 km`).
- **Mode** (trips): `mode:word` with a mode word (`drive`, `car`, `coche`, `carro`, `bike`, `bici`,
  `walk`, `caminar`, `run`, `correr`, `flight`, `fly`, `plane`, `avión`, `avion`, `bus`, `train`,
  `tren`, `ferry`, `uber`, `lyft`, `rideshare`) or a trip mode value (`bike`, `car`, `bus`, `train`,
  `plane`, `walk`, `run`, `ferry`, `rideshare`, `other`). Without `mode:`, a bare mode word in the
  title counts ("Drive to Tucson").
- **Meal type** (meals): `breakfast`/`desayuno`, `lunch`/`almuerzo`, `dinner`/`cena`,
  `snack`/`merienda`, as a word or a tag. Else by start time: 05:00-10:29 breakfast, 10:30-14:29
  lunch, 17:00-21:29 dinner, otherwise snack.
- **Duration** (any tagged title): `45min`, `1h`, `1.5h`, `1h 30min`, Spanish `minutos`/`horas`. A
  bare `m` (`90m`) means minutes except on trips, where it would be meters.

### Copy-paste examples

| Kind | English | Spanish |
|---|---|---|
| Expense | `Groceries Corner Market #expense $42.18` | `Compras Mercado Central #gasto $42.18` |
| Income | `Client payment Acme Studio #income $1500.00` | `Pago de cliente Acme Studio #ingreso $1500.00` |
| Trip | `To the trailhead #trip 7.8mi mode:bike` | `Al parque #viaje 12.5km mode:bici` |
| Meal | `Lunch Corner Cafe #meal` | `Almuerzo Café de la Esquina #comida` |
| Workout | `Strength session #workout 45min` | `Sesión de fuerza #entreno 45min` |
| Task | `Call the plumber #task` | `Llamar al plomero #tarea` |

### Location

The place goes in the event's **Location** field, never in the title. The title grammar does not
read places.

## 3. Units: metric and imperial

Both are first-class. Users may write `mi` or `km` in any title, and apps must accept both.

- **CentenarianOS today** converts kilometers to miles (factor 0.621371) and stores miles rounded
  to 0.1 mi, the unit of its trip records. Its event builder starts the unit toggle on the user's
  travel setting (`travel_settings.distance_unit`, `mi` or `km`).
- **RideWitUS (proposed):** supports metric and imperial display per user (owner request,
  2026-10-05). When it receives a parsed trip token, it should treat the stored value as miles and
  convert for display; it should not re-parse the title with a different grammar.
- Any new app that reads distances follows the same rule: accept both units in input, store one
  canonical unit with the conversion documented, display in the user's unit.

## 4. Which app reads what

| App | Reads | Status |
|---|---|---|
| **CentenarianOS** | Every event on calendars the user switched on. Each becomes a planner task named after the title without its tags; the parsed details are stored on `calendar_sync_items.parsed`; the location is added to the task description. Flagged titles (missing amount or distance, two kinds, unknown tag) still create the task. | **Shipped** (plan 59 phases 4.1-4.3) |
| CentenarianOS | Tagged events also create the record: expense or income transaction, trip, meal log, workout log. Never deletes a financial record on a calendar change; flags it instead. | **Proposed** (plan 59 phase 4.4, not built) |
| **RideWitUS** | Events with a location, forwarded by CentenarianOS as `calendar.activity`, become *suggested* trips to and from the activity, held for review; `#trip` events become confirmed trips. Moved events move unconfirmed suggestions; cancelled events remove them; confirmed trips are never deleted by a calendar change. | **Proposed** (RideWitUS PRD §5.8 and §6.5a, branch `docs/prd-calendar-feed`) |
| Other WitUS apps | Nothing. | None yet |

## 5. Privacy

- **CentenarianOS** reads only calendars the user switches on (all start off), and never writes
  to Google.
- **Sharing to other apps is opt-in per calendar (proposed).** Each synced calendar gets a "Share
  with RideWitUS" switch, off by default. Filters run in CentenarianOS before anything is sent:
  only events with a location; minimum fields (no description, attendees, meeting links or Google
  ids); an optional per-calendar "hide titles"; a window of 14 days back and 30 days ahead.
  Turning sharing off sends `is_active: false`, and the receiver deletes unconfirmed suggestions
  built from that calendar.
- The user's home location is set in RideWitUS and never sent to CentenarianOS (proposed).

## 6. Helping users write events

In CentenarianOS (branch `docs/calendar-event-templates`, pending merge):

- **Event builder**, `/dashboard/settings/calendar/event-builder`: builds a title from simple
  fields, shows what the real parser reads and any warnings, copies the title, or opens Google's
  prefilled create-event form.
- **Printable cheat sheet**, `/dashboard/settings/calendar/event-builder/cheat-sheet`, also
  `public/templates/calendar-event-cheat-sheet.md`.
- **Example events**, an `.ics` with one example per kind in English and Spanish, titled
  "Example: …", for import into a separate test calendar.
- Help articles "How to write calendar events CentenarianOS can read" and "Calendar event cheat
  sheet and example events".

The prefilled Google link is
`https://calendar.google.com/calendar/render?action=TEMPLATE&text=…&dates=…&details=…&location=…&ctz=…`,
with `dates` as local `YYYYMMDDTHHMMSS/YYYYMMDDTHHMMSS` (or `YYYYMMDD/YYYYMMDD` for all-day, end
day exclusive). Google does not publish a reference for this URL; the parameters follow the
community reference at
<https://github.com/InteractionDesignFoundation/add-event-to-calendar-docs/blob/master/services/google.md>.
Any app that offers a similar button should label it as unofficial and offer "copy title" as the
fallback.

## 7. Changing the convention

1. Change the CentenarianOS parser and its tests first (it is the only shipped reader).
2. Regenerate the CentenarianOS templates
   (`node --experimental-strip-types scripts/generate-calendar-event-templates.ts`).
3. Update this file, and any receiving app's docs.
4. Never repurpose an existing tag or word: users' calendars already contain them. Add aliases
   instead.
