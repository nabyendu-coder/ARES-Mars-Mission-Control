# ARES: Mars Mission Control

> Paste only this file into AI chats. Details are in `docs/`.
> Last updated: 7 Nov 2026

## Challenge
**Interplanetary Survival Guide: Martian Map** (2026 NASA Space Apps Challenge, Intermediate)

## Mission
A 3D, interactive map for one astronaut walk on Mars: real NASA elevation, slope, hazards, a safe route, scientific stops, and 3 or more labelled data layers.

## Key dates
- Hackathon: 14 to 15 Nov 2026.
- Submission opens 14 Nov 9:00 AM and closes 15 Nov 11:59 PM, local time. Confirm my local host's exact time.
- Submission and Judging guides are released 13 Nov. Read them, then update this file.
- 2025 judging criteria (check the 2026 version): Impact, Creativity, Validity, Relevance, Presentation.

## Site
**Undecided.** Candidates: Gale Crater (Mount Sharp), Jezero Crater.
Decide by data: I need a high-resolution elevation file covering a 2 to 5 km area plus at least 3 data types.
- Gale: Curiosity has surface radiation (RAD) and weather (REMS) data (verify); fits the challenge's boxwork example.
- Jezero: Perseverance events 2020 to 2024 are verified (see `docs/data-sources.md`); the rover has no radiation detector (verify).

## Challenge checklist (from the official statement)
- [ ] A map, tool or interface a Mars astronaut could use on a surface excursion
- [ ] A layered view of one location or route, using NASA data
- [ ] At least 3 kinds of data (e.g. optical, thermal, topographic, radiation)
- [ ] Safety information (radiation, terrain)
- [ ] A route that avoids obstacles such as large rocks and steep ground
- [ ] A clear scientific goal for the walk

## Scope
**In:** real elevation, slope map, hand-traced route, 3 labelled layers, 3 to 5 science stops, safety panel, honesty table, demo video.
**Cut first if short on time:** radiation detail, spectral layer, rover photos, automatic pathfinding, extra polish.

## Done means
Real elevation + slope map + route + 3 labelled layers + demo video + submitted before the deadline.

## Current task
(write one line here)

## Rules for AI
1. Change only what I ask. 2. Explain each part simply. 3. No new libraries without asking. 4. Never present an assumption as NASA data. 5. Give a source for every scientific value, or say "assumption".

## Authenticity before appearance
Always label each value as one of: **Measured** (NASA observation), **Derived** (calculated from NASA data), **Modelled** (estimate), or **Assumption** (my own choice). Never show simulated data as a real mission measurement.

## Starting point and AI disclosure
The starting code is an AI-made prototype (3D page with *generated* terrain). It must be replaced with real data. AI tools used: Claude (engineering), ChatGPT (data scripts, writing), Gemini (research). I will disclose AI use if the rules ask, and check the 13 Nov guide on pre-existing work.

## Open questions
- Which site?
- Which elevation file, and what is its resolution?
- Which slope limit for suited walking, and what is the source?
- Which radiation value, and what is the source?

## More detail
`docs/data-sources.md`, `docs/values.md`, `docs/architecture.md`, `docs/dev-log.md`
