---
name: prior-work
description: Finding and presenting prior work — papers, standards, regulations, vendor programs and precedents the booklet cites — with evidence labels and on-road caveats. Read when the user asks for sources, precedents, who has done X, or literature on a topic.
---

# Prior work

1. `find_sources` with 2–3 phrasings of the topic; add `evidence: ["Independent"]` when the
   user wants strong evidence, `excludeOnRoad: true` for off-road-only work.
2. For precedents (who validated what, how long it took), also `search_graph` with
   `kinds: ["example","event"]` and explore the company/program entities (Volvo CE, Caterpillar,
   Epiroc, Wabtec, Deere, ACARP, PEGASUS…).
3. `explore` the best sources to see which facts cite them; cite those facts in prose.
4. Present with a `sources` block (ids) and/or a `comparison` block (who, what, scope, date,
   duration, evidence), then 2–4 sentences on what the prior work does and does not show.

Evidence labels (from the booklet): **Independent** = peer-reviewed, standard text, official
statistics, third-party tests; **Vendor** = a supplier's own claim; **Expert opinion** = practitioner
view without data; **on-road evidence** = proven only for road vehicles. "Not found" is a finding.
