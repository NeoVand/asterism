# Probe: newcomer

## User
I just joined the project and I am not a safety engineer. What is this booklet about, in plain words?

<details><summary>6 tool calls · 23s</summary>

- read_file {"file_path":"/skills/explain-concepts/SKILL.md","limit":1000,"offset":0}
- explore {"id":"c0","limit":24}
- search_graph {"query":"virtual validation","types":["term"],"limit":5}
- explore {"id":"t127","limit":6}
- read_facts {"ids":["f1","f2","f3","f4","f6","f7","f58","f59","f186","f124","f11322"]}
- evidence_brief {"question":"Explain the booklet's purpose and central message in plain words to a new project member who is not a safety engineer.","max":8
</details>

## Agent
The booklet asks a practical question: **How can we show that automatic braking on a heavy off-road machine is safe, without spending years testing everything on real machines?** The system being developed warns the operator about a nearby hazard, then brakes automatically if the operator does not respond. [f1, f6]

### Why the project is difficult
The prototype hardware and software are expected in **mid-2027**, with **less than four months** afterward to complete validation. The manufacturer’s last comparable function took **three to four years** to validate. [f2, f3, f4]

The proposed shortcut is **virtual validation**: gathering safety evidence through computer simulations and laboratory tests, instead of—or before—testing the complete real machine. [t127]

### What the booklet investigates
In plain words, it asks:

- Can we build realistic virtual work sites and test how the machine responds?
- How do we know the simulator matches reality closely enough to trust its results?
- What real-machine evidence must we keep to check those results? The booklet’s central requirement is to compare simulation with physical measurements and document where it can—and cannot—be trusted. [f186]

There is also a practical complication: **not everything that looks dangerous calls for braking**. Backing toward a rock pile or having ground crew approach under an agreed procedure can be normal work, yet look hazardous to a simple sensor. [f124]

### The main takeaway
**Simulation is not a magic shortcut.** The research found no documented case of a new automatic-braking function going from its first representative hardware to accepted validation in about four months. Successful reductions in physical testing depended on years of earlier preparation, tightly limited operating conditions, or both. [f58, f59]

Think of the booklet as an evidence-based guide to what the project must establish—not proof that this particular system is already safe or that the deadline is achievable. It was written without the manufacturer’s internal recordings, sensor specifications or other internal documents. [f6, f7]

## User
What is SOTIF and why should I care?

<details><summary>4 tool calls · 19s</summary>

- search_graph {"query":"SOTIF","types":["term"],"limit":5}
- explore {"id":"t50","limit":8}
- read_facts {"ids":["f12007","f12013","f12015","f12018","f12019","f12020","f2355"]}
- evidence_brief {"question":"What is SOTIF in plain language and why does it matter to a new non-safety-engineer on the off-road automatic braking project?"
</details>

## Agent
**SOTIF** means **Safety of the Intended Functionality**. In plain words: **nothing is broken, but the system still gets the situation wrong and behaves unsafely.** Its sensing or decision-making is not good enough for the conditions it encounters. [f12007]

For our automatic-braking project, that includes two opposite problems:
- **Missing a real person**, so the machine fails to react.
- **Reacting to something harmless**, causing unnecessary braking. [f12013]

### How it differs from “something failed”
Testing broken components is important, but it does not establish whether the sensors perform well when everything is working normally. A healthy sensor can still struggle in dust, snow, fog, glare or darkness. That is the SOTIF concern. [f659, f12019]

### Why you should care
The booklet identifies sensing in those difficult conditions as **the hardest uncertainty—and the one least suited to simulation**. Its conclusion is that confidence must rest on real physical tests and recorded sensor data, not simulation alone. [f12019, f12020]

For you, the useful question is: **“Even if every component works as designed, what conditions could make the system misunderstand what is happening?”** The booklet uses that thinking to choose test situations and define requirements. [f12007, f12015]

One important qualification: **ISO 21448, the SOTIF standard, is a road-vehicle standard**, not a standard directly applicable by scope to this heavy off-road function. The booklet borrows its way of thinking about perception limits; it does not treat it as an off-road approval rule. [f2355, f12015]

## User
And what is the difference between Level 8 and Level 9?

<details><summary>3 tool calls · 14s</summary>

- search_graph {"query":"Level 8 Level 9","limit":6}
- explore {"id":"t30","limit":5}
- read_facts {"ids":["f5924","f11749","f2075","f2141"]}
</details>

## Agent
**Level 8 advises the operator; Level 9 intervenes in the machine’s motion.** These are layers in the mining industry’s vehicle-interaction control model. [f5924]

| | Level 8 | Level 9 |
|---|---|---|
| **What it does** | Gives advice or warnings so the operator can act. | Automatically slows or stops the machine. |
| **Who takes the braking action?** | The operator. | The system can intervene itself. |

That distinction comes from EMESRT’s nine-layer model; Level 7 is operator awareness, Level 8 is advisory controls, and Level 9 is intervention controls. [f5924]

**Our Collision Mitigation System is a Level 9 control** because it can brake automatically. [f11749]

### Why the distinction matters
Adding automatic braking is not just adding a stronger warning. It brings the function into the scope of **ISO 19014-2**, which addresses safety-related machine controls; awareness-only systems that do not affect machine motion are excluded. [f2075]

The safety evidence must therefore address both **“Did it brake when needed?”** and **“Did it brake when doing so was unsafe or unnecessary?”** That second question is why the SOTIF discussion matters: an incorrect detection can now cause a physical intervention, not merely an unwanted warning. [f2141, f12013]

## User
Debrief, honestly and briefly: in this conversation, what confused you or slowed you down? Which tool results were unclear, missing, too long or misleading, and what tool or information would have let you answer better? Do not use tools for this.

<details><summary>0 tool calls · 7s</summary>


</details>

## Agent
- **No major confusion about your questions.** The main challenge was keeping explanations simple without implying that road-vehicle standards directly apply to off-road machines.
- **The graph results were often too long.** Concept lookups returned extensive cross-chapter detail when I needed a definition, one example and a caveat.
- **The evidence brief was poorly targeted.** For the booklet overview, it promoted unrelated braking figures and vendor case studies over the purpose and main conclusions I had retrieved. That added noise.
- **Some evidence labels were hard to interpret.** Broad statements carried mixed source labels, while one SOTIF-related finding relied on draft evidence. The narrower glossary facts were clearer.
- **My own presentation could improve.** I simplified Level 8 to “advice or warnings,” without clearly distinguishing it from Level 7 operator awareness. The retrieved material named the levels but did not give a crisp operational boundary.

A **beginner-summary retrieval mode**, plus a short authoritative Level 7/8/9 comparison with concrete examples, would have helped most.
