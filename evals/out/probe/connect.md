# Probe: connect

## User
How does the winter recording issue connect to the statistics on how many trials we need?

<details><summary>8 tool calls · 29s</summary>

- read_file {"file_path":"/skills/graph-research/SKILL.md","limit":1000,"offset":0}
- search_graph {"query":"winter recording","limit":8}
- search_graph {"query":"zero failures trials confidence independence","limit":10}
- explore {"id":"t209","limit":35}
- explore {"id":"t121","focus":"winter","limit":20}
- search_graph {"query":"winter strata repeated replay","limit":8}
- read_facts {"ids":["f97","f215","f6650","f6651","f6882","f6654","f130","f6648","f8182","f5573","f129","f2879","f11049","f520","f84"]}
- evidence_brief {"question":"How does capturing winter recordings now connect to statistical trial counts, independent encounters, per-condition claims and 
</details>

## Agent
**Winter recording determines what population your trial statistics can credibly describe—not just how much data you have.** The booklet therefore treats recording through winter and obtaining enough independent trials as connected requirements: capture the conditions now, then accumulate evidence for clearly defined claims. [f97, f5573, f6650]

### 1. The trial count applies to a defined population
With **zero misses**, a claim at **95% one-sided confidence** needs:

| Maximum claimed miss rate | Independent trials required |
|---|---:|
| 1% | **299** |
| 0.1% | **2,995** |
| 0.01% | **29,956** |

These are counts **per claimed population**, not an automatic allowance covering every machine, site and weather condition. [f6650, f6651, f6882]

So, if winter performance is a separate claim, it needs supporting winter evidence; a large overall count is not itself a demonstration of weather generalisation. The booklet explicitly says that statistical weather-and-site generalisation remains unresolved for off-road validation. [f6650, f2879]

### 2. Recording volume is not independent-trial volume
The statistical unit is an **independent encounter**, not a sensor frame. A long winter recording may contain many frames but relatively few independent detection opportunities; replaying those frames does not turn them into independent encounters. [f130]

Separate condition claims also multiply the burden: the booklet’s example of a 1% miss-rate claim in **20 critical strata** requires roughly **6,000 zero-miss trials**, which it considers feasible only through simulation or hardware-in-the-loop. [f6654]

### 3. Winter logs anchor the virtual evidence
Recording candidate sensors alongside the warning system until mid-2027 captures the real environmental distribution, including winter. Those recordings need synchronised sensors, machine state, calibration, weather/site metadata and defensible ground truth—not merely warning-event counts. [f5573, f520]

Simulation can provide trial volume, but **large simulated counts do not remove model-form uncertainty**. Missing real winter evidence therefore cannot simply be repaired by running more simulations. [f8182]

### Practical consequence
The booklet recommends starting sensor recording in **October 2026** and continuing through **winter 2026–2027**, rather than waiting for the prototype. Inventory existing recordings now, and collect both winter encounters for detection claims and representative operating exposure for nuisance-braking claims—the latter also has a statistical burden: **300 hours with no unnecessary brakes** to support fewer than one per 100 hours. [f97, f11049, f129]

In short: **the statistics set how many trials you need; winter recording determines whether those trials represent the conditions you want to claim.** [f6650, f5573, f2879]

## User
Is there any tension between what the regulations require and what the vendors claim?

<details><summary>5 tool calls · 23s</summary>

- search_graph {"query":"vendor claims regulatory compliance certification","limit":10}
- search_graph {"query":"regulation vendor simulation physical tests","limit":8}
- explore {"id":"t277","limit":18}
- read_facts {"ids":["f2103","f7546","f7548","f1213","f2062","f5160","f4910","f2201","f2202","f6697","f7416","f1202"]}
- evidence_brief {"question":"Tensions between regulatory requirements and vendor claims about off-road virtual validation, statistics and synthetic winter e
</details>

## Agent
**Yes—but mainly a tension between what vendors demonstrate and what counts as compliance evidence, rather than proof that vendors are breaking the rules.** The booklet found no off-road route allowing simulation to replace prescribed physical tests, while vendor speed and coverage claims often stop short of verified safety sign-off. [f2103, f1213]

### Where the tension shows up

- **“Validated faster” is not “approved for release.”** Vendor-only, on-road case studies claim sub-day Level 3 build validation and scenario coverage rising from **12% to 87%**. The booklet concludes that neither discloses enough to establish verified safety sign-off. Documented reductions in physical testing also rested on years of prior investment, a narrow operating envelope, or both. [f1213, f1202]

- **Road-vehicle acceptance is not off-road permission.** There is genuine regulatory progress: WP.29 adopted supplements to **UN R152 in 2025** allowing virtual testing instead of some physical tests for car and van emergency braking. But that is an **on-road precedent**, not an approval route for heavy off-road machines. How much virtual evidence off-road regulators and notified bodies will accept remains uncertain. [f7546, f2103, f7416]

- **A quoted physical-test percentage is not a universal rule.** The often-cited **30% minimum physical testing** appears in a technical-service working document and a vendor interpretation of the R152 proposal. It should not be presented as the general off-road regulatory requirement. [f7548, f2103]

### The connection to winter and trial counts

**Standards compliance does not settle statistical sufficiency.** None of the reviewed standard texts specifies detection or false-alarm sample sizes. Thus, “tested to the standard” does not by itself establish the confidence behind a claimed miss rate; the **299 independent zero-miss trials** for a 1% miss-rate claim at 95% confidence are a statistical requirement for that claim, not a sample size prescribed by those standards. [f5160, f6650]

Likewise, synthetic winter imagery cannot automatically substitute for winter measurements: as of **October 2026**, the booklet found no standard, regulator-endorsed method or broad independent evidence treating ordinary GAN/diffusion weather editing as physically equivalent to matched real sensor measurements for safety-critical braking approval. [f4910]

### What the legal obligation actually demands

For an EU machine introduced in mid-2027, **Machinery Regulation (EU) 2023/1230 applies from 20 January 2027**. It requires risk reduction, safe and reliable controls, and technical conformity evidence—not simply a successful simulation campaign. Its Annex I Part A category for safety components with self-evolving machine-learning behaviour requires notified-body assessment. [f2201, f2202, f6697]

The useful distinction is therefore **tool capability → credible safety evidence → accepted conformity evidence**. Vendor claims may establish the first without establishing the other two; the booklet’s central warning is not to treat them as interchangeable. [f1213, f2103, f7416]

## User
Debrief, honestly and briefly: in this conversation, what confused you or slowed you down? Which tool results were unclear, missing, too long or misleading, and what tool or information would have let you answer better? Do not use tools for this.

<details><summary>0 tool calls · 8s</summary>


</details>

## Agent
- **The main ambiguity was scope.** “The winter recording issue” was easy to connect to the preceding topic, but “regulations versus vendors” could mean simulation acceptance, performance claims, or certification. I covered several rather than making that distinction explicit upfront.
- **Some results were noisy or oversized.** The sample-size hub returned hundreds of linked facts, and searches surfaced tangential vendor hardware claims. More focused summaries would have helped.
- **The evidence briefs were uneven.** They sometimes promoted tangential facts and omitted the strongest facts I had just read. I relied on the underlying fact records instead.
- **Some labels and wording needed caution.** “No off-road document accepts simulation as compliance evidence” is broader than “no identified rule permits replacing a prescribed physical test.” Those are not equivalent, and I should have kept that distinction sharper.
- **What would help most:** a compact, jurisdiction-specific table separating binding law, standards, regulator acceptance, vendor claims, and independent verification—with exact regulatory passages and dates.

My answers were also longer than necessary, especially the second one.
