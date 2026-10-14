---
name: graph-research
description: Playbook for answering any non-trivial question from the knowledge graph without missing facts scattered across chapters — query strategy, hub exploration, cross-chapter stitching, verification and citation. Read before research-heavy answers.
---

# Graph research playbook

The booklet repeats and refines itself: a claim appears in a chapter's Key findings, again in its
Detailed findings with numbers and sources, sometimes in a table, in the Cross-chapter synthesis,
in another chapter from a different angle, and in the glossary in plain words. A complete answer
finds all of these and reconciles them.

## 1. Decompose

Write down (mentally, or with `write_todos` for 3+ parts) the sub-questions. For each, list the
likely vocabulary: official names, acronyms, standard numbers, machine types, the glossary concept.
If a question has independent parts, delegate each to a `researcher` subagent in parallel with a
complete, self-contained question.

## 2. Search wide, then narrow

- Run 3–6 short `search_graph` queries per sub-question with different wordings: the user's words,
  the booklet's words ("collision mitigation", "automatic intervention", "Level 9"), acronyms
  (AEB, ODD, SIL/HIL, SOTIF), and specific names (ISO 21815, EMESRT PR-5A, MSHA).
- Use filters when they help: `types: ["term"]` to find the concept hub, `kinds: ["gap"]` for what
  was NOT found, `kinds: ["number"]` for figures, `kinds: ["disagreement","uncertain"]` for open
  questions, `chapters: [n]` to dig into one chapter, `near: [id]` to search around a node.
- Search results are snippets. Do not stop at the first page that looks fine.

## 3. Stitch through hubs

`explore` a concept (t…) or entity (e…) to see every fact linked to it grouped by chapter. This is
the main way to connect the dots: the same standard, regulation, machine or method shows up in
rules (Ch 3), precedents (Ch 2), planning (Ch 12) and objections (Ch 13). Look for:
- the same number reported in two places (and whether they agree),
- a finding in one chapter that is qualified, contradicted or made uncertain in another,
- glossary facts that explain why something matters.
Use `connect` when two findings seem related but you cannot see how.

## 4. Verify before you cite

`read_facts` on everything you will cite: check the exact wording, the evidence label
(Independent / Vendor / Expert opinion), whether it is on-road-only evidence, the date, and the
linked facts. Use `read_section` when a table or the exact wording matters.

## 5. Coverage checklist (quick self-check before writing)

- Did I look at the Key findings AND the Detailed findings of the relevant chapters?
- Did I check the cross-chapter synthesis (chapter 0) and the Skeptic's review (chapter 13)?
- Did I check gaps ("not found"), uncertainties and disagreements?
- Are all numbers, dates and standard numbers read from facts, not memory?
- Is any claim vendor-only or on-road-only? Say so.

## 6. Write

Answer first, then the support, citing [f…] after each claim. When sources conflict, show both
sides with their evidence labels. When the booklet has no answer, say what it did find and what
the manufacturer would need to supply.
