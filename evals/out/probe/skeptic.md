# Probe: skeptic

## User
My boss says we can validate the new braking system in simulation in four months. Is that realistic?

<details><summary>10 tool calls · 34s</summary>

- read_file {"file_path":"/skills/skeptic-review/SKILL.md","limit":1000}
- read_file {"file_path":"/skills/graph-research/SKILL.md","limit":1000}
- search_graph {"query":"four months","limit":12}
- search_graph {"query":"simulation credibility braking validation","types":["term"],"limit":6}
- explore {"id":"c13","limit":18}
- explore {"id":"t127","limit":12}
- read_facts {"ids":["f58","f70","f7591","f10464","f10431","f10409","f10424","f10430","f10417","f2103","f364","f10434"]}
- read_file {"file_path":"/skills/ui-blocks/SKILL.md","limit":1000}
- show_ui {"block":{"type":"checklist","title":"Questions the four-month claim must answer","items":[{"text":"Is the simulator already credible before
- [ui block: checklist]
</details>

## Agent
**Not as a from-scratch, simulation-only commitment.** For the heavy off-road automatic-braking systems covered by the booklet, four months is a **target, not a supported forecast**: the research found no case in any industry of a new automatic-braking function going from first representative hardware to accepted validation in about four months. [f10464, f58]

### When four months could be plausible
The booklet’s conditional conclusion is that simulation-credibility work must be finished **before the prototype arrives**. The four months can then be a confirmation and calibration campaign—not the period in which the team first develops its simulation method. This is expert judgment, not a demonstrated four-month precedent. [f7591, f70, f58]

### Why “in simulation” is the catch
The central problem is **whether the simulation is trustworthy**, not how many tests it can run. For earth-moving machinery, ISO 3450 requires physical brake-performance testing; the booklet found no identified off-road provision allowing simulation to replace prescribed physical tests. [f10409, f10431, f2103]

Scope also matters: documented off-road intervention launches were deliberately narrow, according to vendor evidence. A restricted initial release is a more defensible starting point than assuming broad coverage across machines and operating conditions. [f10434, f10430]

### What to tell your boss
“**Four months may be credible for a tightly scoped confirmation campaign using an already validated simulation capability plus required physical tests. It is not an evidence-backed promise for building that capability and completing validation from scratch.**” [f7591, f70, f58, f10431]

The review questions below expose the main assumptions. The highest-value changes are to finish credibility work ahead of the clock, retain physical tests, and constrain the initial release scope. [f7591, f10431, f10434]

## User
Steelman the opposite view: what would a supporter of heavy simulation say, and what evidence do they have?

<details><summary>18 tool calls · 62s</summary>

- search_graph {"query":"simulation physical reduction","limit":12}
- search_graph {"query":"four months","limit":12}
- search_graph {"query":"automatic braking simulation validation","limit":15}
- explore {"id":"t216","limit":35}
- search_graph {"query":"simulation reuse","limit":15}
- read_section {"id":"x352"}
- search_graph {"query":"simulation million scenarios mining","limit":15}
- search_graph {"query":"simulation billion million 99","chapters":[2],"limit":25}
- explore {"id":"t75","limit":18}
- search_graph {"query":"physical tests 66% 70%","chapters":[10],"limit":12}
- read_facts {"ids":["f330","f1100","f1850","f7591","f7593","f311","f5207","f14922"]}
- search_graph {"query":"simulation hours 200000 100000 Waymo","chapters":[2],"limit":14}
- read_facts {"ids":["f7861","f7863","f7864","f1212","f1215","f1216","f1571","f1443","f366","f7045","f11710","f7536","f7539","f7563","f58","f7534","f1728
- search_graph {"query":"simulation 99.9 percent validation","limit":10}
- read_file {"file_path":"/skills/prior-work/SKILL.md","limit":1000}
- search_graph {"query":"simulation physical reduction","limit":5}
- explore {"id":"t216","limit":5}
- read_facts {"ids":["f5207","f1215","f1216","f7863","f7864","f330","f1728","f1571","f7536","f311","f7563","f59","f14922","f11710"]}
</details>

## Agent
- **Independent, off-road academic:** MineSim (April 2025) demonstrates feasible mine-specific closed-loop scenario simulation and supports mining scenario/planning validation; it is academic simulation evidence, not accepted automatic-braking safety validation [f330, f1100, f1728].
- **Independent, off-road research:** University of Pretoria’s peer-reviewed 2024 collision-prediction work simulated mining collision-avoidance-system scenarios—a direct mining precedent for simulation-supported algorithm investigation [f1850].
- **Independent finding; partly on-road statistical foundations:** The booklet’s validation stratification exceeds **7,000 cells**, making exhaustive field coverage infeasible and stratified sampling plus simulation unavoidable [f5207].
- **Independent, automotive on-road:** Euro NCAP’s 2026 Virtual Testing protocol, version 1.00 dated March 2025, provides a concrete acceptance precedent: manufacturers correlate simulations against physical tests before submitting predictions; Euro NCAP subsequently performs randomly selected physical verification [f1215, f1216].
- **Independent, laboratory-scale automotive evidence:** “Mind the Gap” reported physical tests safely avoided for **40/61 configurations (66%)**, and **44/86 configurations (51%)** requiring no further real-world tests; these are small-scale self-driving-car results, not heavy-machine reduction estimates [f7863, f7864].
- **Expert opinion + Vendor, automotive on-road:** UTAC CERAM AEBS-16-03 proposed virtual validation with **30% physical tests**, implying **70% substitution**; this was a proposal, not confirmed in adopted regulatory text [f7861].
- **Vendor, automotive on-road:** A vendor claims six months of simulation-led process change increased scenario coverage from **12% to 87%**; this supports coverage acceleration, not demonstrated physical-test reduction or first-hardware-to-approval timing [f1212].
- **Independent, aerospace analogy:** ACAS X used **millions of simulated encounters**, equivalent to **billions of flight hours**—strong quantitative precedent for simulation supplying otherwise impractical collision-avoidance evidence volume, but not off-road automatic braking [f1571].
- **Independent, cross-sector credibility frameworks:** The supported substitution mechanism is physical anchoring: baseline physical tests validate models, simulation fills the validated domain’s interior, and physical confirmation remains at boundaries and after influential changes [f7536].
- **Independent finding + booklet recommendation:** Cross-machine evidence reuse is described as the biggest validation lever and least documented; product-family claims must explicitly justify why shared evidence applies to each machine model [f366, f7045].
- **Glossary finding, unlabeled:** Existing warning-system logs can directly validate reused sensor/mounting models if usable ground truth exists; this credit stops at the first new brake command and does not validate post-intervention braking outcomes [f14922, f11710].
- **Vendor, aerospace reuse precedent:** Lockheed Martin attributes F-35 Auto-GCAS integration in 2019, **seven years earlier than planned**, to agile development and reuse of F-16 work; this is a reuse precedent, not a four-month new-system validation demonstration [f1443].
- **Expert opinion, conditional four-month argument:** Four months is considered feasible **only if simulation credibility work is finished before prototype arrival**, leaving confirmation and discrepancy resolution rather than first-time simulation-method development; the largest calendar saving comes from moving work earlier, not removing physical validation [f7591, f7593, f311].

Tensions:
- **Independent gaps:** No published quantified physical-test reduction for off-road safety functions, and no off-road machine standard accepting simulation instead of physical collision-avoidance/automatic-braking tests, were found [f7563, f7539].
- **Independent finding:** No checked credibility framework prescribes a universal physical-test percentage; the positive precedents do not establish a defensible off-road substitution fraction [f7534].
- **Synthesis gap, unlabeled:** No case in any industry was found of a new automatic-braking function progressing from first representative hardware to accepted validation in about four months; the four-month claim is conditional expert judgment, not demonstrated precedent [f58, f7591].

Also relevant: t216, t75, x352, f1215, f1216, f7536, f7591, f7593.**The strongest pro-simulation argument is that physical testing alone cannot cover the problem adequately—and a physically anchored simulator can provide much more evidence per month.** That supports heavy simulation, but not simulation-only approval or an unconditional four-month deadline. [f5207, f7536, f58]

A thoughtful supporter would make four arguments.

### 1. “Simulation is necessary for coverage, not just cheaper testing”
The booklet’s proposed validation breakdown exceeds **7,000 cells**. It concludes that exhaustive field coverage is infeasible, making stratified sampling plus simulation unavoidable. A supporter would argue that a predominantly physical campaign risks leaving more combinations unexamined. [f5207]

There is a substantial cross-sector precedent: **ACAS X** aircraft collision avoidance used millions of simulated encounters, equivalent to billions of flight hours. This demonstrates simulation’s evidence-volume advantage—not an off-road braking validation timeline. [f1571]

### 2. “Virtual evidence can be accepted when it is independently checked”
**Euro NCAP’s 2026 Virtual Testing protocol**, version 1.00 dated March 2025, requires manufacturers to correlate simulation against physical tests before submitting predictions; Euro NCAP then performs randomly selected physical verification tests. That is an independent **on-road precedent** for using simulation as assessment evidence rather than merely as a development tool. [f1215, f1216]

The defensible model is therefore: physical tests establish credibility, simulation fills the validated domain’s interior, and physical confirmation remains at boundaries and after influential changes. This is also the recurring pattern in the credibility frameworks reviewed by the booklet. [f7536]

### 3. “There is evidence that some physical tests can be avoided”
The academic **“Mind the Gap”** study reported:
- Physical tests “safely avoided” for **40 of 61 configurations—66%**.
- **44 of 86 configurations—51%** requiring no further real-world testing. [f7863, f7864]

Those are genuine quantified results, but from **small-scale self-driving cars at laboratory scale**, not heavy off-road machines. The booklet found **no published, quantified physical-test reduction for off-road safety functions**. A supporter can cite the mechanism’s promise, but cannot responsibly transfer those percentages to your system. [f7863, f7864, f7563]

There is direct mining-domain progress too: **MineSim, reported in April 2025**, demonstrates mine-specific closed-loop scenario simulation for autonomous trucks. It establishes technical feasibility, not accepted braking-system safety validation. [f330, f1728]

### 4. “Four months need not mean starting from zero”
This is the strongest response to your original deadline. The biggest calendar saving comes from moving validation work **before prototype availability**, rather than eliminating physical validation. The booklet considers four months conditionally feasible if simulation-credibility work is already finished when the prototype arrives—leaving confirmation and calibration, rather than first-time capability building. This is **expert judgment**, not a demonstrated four-month precedent. [f311, f7591, f70]

Reuse can help: if the braking system retains the old warning system’s sensors and mounting, existing logs can directly validate those models **provided they contain usable ground truth**. But that evidentiary credit stops at the first brake command; it does not establish what happens after intervention. [f14922, f11710]

### Where the steelman lands
A supporter’s best case is: **“Use simulation for breadth and physical tests for trust; start early and reuse what is already evidenced.”** That is substantially aligned with the booklet’s conclusions. [f5207, f7536, f311, f14922]

The unsupported leap is: “Therefore our new braking system can be fully validated in four months.” Every documented physical-test reduction rested on years of earlier investment, a deliberately narrow operating envelope, or both—and the booklet found no first-representative-hardware-to-accepted-validation four-month precedent. [f59, f58]

## User
Debrief, honestly and briefly: in this conversation, what confused you or slowed you down? Which tool results were unclear, missing, too long or misleading, and what tool or information would have let you answer better? Do not use tools for this.

<details><summary>0 tool calls · 7s</summary>


</details>

## Agent
- **Scope was ambiguous.** “New braking system” could mean basic brake performance or perception-triggered automatic braking. I assumed the latter because that is the booklet’s scope; I should have made that assumption explicit.
- **Some graph results were too broad.** Concept exploration returned hundreds of linked facts but displayed only a small selection. That helped connect chapters, but required further retrieval to distinguish direct evidence from analogies.
- **Evidence labels sometimes needed disentangling.** Some fact nodes listed a mixture of independent, vendor and on-road sources. The source list alone did not clearly identify which source supported which part of the claim.
- **The workflow was heavier than your questions needed.** Skill-file reading and the mandatory UI checklist added overhead. The researcher helped with the steelman, but its findings still needed checking against full facts.

**What would have helped most:** a compact evidence table separating off-road demonstrations, on-road precedents, expert judgments and missing evidence—plus clarification of whether “four months” starts from scratch or after a credible simulator already exists.
