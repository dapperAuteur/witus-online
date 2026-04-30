# Product Hunt launch - CentenarianOS

**Launch date:** 2026-07-06 (Track E launch #4, capstone product launch)
**Switchy slug:** `e-cent-ph`
**Hunter:** TBD by BAM
**Status:** Draft

## Tagline (60-char max)

**Primary:** Personal OS for living to 100. Built by one of us. (51)

**Alternatives:**
- Plan, track, and live the next 50 years on one OS. (50)
- 14 modules. 84+ migrations. Built for a long life. (49)

## Tagline note

The PH crowd responds better to the consumer angle (multi-decade horizon, personal OS) than to the technical war stories (84+ migrations, shared Supabase). Save the technical story for the Show HN copy on the same day. PH leads with the philosophy: "personal OS for the longest possible life."

## Launch description (260-char limit)

CentenarianOS is a personal operating system for living a long, working life. Plan, track, and adjust health, finance, focus, fitness, and learning across a multi-decade horizon. 14 modules. Offline-first. AI coach that knows your data. Free to start. (251)

## First comment (BAM's voice)

I'm training to be the world's fastest centenarian. To do that I need a system that thinks in decades, not weeks. Most "second brain" tools assume you're planning the next quarter. CentenarianOS assumes you're planning the next 50 years.

There are 14 modules: planner, nutrition, focus, health, workouts, finance, travel, equipment, correlations, data hub, blog, recipes, LMS, AI coach. They share one database, so the workouts module knows what the nutrition module logged, and the correlations module surfaces the patterns across all of them.

I built this for myself first. Then I made it the operating system for two products (CentenarianOS for individuals, Work.WitUS for contractors) on one shared Supabase database. That cross-product schema discipline is its own story, told on Show HN the same day if you want the technical version.

If you're planning your life on a horizon longer than the next sprint, try it. Free at centenarianos.com.

## Gallery captions (4-6 images, 60 chars each)

1. 14 modules, one database, one multi-decade horizon. (53)
2. Correlations: see what your data actually says. (49)
3. Multi-decade planner. Schedule years, not weeks. (50)
4. AI coach that knows what you logged this morning. (51)
5. Offline-first sync. Works on the trail, syncs at home. (55)
6. Built by a solo dev training to live to 100+. (45)

## Topics / categories

- Productivity (primary)
- Health & Fitness
- Personal Development
- Artificial Intelligence (for the AI coach)

## Maker comment thread starters

**"How is this different from Notion / Obsidian / Reflect / Roam?"**
> Those are great general-purpose second brains. CentenarianOS is opinionated. The modules are pre-built for the longevity-focused life, the schema is fixed, the AI coach is trained on the data you log. If you want infinite flexibility, use Notion. If you want a system that already knows what to ask for, this is it.

**"Why share a database with another product?"**
> Because I built CentenarianOS and Work.WitUS as one operator with overlapping needs. Some modules (finance, planner, equipment) are useful for both an individual life and a contractor business. Sharing the schema means I write migrations once. The discipline cost is real (no migration during launch week, careful boundary work) but the payoff in shared infrastructure is huge.

**"Subscription? Open source?"**
> Free tier with the core modules. Paid tier for the AI coach + the cross-module correlations. Not open source, but the architecture write-up is public on dev.to.

## Cross-links (substituted at send time)

- App: https://centenarianos.com
- Pricing: https://centenarianos.com/pricing
- Architecture write-up: dev.to canonical to brandanthonymcdonald.com
- Switchy short URL: filled in from `e-cent-ph` slug at T-7

## References

- Per-product launch-prep doc: `gemini/centenarian-os/plans/40-2026-04-27-track-e-launch-prep.md`
- Cross-product coordination: shared Supabase with `gemini/contractor-os` (Work.WitUS); migration freeze 2026-06-29 -> 2026-07-13
- Show HN angle (saved for Show HN copy): "84+ migrations, shared Supabase with my contractor app"
