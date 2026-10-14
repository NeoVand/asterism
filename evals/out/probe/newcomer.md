# Probe: newcomer

## User
I just joined the project and I am not a safety engineer. What is this booklet about, in plain words?

<details><summary>4 tool calls · 17s</summary>

- read_file {"file_path":"/skills/explain-concepts/SKILL.md","limit":1000,"offset":0}
- explore {"id":"c0","limit":24}
- read_facts {"ids":["f1","f2","f3","f4","f6","f7","f58","f59","f76","f186","f194","f211"]}
- evidence_brief {"question":"Explain the booklet purpose and central takeaway in plain words for a new project member who is not a safety engineer.","max":1
</details>

## Agent
The booklet is about **how to build convincing evidence that automatic braking on heavy off-road machines works safely—and how much of that testing can be done in a computer instead of on real machines.** The system being developed brakes automatically if the operator does not respond to a warning that something is too close. [f1, f6]

### Why this project is difficult
Prototype hardware and software are expected in **mid-2027**, with less than **four months** afterward to finish validation—the work of showing the system meets its requirements. The last comparable function took **three to four years** to validate. [f2, f3, f4]

### What the booklet investigates
In plain words, it asks:
- **Can we build useful virtual job sites?** Its recommended approach combines reusable computer-built sites with measurements from real sites, so the differences between simulation and reality can be checked. [f76]
- **When should we trust the computer tests?** Simulations need checking against physical measurements, their uncertainties must be understood, and their limits must be documented. [f186]
- **Can software tools make this fast enough?** The research found no single tool with public evidence of doing the whole job across many earth-moving sites and all-weather sensing. [f194]

### The main takeaway
**Simulation can help, but it is not a shortcut around proving safety.** Every documented reduction in physical testing relied on years of earlier preparation, tightly limited operating conditions, or both. The booklet found no precedent for taking a new automatic-braking function from its first representative hardware to accepted validation in about four months. [f59, f58]

Also, this is a **research-based guide, not proof that our particular system is safe**: the authors had no internal machine recordings, sensor specifications or project documents to assess. [f7]

## User
What is SOTIF and why should I care?

<details><summary>3 tool calls · 14s</summary>

- search_graph {"query":"SOTIF","types":["term"],"limit":5}
- explore {"id":"t50","limit":12}
- read_facts {"ids":["f12007","f12013","f12019","f12020","f12015","f12018","f2355","f1009"]}
</details>

## Agent
**SOTIF** means **Safety of the Intended Functionality**. In plain words: *nothing is broken, but the system still makes an unsafe decision because it cannot sense or understand the situation well enough.* [f12007]

### What that means on our machines
The system might **miss a real person**, or mistake something harmless for a threat and brake unnecessarily. Both are SOTIF concerns—even if every sensor and computer is working as designed. [f12013]

### Why you should care
- **“It didn’t break” is not enough.** Testing broken sensors and other faults does not, by itself, show that a healthy system can reliably recognise hazards. [f1009]
- **Difficult visibility is central to this project.** The booklet identifies sensing in dust, snow, fog, glare and darkness as the hardest uncertainty—and the one least suited to simulation. It says evidence must include physical tests and recorded sensor data. [f12019, f12020]
- **It changes which tests we need.** We must look for conditions that trigger bad sensing or decisions, not just check whether components work. The booklet borrows that approach from SOTIF for designing scenarios and requirements. [f12015]

One important distinction: **ISO 21448, the SOTIF standard, is for road vehicles**, not directly applicable by scope to our heavy off-road system. The booklet uses its ideas, rather than treating it as the governing off-road standard. [f2355, f12015]

The useful question to remember is: **“Even when everything works as designed, when could this system still get the situation wrong?”** [f12007]

## User
And what is the difference between Level 8 and Level 9?

<details><summary>3 tool calls · 18s</summary>

- search_graph {"query":"Level 8 Level 9","limit":8}
- explore {"id":"t30","limit":8}
- read_facts {"ids":["f5924","f11748","f11749","f11986","f11987","f11750"]}
</details>

## Agent
**Level 8 advises the operator; Level 9 acts on the machine.** These are layers in EMESRT’s mining vehicle-interaction control model. [f5924]

- **Level 8 — advisory controls:** the system warns or advises, leaving the operator to take action. [f5924]
- **Level 9 — intervention controls:** the system can automatically slow or stop the machine. Our Collision Mitigation System is a Level 9 control; the existing proximity-warning system sits at Levels 7 and 8. [f5924, f11748, f11749]

### Why the difference matters
Adding automatic braking is **not just adding a stronger warning**. Once the system can command the brakes, it controls machine motion and falls within the functional-safety requirements of ISO 19014-2. [f11986]

We therefore need to show both that it:
- **Intervenes when needed**, rather than missing a dangerous situation.
- **Does not intervene when doing so is unsafe or unnecessary.**

The booklet says these need separate analyses and acceptance thresholds. That connects directly to your SOTIF question: recognising a hazard correctly matters, but so does choosing whether to brake. [f11987]

And **Level 9 does not replace the other safety layers**: site controls and the existing lower-level protections still matter. [f11750]

## User
Debrief, honestly and briefly: in this conversation, what confused you or slowed you down? Which tool results were unclear, missing, too long or misleading, and what tool or information would have let you answer better? Do not use tools for this.

<details><summary>0 tool calls · 8s</summary>


</details>

## Agent
- **Nothing in your questions was confusing.** The main challenge was choosing how much detail a newcomer needed without turning a simple explanation into a standards lecture.
- **The graph results were often too long.** Concept explorations returned cross-chapter material, regulatory differences and vendor examples that weren’t needed for your questions. A “plain-language definition + project relevance + key caveat” retrieval mode would have been faster.
- **Some evidence labels were ambiguous.** A fact labelled “Independent” could list an expert-opinion source; another combined expert, vendor and on-road references. That made the strength of support harder to judge.
- **The evidence brief was overinclusive.** For the opening overview, it promoted planning details and statistics that weren’t necessary for your question.
- **One explanation needed tighter support:** I described Level 8 as leaving action to the operator, while the retrieved definition said only “advisory controls.” The interpretation was reasonable, but an explicit definition of who acts would have supported it better.

Most useful improvement: **short, audience-aware results with a direct quotation and an unambiguous evidence label for each claim.**
