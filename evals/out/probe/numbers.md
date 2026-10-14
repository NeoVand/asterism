# Probe: numbers

## User
Give me the 8 most important numbers in this research, with what they mean.

<details><summary>15 tool calls · 34s</summary>

- ls {"path":"/skills"}
- read_file {"file_path":"/skills/graph-research/SKILL.md","limit":1000}
- read_file {"file_path":"/skills/ui-blocks/SKILL.md","limit":1000}
- explore {"id":"c0","limit":60}
- search_graph {"query":"key numbers","kinds":["number"],"limit":30}
- search_graph {"query":"independent trials statistical confidence","types":["term"],"limit":5}
- search_graph {"query":"7000 strata","limit":4}
- search_graph {"query":"false nuisance 42%","limit":4}
- read_facts {"ids":["f3","f58","f60","f1204","f126","f224","f131","f228","f226","f103","f229","f161","f249"]}
- explore {"id":"t209","limit":12}
- show_ui {"block":{"type":"metrics","title":"1–4 · Schedule and proof burden","items":[{"value":"<4 months","label":"Required validation window","det
- [ui block: metrics]
- read_facts {"ids":["f324","f129","f132"]}
- show_ui {"block":{"type":"metrics","title":"5–8 · Coverage and operational reality","items":[{"value":">7,000 cells","label":"Size of the test space
- [ui block: metrics]
</details>

## Agent
My pick of the **eight most decision-relevant numbers** is below. Together, they capture the research’s central message: the proposed schedule has no documented precedent, statistical proof drives the testing burden, and exhaustive field coverage is infeasible. [f58, f126, f129, f132]

**Read the statistical figures as examples of evidence requirements, not prescribed safety targets.** The reviewed off-road standards do not supply statistical acceptance targets, and the booklet found no published off-road values for unnecessary braking events per operating hour. [f324, f249]

## User
Which of those are vendor claims or on-road only?

<details><summary>0 tool calls · 9s</summary>


</details>

## Agent
**Only the 42-month PEGASUS figure is on-road-only evidence. None of the eight is a vendor claim.** [f1204]

| Number | Evidence status |
|---|---|
| **<4 months** | The manufacturer’s required project window—not a demonstrated result or vendor performance claim. The booklet found no precedent for achieving it. [f3, f58] |
| **42 months** | **Independent, on-road evidence.** PEGASUS developed a validation method for one highway function; it is not an off-road braking-validation precedent. [f1204] |
| **299 trials** | A statistical requirement for demonstrating a ≤1% miss rate at 95% confidence with zero misses—not a vendor claim or road-specific result. [f126] |
| **300 hours** | A statistical exposure requirement, assuming representative operation and zero unnecessary brakes—not a vendor claim or road-specific result. [f129, f224] |
| **>7,000 test cells** | The booklet’s estimate of the off-road test-space size across sites, scenarios, conditions and machine models—not a measured vendor achievement. [f131] |
| **12 of 13 deaths** | US haul-truck collision-fatality evidence from 2005–2021—off-road, not a vendor claim. [f228] |
| **18% false alarms** | Historical off-road field evidence from the NIOSH Caterpillar 793B study—not a vendor claim. It should not be treated as a modern fleet benchmark. [f226] |
| **300 ms** | An off-road **standard requirement** in ISO 16001:2017, not a vendor performance claim. It applies to warning systems, not automatic braking. [f229, f161] |

## User
Debrief, honestly and briefly: in this conversation, what confused you or slowed you down? Which tool results were unclear, missing, too long or misleading, and what tool or information would have let you answer better? Do not use tools for this.

<details><summary>0 tool calls · 7s</summary>


</details>

## Agent
- **“Most important” needed a judgment call.** I chose decision-relevant figures, but the booklet offered 27 “figures worth remembering.” I should have made that selection criterion explicit immediately.
- **The synthesis result was useful but bulky.** It mixed hundreds of findings, numbers, gaps and project assumptions. A compact table of candidate numbers, significance and evidence labels would have sped up selection.
- **Evidence labels were uneven.** The detailed PEGASUS fact clearly said “Independent, on-road,” while many synthesis facts omitted labels. That made your follow-up require distinguishing statistical calculations, project requirements, standards and empirical findings—not merely checking “vendor” versus “independent.”
- **I made a verification-order mistake.** I rendered the first block before reading two supporting facts in full, then verified them afterward. They supported the wording, but verification should have come first.
- **The answer was less convenient than it could have been.** Two interactive blocks fragmented a simple eight-item request. One compact numbered table, with an evidence-status column from the outset, would have answered both your original question and much of your follow-up.
