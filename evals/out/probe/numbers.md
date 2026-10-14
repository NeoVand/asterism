# Probe: numbers

## User
Give me the 8 most important numbers in this research, with what they mean.

<details><summary>13 tool calls · 36s</summary>

- read_file {"file_path":"/skills/graph-research/SKILL.md","limit":1000}
- explore {"id":"c0","limit":40}
- search_graph {"query":"","kinds":["number"],"limit":40}
- read_file {"file_path":"/skills/ui-blocks/SKILL.md","limit":1000}
- search_graph {"query":"figures","chapters":[0],"kinds":["number"],"limit":35}
- search_graph {"query":"latency","chapters":[0],"limit":10}
- search_graph {"query":"2027 regulation","chapters":[0],"limit":8}
- explore {"id":"c13","limit":8}
- read_facts {"ids":["f3","f4","f58","f60","f220","f222","f224","f228","f239","f144","f52","f249","f126"]}
- read_facts {"ids":["f81","f129","f82","f62"]}
- evidence_brief {"question":"Select eight most decision-important numbers across the research and explain their meaning: validation window, capability prece
- show_ui {"block":{"type":"comparison","title":"Eight numbers that matter most","columns":["Number","What it means"],"rows":[{"label":"1 · Validation
- [ui block: comparison]
</details>

## Agent
These are my **eight most decision-important numbers**, shown below with their meaning and evidence caveats.

Together, they capture the research’s central message: **move validation work ahead of hardware arrival**—the booklet found no precedent for completing accepted validation of a new automatic-braking function from first representative hardware in about four months. Statistical evidence and simulator credibility, not simply test volume, constrain the programme. [f62, f58, f10409]

## User
Which of those are vendor claims or on-road only?

<details><summary>3 tool calls · 21s</summary>

- evidence_brief {"question":"Which of the eight previously selected numbers are vendor claims or on-road-only evidence? Classify 4 months,42 months,299 tria
- read_facts {"ids":["f3","f60","f126","f129","f224","f228","f239","f81","f52"]}
- evidence_brief {"question":"Classify the eight numbers by vendor versus independent and on-road-only provenance.","max":9}
</details>

## Agent
**Two are on-road-only evidence; none of the eight is labelled a vendor claim.** The four-month deadline is a project requirement, not an independently demonstrated capability. [f60, f81, f3]

| Number | Evidence status | Important caveat |
|---|---|---|
| **42 months** — PEGASUS | Independent, **on-road** | A capability-building precedent involving 17 partners—not a demonstrated off-road validation schedule. [f60] |
| **1–4 metres** — neural-reconstruction viewpoint shift | Independent, **on-road** | Not an established off-road tolerance or guarantee. [f81] |
| **Less than 4 months** — validation window | Project requirement; not a vendor performance claim | Describes the requested deadline, not evidence that it is achievable. [f3] |
| **299 zero-miss trials** | Independent statistical result | Requires independent trials **per population**; not a measured machine-performance result. [f126] |
| **300 event-free hours** | Independent statistical result | Supports fewer than one unnecessary brake per 100 hours at 95% confidence; not a field-performance claim. [f129, f224] |
| **12 of 13 deaths** — forward motion | Independent, **off-road** accident evidence | Specifically US haul-truck collision deaths during 2005–2021. [f228] |
| **0.3–2.5 seconds** — brake response | Independent published evidence; not labelled on-road-only | Combines different brake technologies and MSHA weight-class tables—not a measured range for your machines. [f239] |
| **20 January 2027** | Independent regulatory requirement | The EU Machinery Regulation’s application date, not a performance claim. [f52] |

## User
Debrief, honestly and briefly: in this conversation, what confused you or slowed you down? Which tool results were unclear, missing, too long or misleading, and what tool or information would have let you answer better? Do not use tools for this.

<details><summary>0 tool calls · 8s</summary>


</details>

## Agent
- **“Most important” required judgment.** I chose a programme-wide mix, but should have made the selection criterion explicit rather than implying a definitive top eight.
- **Some retrieval was inefficient.** An empty-query search for numeric facts returned nothing. Exploring the synthesis was much more useful, although its output was long.
- **Evidence labels needed care.** Some synthesis facts carried explicit “Independent” and “on-road” labels; others had no label or inherited evidence through linked facts. Missing labels should not be mistaken for independent evidence.
- **The follow-up exposed a tool limitation.** `evidence_brief` did not recognize facts retrieved in the previous turn, so I had to fetch them again. Cross-turn retrieval history would have avoided that.
- **My presentation was too indirect.** I put all eight numbers in an interactive block and left almost none in the main answer. A compact, directly readable table would have been clearer.

The most useful improvement would be a **ranked key-numbers view with explicit provenance, applicability limits, and project-requirement versus research-result labels**.
