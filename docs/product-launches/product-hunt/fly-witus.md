# Product Hunt launch - Fly.WitUS

**Launch date:** 2026-05-25 (Track E launch #2, narrow-launch playbook test)
**Switchy slug:** `e-fly-ph`
**Hunter:** TBD by BAM
**Status:** Draft

## Tagline (60-char max)

**Primary:** Pre-flight + flight log for FAA Part 107 drone pilots (54)

**Alternatives:**
- Offline-first checklist + log for Part 107 commercial pilots (60)
- Drone pre-flight, NOAA weather, FAA-export PDF. Offline. (56)

## Launch description (260-char limit)

Fly.WitUS is an offline-first PWA for FAA Part 107 commercial drone pilots. Run the pre-flight checklist with NOAA weather auto-fetched, log the flight, export an FAA-shaped PDF after every mission. Works without signal. Built by a Part 107 pilot. (245)

## First comment (BAM's voice)

I fly Part 107 commercially and the existing apps fall apart at the sites I actually fly. Remote fields, dead cell zones, "let me just check the weather" turning into a five-minute reload screen. So I built the one I needed.

Fly.WitUS works fully offline. The 8-section checklist runs without signal. Once you're back online the IndexedDB queue syncs cleanly. NOAA weather pulls automatically when there's a connection so the wind-and-density numbers come from the FAA's source of truth, not a guess.

The PDF export is shaped to match Part 107 documentation rules. Drop the export into your records and you've got the audit trail the FAA expects.

If you fly Part 107, this is for you. If you fly recreationally, this is overkill and there are better fits. I built it for the working commercial use case first.

Free to start at fly.witus.online. Drone pilots, what's missing? I'd rather hear it now than after launch week.

## Gallery captions (4-6 images, 60 chars each)

1. 8-section pre-flight checklist, fully offline. (47)
2. NOAA weather and density altitude, auto-fetched. (49)
3. Flight log with battery cycles + flight time. (46)
4. FAA-shaped PDF export. Drop it in your records. (48)
5. Built as a PWA. Installs on iOS, Android, desktop. (50)
6. Built by a Part 107 pilot for Part 107 pilots. (46)

## Topics / categories

- Travel (PH's closest fit for aviation/drones)
- Productivity (secondary)
- Developer Tools (the offline-PWA + IndexedDB story has dev-crowd appeal)

## Maker comment thread starters

**"Why not just use Kittyhawk / Airdata?"**
> Both are great if you're online. Both fall over at the remote sites where I actually fly. The differentiator here is offline-first as a primary design goal, not a fallback. Run the checklist + log the flight with airplane mode on, sync when you're back.

**"Does it integrate with my drone manufacturer's logs?"**
> Not yet. The launch is the standalone case. Manufacturer-API import (DJI, Autel, Skydio) is on the roadmap but is post-launch.

**"How is NOAA weather different from in-app weather APIs?"**
> NOAA is the FAA's referenced source. If you cite weather in your Part 107 documentation, NOAA is the defensible source. Other weather APIs are fine for go/no-go but I wanted the documentation trail to point at the right place.

## Cross-links (substituted at send time)

- App: https://fly.witus.online
- Pricing: https://fly.witus.online/pricing (or `/free` if no paid tier at launch)
- Docs: https://fly.witus.online/docs
- GitHub: TBD if open-sourced
- Switchy short URL: filled in from `e-fly-ph` slug at T-7

## References

- Per-product launch-prep doc: `claude/fly-witus/plans/2026-04-27-track-e-launch-prep.md`
- Distribution emphasis is r/Part107 + r/drones + r/UAVmapping over PH (per launch-prep doc), but PH still hit on schedule
