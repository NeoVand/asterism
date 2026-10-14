# Probe: skeptic

## User
My boss says we can validate the new braking system in simulation in four months. Is that realistic?

<details><summary>14 tool calls · 37s</summary>

- read_file {"file_path":"/skills/skeptic-review/SKILL.md","limit":1000}
- read_file {"file_path":"/skills/graph-research/SKILL.md","limit":1000}
- search_graph {"query":"four months","limit":8}
- search_graph {"query":"braking validation simulation","chapters":[13],"limit":8}
- explore {"id":"c0","limit":15}
- read_file {"file_path":"/skills/ui-blocks/SKILL.md","limit":1000}
- explore {"id":"c10","limit":12}
- explore {"id":"c13","limit":12}
- search_graph {"query":"four-month prerequisites acceptance","chapters":[12],"limit":6}
- read_facts {"ids":["f58","f59","f70","f7591","f10464","f191","f65"]}
- read_facts {"ids":["f7525","f7536","f7539","f7544","f8159","f8201","f8203","f10424","f2137","f10203","f11269","f10434","f10435"]}
- evidence_brief {"question":"Is four months realistic to validate a new heavy off-road automatic braking system in simulation, and what conditions make that
- show_ui {"block":{"type":"checklist","title":"What must be true for a credible four-month commitment","items":[{"text":"Define exactly what is being
- [ui block: checklist]
</details>

## Agent
**Not as a start-from-scratch, simulation-only promise.** For heavy off-road automatic braking, the booklet judges four months plausible only if simulation-credibility work is completed **before the prototype arrives**—making those months a confirmation and calibration campaign, not the first attempt to build the validation method. That is a conditional expert judgment, not a demonstrated schedule. [f7591, f70]

### Why the claim needs challenging

- **There is no matching precedent.** The research found no case, in any industry, of a new automatic-braking function progressing from first representative hardware to accepted validation in about four months. Documented reductions in physical testing depended on years of earlier simulation investment, a deliberately narrow operating envelope, or both. [f58, f59]
- **Simulation does not remove the need for physical evidence.** The booklet recommends a safety case supported by targeted physical tests and a documented simulation-credibility framework. It found no off-road standard explicitly accepting simulation instead of physical collision-avoidance or automatic-braking tests—although incomplete access to paid standards means “not found” does not mean “prohibited.” [f2137, f7539, f7544]
- **A working simulator is not an accepted validation capability.** Credibility requires validation against physical data, quantified uncertainty, a defined operating envelope and independent review. Sensor/environment fidelity is identified as the hardest uncertainty, weakest precisely where risk is highest. [f7525, f10424]

### What could make four months realistic?

A **narrow, prepared release**, rather than unrestricted validation across machines and conditions. Vendor-documented off-road intervention launches were deliberately limited; for example, Volvo CE’s January 2023 system operated only in reverse at **3–15 km/h**. These are vendor precedents for scope restriction, not proof of a four-month validation schedule. [f10434, f10435]

The readiness checklist below identifies what should already exist before committing. The biggest confidence improvements are to **narrow the release envelope, prove predictive accuracy against independent physical tests, and retain targeted physical confirmation**. [f59, f8159, f7536]

**My assessment:** treat your boss’s four months as a **target, not a forecast**, until those prerequisites have evidence behind them. The useful question is: “Four months to demonstrate exactly what, within which operating limits, accepted by whom—and what validation capability is already proven today?” [f10464, f10203, f7525]

## User
Steelman the opposite view: what would a supporter of heavy simulation say, and what evidence do they have?

<details><summary>12 tool calls · 39s</summary>

- search_graph {"query":"simulation reduction physical tests precedents","limit":8}
- read_file {"file_path":"/skills/prior-work/SKILL.md","limit":1000}
- explore {"id":"t216","limit":18}
- search_graph {"query":"physical testing reduction Boeing rail FDA","limit":10}
- search_graph {"query":"importance sampling acceleration simulation","limit":6}
- search_graph {"query":"VaViM reduction 60","limit":6}
- search_graph {"query":"simulation regression before prototype","chapters":[1,2],"limit":6}
- find_sources {"query":"accelerated evaluation Michigan importance sampling","limit":3}
- find_sources {"query":"Euro NCAP virtual testing 2026","limit":2}
- read_facts {"ids":["f311","f5207","f1220","f1221","f350","f1215","f1216","f7546","f7549","f7534","f7563"]}
- read_facts {"ids":["f484","f731","f747","f1219","f14159","f14160"]}
- evidence_brief {"question":"Steelman heavy simulation for four-month off-road braking validation: strongest affirmative arguments, independent evidence and
</details>

## Agent
**The strongest pro-simulation case is not “we can dispense with reality.” It is “we should use physical tests to establish trust, then let simulation supply the coverage and repetition that physical testing cannot.”** That is close to the booklet’s recommended approach—not a fringe position. [f484, f2137]

A supporter would make five strong arguments.

### 1. “The physical-only alternative cannot cover the problem”

The booklet’s proposed test stratification exceeds **7,000 validation cells**. Exhaustive field coverage is infeasible, so it concludes that stratified sampling plus simulation is unavoidable. The fair comparison is therefore not simulation versus exhaustive real-world proof; exhaustive real-world proof is not an available option. [f5207]

**What this supports:** using simulation heavily to explore combinations, with physical evidence anchoring the results—not simply testing a small physical sample and leaving the rest unexplored. [f484, f5207]

### 2. “There is independent evidence of enormous statistical acceleration”

University of Michigan researchers reported importance-sampling acceleration factors of approximately:

- **300–100,000×** for car-following crash evaluation.
- **2,000–20,000×** for lane-change conflicts. [f1220, f1221]

The method deliberately samples dangerous situations more frequently, then mathematically reweights the results to estimate normal-operation risk. It is not merely running ordinary scenarios faster. [f14159, f14160]

**Evidence strength:** independent, but **on-road only**. The booklet calls rare-event methods the strongest independent evidence for compressing statistical proof. Crucially, these factors concern statistical exposure—not equivalent reductions in an entire product’s validation schedule or a safety sign-off. [f350, f1219]

### 3. “External assessors already accept qualified virtual evidence”

This is more than a vendor aspiration:

- **Euro NCAP’s 2026 Virtual Testing protocol**, version 1.00 dated March 2025, requires correlation against physical tests before manufacturers submit simulation predictions; Euro NCAP then conducts randomly selected physical verification tests. That provides a concrete model for independently checking predictions. [f1215, f1216]
- **WP.29 adopted amendments to UN Regulation No. 152 in 2025** permitting virtual testing instead of some physical car-and-van automatic-emergency-braking tests. The 28 August 2025 text leaves the number of physical confirmation tests to agreement between manufacturer and authority. [f7546, f7549]

**What this supports:** qualified substitution is a real assessment and regulatory practice. **What it does not establish:** acceptance for heavy off-road braking; these are on-road precedents. [f7546, f7539]

### 4. “Four months after hardware arrival need not mean four months of total work”

A supporter’s best schedule argument is to develop software-in-the-loop testing, closed-loop simulation, replay, regression and fault injection **before the prototype is available**. After correlating the models with prototype measurements, the team can rerun the scenario matrix, critical boundaries, variants and faults using virtual and bench testing. [f731, f747]

The booklet explicitly judges that the **largest calendar saving comes from moving work before prototype availability**, rather than eliminating physical validation. On that interpretation, four months is a final confirmation campaign supported by substantial earlier work—not a miraculous compression of everything into four months. This remains an expert planning judgment, not a demonstrated four-month precedent. [f311, f70, f7591]

### 5. “There is no scientifically mandated physical-test percentage”

None of the credibility frameworks checked prescribes a universal physical-test percentage. A supporter can reasonably reject an arbitrary rule that most tests must be physical: the allocation should follow the evidence needed to establish credibility. [f7534, f275]

That argument cuts both ways. It supports neither a compulsory physical majority nor an unsupported promise that a particular virtual percentage will be accepted. [f7534]

### Where the steelman lands

**Heavy simulation is strongly defensible as the main engine of coverage, regression and statistical testing, supported by targeted physical evidence.** The booklet itself recommends a safety case, targeted physical tests and simulation under a credibility framework. [f484, f2137]

**The four-month commitment is the weaker claim.** No published, quantified reduction in physical testing was found for off-road safety functions, and no case was found of a new automatic-braking function going from first representative hardware to accepted validation in about four months. The evidence supports the strategy much more strongly than it supports that deadline. [f7563, f58]

## User
Debrief, honestly and briefly: in this conversation, what confused you or slowed you down? Which tool results were unclear, missing, too long or misleading, and what tool or information would have let you answer better? Do not use tools for this.

<details><summary>0 tool calls · 9s</summary>


</details>

## Agent
- **The main ambiguity was scope:** “validate in four months” could mean internal engineering confidence, release approval, or conformity acceptance—and four months from today versus after prototype arrival. I assumed the booklet’s heavy off-road automatic-braking context. Your actual scope and existing simulation maturity would have improved the judgment most.

- **Some tool outputs were too broad.** Chapter and concept explorations returned long lists, often with truncated claims. Useful for discovery, but they required further calls to verify wording and caveats.

- **Search relevance was uneven.** “VaViM reduction 60,” for example, returned several unrelated standards and planning facts rather than a clear precedent. A structured precedent table—scope, preparation time, measured savings, acceptance and evidence quality—would have been much better.

- **The final evidence brief was imperfect.** It surfaced facts I had not fully read and omitted useful quantitative evidence I had verified. I therefore couldn’t safely treat it as a complete, citation-ready summary.

- **I over-researched relative to your questions.** The answers could have been shorter while preserving the key distinction: strong evidence for simulation-heavy validation, weak evidence for this particular four-month deadline.
