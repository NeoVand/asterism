# Asterism — vision

A desktop-grade knowledge and planning agent over the research booklet
_Virtual Validation of a Collision Mitigation System for Heavy Off-Road Machines_ and its
_Glossary and Prerequisites_ (both in `references/`).

## What it is

- **A fact graph, not a vector index.** Every claim, number, date, gap and disagreement in the
  booklet and glossary becomes a node, linked to the sources it cites, the glossary concepts
  and named entities it involves, the section it came from, and to facts elsewhere that restate,
  support, contradict or elaborate it. Retrieval is lexical search plus graph traversal.
- **A Deep Agent** (`deepagents`, TypeScript) that searches and walks that graph with its own
  tools, decomposes hard questions, stitches facts from different chapters, answers with streaming
  citations, and helps plan — asking the user questions through in-chat forms when a plan needs
  their constraints. Skills hold the long instructions (progressive disclosure); the system
  prompt stays lean.
- **A living 3D constellation.** Left: a WebGPU (three/webgpu + TSL) graph with GPU force layout,
  bundled glowing edges and bloom. When the agent searches, reads and cites, the matching stars
  light up and the answer draws its own asterism between the facts it used.
- **A chat that renders tools, not walls of text.** Right: a ChatGPT-like composer and history,
  live agent events, and generated UI blocks (plans, timelines, comparisons, risk matrices,
  question forms) whose items link back into the graph.

## Non-negotiables

- Model: `gpt-6.1-sol` via OpenAI. Bring-your-own key in Settings (model, system prompt); the dev
  `.env` key is used when no key is set. Keys are never logged.
- Desktop only, dark, quiet, no page scroll, no weird empty space, few lines; hugeicons; smooth
  eased motion; small moments of delight.
- Retrieval and generation quality are measured with evals and probed by talking to the real agent.
- Future-ready: new documents can be uploaded and woven into the graph by the same pipeline.

## Name

_Asterism_: a recognizable pattern of stars inside a larger constellation — which is what an
answer is inside the graph.
