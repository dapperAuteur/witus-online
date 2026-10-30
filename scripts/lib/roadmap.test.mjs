// Ecosystem roadmap parser and staleness rule (lib/roadmap/roadmap.mjs), behind /admin/roadmap.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  STAGES,
  appSlugMatches,
  countTopLevel,
  isIsoDate,
  isRoadmapStale,
  parseRoadmap,
  sectionItems,
} from "../../lib/roadmap/roadmap.mjs";

const GOOD = `---
app: witus-learn
name: Learn.WitUS
stage: live
url: https://learn.witus.online
updated: 2026-10-29
---

# Learn.WitUS roadmap

## Live now
- Multi-tenant schools
- Course seeds run on merge
  - nested detail under the seeds item

## In progress
- EPUB export for every course

## Next
- Per-school analytics
- Stripe Connect payouts

## Backlog
- Offline lessons

## Blocked on
- BioDigital license (task 103)
`;

test("good file: frontmatter, five sections, counts, first next item", () => {
  const r = parseRoadmap(GOOD);
  assert.equal(r.ok, true);
  assert.deepEqual(r.errors, []);
  assert.equal(r.meta.app, "witus-learn");
  assert.equal(r.meta.name, "Learn.WitUS");
  assert.equal(r.meta.stage, "live");
  assert.equal(r.meta.url, "https://learn.witus.online");
  assert.equal(r.meta.updated, "2026-10-29");
  assert.deepEqual(
    r.sections.map((s) => s.key),
    ["live", "inProgress", "next", "backlog", "blocked"],
  );
  const live = sectionItems(r, "live");
  assert.equal(live.length, 3);
  assert.equal(countTopLevel(live), 2, "nested bullets are detail, not separate work");
  assert.equal(live[2].depth, 1);
  assert.equal(sectionItems(r, "next")[0].text, "Per-school analytics");
  assert.equal(countTopLevel(sectionItems(r, "blocked")), 1);
});

test("missing sections are fine and come back empty", () => {
  const r = parseRoadmap(`---
app: anatomy
name: Anatomy tool
stage: idea
updated: 2026-10-29
---

## Next
- Vet it with the rubric
`);
  assert.equal(r.ok, true);
  assert.equal(r.sections.length, 1);
  assert.deepEqual(sectionItems(r, "live"), []);
  assert.deepEqual(sectionItems(r, "blocked"), []);
  assert.equal(countTopLevel(sectionItems(r, "next")), 1);
});

test("placeholder items like 'None yet' do not count", () => {
  const r = parseRoadmap(`---
app: x
name: X
stage: building
updated: 2026-10-01
---
## Live now
- None yet
## Blocked on
- Nothing.
`);
  assert.equal(countTopLevel(sectionItems(r, "live")), 0);
  assert.equal(countTopLevel(sectionItems(r, "blocked")), 0);
});

test("bad frontmatter: errors, never a throw, sections still parsed", () => {
  const noBlock = parseRoadmap("## Live now\n- something\n");
  assert.equal(noBlock.ok, false);
  assert.match(noBlock.errors[0], /No frontmatter/);

  const unclosed = parseRoadmap("---\napp: x\nname: X\n## Live now\n- a\n");
  assert.equal(unclosed.ok, false);
  assert.match(unclosed.errors.join(" "), /not closed/);

  const badValues = parseRoadmap(`---
app: x
stage: shipping
updated: 2026-13-40
this line has no colon
---
## Next
- still read
`);
  assert.equal(badValues.ok, false);
  const all = badValues.errors.join(" | ");
  assert.match(all, /missing `name`/);
  assert.match(all, /Unknown stage "shipping"/);
  assert.match(all, /not a YYYY-MM-DD date/);
  assert.match(all, /not "key: value"/);
  assert.equal(sectionItems(badValues, "next")[0].text, "still read");

  assert.doesNotThrow(() => parseRoadmap(undefined));
  assert.equal(parseRoadmap("").ok, false);
});

test("unknown headings are kept as-is, in order, with their items", () => {
  const r = parseRoadmap(`---
app: vogoat
name: VO GOAT
stage: Building
updated: 2026-10-20
---
## Live now
- Daily script
## Ideas from BAM
- Leaderboard by literary device
### A sub-heading
## Next:
- Workshop feature
`);
  assert.equal(r.ok, true);
  assert.equal(r.meta.stage, "building", "stage is normalized to lower case");
  assert.deepEqual(
    r.sections.map((s) => [s.key, s.heading]),
    [
      ["live", "Live now"],
      [null, "Ideas from BAM"],
      ["next", "Next:"],
    ],
  );
  assert.deepEqual(
    r.sections[1].items.map((i) => i.text),
    ["Leaderboard by literary device", "A sub-heading"],
  );
});

test("CRLF, BOM, quoted values, code fences and wrapped lines", () => {
  const r = parseRoadmap(
    '﻿---\r\napp: "shop-witus"\r\nname: \'Shop.WitUS\'\r\nstage: beta\r\nupdated: 2026-10-02\r\n---\r\n## In progress\r\n- A long item\r\n  that wraps\r\n```\r\n- not an item\r\n```\r\n',
  );
  assert.equal(r.ok, true);
  assert.equal(r.meta.app, "shop-witus");
  assert.equal(r.meta.name, "Shop.WitUS");
  assert.deepEqual(
    sectionItems(r, "inProgress").map((i) => i.text),
    ["A long item that wraps"],
  );
});

test("stages list matches the documented format", () => {
  assert.deepEqual([...STAGES], ["idea", "vetted", "building", "alpha", "beta", "live", "paused", "retired"]);
});

test("isIsoDate accepts real dates only", () => {
  assert.equal(isIsoDate("2026-02-28"), true);
  assert.equal(isIsoDate("2026-02-30"), false);
  assert.equal(isIsoDate("10/29/2026"), false);
});

test("staleness: main more than 14 days newer than the roadmap's last commit", () => {
  assert.equal(isRoadmapStale("2026-10-01T00:00:00Z", "2026-10-15T00:00:00Z"), false, "exactly 14 days is not stale");
  assert.equal(isRoadmapStale("2026-10-01T00:00:00Z", "2026-10-15T00:00:01Z"), true);
  assert.equal(isRoadmapStale("2026-10-20T00:00:00Z", "2026-10-20T00:00:00Z"), false, "same commit");
  assert.equal(isRoadmapStale("2026-10-20T00:00:00Z", "2026-10-01T00:00:00Z"), false, "roadmap newer than main");
  assert.equal(isRoadmapStale("2026-10-01", "2026-10-05", 3), true, "custom threshold");
  assert.equal(isRoadmapStale(null, "2026-10-05"), null, "unknown without a roadmap commit");
  assert.equal(isRoadmapStale("2026-10-01", undefined), null, "unknown without a main commit");
  assert.equal(isRoadmapStale("not a date", "2026-10-05"), null);
});

test("app slug matches the registry slug or an alias", () => {
  assert.equal(appSlugMatches("learn-witus", "learn-witus", ["witus-learn"]), true);
  assert.equal(appSlugMatches("Witus-Learn", "learn-witus", ["witus-learn"]), true);
  assert.equal(appSlugMatches("shop-witus", "learn-witus", ["witus-learn"]), false);
  assert.equal(appSlugMatches(null, "learn-witus"), false);
});

test("alpha stage (2026-10-30) parses and sits between building and beta", () => {
  const r = parseRoadmap(`---
app: invest-witus
name: Invest.WitUS
stage: Alpha
url: https://invest.witus.online
updated: 2026-10-30
---

## In progress
- Waitlist signups on witus.online
`);
  assert.equal(r.ok, true);
  assert.deepEqual(r.errors, []);
  assert.equal(r.meta.stage, "alpha");
  assert.equal(STAGES.indexOf("alpha"), STAGES.indexOf("building") + 1);
  assert.equal(STAGES.indexOf("beta"), STAGES.indexOf("alpha") + 1);
  assert.equal(sectionItems(r, "inProgress")[0].text, "Waitlist signups on witus.online");
});

test("stage filter on /admin/roadmap is built from STAGES, so it offers alpha", () => {
  const page = readFileSync(new URL("../../app/admin/roadmap/page.tsx", import.meta.url), "utf8");
  assert.match(page, /const FILTERS = \["all", \.\.\.STAGES, "none"\]/);
});

test("documented stage lists include alpha", () => {
  for (const p of ["lib/roadmap/roadmap.mjs", "docs/shared-rules.md"]) {
    const src = readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
    assert.match(src, /stage: idea \| vetted \| building \| alpha \| beta \| live \| paused \| retired/, p);
  }
});
