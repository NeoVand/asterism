# Five-minute demo

Chrome on macOS, window maximized, `npm run dev` (or `npm run build && npm start`, port 3000).
Start from a new conversation (pencil icon) so the empty state shows.

1. **The constellation (30 s).** Let the layout settle: nine colored clusters are the glossary's
   topic areas; 20.5k stars are facts, concepts, entities and sources, 110k links. Drag to orbit,
   scroll to zoom. Hover a star to read it; click one to open its card (quote, sources, the
   chapters it connects to).
2. **The tour (45 s).** "New here? Take the one-minute tour" flies through the nine areas with one
   finding each. Press → twice, then Esc.
3. **Search (20 s).** ⌘K, type `Volvo CE Collision Mitigation`, Enter: the camera flies to the
   system and its card shows a synopsis stitched from every chapter that mentions it, each sentence
   cited.
4. **A cross-chapter question (90 s).** Click the starter "Rules and deadlines". Watch the activity
   log (skills opened, searches, hubs, parallel researchers with their own steps) while the stars
   they touch light up. The answer streams with numbered citations, usually with a timeline
   block and its "today" marker; the gold answer constellation is drawn across the chapters it
   used. Hover a citation chip to light its star, click it to fly there.
5. **Planning (90 s).** New conversation → "Plan the validation". After a first look at the
   evidence the agent asks a short form (machines, sensors, assets, markets, capacity). Answer it;
   the plan comes back as phases, gates and dated tasks, tailored to the answers, and the agent
   remembers the project for next time (Settings → Memory & data).
6. **Grow the graph (45 s).** Drag `evals/fixtures/site-visit-notes.md` onto the window. Its facts
   are extracted and fly into the constellation, linked to the concepts they mention. Ask "Does
   our Nordberg winter logging plan cover what the booklet says a baseline needs?" to see the
   agent stitch the notes and the booklet.

Settings (gear): your own API key, model, system prompt, graph view options, memory. "Deep
research" in the composer gives the agent more reasoning and more researchers for hard questions.
