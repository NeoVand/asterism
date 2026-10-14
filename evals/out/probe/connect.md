# Probe: connect

## User
How does the winter recording issue connect to the statistics on how many trials we need?

<details><summary>10 tool calls · 35s</summary>

- read_file {"file_path":"/skills/graph-research/SKILL.md","limit":1000}
- search_graph {"query":"winter recording","limit":10}
- search_graph {"query":"trials zero failures statistical","limit":12}
- explore {"id":"t210","limit":35}
- explore {"id":"t121","focus":"winter","limit":15}
- search_graph {"query":"winter statistics simulation credibility","chapters":[13,9,0],"limit":8}
- read_facts {"ids":["f10461","f97","f6654","f6878","f6881","f6882","f14212","f5205","f5573","f7468","f11049","f84","f6657","f224"]}
- search_graph {"query":"winter missing simulation validated snow","chapters":[13],"limit":5}
- read_facts {"ids":["f10479","f10956","f10937"]}
- evidence_brief {"question":"How does capturing winter recordings connect to statistical trial requirements and credible winter validation?","max":15}
</details>

## Agent
**Winter recording determines whether the trials represent winter at all; the statistics determine how many valid trials you need.** A large trial count cannot compensate for missing seasonal evidence or an unvalidated snow model. [f14212, f10479, f10956]

### 1. The trial count applies to a defined population
To demonstrate a miss rate of at most **1% at 95% one-sided confidence**, you need **299 independent encounters with zero misses**. That is not automatically one allowance for the whole product: separate claims for weather conditions, machine families or scenario types need their own evidence—or a justified statistical pooling model. [f6878, f14212]

So, if winter operation is a separate claimed condition, you cannot simply use successful fair-weather encounters to fill its sample. The scale grows quickly: **20 critical strata require about 6,000 zero-miss trials**, which the booklet judges feasible only in simulation or hardware-in-the-loop. [f14212, f6654]

### 2. Winter recordings make those simulated trials defensible
The fleet recordings capture the actual environmental distribution, including winter. They also provide reference evidence against which winter sensor simulation can be checked—important because snow and other adverse conditions are among the weakest areas of sensor-model credibility. [f5573, f10479]

That creates the connection: **real winter data supplies the reference; simulation supplies the volume**. But credibility must be established separately for each phenomenon; thousands of synthetic snow trials do not, by their number alone, establish that the snow model is valid. [f6654, f7468, f10956]

### 3. Recording volume is not trial count
A ten-second encounter can contain hundreds of correlated sensor frames, but the statistical unit is the **independent encounter**, not each frame. Recording lots of winter footage therefore does not automatically give you hundreds of independent winter trials. [f5205]

The required counts also rise sharply with stronger claims: at 95% confidence and zero misses, a **0.1%** miss-rate limit needs **2,995** independent trials; **0.01%** needs **29,956**, per claimed population. [f6881, f6882]

### 4. That is why the calendar matters now
The booklet’s expert recommendation is to begin recording in **October 2026** and continue through winter: **winter 2026–27 is the last opportunity before the planned mid-2027, four-month validation window**. Waiting for the prototype risks reaching the high-volume test campaign without credible winter reference data. [f97, f10461]

The practical implication is to inventory existing recordings and capture winter data now, using candidate development sensors alongside the warning system where possible. If snow has no credible reference data, the booklet calls for escalation—not treating a large simulated trial count as a substitute. [f11049, f5573, f10956]

## User
Is there any tension between what the regulations require and what the vendors claim?

<details><summary>5 tool calls · 27s</summary>

- search_graph {"query":"vendor claims regulation simulation certification","limit":8}
- search_graph {"query":"vendor physical reduction 90 percent","limit":6}
- explore {"id":"t277","limit":14}
- read_facts {"ids":["f2103","f7862","f9356","f4910","f2062","f2201","f2202","f187","f7563","f7679","f6749"]}
- evidence_brief {"question":"Tensions between regulatory requirements and vendor claims for off-road virtual validation, particularly winter evidence and st
</details>

## Agent
**Yes—the main tension is between a vendor showing that simulation can generate tests and demonstrating that those tests are acceptable compliance evidence.** The booklet found no off-road acceptance route allowing simulation to replace prescribed physical tests, and no published, quantified reduction in physical testing for off-road safety functions. That is an evidence gap, not a blanket prohibition on using simulation. [f2103, f7563]

### Where the claims outrun the evidence

- **“We can replace most physical testing.”** A vendor interpretation of a **UN R152 proposal** described virtual validation with **30% physical tests**, implying 70% replacement. But that was **on-road automotive AEBS evidence**, and the booklet did not confirm it in adopted regulatory text. None of the credibility frameworks examined sets a universal physical-test percentage. [f7862, f187]

- **“Virtual testing is already accepted by regulators.”** There are on-road precedents, but UNECE’s NATM treats virtual testing as **one part of a wider assessment**, not simulation-only approval. That does not establish acceptance for heavy off-road collision mitigation. [f7679, f2103]

- **“Simulation compresses development to months.”** The booklet explicitly records a disagreement: vendors market months-long compression, while ISO 21815 committee text describes the algorithms as immature. These are respectively **vendor marketing evidence** and an **independent committee assessment**, not equivalent demonstrations of readiness. [f9356]

### How this connects to winter and trial counts

**Generating enough trials does not resolve either model validity or regulatory acceptance.** The standards reviewed—ISO 21815 Parts 1, 3, 4 and 5, and ISO 16001—do not prescribe statistical sample sizes or simulation-credibility rules. So the earlier **299-trial figure is statistical support for a defined performance claim, not a regulatory approval threshold**. [f6749, f6878, f14212]

Likewise, making recorded scenes look snowy is not an established substitute for winter sensor evidence. As of October 2026, the booklet found **no standard, regulator-endorsed method or broad independent evidence** treating ordinary GAN/diffusion weather editing as physically equivalent to matched real sensor measurements for safety-critical braking approval. [f4910]

### What the legal requirement actually asks for

For an EU machine introduced in mid-2027, the **Machinery Regulation (EU) 2023/1230**, applicable from **20 January 2027**, requires risk reduction, safe and reliable control systems, and technical conformity evidence. ISO 21815 standards are not themselves law; their binding role depends on legislation, designation, contracts or the manufacturer’s conformity route. [f2201, f2202, f2062]

The defensible distinction is therefore: **vendor capability claims can support the engineering case, but neither large trial counts nor realistic synthetic weather establish the compliance case by themselves.** Off-road acceptance of virtual evidence remains unresolved in the booklet. [f6749, f4910, f2103]

## User
Debrief, honestly and briefly: in this conversation, what confused you or slowed you down? Which tool results were unclear, missing, too long or misleading, and what tool or information would have let you answer better? Do not use tools for this.

<details><summary>0 tool calls · 7s</summary>


</details>

## Agent
- **Scope was ambiguous.** “Winter recording issue” could mean missing seasonal coverage, replay-quality logs, or sensor compatibility. I inferred seasonal coverage. Your regulations question could likewise mean winter-specific claims or vendor claims generally; I answered broadly without making that shift explicit.
- **Search results sometimes blurred gaps and prohibitions.** “No off-road document accepts simulation” sounded stronger than “the booklet found no acceptance precedent.” Reading full facts helped, but I should consistently preserve that distinction.
- **The evidence briefs were uneven.** The second prioritized loosely relevant Waymo material and omitted useful conclusions about physical-test percentages. I relied on the full facts instead.
- **Some results were noisy or oversized.** “Winter” surfaced the Winter Simulation Conference, while concept-hub results returned many repeated statistics. More focused filtering would have reduced the work.
- **What would help most:** a compact claim-to-evidence table distinguishing **adopted law, proposal, standard, vendor interpretation, and research gap**, with jurisdiction and date. That would make the regulatory comparison clearer and less prone to overstatement.
