# Probe: numbers

## User
Give me the 8 most important numbers in this research, with what they mean.

<details><summary>13 tool calls · 35s</summary>

- read_file {"file_path":"/skills/graph-research/SKILL.md","limit":1000}
- explore {"id":"c0","limit":50}
- search_graph {"query":"million hours confidence","kinds":["number"],"limit":15}
- search_graph {"query":"simulation reduction cost","kinds":["number"],"limit":15}
- read_file {"file_path":"/skills/ui-blocks/SKILL.md","limit":1000}
- read_facts {"ids":["f3","f58","f60","f126","f129","f228","f226","f160","f161","f144","f187","f130"]}
- explore {"id":"f126","limit":8}
- read_facts {"ids":["f224","f6658","f5898","f5174"]}
- evidence_brief {"question":"Select eight most decision-important numbers across the research and explain meaning: less than four months, 42 months, 299 tri
- show_ui {"block":{"type":"metrics","title":"1–4 · Schedule and statistical proof","items":[{"value":"<4 months","label":"Required validation window"
- [ui block: metrics]
- show_ui {"block":{"type":"metrics","title":"5–8 · Real hazards and intervention timing","items":[{"value":"12 of 13","label":"Haul-truck collision d
- [ui block: metrics]
</details>

## Agent
These are my **eight most decision-important numbers**, shown below: they capture the schedule challenge, the evidence needed to demonstrate performance, and the real-world hazards and delays the system must address.

The key caveat: **none establishes a universal percentage of physical testing that simulation can replace**. The credibility frameworks reviewed prescribe neither a universal physical-test percentage nor a universal tolerance; that justification must be specific to the intended use. [f187]

## User
Which of those are vendor claims or on-road only?

<details><summary>0 tool calls · 9s</summary>


</details>

## Agent
**None of the eight is vendor-only. Only the PEGASUS figure is explicitly on-road evidence.** The others are off-road requirements or observations, statistical calculations, or a mixed-source engineering finding.

| Number | Evidence status | Important qualification |
|---|---|---|
| **<4 months** | Manufacturer’s project requirement—not a vendor performance claim | The booklet found **no precedent in any industry** for validating a new automatic-braking function that quickly from first representative hardware. [f3, f58] |
| **42 months** | **Independent, on-road evidence** | PEGASUS involved 17 partners. It illustrates capability-building effort, not a proven off-road delivery schedule. [f60] |
| **299 trials** | **Independent statistical calculation** | Requires zero misses, independent encounters and a defined claimed population to demonstrate ≤1% misses at 95% confidence. It is not a field-performance result. [f126, f130] |
| **300 hours** | **Independent statistical calculation** | Assumes a zero-event Poisson calculation and representative operation. It supports a rate claim—not an established acceptable nuisance-braking threshold. [f6658] |
| **12 of 13 deaths** | **Independent, off-road accident evidence** | US haul-truck collision fatalities, 2005–2021; not a claim about all machine types or all fatal-accident mechanisms. [f228] |
| **18% false alarms** | **Independent, off-road field study** | NIOSH’s 2006 Caterpillar 793B radar study; historical warning-system evidence, not modern automatic-braking performance. [f5174] |
| **300 ms** | **Independent, off-road standard requirement** | ISO 16001:2017 covers **warning, not braking**. [f160, f161] |
| **Half or more of stopping distance** | **Independent, mixed-source finding—not on-road-only** | The supporting sources include an on-road truck stopping-distance study alongside braking-system and mining evidence. It is not a universal measured proportion for every off-road machine. [f5898] |

## User
Debrief, honestly and briefly: in this conversation, what confused you or slowed you down? Which tool results were unclear, missing, too long or misleading, and what tool or information would have let you answer better? Do not use tools for this.

<details><summary>0 tool calls · 7s</summary>


</details>

## Agent
- **Selecting “most important” was subjective.** I chose decision-relevant figures, but the research did not supply a definitive top-eight ranking. I should have made that selection criterion clearer.
- **Evidence labels needed extra checking.** Some synthesis facts inherited labels from underlying facts, and the latency finding combined several sources, including on-road evidence. A direct breakdown of which source supports which part of a claim would have made your follow-up easier to answer precisely.
- **Some retrieval was noisy.** Searches returned loosely related cost and glossary figures. The synthesis overview was useful but long; the final evidence brief omitted some selected numbers while including unrelated findings.
- **My presentation was less useful than it could have been.** I put the explanations into interactive cards, leaving the text answer thin. A compact eight-row table with an **evidence-status column from the outset** would have been clearer.

The most helpful improvement would be a tool result that bundles each number with its meaning, assumptions, evidence provenance, and off-road applicability.
