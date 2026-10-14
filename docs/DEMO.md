# Seven-minute demo

Chrome on macOS, window maximized, `npm run dev` (or `npm run build && npm start`, port 3000).
Start from a new conversation (pencil icon) so the empty state shows.

1. **The constellation (30 s).** Let the layout settle: nine colored clusters are the glossary's
   topic areas; 20.5k stars are facts, concepts, entities and sources, 110k links. Drag to orbit,
   scroll to zoom. Hover a star to read it; click one to open its card (quote, sources, the
   chapters it connects to).
2. **Views (20 s).** Bottom right: "2D" flattens the constellation into a map seen from above
   (drag to pan); the bundle button switches between bundled highways and plain straight edges,
   and the edges visibly regather on the GPU. Back to 3D for the rest.
3. **The tour (45 s).** "New here? Take the one-minute tour" flies through the nine areas with one
   finding each. Press → twice, then Esc.
4. **Search (20 s).** ⌘K, type `Volvo CE Collision Mitigation`, Enter: the camera flies to the
   system and its card shows a synopsis stitched from every chapter that mentions it, each sentence
   cited.
5. **Read (60 s).** On the card, Read: the reader opens on the left at the passage where the system
   is described, highlighted. Hover other sentences (their stars light up), click one (the camera
   flies to it). Contents (top left of the reader) → Chapter 1 → scroll to "How the approaches are
   combined": the phase diagram, click it for full size. A citation chip opens its source; in the
   glossary, "Ch 8" chips jump into the booklet. The sparkle lights the stars of the page you are
   reading.
6. **A cross-chapter question (90 s).** Click the starter "Rules and deadlines". Watch the activity
   log (skills opened, searches, hubs, parallel researchers with their own steps) while the stars
   they touch light up. The answer streams with numbered citations, usually with a timeline
   block and its "today" marker; the gold answer constellation is drawn across the chapters it
   used. Hover a citation chip to light its star, click it to fly there.
7. **Planning (90 s).** New conversation → "Plan the validation". After a first look at the
   evidence the agent asks a short form (machines, sensors, assets, markets, capacity). Answer it;
   the plan comes back as phases, gates and dated tasks, tailored to the answers, and the agent
   remembers the project for next time (Settings → Memory & data).
8. **Grow the graph (45 s).** Drag `evals/fixtures/site-visit-notes.md` onto the window. Its facts
   are extracted and fly into the constellation, linked to the concepts they mention. Ask "Does
   our Nordberg winter logging plan cover what the booklet says a baseline needs?" to see the
   agent stitch the notes and the booklet.

Also worth a minute: + on a card (or "Add to chat" in ⌘K) puts stars or a whole search into the
composer as chips, so you can ask your own question about exactly those; and "show me the diagram
of the warn-or-brake logic" brings the glossary's flowchart into the chat.

Settings (gear): your own API key, model, system prompt, graph view options, memory. "Deep
research" in the composer gives the agent more reasoning and more researchers for hard questions.
