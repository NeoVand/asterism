# Probe: skeptic

## User
My boss says we can validate the new braking system in simulation in four months. Is that realistic?

<details><summary>12 tool calls · 31s</summary>

- read_file {"file_path":"/skills/skeptic-review/SKILL.md","limit":1000}
- read_file {"file_path":"/skills/graph-research/SKILL.md","limit":1000}
- search_graph {"query":"four months","limit":8}
- search_graph {"query":"16 weeks","limit":8}
- explore {"id":"c13","limit":15}
- explore {"id":"c0","limit":12}
- read_file {"file_path":"/skills/ui-blocks/SKILL.md","limit":1000}
- search_graph {"query":"credibility before prototype","chapters":[10],"limit":8}
- read_facts {"ids":["f58","f59","f70","f7591","f10464","f8238","f8239","f8226","f10431","f10424","f10417","f11188","f11192","f11166"]}
- evidence_brief {"question":"Is validating a new heavy off-road automatic braking system in simulation in four months realistic, and what conditions disting
- show_ui {"block":{"type":"checklist","title":"What must be true for four months to be credible?","items":[{"text":"Simulation credibility establishe
- [ui block: checklist]
</details>

## Agent
**Only under tight conditions—not as a from-scratch, simulation-only validation promise.** For heavy off-road automatic braking, the booklet calls four months **“a target, not a forecast”**: it is feasible only if the simulation-credibility work is finished before the prototype arrives. [f10464, f7591]

### What makes the claim questionable

- **No demonstrated four-month precedent.** The research found no case in any industry of a new automatic braking function going from first representative hardware to accepted validation in about four months. Every documented reduction in physical testing relied on years of earlier simulation/statistics investment, a deliberately narrow operating envelope, or both. That does not prove impossibility, but it does not support an unconditional promise. [f58, f59]
- **Simulation cannot replace all physical evidence.** ISO 3450 requires physical brake-performance testing. The booklet also found no evidence establishing whether a regulator or notified body would accept simulation evidence for machinery conformity—acceptance must not be assumed. [f10431, f11188]
- **A large simulation campaign is not necessarily credible evidence.** Sensor and environment fidelity is the hardest uncertainty, and is weakest precisely where the risk lies. [f10424]

### What four months could realistically mean

The defensible interpretation is **four months of confirmation and calibration**, using models, data pipelines, scenarios and acceptance criteria prepared beforehand—not four months to invent the simulation method, establish its credibility and validate the product. That is the booklet’s recommended strategy, not a demonstrated schedule guarantee. [f70, f7591, f8238, f8239]

Narrow scope also matters: the documented Volvo CE, Komatsu and Caterpillar intervention launches were restricted by direction, speed, model or trigger. Those are **vendor-reported precedents**, not proof that a broad release can be validated in four months. [f11166]

The checklist below gives the conditions I would ask your boss to substantiate. **If those foundations are not already in place, treat four months as an aspiration—not a defensible delivery commitment.** [f7591, f10464]

## User
Steelman the opposite view: what would a supporter of heavy simulation say, and what evidence do they have?

<details><summary>11 tool calls · 35s</summary>

- read_file {"file_path":"/skills/prior-work/SKILL.md","limit":1000}
- search_graph {"query":"simulation reduction physical testing","chapters":[2],"limit":12}
- search_graph {"query":"simulation acceleration importance sampling","limit":8}
- find_sources {"query":"virtual validation braking simulation physical testing reduction","limit":6}
- search_graph {"query":"simulation strongest case","limit":8}
- explore {"id":"t216","limit":16}
- explore {"id":"t206","limit":12}
- search_graph {"query":"UTAC 80% 90%","limit":6}
- search_graph {"query":"simulation off-road Deere millions","chapters":[2],"limit":8}
- read_facts {"ids":["f311","f5207","f1220","f1221","f1219","f6647","f1215","f1216","f7536","f13557","f13561","f1724","f7563","f70","f59"]}
- evidence_brief {"question":"Steelman heavy use of simulation for four-month off-road braking validation: strongest arguments, independent precedents and pr
</details>

## Agent
**The strongest pro-simulation case is not “trust the simulator instead of reality.” It is “use reality to qualify the simulator, then use simulation to cover far more cases than physical testing can.”** That is consistent with the booklet’s credibility framework: physical tests establish the model’s validity, simulation fills the validated domain, and physical confirmation remains at boundaries and after influential changes. [f7536]

A supporter would make four strong arguments.

### 1. Physical testing alone cannot cover the problem

“In the booklet’s worked validation structure, there are **more than 7,000 cells** before exhaustive repetition. Trying to cover all of them in the field is infeasible. Simulation plus stratified sampling is not merely a cheaper alternative—it is necessary for coverage.” [f5207]

They would also reject the idea that every virtual test needs photorealistic rendering. Braking-logic tests using object lists can run without drawing images, much faster than real time, across thousands of processor cores. The booklet recommends this approach for most of the millions of braking-logic combinations. That supports throughput for **braking logic**, not proof of sensor realism. [f13557, f13561]

### 2. There is independent evidence of enormous statistical acceleration

“The strongest published results are not just vendor marketing.” University of Michigan researchers reported these acceleration factors in **2016**, using importance sampling to concentrate testing on rare dangerous interactions:

- **300–100,000×** for car-following crash evaluation. [f1220]
- **2,000–20,000×** for lane-change conflicts. [f1221]

These are **independent, on-road results**. A supporter can reasonably argue that waiting for dangerous events to occur naturally is a poor testing strategy when targeted simulation can produce informative encounters much faster. But those numbers describe **statistical exposure reduction**, not equivalent reductions in the full product-validation schedule or safety sign-off. Importance sampling also requires a known real-world exposure distribution. [f1219, f6647]

### 3. Formal assessment already uses qualified virtual evidence

“Simulation is not inherently unacceptable evidence.” **Euro NCAP’s 2026 Virtual Testing protocol, version 1.00 dated March 2025**, requires manufacturers to correlate simulation against physical tests before submitting predictions; Euro NCAP then performs randomly selected physical verification tests. This is an independent, formal **on-road assessment precedent** for using simulation with checks against reality. [f1215, f1216]

The supporter’s point is that the right question is **“What evidence makes these predictions trustworthy?”**, not “Are virtual results legitimate at all?” The booklet finds a recurring physical-anchoring approach across NASA, medical-device and aerospace credibility frameworks too. [f7536]

### 4. Four months need not contain four months’ worth of total preparation

“The clock should measure the prototype confirmation campaign, not the creation of the entire validation capability.” The booklet itself concludes that the largest calendar saving comes from moving work **before the prototype exists**, rather than removing physical validation. With preparation complete, the final four months become calibration and confirmation. This is the booklet’s **expert judgment**, not an observed four-month success story. [f311, f70]

### How far does that steelman get your boss?

It makes a strong case for a **simulation-heavy validation strategy**. It does **not** establish the four-month delivery date.

The remaining evidentiary gap is important: the booklet found **no published, quantified reduction in physical testing for off-road safety functions**. Automotive credibility concepts can inform off-road work, but that does not automatically validate automotive sensor and environment models for off-road conditions. [f7563, f1724]

So the strongest defensible version of your boss’s position is: **“Four months may be achievable for a tightly bounded confirmation campaign built on an already credible virtual-validation capability.”** It is not: “Simulation lets us compress a new, broad validation programme into four months.” Every documented reduction the booklet found depended on substantial prior investment, narrow scope, or both. [f70, f59]

## User
Debrief, honestly and briefly: in this conversation, what confused you or slowed you down? Which tool results were unclear, missing, too long or misleading, and what tool or information would have let you answer better? Do not use tools for this.

<details><summary>0 tool calls · 8s</summary>


</details>

## Agent
- **Your wording left one important ambiguity:** “new braking system” could mean brake hardware or automatic collision-mitigation software. I assumed the latter from the booklet’s context; I should have stated that assumption.
- **The evidence brief was noisy.** It returned more facts than requested, including facts I had not fully read and some peripheral material. Its instruction to include every relevant conclusion could have bloated the answer. I relied instead on the verified facts.
- **Some searches matched too loosely.** Queries about simulation benefits surfaced gaps, unrelated figures and vendor launch descriptions rather than concrete validation successes. More precise ranking by *demonstrated outcome* would have helped.
- **The graph summaries were sometimes too large.** Chapter and concept results mixed useful conclusions with dozens of tangential facts. A compact “claim → strongest evidence → limitation” result would have been faster to use.
- **The decisive missing information was yours:** what already exists—validated models, representative test data, agreed acceptance criteria—and what “validated” means to your boss. Those facts would distinguish a plausible four-month confirmation campaign from an unsupported deadline.

My main shortcoming: I answered the general evidence question well enough, but the first verdict sounded more specific to your programme than the information justified.
