# WitUS App-Idea Vetting Rubric

**Version 1.0 · 2026-09-18 · Owner: Anthony McDonald (BAM)**
**Status:** in force. Weights and thresholds are provisional until three ideas have been scored and at least one outcome is known (see §9).

This file is the canonical source for the "New-product vetting rule" in `gemini/witus/CLAUDE.md`. The readable guide, with a worked example, is the library ebook `plans/playbook/2026-09-18-app-idea-vetting-playbook.md`. The ebook is a dated snapshot of this file; when the two disagree, this file wins.

---

## 1. When to use it

- Any new product idea: an ecosystem app, a sub-site, a paid tool, or a client's idea that BAM might build.
- Before any code, repo, domain, or onboarding step.
- Again when the scope changes materially, when a major competitor moves, or when a Park trigger fires.

**Not for:**
- Features inside an existing product. Those use that product's own `plans/`.
- Build-vs-buy decisions on internal tools. Those use a build-vs-buy analysis like `plans/29`, though gates G3 and G4 still apply.

## 2. The process

1. **Find prior work.** Search every ecosystem repo's gitignored `plans/` with `rg -uu`, and link what you find (shared rules, "Finding what BAM mentions").
2. **Restate the idea and declare the goal.**
   - Record every interpretation you made.
   - Ask BAM which goal the idea serves: **business**, **portfolio/demo**, or **community**. The goal picks the weight profile.
   - If the goal is unknown, score both business and portfolio.
3. **Research in slices, with source discipline.** The four slices:
   - competitors and substitutes, including do-it-yourself tools and dead competitors;
   - the first customer or site;
   - market and economics;
   - law, policy, and governing bodies.

   Every fact gets a URL, a publisher, and a date. Flag conflicts. Write UNVERIFIED rather than guess.
4. **Write the analysis** at `gemini/witus/plans/NN-<slug>-analysis.md`, following the template in §6, with APA 7 citations.
5. **Score it.** Gates first (§3), then the dimensions (§4) with an evidence tag on each score, then the math and verdict (§5).
6. **Decide, and set up the test.** State the verdict, the cheapest honest test, and the kill criteria. File a `plans/user-tasks/` file for any step BAM does outside the editor.
7. **Run a rubric retro.**
   - Add what you learned to the lessons log (§8), and record the idea in the outcome log (§9).
   - Propose any gate, weight, or threshold change in the analysis. BAM approves it before it lands here.

## 3. Gates

Check the gates before scoring.
- An open gate that a no-code test can resolve caps the verdict at **Test cheaply**.
- A gate that can't be resolved means **Kill**.

| Gate | Fails when | Resolves when |
|---|---|---|
| **G1 No payer** | Nobody with a budget line can be named for the first ten customers | A named payer says yes to a paid pilot or a letter of intent |
| **G2 Free incumbent does the core job** | A verified tool that is free, or already paid for, does the core job for the same user | The idea narrows to a job the incumbent does not do (verified), or becomes an add-on to it |
| **G3 Protected-time conflict** | The product needs BAM live during protected windows (weekend crew work, event days) and there is no staffing plan | A support plan exists: an offline-first design, a paid on-call person, or no live service promise |
| **G4 Harm without mitigation** | It handles minors, health, money, or safety data, or could publicly embarrass a person, and there is no written mitigation | Mitigations are written: data minimization, opt-outs, access control, an incident plan |
| **G5 Many products in one** | The idea is really N products (per sport, per vertical, per role) with no stand-alone first slice | A one-slice first version is defined and stands on its own |
| **G6 Rules forbid it** | A law, a platform policy, or a governing body's rule blocks the core use | Permission is verified, or the design complies |

## 4. Scored dimensions

Score each dimension from 1 to 5 using the anchors. Tag every score:
- **V:** verified against a dated source.
- **I:** inferred from verified facts.
- **A:** assumption.

| # | Dimension | 1 | 3 | 5 |
|---|---|---|---|---|
| D1 | **Payer pain.** Does the person who signs feel the problem? (For community projects, read "payer" as the people served.) | The payer is indifferent; the pain sits with people who don't pay | The payer feels it, but it is not a top-three problem | It is one of the payer's top three problems and costs them time or money now |
| D2 | **Willingness to pay against free.** | Incumbents are free to the payer | Paid tools exist at prices the payer already pays | The payer pays more today for a worse solution |
| D3 | **Verified white space.** | A verified incumbent does it, or is shipping it within 12 months | A gap exists, but a do-it-yourself or adjacent tool covers most of it | A dated, sourced gap with no credible incumbent path to close it |
| D4 | **Distribution.** | Each account needs field sales, and value depends on network effects | A channel exists but is unproven | A channel or self-serve path reaches buyers without BAM selling each one |
| D5 | **Revenue math** (accounts times hours) | $100k a year takes more than 100 accounts, each needing hours of selling | $100k a year from 20 to 100 accounts, or a low-touch sale | $100k a year from fewer than 20 accounts, or self-serve at scale |
| D6 | **Scope honesty.** | Many products hide in one, with no stand-alone slice | Two or three products; the slice exists but is thin | One product, with a first version buildable in weeks |
| D7 | **Founder fit** (from the verified record only) | No relevant experience | Adjacent experience | Direct, verified experience with the user's job |
| D8 | **Founder constraints**: protected windows, live-support load, cost to open priorities | Collides with protected time, or displaces an open priority | Manageable with design choices | Asynchronous, no live service promise, fits beside current work |
| D9 | **Risk and compliance** | Regulated data or minors' data, severe harm if wrong, and no plan | Known rules, a plan exists, moderate harm | Low-risk data and no special rules |
| D10 | **Timing** | A technology or market shift is likely to erase it within two years | Neutral | A shift has opened a window others haven't used |
| D11 | **Ecosystem leverage** | Nothing is reused, and it adds maintenance | Patterns are reused (auth, tenancy) | Real components are reused, and it feeds other products |

## 5. Weight profiles, score, verdict

The goal declared in step 2 picks the column. Each column sums to 100.

| Dimension | Business | Portfolio / demo | Community (untested) |
|---|---|---|---|
| D1 Payer pain | 15 | 5 | 10 |
| D2 Willingness to pay | 10 | 0 | 0 |
| D3 White space | 10 | 10 | 10 |
| D4 Distribution | 10 | 5 | 10 |
| D5 Revenue math | 10 | 0 | 0 |
| D6 Scope honesty | 10 | 20 | 15 |
| D7 Founder fit | 5 | 15 | 10 |
| D8 Founder constraints | 10 | 15 | 15 |
| D9 Risk and compliance | 10 | 10 | 15 |
| D10 Timing | 5 | 5 | 5 |
| D11 Ecosystem leverage | 5 | 15 | 10 |

**Score** = sum of (weight × score) ÷ 100. The range is 1.0 to 5.0.

**Assumption weight** = the total weight of the dimensions tagged **A**.

| Verdict | When |
|---|---|
| **Kill** | Any gate that can't be resolved, or a score below 2.0 |
| **Park** | A score from 2.0 to 2.9. Write down the trigger that would reopen it |
| **Test cheaply** | Any of these: a score from 3.0 to 3.7; a score of 3.8 or higher with an open but testable gate; or an assumption weight above 30. Run the no-code test with its kill criteria, then re-score |
| **Build** | All of these: a score of 3.8 or higher; no open gates; an assumption weight of 30 or less; and a named payer (business) or a named user (portfolio or community) has said yes |

## 6. The analysis template

Every analysis carries these sections, in this order:

0. **Bottom line:** the verdict, the reasons, and what would flip it.
1. **The concept:** restated, with interpretations and the declared goal.
2. **The first customer or site:** facts, including the vendor stack they actually run.
3. **Need:** what is real and what is already solved, as a table.
4. **Competitors and substitutes:**
   - dated and priced;
   - including do-it-yourself options and dead competitors;
   - with notes on consolidation.
5. **Rubric scorecard:** gates and dimensions with evidence tags. Score each profile when the goal is undecided.
6. **Customer profiles:**
   - role key B/U/A/P/G (buyer, user, audience, payer, gatekeeper);
   - "who else";
   - the bad actors to design against.
7. **Revenue:** models, accounts-needed math, and the first market's ceiling.
8. **Positioning:** what to say and what not to say.
9. **Stress test:**
   - a pre-mortem;
   - an assumptions table, with the cheapest test and a kill threshold for each;
   - operational, economic, technical, and legal/policy stress.
10. **Why it shouldn't be done,** ranked.
11. **The cheapest honest test:** options, calendar, steps, and kill criteria.
12. **Ecosystem fit and opportunity cost.**
13. **Questions for BAM.**
14. **Rubric retro:** lessons learned and proposed changes.

Then **References** in APA 7.

## 7. Research method checklist

**Before you research**
- Search first: `rg -uu` across the ecosystem, and link any prior work.
- Map the first customer's vendor stack from its own website before assuming anything about it.

**Competitors**
- Read each incumbent's own announcements from the last twelve months.
- Never write a competitor's ownership, price, or feature coverage from memory.
- Price the do-it-yourself substitute (a spreadsheet plus free software is often the real competitor).
- Look for dead competitors. A shutdown is a market signal.

**Sources**
- Use primary sources for law and rules: eCFR, statute text, a governing body's own PDFs. Note effective dates and recent changes.
- Date every fact, label company claims as claims, and flag conflicts between sources.

**Research agents**
- Give each agent a slice and a search budget. The session cap is 200 web searches, shared by every agent.
- Have each agent write findings to `plans/research/NN-<slug>/` as it goes, so a stop or a usage cutoff loses nothing.
- Once search results have surfaced the URLs, fetch those pages directly instead of searching again.

**Count, don't estimate**
- Count the products hiding in the idea.
- Count the accounts needed for $100k a year, and the hours to win each one.

**Anything touching minors or schools**
- FERPA directory-information and opt-out rules.
- COPPA for users under 13.
- The ADA Title II web and app deadlines.
- Title IX publicity equity.
- The state association's media and NIL rules.
- The state student-privacy consortium agreement.

## 8. Lessons log

Append a row for every lesson. Lessons become checklist items, gates, or weights once BAM approves the change.

| # | Date | Idea (analysis) | What we learned | Change made |
|---|---|---|---|---|
| L1 | 2026-09-18 | School sports stats app (`plans/32`) | Default `rg` skipped every gitignored `plans/` directory, so the prior lacrosse idea looked missing | Process step 1; shared-rules v2 |
| L2 | 2026-09-18 | Same | Competitor facts from memory were wrong or stale. VNN belongs to PlayOn, not Snap!. GameChanger added scorekeeping in seven sports and on-stream scoreboards in December 2025 | Checklist: read incumbents' announcements from the last twelve months; no competitor facts from memory |
| L3 | 2026-09-18 | Same | The idea hid about twenty products, because every sport has its own rules | Gate G5 and dimension D6 |
| L4 | 2026-09-18 | Same | The athletic director signs, but the broadcast crew feels the pain | D1 carries the largest business weight |
| L5 | 2026-09-18 | Same | Live high school events need support on Friday nights and Saturdays, which is BAM's crew-work window | Gate G3 and dimension D8 |
| L6 | 2026-09-18 | Same | The cheapest competitor was a spreadsheet feeding free graphics software | Checklist: always price the do-it-yourself substitute |
| L7 | 2026-09-18 | Same | Research agents stopped mid-run lost their synthesis, and the 200-search session cap ran out | Checklist: agents write incrementally and get search budgets |
| L8 | 2026-09-18 | Same | The first customer's website exposed its whole vendor stack in minutes | Checklist: map the stack from the customer's own site |
| L9 | 2026-09-18 | Same | The verdict depends on the goal. The same slice is a Park as a business and a Test cheaply as a portfolio demo | Weight profiles by goal (§5) |
| L10 | 2026-09-18 | Same | A dead competitor (DigitalScout, discontinued) says something about the market | Checklist: include dead competitors |

## 9. Outcome log (calibration)

Record every scored idea. At the 3-month and 12-month checks, compare what happened with the verdict. If they diverge, propose a weight or threshold change.

| Idea | Analysis | Vetted | Rubric | Goal | Score | Verdict | 3-month check | 12-month check |
|---|---|---|---|---|---|---|---|---|
| School sports platform, all sports (as first described) | `plans/32` | 2026-09-18 | v1.0 | Business | 1.50 | Kill | Due 2026-12-18 | Due 2027-09-18 |
| Broadcast stats desk, one sport, for student crews | `plans/32` | 2026-09-18 | v1.0 | Business / portfolio | 2.70 / 3.30 | Park / Test cheaply | Due 2026-12-18 | Due 2027-09-18 |
| Lacrosse-first stats for a coach | `plans/32` | 2026-09-18 | v1.0 | Business / portfolio | 2.65 / 3.15 | Park / Test cheaply | Due 2026-12-18 | Due 2027-09-18 |

**Decisions made before the rubric existed** (unscored; score them later if they help calibration):

| Idea | Where | Decision |
|---|---|---|
| E-signature, build in-house | `plans/29` | Don't build; buy (2026-08-14) |
| VoGoat | `plans/ecosystem/new-app-ideas/vo-goat.md`, `vogoat/docs/01-prd.md` | Greenlit 2026-08-30 |
| Create.WitUS | `create-witus/docs/01-prd.md` | Build brief, no app code |

## 10. Changing this rubric

- Any session may append to the lessons log and the outcome log.
- Changes to gates, dimensions, weights, or thresholds need BAM's approval. Propose them in the analysis's rubric-retro section.
- On each approved change:
  - bump the version;
  - add a changelog row;
  - refresh the library ebook so its snapshot matches.
- Record the rubric version beside every score so that scores made under different versions are never compared as equals.
- Review the weights after every three scored ideas, or after any outcome that contradicts its verdict.

## Changelog

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-09-18 | Created at BAM's request from the school sports stats app analysis (`plans/32`): six gates, eleven dimensions, three weight profiles, four verdicts, and the lessons and outcome logs seeded with that analysis |
