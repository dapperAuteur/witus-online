# Product Hunt launch - FlashLearnAI

**Launch date:** 2026-05-05 (Track E launch #1, "bar-setter")
**Switchy slug:** `e-flash-ph`
**Hunter:** TBD by BAM (T-14 task per `claude/flashlearn-ai/plans/2026-04-27-track-e-launch-prep.md`)
**Status:** Draft (refined from BAM's first pass typed directly into PH)

## Tagline (60-char max)

**Primary:** Smart flashcards from any PDF, video, or audio (47)

**Alternatives:**
- AI flashcards from any source, scheduled to stick (49)
- Spaced-repetition flashcards from any document (46)
- Turn anything into AI flashcards you'll remember (48)

**Why the change from BAM's first pass ("Learn Faster with Smart Flashcards"):** that line is generic and doesn't say what makes FlashLearnAI different from any other flashcard app. The from-anything angle is the differentiator the description has to lean on anyway, so it belongs in the tagline.

## Launch description (260-char limit)

FlashLearnAI turns any source (PDF, image, YouTube, audio) into AI-generated flashcards and schedules reviews with spaced repetition. Free to start. Public REST API. Multiplayer Versus Mode for study groups. (210)

**Why the change from BAM's first pass:** the original was 290 chars (over PH's 260 cap), and "ensures you remember what you learn" oversells. Replaced with three concrete capability lines that each give a separate audience a reason to click (free for students, API for devs, Versus Mode for study groups).

## First comment (BAM's voice)

I'm training to be the world's fastest centenarian, so I needed a memory tool that works for me at 50, 70, and 90. FlashLearnAI is what I use to keep learning new things and remembering them.

The feature I lean on most is the spaced recall scheduler. Cards I get wrong show up again sooner. Cards I crush get pushed out. Reviews fit between the rest of life instead of competing with it.

If you build other learning products, the public REST API is open. 27 documented endpoints. Send a topic, get a deck back, log results, watch mastery improve. Versus Mode lets a study group race the same deck and surface each player's confidence-versus-accuracy gap, which has been the single most useful thing for fixing the way I study.

Free to start at flashlearnai.witus.online. Ask me anything below.

**Why the change from BAM's first pass:** original led with "My favorite feature is the spaced recall scheduler" and buried the centenarian story at the end. PH first comments are about warmth, not features, so the personal hook goes first. Also fixed the typo "I'm built this" -> "I built this" (rephrased the line entirely). Added the API + Versus Mode mentions, both of which are in the launch-prep doc as the strongest dev hooks but were absent from BAM's first pass.

## Gallery captions (4-6 images, 60 chars each)

1. Drop a PDF. Get a 20-card deck back in seconds. (49)
2. Spaced repetition scheduler surfaces what you forget. (54)
3. Versus Mode: race a deck, see confidence vs accuracy. (54)
4. 27 documented REST endpoints. Build on the platform. (53)
5. Free to start. Pay only for the AI generations you need. (57)
6. Built by a solo dev training to live to 100+. (45)

## Topics / categories

- Education (primary)
- Productivity (secondary)
- Artificial Intelligence
- Developer Tools (for the API surface)

## Maker comment thread starters

**"How does this compare to Anki?"**
> Anki is the bar for spaced repetition and the algorithm under FlashLearnAI is in the same family (SM-2). The difference is the input side. Anki expects you to author cards. FlashLearnAI takes a PDF, a YouTube link, an image, or an audio file, and generates the deck for you. If you already have a hand-tuned Anki deck, keep it. If you have a 200-page textbook and a deadline, this is the faster path.

**"What's the AI grading model?"**
> Gemini for generation; a separate similarity-aware grader for free-text answers (handles "9.81 m/s²" vs "9.81 m s⁻²", "Tylenol" vs "Acetaminophen", and typos with similarity scores instead of binary pass/fail). Confidence-calibration weight in Versus Mode penalizes confidently wrong answers.

**"Where are the API docs?"**
> /docs/api on the live site. OpenAPI spec at /api/v1/openapi. 27 endpoints across auth, generations, sets, sessions, results, mastery, webhooks, and the ecosystem partner surface. Free tier is 100 generations + 1k API calls per month.

## Cross-links (substituted at send time)

- App: https://flashlearnai.witus.online
- Pricing: https://flashlearnai.witus.online/pricing
- Docs: https://flashlearnai.witus.online/docs/api
- GitHub: https://github.com/dapperAuteur/flashlearn-ai
- Switchy short URL: filled in from `e-flash-ph` slug at T-7

## References

- Per-product launch-prep doc: `claude/flashlearn-ai/plans/2026-04-27-track-e-launch-prep.md`
- Locked launch-day timeline: PH 03:01 PT -> Peerlist 06:00 ET -> Show HN 09:00 ET -> IH/Uneed/microlaunch/devhunt 10:00 ET -> Reddit 11:00 ET -> dev.to/Hashnode 12:00 ET -> vendor pitches 13:00 ET -> newsletter 17:00 ET
