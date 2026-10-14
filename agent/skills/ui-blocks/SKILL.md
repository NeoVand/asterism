---
name: ui-blocks
description: Catalog and JSON shapes of the interactive blocks show_ui can render in the chat (plan, timeline, comparison, metrics, risks, checklist, flow, sources, diagram) and when to use each. Read before the first show_ui call.
---

# UI blocks

`show_ui({ block })` renders one block in the chat. Call it after your research and BEFORE you write
your answer text; the chat displays your answer above the blocks, so refer to them as "below". Items carry `cites`: graph ids that light up
in the 3D view when the user hovers the item. Every item that states a fact should cite it.
Keep text short (blocks are compact cards, not essays). After a block, add only the reasoning and
caveats the block cannot carry. One or two blocks per answer is usually right.

## plan — phased plans and roadmaps
```json
{"type":"plan","title":"Virtual validation roadmap","subtitle":"Oct 2026 → staged release",
 "phases":[{"name":"Phase 0 · Define & record","window":"Oct–Dec 2026","start":"2026-10","end":"2026-12",
   "goal":"Fix the ODD, hazards and acceptance metrics; start fleet logging",
   "items":[{"text":"Scenario catalogue from ISO 21815-3 and EMESRT PR-5A","cites":["f12","f88"]}],
   "gate":{"name":"Scope gate","criteria":"ODD and acceptance metrics signed off","cites":["f301"]}}]}
```
3–6 phases, 2–6 items each. `start`/`end` (YYYY-MM) let the client draw the time axis.

## timeline — dated events, deadlines, regulatory dates
```json
{"type":"timeline","title":"Regulatory clock","events":[
 {"date":"2027-01-20","label":"EU Machinery Regulation applies","kind":"deadline","cites":["f40"]}]}
```
kinds: deadline, milestone, event, risk. Sort by date.

## comparison — options side by side
```json
{"type":"comparison","title":"Ways to build virtual job sites","columns":["Accuracy","Effort","Off-road maturity"],
 "rows":[{"label":"Procedural generation","cells":[{"text":"Medium","tone":"neutral","cites":["f1"]},
  {"text":"Low per site","tone":"good"},{"text":"Strongest record","tone":"good","cites":["f2"]}]}],
 "note":"Survey capture is the only method with a measurable accuracy standard."}
```
tones: good, warn, bad, neutral. Every row has one cell per column.

## metrics — 2–6 key figures
```json
{"type":"metrics","title":"Figures that size the problem","items":[
 {"value":"299","label":"zero-miss trials for ≤1% miss rate","detail":"95% confidence","cites":["f9"]}]}
```

## risks — likelihood × impact (1–3 each) with mitigation
```json
{"type":"risks","title":"Top programme risks","items":[
 {"risk":"Notified-body lead time exceeds the window","likelihood":2,"impact":3,
  "mitigation":"Engage a notified body in Phase 0","cites":["f41"]}]}
```

## checklist — actions or review questions
```json
{"type":"checklist","title":"Record now","items":[{"text":"Log the existing warning system through winter","detail":"…","cites":["f5"]}]}
```

## flow — a process in 2–9 steps
```json
{"type":"flow","title":"Correlate, then multiply","steps":[{"label":"Correlate","detail":"…","cites":["f7"]}]}
```

## sources — prior work list
```json
{"type":"sources","title":"Key prior work on sensor sim-to-real","ids":["s12","s15"],"note":"All on-road evidence"}
```
The client shows title, year, evidence label and link for each source id.

## diagram — one of the documents' own diagrams
```json
{"type":"diagram","id":"m4","note":"Simulation counts only after the physical tests correlate."}
```
Get the id from `find_diagrams`. Show the booklet's own diagram when the user asks for a figure,
flowchart, process or plan from the documents, or when it answers better than prose (decision
logic, phase plans, ladders, tool chains). Do not redraw those diagrams as flow blocks. The note is
optional: one line on what to look at. In your text, still say in a few sentences what the diagram
shows and why, citing the facts behind it (search for them; the diagram itself is not a citation).

## Rules
- Only cite ids that appeared in your tool results.
- Use the booklet's numbers and dates exactly as the facts give them.
- If show_ui rejects a block, fix the fields it names and call it again.
