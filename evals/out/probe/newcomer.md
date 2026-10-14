# Probe: newcomer

## User
I just joined the project and I am not a safety engineer. What is this booklet about, in plain words?

<details><summary>5 tool calls · 29s</summary>

- read_file {"file_path":"/skills/explain-concepts/SKILL.md","limit":1000,"offset":0}
- explore {"id":"c0","limit":24}
- search_graph {"query":"virtual validation","types":["term"],"limit":5}
- explore {"id":"t127","limit":8}
- read_facts {"ids":["f1","f2","f3","f4","f6","f7","f58","f59","f186","f124","f2137","f11322"]}
</details>

## Agent
This booklet is about **how to show that automatic braking on heavy off-road machines is safe—and how much of that testing can be done virtually instead of on real machines**. The system being developed warns the operator about something nearby, then brakes automatically if the operator does not react. [f1, f6]

### Why the project needs it
The prototype hardware and software are expected in **mid-2027**, with less than **four months** afterward to finish validation. The last comparable function took **three to four years**. The booklet investigates whether virtual testing can help close that gap. [f2, f3, f4, f6]

### What “virtual testing” means
It means gathering safety evidence using computer simulations and laboratory test equipment, instead of—or before—testing the complete real machine. [t127]

The booklet follows the questions that make those tests useful: how to represent job sites, sensors, weather, machine movement and braking; how to compare the existing warning system with the new braking system; and how to decide whether the simulated results deserve trust. [t127]

One practical difficulty is that **ordinary work can look like danger**: backing toward a rock pile or a ground worker approaching under an agreed procedure can look threatening to a simple sensor. Testing must account for that, not just obvious collision situations. [f124]

### Its main message
**Simulation is useful, but it is not a shortcut to proof.** The simulated results must be checked against physical measurements, their uncertainty understood, and the limits of where they can be trusted documented. [f186]

The research found **no documented example** of a new automatic-braking function going from its first representative hardware to accepted validation in about four months. Successful reductions in physical testing relied on years of preparation, tightly limited operating conditions, or both. [f58, f59]

The booklet’s recommended route—an expert recommendation, not a proven four-month recipe—is to combine simulation, targeted real-world tests and a documented argument explaining why the system is safe. [f2137]

### How to read it as a newcomer
Think of it as **an evidence-based decision guide, not a certificate that the system is safe**. It helps the project decide what to test and what evidence to assemble; it was written without the manufacturer’s internal recordings, sensor specifications or documents, so those project-specific facts still need to shape the approach. [f6, f7]

## User
What is SOTIF and why should I care?

<details><summary>3 tool calls · 20s</summary>

- search_graph {"query":"SOTIF","types":["term"],"limit":5}
- explore {"id":"t50","limit":12}
- read_facts {"ids":["f12007","f12013","f12015","f12018","f12019","f12020","f2355","f659"]}
</details>

## Agent
**SOTIF** stands for **Safety of the Intended Functionality**. In plain words, it asks: **“Could the system behave unsafely even when nothing is broken?”** A sensor or its decision-making software can work as designed yet still be inadequate for the situation it encounters. [f12007]

### What that means on this project
SOTIF covers both:
- **Missing a real person**, so the system fails to respond to a hazard.
- **Reacting to something harmless**, causing unnecessary braking. [f12013]

For our automatic-braking system, a central question is whether the sensors can see reliably in **dust, snow, fog, glare and darkness**. The booklet identifies this as the hardest uncertainty—and the one least suited to proving through simulation alone. [f12019]

### Why you should care
Testing that components survive faults is not enough: it does not establish how well the system perceives its surroundings when all the hardware is healthy. [f659]

SOTIF therefore changes what evidence the project needs. We must investigate the conditions that make sensing or decisions inadequate, turn those conditions into test scenarios and requirements, and support claims about difficult visibility with **physical tests and recorded sensor data**. [f12015, f12020]

### One important caveat
**ISO 21448**, the SOTIF standard, is a **road-vehicle standard**, not one that applies by scope to this heavy off-road function. The booklet borrows its useful way of thinking about perception limits; it does not treat it as the project’s off-road compliance standard. [f2355, f12015]

The distinction to remember is: **“Nothing failed” does not mean “the system is safe.”** [f12007]

## User
And what is the difference between Level 8 and Level 9?

<details><summary>3 tool calls · 18s</summary>

- search_graph {"query":"Level 8 Level 9","limit":6}
- explore {"id":"t30","limit":8}
- read_facts {"ids":["f5924","f11749","f11750","f2075","f2141"]}
</details>

## Agent
**Level 8 advises the operator; Level 9 intervenes in the machine’s movement.** These are layers in EMESRT’s mining vehicle-interaction control model: Level 8 means advisory controls, while Level 9 means controls that automatically slow or stop the vehicle. [f5924]

- **Level 8:** the system gives advice or warnings; the operator must take the action.
- **Level 9:** the system can take action itself by slowing or stopping the machine. Our Collision Mitigation System belongs here. [f5924, f11749]

### Why the difference matters
Moving to Level 9 is **not just adding a stronger warning**. Adding a brake command brings the system into the scope of ISO 19014-2’s functional-safety requirements, whereas awareness-only systems that do not affect machine motion are excluded. [f2075]

The booklet therefore recommends checking two sides of safety separately:
1. **Does it intervene when needed?**
2. **Could it intervene when braking is unsafe or unnecessary?** [f2141]

That second question connects directly to SOTIF: detecting something harmless is more consequential when the system can command the brakes.

Also, **Level 9 does not replace the earlier layers of protection**. ICMM and EMESRT say effective Level 8 and 9 deployment requires understanding the existing Level 1–7 controls during normal operations. [f11750]

## User
Debrief, honestly and briefly: in this conversation, what confused you or slowed you down? Which tool results were unclear, missing, too long or misleading, and what tool or information would have let you answer better? Do not use tools for this.

<details><summary>0 tool calls · 10s</summary>


</details>

## Agent
The questions themselves were clear. The main friction was in retrieving the right amount of evidence:

- **Overlong results:** Exploring “virtual validation” and the nine-level model returned many cross-chapter facts and tangential details. Useful for completeness, but excessive for a newcomer’s short question.
- **A potentially confusing search:** “Level 8 Level 9” also surfaced technology-readiness levels and Machine Performance Levels—different numbering systems. The conversation context helped distinguish them.
- **Uneven evidence labels:** Some results mixed independent, vendor and expert evidence, or flagged draft/on-road material. That required care not to present borrowed SOTIF concepts as an applicable off-road standard.
- **One weakness in my answer:** I described Level 8 as advice/warnings, but the retrieved model distinguishes Level 7 *operator awareness* from Level 8 *advisory controls*. I should have kept that distinction clearer. I also left the final SOTIF connection uncited.

A **compact beginner-oriented result** containing the definition, one verified example, the key caveat and a precise Level 7/8/9 comparison would have let me answer more efficiently and accurately. No additional information from you was needed.
