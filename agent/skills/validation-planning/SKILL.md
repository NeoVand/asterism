---
name: validation-planning
description: How to build a credible, evidence-grounded plan (validation roadmap, test campaign, 90-day plan, work packages, staffing, go/no-go gates) for the collision mitigation system — gathering the user's constraints with ask_user, structuring phases the way the booklet recommends, and rendering it with show_ui. Read before any planning request.
---

# Planning playbook

Plans must be grounded in the booklet's evidence and honest about what it could not find.

## 1. Know the situation (ask once)

If the user has not told you, call `ask_user` with 2–5 questions that change the plan. Good ones:
- Which machines/platforms are in scope first? (wheel loaders, articulated haulers, haul trucks, excavators…)
- Sensor set of the new system? (radar, camera, lidar, ultrasonic, fusion; same as the warning system?)
- Is the detection software new, modified or reused? Does it use machine learning?
- Which recordings already exist (machines, sites, seasons)?
- Target markets (EU, US, Australia, South Africa…) — drives the regulatory route.
- Planning horizon / deadline, team size, budget appetite (scale question).
Offer concrete options; include "Not sure". Skip questions the conversation already answered.
After answers arrive, restate the 2–3 assumptions that matter most.

## 2. Gather the evidence (before drafting)

Research with graph tools (see graph-research). For a validation roadmap, cover at least:
- Chapter 12 (planning methods, P50/P80 dates, stop and descope criteria, thin-slice pilot),
- Chapter 1 (which approaches can and cannot compress validation; the phase structure),
- Chapter 3 (standards, EU Machinery Regulation 20 Jan 2027, notified bodies, ML rules),
- Chapter 10 (when simulation can be trusted; how much physical testing must remain),
- Chapter 9 (coverage, statistics like zero-miss trial counts, tuning without over-fitting),
- Chapter 13 (the strongest objections — the plan must answer them),
- "What the research could not find" (gaps → early experiments or supplier questions).
Use researcher subagents in parallel for these when the request is broad.

## 3. Structure

The booklet's credible order (an assessment, not a documented off-road case):
- **Phase 0 (from Oct 2026, before sensor/prototype freeze):** define ODD, hazard analysis,
  scenario catalogue, acceptance metrics, safety-case structure; record fleet data through winter.
- **Phase 1 (before mid-2027):** build and correlate the virtual pipeline: replay, SIL/HIL,
  sensor-model correlation, operator studies, independent review of the test plan.
- **Phase 2 (prototype mid-2027, < 4 months):** correlate on the prototype, multiply virtually,
  confirm worst cases on the track, shadow mode with braking disabled.
- **Phase 3:** staged, limited-domain release (e.g. reverse only, low speed), widened only by evidence gates.
Adapt to the user's answers; give every phase a goal, 2–6 work items and a gate with criteria.

## 4. Render

- `show_ui` plan block (phases with start/end months, items and gates, all cited).
- Optionally a risks block (top 4–6 risks with mitigations) or a timeline of hard dates.
- Then 3–6 sentences of prose: the critical path, the biggest assumption, what to ask the
  manufacturer, and P50/P80 framing if dates are involved. Cite inline.

## 5. Honesty rules

- Never present an assessment as a documented precedent; say "the booklet assesses…".
- Mark vendor-only and on-road-only evidence.
- Name the gaps that could break the plan (e.g. notified-body lead time not found).
