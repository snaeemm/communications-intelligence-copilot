# Communications Intelligence Copilot — *From Coverage to Client Counsel*

A **candidate-built, rules-based workflow demonstration** using **synthetic data**. It is a proof of concept built for Ruder Finn Atteline, supporting a proposed 2027 AI & Analytics Strategy. It is **not an Atteline product** and **not production software**.

It shows how a communications team could move from approved key messages and published coverage to a **reviewed, evidence-backed briefing**, with every decision attributable to a person.

## Run it

```bash
npm install
npm run dev        # opens http://localhost:5180 — no env vars, keys, backend or login
```

`npm run build` (type-check + build) · `npm run check:qa` (96 deterministic engine checks) · `npm run check:engine` (prints the engine's output for every article).

## What it is — and is not

- **Rules-based, not an LLM.** Tone uses a small sentiment lexicon; key messages use keyword, phrase and same-sentence synonym matching. No language model, no API, no network use for app data (the only external request is the Google Fonts stylesheet, with a system-font fallback).
- **Why:** it must behave identically on every run, and be honest about what it is. The rules produce a *score*, not a model probability.
- **Nothing here establishes AI accuracy, time savings, ROI or production readiness.** Figures come from a small synthetic sample and are labelled illustrative. The "minutes per article" slider is a user assumption, not a measurement.
- A future pilot could *test* whether an approved enterprise LLM handles paraphrase and contradiction better than these rules. That is **not implemented or validated** here.
- **Ask the Campaign is a guided demo, not a chatbot.** Suggested-question buttons, plus a chat input you can type into. Typed text is matched to supported topics by **deterministic keyword rules** (`interpretQuestion`), the answer is a pure function of the reviewed data (`src/engine/ask.ts`), and the card says how the question was understood ("Understood as: …"). Two-part questions such as *"Which message is underperforming, and what should we recommend to the client?"* get one combined answer. Anything it cannot match (forecasts, competitors, ROI, model accuracy, small talk) gets an explicit limitation, with no figures invented. No language model.
- **The advisory panel is simulated, not four LLM agents.** Four rule-based perspectives read the same reviewed state and apply different fixed rules, so they can disagree (`src/engine/advisory.ts`). Every figure is computed from the current data, each point is marked *Supported*, *Assumption* or *Not established*, and where evidence is thin they say so. It is labelled *Simulated advisory panel · No live LLM*, and nothing becomes a recommendation until a person accepts or edits it in step 11.

## The twelve steps (one page, driven by app state — there are no routes)

| # | Step | What it does | Reads |
| --- | --- | --- | --- |
| 1 | Client brief | Objective, audiences, three approved key messages | Brief |
| 2 | Coverage | 16 articles, data-preparation strip (duplicates / incomplete excluded) | Coverage |
| 3 | Analysis | Rules-based labels with quoted matches; two deliberately difficult articles | Messages + articles |
| 4 | Penetration | Share of eligible articles carrying each message (**provisional**) | Unreviewed findings |
| 5 | Gaps | Weakest message and where it is missing (provisional) | Unreviewed findings |
| 6 | Evidence | Exact quote highlighted in the article, with a verification check | Findings + articles |
| 7 | Human review | Accept / correct / reject every finding; unlocks 8–12 when all 64 are reviewed | Findings |
| 8 | Briefing | Reviewed metrics, notable findings, limitations, review log, sign-off | **Reviewed set only** |
| 9 | Client analytics | Message performance and tone for the client | Reviewed set only |
| 10 | Advisory panel | **Run Advisory Review**: four simulated perspectives challenge the reviewed results, then a synthesis | Reviewed set only |
| 11 | Recommendation | Proposed action for a person to edit and accept | Reviewed set only |
| 12 | Ask the Campaign | Suggested or typed questions answered from the reviewed set, with evidence links | Reviewed set + audit trail |

**Message penetration** = eligible analysed articles carrying the message ÷ total eligible analysed articles × 100 (duplicates and incomplete records excluded; zero eligible gives 0%). Figures are *provisional* until every finding is reviewed.

## Evidence rules

- Every displayed quote must be an **exact substring** of its article (`validateEvidence` checks text *and* offsets). A quote that fails is flagged, the finding is never counted as verified pickup, and **Accept is disabled** for it.
- A reviewer's decision always overrides the rules. **Accept** keeps the value, **Correct** changes it, **Reject** removes unsupported pickup (a rejected message finding never counts as present).
- Two rules lower a finding's score and flag it for attention: contrast wording near a match (*contrast-cue*) and loose topic hints with no match (*weak-signal*). "Accept all high-score" skips flagged findings.

## Audit trail — who changed what, and when

Every action is stamped with the **reviewer**, a **timestamp** and the **before → after** value, in an append-only log.

- **Reviewing as** (header): a picker of three *fictional* staff. It attributes actions; it is **not authentication**.
- **Audit trail** (header): the full log, filterable by reviewer, with **Export CSV**. Each row links to its evidence.
- **Evidence inspector**: a *Decision history* for the finding being viewed.
- **Human review**: each reviewed row shows who decided and when.
- **Briefing**: sign-off ("Approved by …, role · time") and a review log of corrections and rejections.
- **Ask the Campaign**: "Who made the review decisions, and when?" answers from the log.
- Approvals are withdrawn automatically if a review changes afterwards, and that withdrawal is logged too. Reset clears the log.

## Advisory panel (Priority 2)

| Perspective | Rule it applies | Example from the current data |
| --- | --- | --- |
| PR Strategist | Compares the weakest message with the leader against the brief's objective | Revisit Message C (2 of 16 vs 11 of 16) |
| Data Analyst | Challenges baseline, target, denominator and ranking robustness | No prior-period baseline, so "lowest" is not "underperforming" |
| Audience Advocate | Maps outlet types to the brief's audiences (labelled an assumption) | Audience understanding cannot be established |
| Evidence Reviewer | Separates verified counts from unsupported causes and disputed claims | The claim behind Message C was rejected in review (C16) |

The synthesis shows agreement, disagreement, missing evidence, next steps and source links. It changes with the reviewed state: with nothing corrected, Message C is 19% and the disputed-claim material disappears; with review incomplete the perspectives say they cannot evaluate. Running it is logged in the audit trail.

## Two difficult articles (illustrative, not a benchmark)

- **C15 — paraphrase.** "Nod off faster… think clearly" restates Message A without its vocabulary. The rules miss it and flag a weak signal.
- **C16 — contradiction.** The article repeats "independently lab-tested" only to dispute it. The rules count it as Message C pickup and flag the contrast wording. Rejecting it moves Message C from 19% to 13%.

## Architecture

```
src/data/     synthetic client, key messages, coverage, fictional staff
src/engine/   pure functions: classifyTone, detectKeyMessage, computePenetration, findGapsAndPatterns,
              recommendAction, validateEvidence, eligibleItems, buildFindings, buildValidated,
              notableFindings, ASK_QUESTIONS, audit helpers   (+ qa.ts, sanity.ts)
src/state/    React Context + useReducer, persisted to localStorage; "Reset demo" restores the pristine state
src/screens/  the eleven steps
src/components/  step bar, evidence inspector, audit panel, shared UI
```

## Demo video

[`docs/demo/communications-intelligence-copilot-demo-narrated.mp4`](docs/demo/communications-intelligence-copilot-demo-narrated.mp4), 1920×1080, H.264, 137 s (2 min 17 s), with AI-generated narration (captions in the `.srt` file next to it). Full-screen title cards sit **between** clean recordings of the real app; nothing is overlaid on the app. The scene timings are in the video's timestamps file. It has the actual scene times, `demo-assets/title-cards/` the cards, and `demo-assets/screens/` key screenshots.

## Demo click path

1. **Analysis (3)** — scroll to *Two difficult articles*: the rules miss the paraphrase and count the contradiction.
2. **Open source article** on the contradiction — highlighted quote, ✓ exact-quote check, "check" flag. *Esc*.
3. **Human review (7)** — *Reviewing as* Jonas → **Accept all high-score**; Priya → **Correct → present** on the paraphrase; Amira → **Reject** on the contradiction. Point at the penetration panel (A 63→69%, C 19→13%). Accept the rest.
4. **Audit trail** (header) — tick *Changes only*: three people, three actions, timestamps, before → after.
5. **Briefing (8)** — approve the observation, then **Approve briefing**: the sign-off names who and when. Scroll to the *Review log*.
6. **Advisory panel (10)** → **Run Advisory Review**: Strategist vs Analyst on "underperforming", then the synthesis. **Recommendation (11)** → **Accept**.
7. **Ask the Campaign (12)** — click *Which key message had the lowest penetration?* → open **[C01]**; then type *Which message is underperforming, and what should we recommend to the client?*; then something unsupported such as *How much time did we save?*

## Limitations to disclose

- Synthetic, small sample (16 articles); percentages are illustrative.
- The rules can miss paraphrase and mis-read contradicted claims — the reason for mandatory human review, and the motivation for a separately evaluated pilot.
- Message pickup measures presence in coverage, not reach, depth of sentiment or business outcome.
- Reviewer identity is a demo picker, not authentication; timestamps come from the browser clock.
- A reviewer's "Correct → present" on something the engine missed has no engine quote; it is recorded as reviewer-asserted.
- Ask the Campaign understands a fixed set of topics through keyword rules. It will misread some phrasings and says so when it cannot match one; it is not a language model.
- The advisory perspectives are templates filled with the reviewed numbers. Their "disagreement" comes from different rules, not independent reasoning, and the outlet-to-audience mapping is an assumption.
- The logo file is used only inside this clearly labelled candidate demonstration.
