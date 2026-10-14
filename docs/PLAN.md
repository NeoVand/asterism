# Asterism — build plan and status

Read with `docs/VISION.md`. Updated as work lands.

## Architecture

| Layer | Where | Notes |
|---|---|---|
| Parse | `scripts/kg/parse.ts` → `data/kg/parsed.json` | Sections (roles: key findings, uncertain, disagree, blind spots…), 931 extraction chunks, 1,205 canonical sources (1,437 citations), 361 glossary terms + A–Z aliases |
| Extract | `scripts/kg/extract.ts` → `data/kg/extract/k*.json` | `gpt-6.1-sol` (low effort), atomic self-contained facts with quote, kind, evidence label, on-road flag, citations, glossary-term ids, entities. Cached by chunk hash |
| Resolve | `scripts/kg/resolve.ts` → `data/kg/entities.json` | LLM merges entity variants; maps entities onto single-subject glossary concepts (group concepts keep members as entities with `is_a`) |
| Sources | `scripts/kg/sources.ts` → `data/kg/sources.json` | Clean title / by / year / kind for every source |
| Assemble | `scripts/kg/assemble.ts` → `data/kg/graph.json` | Stable fact ids (`data/kg/fact-ids.json`), topics (glossary Parts A–I) by vote |
| Link | `scripts/kg/link.ts` → `data/kg/links/*.json` | Per hub (concept/entity in ≥2 places): cited cross-chapter synopsis + fact↔fact relations (same, supports, contradicts, elaborates, depends) |
| Graph DB | `src/lib/server/kg/store.ts` | In-memory typed property graph, MiniSearch BM25 with stemming, alias expansion, role boosts; paths; raw section text |
| Agent | `src/lib/server/agent/*` | `deepagents` + ChatOpenAI (Responses API). Tools: search_graph, explore, read_facts, connect, read_section, find_sources, show_ui, ask_user (LangGraph interrupt). Researcher subagent. Skills in `agent/skills/*/SKILL.md`. Memories in `data/memories` |
| Stream | `src/routes/api/chat/+server.ts`, `src/lib/server/agent/run.ts` | SSE events: text, reasoning, tool, tool_end, graph (touch/read), todos, task, ui, interrupt, done |
| UI | `src/routes/+page.svelte`, `src/lib/chat/*`, `src/lib/graph/*`, `src/lib/blocks/*` | WebGPU renderer (TSL compute layout, bundled Bézier edges, bloom), scene labels, node card, ⌘K palette, chat panel, generative blocks |
| Evals | `evals/cases.json`, `evals/run.ts` | 20 cross-chapter cases with gold claims; judge = gpt-6.1-sol; reports in `evals/out/` |

Rebuild the graph: `parse → extract → resolve → sources → assemble → link → assemble`.

## Eval history (20, later 30 cases; judge score /5, answer recall, retrieval recall, citation precision)

- baseline: 3.10 · 48% · 67% · 90%
- + links/synopses, dedup folding: 3.65 · 57% · 87% · 97%
- + chapter/synthesis overviews, completeness prompt (low effort): 3.90 · 65% · 85% · 98%
- medium effort: 3.65 · 57% · 90% · 99.6% (slower; low stays default)
- 30 cases (10 added) + headline conclusions in search results: 3.83 · 67% · 84% · 99%
- + hyphen/spelling-aware tokenizer, blocks graded too: 3.90 · 68% · 86% · 99.5%
- + probe fixes (scope rule, ask_user only after research, Level-9 aliases, explore focus): 3.93 · 69.5% · 90.5% · 98%
- + evidence_brief (ranked, folded evidence pack before writing): 4.07 · 68% · 86% · 97.8%
- + search_graph shows strong matches outside a chapter filter: 3.97 · 70% · 89% · 97.8%
- 33 cases (SOTIF, detection range, proven in use); judge gives partial credit (half) for a claim
  missing a secondary detail, strict figure kept as "full". Two identical runs: 3.85 · 71.4% (full
  62.2%) · 87.7% · 97.7% and 3.85 · 70.9% (62.0%) · 90% · 97.7% — run-to-run noise ≈ ±1%.
- A/B, same judge: evidence_brief without the 20-fact floor and user-question ranking: 3.91 · 71.3%
  · 88.8% — neutral, kept. Injecting unread synthesis conclusions into the brief: 3.73 · 68.4% ·
  91.7% — retrieval up, answers worse; reverted.
- + brief favors deliberately read facts, honors its requested size; source results fold
  restatements; evals no longer see the user's memory: 3.91 · 71.4% (full 63.7%) · 89.4% · 97.8%
- + write_todos (todoListMiddleware, used in 6/33 multi-part cases); last turn's reads carry into
  follow-ups: **4.00 · 74.5% (full 66.0%) · 91.3% · 98.2%**, 44 s per answer
- Prompt "don't re-read researcher facts": 3.79 · 70.6% · 87.1%, no faster; reverted.

## Done

- Full pipeline and 20.6k-node / 110k-edge graph (16.6k facts, 2k entities, 1.2k sources, 361 concepts)
- Agent with skills, subagents, ask_user forms, UI blocks; SSE streaming; settings (BYO key, model, prompt)
- WebGPU constellation with live lighting, answer asterism trail, numbered cited labels, fly-to
- Production build (adapter-node), unit tests (search, folding, citations, blocks), Playwright e2e
- Upload: drop a document → chunk → extract → weave into the graph live (`src/lib/server/kg/ingest.ts`)
- Probes: multi-turn scenarios ending in the agent's own debrief (`evals/probe.ts`)
- Screenshots of key states: `npx tsx scripts/dev/screens.ts --ask` → `docs/screens/`

## Next

- Raise answer recall: most misses are facts the agent retrieved but left out of the answer
- More eval cases for planning, prior work and concept explanations
