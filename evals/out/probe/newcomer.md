# Probe: newcomer

## User
I just joined the project and I am not a safety engineer. What is this booklet about, in plain words?

<details><summary>6 tool calls · 24s</summary>

- read_file {"file_path":"/skills/explain-concepts/SKILL.md","limit":1000}
- explore {"id":"c0","limit":16}
- search_graph {"query":"virtual validation","types":["term"],"limit":4}
- explore {"id":"t127","limit":6}
- read_facts {"ids":["f1","f2","f3","f4","f6","f7","f58","f59","f186","f11322"]}
- evidence_brief {"question":"Explain the booklet's purpose, project challenge and main takeaway in plain words for a newcomer who is not a safety engineer."
</details>

## Agent
The booklet is about **how to show that an automatic braking system for heavy off-road machines is safe enough to use—and how much of that testing can be done with computers rather than real machines.** The system is intended to brake when the operator has not reacted to a warning that something is too close. [f1, f6]

### Why the project is difficult
The prototype hardware and software are expected in **mid-2027**, with **less than four months** afterward to finish validation. The last comparable function took **three to four years** to validate. That is why the project wants to move much of the testing into simulation. [f2, f3, f4, f6]

### What “virtual validation” means
It means collecting evidence through computer simulations and laboratory tests before, or instead of, some tests on the complete real machine. Think of it as testing the system in a simulated job site—but still needing to show that the simulation represents reality well enough. [t127, f186]

For example, once automatic braking starts, the machine’s movement changes. The simulation must follow that changed movement, not simply play back what happened in an old recording. [f11322]

### The main message
**Simulation is useful, but it is not a shortcut around proving safety.** Its results need to be checked against real measurements, its uncertainties understood, and its limits clearly stated. [f186]

The booklet found **no documented case** of a new automatic braking function going from first representative hardware to accepted validation in about four months. Successful reductions in physical testing depended on years of earlier preparation, tightly restricted operating conditions, or both. [f58, f59]

So read it as an evidence-based guide to **what could make this ambitious project credible—not a promise that the deadline is achievable**. It also has an important limitation: the research used no internal machine recordings, sensor specifications or project documents, so it cannot establish whether this particular system is ready. [f6, f7, f58]

## User
What is SOTIF and why should I care?

<details><summary>3 tool calls · 15s</summary>

- search_graph {"query":"SOTIF","types":["term"],"limit":5}
- explore {"id":"t50","limit":8}
- read_facts {"ids":["f12007","f12013","f12008","f12015","f12018","f12019","f12020","f12021","f2355"]}
</details>

## Agent
**SOTIF means “Safety of the Intended Functionality.”** In plain words: **nothing is broken, but the system still gets the situation wrong and behaves unsafely.** Its sensors or decision-making may simply not be good enough for the conditions it encounters. [f12007]

### What that means on this project
For the automatic braking system, SOTIF covers both:
- **Missing a real person** and therefore not responding to a hazard.
- **Reacting to something harmless** and braking unnecessarily. [f12013]

Dust, fog, snow, glare and darkness are especially important: the question is not just “Is the sensor working?” but **“Can it actually see what matters in these conditions?”** [f12019]

### Why you should care
Showing that the electronics handle failures safely does **not** show that the system can reliably detect people. Those are different safety questions, and the project needs evidence for both. [f12021]

The booklet identifies sensing in difficult conditions as one of the hardest uncertainties—and one of the least suitable for relying on simulation alone. It concludes that confidence here must rest on **physical tests and recorded sensor data**, not just convincing-looking virtual scenes. [f12019, f12020]

One important distinction: **ISO 21448:2022**, the standard associated with SOTIF, is for road vehicles; it does **not directly apply by scope** to this heavy off-road function. The booklet borrows its way of identifying conditions that expose sensing limitations, rather than treating it as an off-road approval standard. [f12008, f2355, f12015]

## User
And what is the difference between Level 8 and Level 9?

<details><summary>3 tool calls · 13s</summary>

- search_graph {"query":"Level 8 Level 9","limit":6}
- explore {"id":"t30","limit":6}
- read_facts {"ids":["f5924","f11749","f11750","f11986","f2141"]}
</details>

## Agent
**Level 8 advises the operator; Level 9 intervenes in the machine’s movement.** These are layers in EMESRT’s mining vehicle-interaction control model. [f5924]

- **Level 8 — advisory controls:** the system advises the operator, who must take action.
- **Level 9 — intervention controls:** the system can automatically slow or stop the vehicle. The project’s Collision Mitigation System is a Level 9 control. [f5924, f11749]

### Why the difference matters
Moving to Level 9 is not just adding a stronger warning. **The system can now command the brakes**, affecting machine motion and bringing the function within ISO 19014-2’s functional-safety requirements. [f11986]

The booklet therefore recommends proving both sides of the safety question:
- Does it intervene **when needed**?
- Does it avoid intervening **when braking would be unsafe or unnecessary**? [f2141]

And “Level 9” does not mean the other protections become unnecessary: ICMM and EMESRT stress that higher-level controls do **not replace** the lower-level defenses. [f11750]

## User
Debrief, honestly and briefly: in this conversation, what confused you or slowed you down? Which tool results were unclear, missing, too long or misleading, and what tool or information would have let you answer better? Do not use tools for this.

<details><summary>0 tool calls · 8s</summary>


</details>

## Agent
The questions were clear; the main friction was in the retrieval tools.

- **The evidence brief was poorly matched.** For your introductory question, it returned planning methods, automotive case studies and readiness challenges instead of the purpose and main takeaway I had retrieved. I relied on the directly read facts instead.
- **Concept results were too broad.** SOTIF and Level 8/9 searches brought back long cross-chapter summaries, regulations and vendor examples. Useful for research, but more than needed for a newcomer’s explanation.
- **Some evidence labels needed care.** Results mixed definitions, recommendations, road-vehicle evidence and off-road requirements. The SOTIF results particularly required separating “useful ideas borrowed from a road standard” from “a standard that applies to this machine.”
- **The underlying project information was missing.** The booklet has no internal sensor specifications or machine data. That did not prevent these definitions, but it limits project-specific examples.

A **short, audience-aware retrieval mode**—definition, one documented example, project relevance and applicability caveat—plus a more relevant evidence brief would have helped most.
