/**
 * The agent's graph tools. Every tool streams a `graph` custom event naming the nodes it
 * touched or read, so the 3D view lights up while the agent works.
 */
import { tool } from '@langchain/core/tools';
import { dispatchCustomEvent } from '@langchain/core/callbacks/dispatch';
import type { RunnableConfig } from '@langchain/core/runnables';
import { getCurrentTaskInput, interrupt } from '@langchain/langgraph';
import { z } from 'zod';
import type { KGNode, NodeType, RelType } from '#lib/kg/types.ts';
import { Block, QuestionForm, type Answers } from '#lib/blocks/schema.ts';
import { getStore, type GraphStore } from '../kg/store.ts';
import { alsoNote, byImportance, chapterName, chapterTag, clip, foldDuplicates, line } from './format.ts';
import { CHAPTER_TITLES } from '#lib/kg/types.ts';

export type GraphEventMode = 'touch' | 'read';

/** Everything the agent has seen in the current turn, per thread (feeds evidence_brief). */
const seenByThread = new Map<string, Set<string>>();

export function resetSeen(threadId: string) {
	seenByThread.delete(threadId);
}

function threadOf(config: RunnableConfig | undefined): string {
	return String((config?.configurable as { thread_id?: string } | undefined)?.thread_id ?? 'default');
}

async function emit(config: RunnableConfig | undefined, mode: GraphEventMode, ids: string[]) {
	if (!ids.length) return;
	const t = threadOf(config);
	let seen = seenByThread.get(t);
	if (!seen) seenByThread.set(t, (seen = new Set()));
	if (seen.size < 6000) for (const id of ids) seen.add(id);
	try {
		await dispatchCustomEvent('graph', { mode, ids: [...new Set(ids)] }, config);
	} catch {
		/* not streaming (evals) */
	}
}

const ID_RE = /^[fstecdxg][A-Za-z0-9]*$/;

function groupBy<T>(items: T[], key: (t: T) => string) {
	const m = new Map<string, T[]>();
	for (const it of items) {
		const k = key(it);
		if (!m.has(k)) m.set(k, []);
		m.get(k)!.push(it);
	}
	return m;
}

/** Facts linked to a hub node, grouped by where they live — the cross-chapter "stitching" view. */
function factsByChapter(store: GraphStore, facts: KGNode[], perGroup: number, max: number): string[] {
	const out: string[] = [];
	const groups = groupBy(facts, (f) => (f.doc === 'glossary' ? 'G' : String(f.chapter ?? 0)));
	const order = [...groups.keys()].sort((a, b) => (a === 'G' ? 99 : Number(a)) - (b === 'G' ? 99 : Number(b)));
	let shown = 0;
	for (const g of order) {
		const list = groups.get(g)!.sort(byImportance);
		const name = g === 'G' ? 'Glossary' : chapterName(Number(g));
		out.push(`  ${name} — ${list.length} fact${list.length > 1 ? 's' : ''}`);
		for (const f of foldDuplicates(store, list, perGroup)) {
			if (shown >= max) break;
			out.push(`    ${line(store, f.node, 220)}${f.also.length ? ` (+${f.also.length} restatement${f.also.length > 1 ? 's' : ''})` : ''}`);
			shown++;
		}
	}
	return out;
}

export function makeTools() {
	const searchGraph = tool(
		async ({ query, types, chapters, kinds, near, limit }, config) => {
			const store = getStore();
			const max = Math.min(limit ?? 14, 40);
			const raw = store.search(query, {
				types: types as NodeType[] | undefined,
				chapters,
				kinds,
				near,
				limit: max * 3
			});
			const hits = foldDuplicates(store, raw.map((h) => h.node), max);
			// The booklet's own conclusions on this topic come first, so answers anchor on them.
			const wantsFacts = !types || types.includes('fact');
			const shownIds = new Set(hits.flatMap((h) => [h.node.id, ...h.also.map((a) => a.id)]));
			const headline = wantsFacts && !chapters?.length && !kinds?.length
				? foldDuplicates(
						store,
						store
							.search(query, { types: ['fact'], roles: ['synthesis', 'key-findings'], near, limit: 12 })
							.map((h) => h.node)
							.filter((n) => !shownIds.has(n.id)),
						4
					)
				: [];
			// A chapter filter can hide the best evidence (precedents live in Ch1 and Ch2, rules in Ch3
			// and the glossary…), so point at strong matches the filter left out.
			const outside = chapters?.length
				? foldDuplicates(
						store,
						store
							.search(query, { types: types as NodeType[] | undefined, kinds, near, limit: 16 })
							.map((h) => h.node)
							.filter((n) => !shownIds.has(n.id) && n.type === 'fact' && !chapters.includes(n.chapter ?? -1)),
						4
					)
				: [];
			await emit(config, 'touch', [...hits, ...headline, ...outside].flatMap((h) => [h.node.id, ...h.also.map((a) => a.id)]));
			const outsideLines = outside.length
				? [
						'',
						`Strong matches outside ${chapters!.map((c) => (c ? `Ch${c}` : 'the introduction')).join('/')} (search those chapters too):`,
						...outside.map((h) => line(store, h.node, 220) + alsoNote(h.also))
					]
				: [];
			if (!hits.length) {
				return [
					`No matches for "${query}" with these filters. Try other wording, a synonym or acronym, fewer filters, or explore a related concept.`,
					...outsideLines
				].join('\n');
			}
			let synopses = 0;
			const lines = hits.map((h) => {
				let l = line(store, h.node, 260) + alsoNote(h.also);
				if (h.node.synopsis && synopses < 3 && (h.node.type === 'term' || h.node.type === 'entity')) {
					synopses++;
					l += `\n    synopsis: ${clip(h.node.synopsis, 700)}`;
				}
				return l;
			});
			const chapterSpread = new Set(hits.flatMap((h) => [h.node, ...h.also]).filter((n) => n.type === 'fact').map((n) => chapterTag(n)));
			return [
				...(headline.length
					? ['Booklet conclusions on this (synthesis / key findings):', ...headline.map((h) => line(store, h.node, 300) + alsoNote(h.also)), '']
					: []),
				`${hits.length} matches for "${query}"${chapterSpread.size > 1 ? ` across ${[...chapterSpread].join(', ')}` : ''}:`,
				...lines,
				...outsideLines,
				'',
				'Next: explore hub ids (t…, e…) to see every chapter that discusses them, or a chapter (c0 synthesis, c1…c13) for its key findings, uncertainties and gaps; read_facts for citations and linked facts.'
			].join('\n');
		},
		{
			name: 'search_graph',
			description:
				'Full-text search over the knowledge graph (facts, glossary concepts, entities, sources, sections) with acronym/alias expansion. Use several short, specific queries with different wordings rather than one long one. Filter by node types, booklet chapters (0 = intro/synthesis) or fact kinds.',
			schema: z.object({
				query: z.string().describe('Keywords, names, standard numbers or a short phrase'),
				types: z
					.array(z.enum(['fact', 'term', 'entity', 'source', 'section', 'chapter']))
					.optional()
					.describe('Restrict node types; omit for all'),
				chapters: z.array(z.number().int().min(0).max(13)).optional(),
				kinds: z
					.array(
						z.enum([
							'finding',
							'number',
							'definition',
							'requirement',
							'recommendation',
							'gap',
							'uncertain',
							'disagreement',
							'risk',
							'event',
							'method',
							'example'
						])
					)
					.optional()
					.describe('Fact kinds, e.g. ["gap"] for what was not found, ["number"] for figures'),
				near: z.array(z.string()).optional().describe('Only return nodes within 2 hops of these ids'),
				limit: z.number().int().min(1).max(40).optional()
			})
		}
	);

	const explore = tool(
		async ({ id, limit, focus }, config) => {
			const store = getStore();
			const n = store.get(id);
			if (!n) return `Unknown id ${id}. Ids look like f123 (fact), t12 (concept), e45 (entity), s67 (source), x89 (section), c3 (chapter).`;
			const max = Math.min(limit ?? 24, 60);
			const nb = store.neighbors(id);
			const nodesOf = (rels: RelType[], types?: NodeType[]) =>
				nb.filter((a) => rels.includes(a.r)).map((a) => store.get(a.id)!).filter((x) => !types || types.includes(x.type));
			const out: string[] = [line(store, n, 600)];
			const touched: string[] = [];
			if (n.synopsis) out.push(`Synopsis: ${n.synopsis}`);

			if (n.type === 'term' || n.type === 'entity') {
				let facts = nodesOf(['uses', 'about', 'states']).filter((x) => x.type === 'fact');
				const total = facts.length;
				if (focus?.trim()) {
					// Question-focused view: only the hub's facts that match the focus, best first.
					const scores = store.scoreWithin(focus, new Set(facts.map((f) => f.id)));
					facts = facts.filter((f) => scores.has(f.id)).sort((a, b) => scores.get(b.id)! - scores.get(a.id)!);
					out.push(`Facts matching "${focus}" (${facts.length} of ${total}), by where they appear:`);
					out.push(...factsByChapter(store, facts.slice(0, max * 2), max, max));
				} else {
					out.push(`Facts (${total}), by where they appear${total > max ? ` — showing the most important; pass focus to narrow` : ''}:`);
					out.push(...factsByChapter(store, facts, Math.max(2, Math.ceil(max / 8)), max));
				}
				touched.push(...facts.slice(0, 200).map((f) => f.id));
				const related = nodesOf(['related', 'is_a']);
				if (related.length) out.push(`Related: ${related.slice(0, 16).map((r) => `${r.id} ${r.label}`).join('; ')}`);
				const chapters = nodesOf(['discussed_in']);
				if (chapters.length) out.push(`Discussed in: ${chapters.map((c) => c.label).join('; ')}`);
				// Entities and concepts that co-occur with this hub most often.
				const co = new Map<string, number>();
				for (const f of facts) for (const a of store.neighbors(f.id, { rels: ['about', 'uses'] })) if (a.id !== id) co.set(a.id, (co.get(a.id) ?? 0) + 1);
				const top = [...co.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
				if (top.length) out.push(`Often together with: ${top.map(([k, c]) => `${k} ${store.get(k)!.label} (${c})`).join('; ')}`);
			} else if (n.type === 'fact') {
				out.push(`Where: ${store.where(n)}`);
				if (n.quote) out.push(`Quote: "${clip(n.quote, 320)}"`);
				const srcs = nodesOf(['cites']);
				if (srcs.length) out.push('Cites:', ...srcs.map((s) => `  ${line(store, s, 200)}`));
				const rel = nb.filter((a) => ['same', 'supports', 'contradicts', 'elaborates', 'depends'].includes(a.r));
				if (rel.length) {
					out.push('Linked facts elsewhere:');
					for (const a of rel.slice(0, 12)) out.push(`  ${a.r}${a.note ? ` (${clip(a.note, 90)})` : ''}: ${line(store, store.get(a.id)!, 200)}`);
				}
				const hubs = nodesOf(['uses', 'about']);
				if (hubs.length) out.push(`Concepts & entities: ${hubs.map((h) => `${h.id} ${h.label}`).join('; ')}`);
				const sec = nb.find((a) => a.r === 'states' && !a.out);
				if (sec) {
					const siblings = store
						.neighbors(sec.id, { rels: ['states'] })
						.map((a) => store.get(a.id)!)
						.filter((x) => x.id !== id)
						.sort(byImportance)
						.slice(0, 6);
					if (siblings.length) out.push(`Same section (${sec.id}):`, ...siblings.map((s) => `  ${line(store, s, 180)}`));
					touched.push(...siblings.map((s) => s.id));
				}
				touched.push(...srcs.map((s) => s.id), ...rel.map((r) => r.id), ...hubs.map((h) => h.id));
			} else if (n.type === 'source') {
				const facts = nodesOf(['cites']);
				if (n.url) out.push(`URL: ${n.url}`);
				out.push(`Cited by ${facts.length} facts:`, ...facts.sort(byImportance).slice(0, max).map((f) => `  ${line(store, f, 220)}`));
				touched.push(...facts.map((f) => f.id));
			} else if (n.type === 'chapter' && n.chapter != null) {
				// The chapter's own summary: key findings (or the cross-chapter synthesis), then
				// what is established, uncertain, disputed and missing.
				const facts = store.chapterFacts.get(n.chapter) ?? [];
				const byRole = (roles: string[]) => facts.filter((f) => roles.includes(store.roleOf(f) ?? ''));
				if (n.chapter === 0) {
					// The synthesis is the booklet's own top-level answer: show every subsection.
					const bySection = new Map<string, KGNode[]>();
					for (const f of byRole(['synthesis'])) {
						const title = store.section(f.sectionId!)?.title ?? 'Synthesis';
						if (!bySection.has(title)) bySection.set(title, []);
						bySection.get(title)!.push(f);
					}
					out.push(`Cross-chapter synthesis — ${bySection.size} subsections:`);
					for (const [title, list] of bySection) {
						const folded = foldDuplicates(store, list.sort(byImportance), Math.max(3, Math.round(max / 6)));
						out.push(`  ${title} (${list.length}):`, ...folded.map((f) => `    ${line(store, f.node, 220)}`));
						touched.push(...folded.map((f) => f.node.id));
					}
					out.push('(Search with chapters:[0] to read a subsection in full.)');
				}
				const groups: [string, KGNode[], number][] =
					n.chapter === 0
						? [['Introduction', byRole(['front']), 8]]
						: [
								['Key findings', byRole(['key-findings']), 30],
								['Well established', byRole(['established']), 10],
								['Uncertain', byRole(['uncertain']), 8],
								['Where experts disagree', byRole(['disagree']), 8],
								['Blind spots (not found / not asked)', byRole(['blind-spots']), 10]
							];
				for (const [title, list, cap] of groups) {
					if (!list.length) continue;
					const folded = foldDuplicates(store, list, cap);
					out.push(`${title} (${list.length}):`, ...folded.map((f) => `  ${line(store, f.node, 240)}`));
					touched.push(...folded.map((f) => f.node.id));
				}
				const children = nodesOf(['contains']).filter((x) => nb.find((a) => a.id === x.id)?.out);
				if (children.length) out.push(`Sections: ${children.slice(0, 40).map((c) => `${c.id} ${c.label}`).join('; ')}`);
				out.push(`(${facts.length} facts in this chapter; search with chapters:[${n.chapter}] to dig deeper.)`);
			} else {
				const children = nodesOf(['contains']).filter((x) => nb.find((a) => a.id === x.id)?.out);
				const facts = nodesOf(['states']).sort(byImportance);
				if (children.length) out.push(`Subsections: ${children.slice(0, 30).map((c) => `${c.id} ${c.label}`).join('; ')}`);
				if (facts.length) out.push(`Facts (${facts.length}):`, ...facts.slice(0, max).map((f) => `  ${line(store, f, 220)}`));
				touched.push(...children.map((c) => c.id), ...facts.slice(0, max).map((f) => f.id));
			}
			await emit(config, 'read', [id]);
			await emit(config, 'touch', touched);
			return out.join('\n');
		},
		{
			name: 'explore',
			description:
				'Open one node and walk its neighborhood. For a concept (t…) or entity (e…): its cross-chapter synopsis and EVERY linked fact grouped by chapter — the best way to stitch together what different chapters say about one thing. For a chapter (c0 = cross-chapter synthesis, c1…c13): its key findings, what is established, uncertain, disputed and not found. For a fact: its quote, sources, linked facts in other chapters (same/supports/contradicts/elaborates) and section siblings. Also works for sources and sections.',
			schema: z.object({
				id: z.string().describe('Node id, e.g. t25, e12, f340, s88, x120, c8'),
				limit: z.number().int().min(4).max(60).optional().describe('Max listed items (default 24)'),
				focus: z
					.string()
					.optional()
					.describe('For concepts/entities with many facts: a few words to show only the facts about that aspect, e.g. "winter recording"')
			})
		}
	);

	const readFacts = tool(
		async ({ ids }, config) => {
			const store = getStore();
			const out: string[] = [];
			const read: string[] = [];
			for (const id of ids.slice(0, 30)) {
				const n = store.get(id);
				if (!n) {
					out.push(`${id}: unknown id`);
					continue;
				}
				read.push(id);
				if (n.type !== 'fact') {
					out.push(line(store, n, 500));
					continue;
				}
				const srcs = store.neighbors(id, { rels: ['cites'] }).map((a) => store.get(a.id)!);
				const rel = store
					.neighbors(id)
					.filter((a) => ['same', 'supports', 'contradicts', 'elaborates', 'depends'].includes(a.r));
				out.push(
					[
						line(store, n, 800),
						`  where: ${store.where(n)}`,
						n.quote ? `  quote: "${clip(n.quote, 300)}"` : '',
						srcs.length ? `  sources: ${srcs.map((s) => `${s.id} ${clip(s.label, 90)} [${s.evidence ?? '?'}${s.onRoad ? ', on-road' : ''}]`).join(' | ')}` : '',
						rel.length ? `  linked: ${rel.slice(0, 6).map((a) => `${a.r} ${a.id}`).join(', ')}` : ''
					]
						.filter(Boolean)
						.join('\n')
				);
			}
			await emit(config, 'read', read);
			return out.join('\n');
		},
		{
			name: 'read_facts',
			description:
				'Read full facts (or any nodes) by id: complete text, location, verbatim quote, sources with evidence labels, and links to facts in other chapters. Read every fact you intend to cite.',
			schema: z.object({ ids: z.array(z.string()).min(1).max(30) })
		}
	);

	const connect = tool(
		async ({ from, to }, config) => {
			const store = getStore();
			const a = store.get(from);
			const b = store.get(to);
			if (!a || !b) return `Unknown id: ${!a ? from : to}`;
			const paths = store.paths(from, to, 5, 3);
			if (!paths.length) return `No path within 5 hops between ${from} and ${to} (outside structural hubs).`;
			const out = [`Paths from ${line(store, a, 140)} to ${line(store, b, 140)}:`];
			const all: string[] = [];
			paths.forEach((p, i) => {
				out.push(`Path ${i + 1} (${p.length - 1} hops):`);
				for (let k = 0; k < p.length; k++) {
					const n = store.get(p[k])!;
					const e = k > 0 ? store.edgeBetween(p[k - 1], p[k]) : null;
					out.push(`  ${e ? `—${e.r}${e.note ? ` (${clip(e.note, 80)})` : ''}→ ` : ''}${line(store, n, 200)}`);
					all.push(p[k]);
				}
			});
			await emit(config, 'read', all);
			return out.join('\n');
		},
		{
			name: 'connect',
			description:
				'Find how two nodes are connected (up to 3 short paths through shared concepts, entities, sources and fact-to-fact links). Use it to connect the dots between findings in different chapters.',
			schema: z.object({ from: z.string(), to: z.string() })
		}
	);

	const readSection = tool(
		async ({ id, offset }, config) => {
			const store = getStore();
			let sid = id;
			const n = store.get(id);
			if (n?.type === 'fact' && n.sectionId) sid = n.sectionId;
			if (n?.type === 'term' && n.sectionId) sid = n.sectionId;
			const sec = store.section(sid);
			if (!sec) return `No section for ${id}. Pass a section id (x…), or a fact/concept id to read its section.`;
			const { text, total, next } = store.sectionText(sid, offset ?? 0, 7000);
			await emit(config, 'read', [store.get(sid) ? sid : id]);
			return [
				`${sid} ${sec.path.join(' › ')} (${total} chars${offset ? `, from ${offset}` : ''})`,
				text,
				next ? `\n[continues — call read_section with offset ${next}]` : ''
			].join('\n');
		},
		{
			name: 'read_section',
			description:
				'Read the original markdown of a booklet or glossary section (tables, lists, full wording). Pass a section id, or a fact/concept id to read the section it came from. Use when the exact wording, a table or surrounding context matters.',
			schema: z.object({ id: z.string(), offset: z.number().int().min(0).optional() })
		}
	);

	const findSources = tool(
		async ({ query, evidence, excludeOnRoad, chapters, limit }, config) => {
			const store = getStore();
			let hits = store.search(query, { types: ['source'], limit: 80 });
			// Also surface sources cited by the best matching facts.
			const factHits = store.search(query, { types: ['fact'], chapters, limit: 25 });
			const viaFacts = new Map<string, number>();
			for (const f of factHits) for (const a of store.neighbors(f.id, { rels: ['cites'] })) viaFacts.set(a.id, (viaFacts.get(a.id) ?? 0) + f.score);
			const scored = new Map<string, number>();
			for (const h of hits) scored.set(h.id, h.score);
			for (const [id, s] of viaFacts) scored.set(id, (scored.get(id) ?? 0) + s * 0.6);
			let list = [...scored.entries()].map(([id, score]) => ({ node: store.get(id)!, score }));
			if (evidence?.length) list = list.filter((x) => x.node.evidence && evidence.includes(x.node.evidence));
			if (excludeOnRoad) list = list.filter((x) => !x.node.onRoad);
			if (chapters?.length) list = list.filter((x) => store.sourceChapters(x.node.id).some((c) => chapters.includes(c)));
			list.sort((a, b) => b.score - a.score);
			list = list.slice(0, Math.min(limit ?? 12, 30));
			hits = [];
			await emit(config, 'touch', list.map((x) => x.node.id));
			if (!list.length) return `No sources found for "${query}" with these filters.`;
			return [
				`${list.length} sources for "${query}":`,
				...list.map((x) => {
					const chs = store.sourceChapters(x.node.id).map((c) => `Ch${c}`).join(',');
					const facts = store.neighbors(x.node.id, { rels: ['cites'] }).map((a) => store.get(a.id)!).sort(byImportance);
					return `${line(store, x.node, 240)} {${chs}}${facts[0] ? `\n    e.g. ${facts[0].id}: ${clip(facts[0].text, 160)}` : ''}`;
				})
			].join('\n');
		},
		{
			name: 'find_sources',
			description:
				'Search prior work: the 1,200 sources the booklet cites (papers, standards, regulations, vendor material, reports), ranked by direct match and by how strongly matching facts cite them. Filter by evidence label, chapter, or exclude on-road-only evidence.',
			schema: z.object({
				query: z.string(),
				evidence: z.array(z.enum(['Independent', 'Vendor', 'Expert opinion'])).optional(),
				excludeOnRoad: z.boolean().optional(),
				chapters: z.array(z.number().int().min(0).max(13)).optional(),
				limit: z.number().int().min(1).max(30).optional()
			})
		}
	);

	const showUi = tool(
		async ({ block }, config) => {
			const parsed = Block.safeParse(block);
			if (!parsed.success) {
				return `Block rejected: ${parsed.error.issues
					.slice(0, 5)
					.map((i) => `${i.path.join('.')}: ${i.message}`)
					.join('; ')}. Fix the JSON and call show_ui again.`;
			}
			const store = getStore();
			const ids = JSON.stringify(parsed.data).match(/"[fstecx]\d+"/g)?.map((s) => s.slice(1, -1)) ?? [];
			const unknown = ids.filter((i) => !store.get(i));
			await emit(config, 'read', ids.filter((i) => store.get(i)));
			try {
				await dispatchCustomEvent('ui', { block: parsed.data }, config);
			} catch {
				/* not streaming */
			}
			return `Rendered the ${parsed.data.type} block in the chat${unknown.length ? ` (ignored unknown ids: ${unknown.join(', ')})` : ''}. The user sees it now: do not repeat its contents in prose — add only what the block cannot say (the reasoning, caveats, the decision you recommend), citing facts inline.`;
		},
		{
			name: 'show_ui',
			description:
				'Render an interactive block in the chat: plan (phases, items, gates), timeline (dated events, deadlines), comparison (table), metrics (key figures), risks (likelihood × impact with mitigations), checklist, flow (steps) or sources (list of source ids). Items carry `cites` (graph ids) that light up on hover. Read the ui-blocks skill before the first use.',
			schema: z.object({ block: z.any().describe('One block object; see the ui-blocks skill for shapes') })
		}
	);

	const askUser = tool(
		async (form) => {
			const parsed = QuestionForm.safeParse(form);
			if (!parsed.success) {
				return `Form rejected: ${parsed.error.issues
					.slice(0, 5)
					.map((i) => `${i.path.join('.')}: ${i.message}`)
					.join('; ')}`;
			}
			const answers = interrupt({ type: 'questions', form: parsed.data }) as Answers | { skipped: true };
			if ('skipped' in answers) return 'The user skipped the questions. Proceed with clearly stated assumptions, and say which ones they should confirm.';
			const lines = parsed.data.questions.map((q) => {
				const a = answers[q.id];
				const v = Array.isArray(a) ? a.join(', ') : a == null || a === '' ? '(no answer)' : String(a);
				return `- ${q.label}: ${v}${q.unit && typeof a === 'number' ? ` ${q.unit}` : ''}`;
			});
			return `The user answered:\n${lines.join('\n')}\nUse these answers; do not ask again for what they already told you.`;
		},
		{
			name: 'ask_user',
			description:
				"Ask the user a few structured questions in an in-chat form (single choice, multiple choice, short text or a numeric scale) and wait for the answers. ONLY for building a plan or a tailored recommendation whose shape depends on facts only the user knows (machines in scope, sensors, software reuse, markets, deadline, team) — never for factual, explanatory or general-advice questions, which you answer directly from the graph. Research first, then ask at most once per request, 2–5 questions with good options.",
			schema: QuestionForm
		}
	);

	const evidenceBrief = tool(
		async ({ question, max }, config) => {
			const store = getStore();
			const seen = seenByThread.get(threadOf(config));
			const seenFacts = [...(seen ?? [])].map((id) => store.get(id)).filter((n): n is KGNode => n?.type === 'fact');
			if (!seenFacts.length) return 'You have not looked at any facts yet in this turn. Research first (search_graph, explore), then call evidence_brief.';
			const legacy = process.env.ASTERISM_BRIEF_LEGACY === '1'; // TEMP A/B
			const asked = legacy ? '' : lastUserMessage();
			// The booklet's own conclusions on the question compete for a place even if the
			// research did not reach them.
			const conclusions = legacy
				? []
				: store
						.search(`${asked} ${question}`, { types: ['fact'], roles: ['synthesis', 'key-findings'], limit: 10 })
						.map((h) => h.node)
						.filter((n) => !seen?.has(n.id));
			const facts = [...seenFacts, ...conclusions];
			// Rank against both the agent's restatement and the user's own words: restatements
			// tend to narrow the question and drop parts of it.
			const ids = new Set(facts.map((f) => f.id));
			const scores = blend(store.scoreWithin(question, ids), asked ? store.scoreWithin(asked, ids) : new Map());
			const ROLE: Record<string, number> = { synthesis: 1.5, 'key-findings': 1.35, disagree: 1.15, uncertain: 1.1, 'blind-spots': 1.05 };
			const ranked = facts
				.map((f) => ({ f, score: (scores.get(f.id) ?? 0) * (ROLE[store.roleOf(f) ?? ''] ?? 1) * (0.8 + 0.1 * (f.importance ?? 2)) }))
				.filter((x) => x.score > 0)
				.sort((a, b) => b.score - a.score)
				.map((x) => x.f);
			const folded = foldDuplicates(store, ranked, Math.min(legacy ? (max ?? 28) : Math.max(max ?? 28, 20), 40));
			const isHeadline = (n: KGNode) => ['synthesis', 'key-findings'].includes(store.roleOf(n) ?? '');
			const isTension = (n: KGNode) =>
				['gap', 'uncertain', 'disagreement'].includes(n.kind ?? '') || ['disagree', 'uncertain', 'blind-spots'].includes(store.roleOf(n) ?? '');
			const headline = folded.filter((x) => isHeadline(x.node) && !isTension(x.node));
			const tension = folded.filter((x) => isTension(x.node));
			const detail = folded.filter((x) => !isHeadline(x.node) && !isTension(x.node));
			const fmt = (x: { node: KGNode; also: KGNode[] }) => `  ${line(store, x.node, 320)}${alsoNote(x.also)}`;
			await emit(config, 'read', folded.map((x) => x.node.id));
			return [
				`Evidence brief for: ${question}`,
				`(${folded.length} most relevant of the ${seenFacts.length} facts you saw this turn${conclusions.length ? ' and the booklet’s matching conclusions' : ''}; restatements folded)`,
				headline.length ? `\nBooklet conclusions:\n${headline.map(fmt).join('\n')}` : '',
				detail.length ? `\nSupporting detail:\n${detail.map(fmt).join('\n')}` : '',
				tension.length ? `\nGaps, uncertainties and tensions:\n${tension.map(fmt).join('\n')}` : '',
				'\nWrite the answer now from this brief: state every booklet conclusion above that bears on the question (with its exact numbers, dates and names), then the supporting detail, then the gaps. Cite the ids. If something important is missing, research it first.'
			]
				.filter(Boolean)
				.join('\n');
		},
		{
			name: 'evidence_brief',
			description:
				'Call once when your research is done, right before writing the answer: returns the most relevant facts you have seen in this turn (search results, explored hubs, read facts), deduplicated and ranked, with the booklet\'s own conclusions first, then detail, then gaps and tensions. Write your answer from it.',
			schema: z.object({
				question: z.string().describe('The question you are answering, in your words'),
				max: z.number().int().min(8).max(40).optional()
			})
		}
	);

	return { searchGraph, explore, readFacts, connect, readSection, findSources, showUi, askUser, evidenceBrief };
}

/** Sum of two score maps, each normalized to its best score. */
function blend(a: Map<string, number>, b: Map<string, number>): Map<string, number> {
	const out = new Map<string, number>();
	for (const m of [a, b]) {
		const top = Math.max(0, ...m.values());
		if (!top) continue;
		for (const [id, v] of m) out.set(id, (out.get(id) ?? 0) + v / top);
	}
	return out;
}

/** The latest user message in the running agent's state (empty outside a graph run). */
function lastUserMessage(): string {
	try {
		const msgs = (getCurrentTaskInput() as { messages?: { content: unknown; getType?: () => string; type?: string }[] })?.messages ?? [];
		for (let i = msgs.length - 1; i >= 0; i--) {
			const m = msgs[i];
			if ((m.getType?.() ?? m.type) !== 'human') continue;
			const c = m.content;
			return typeof c === 'string' ? c : Array.isArray(c) ? c.map((x: { text?: string }) => x.text ?? '').join(' ') : '';
		}
	} catch {
		// Not inside a graph run (unit tests, scripts).
	}
	return '';
}

export function isNodeId(s: string) {
	return ID_RE.test(s);
}
