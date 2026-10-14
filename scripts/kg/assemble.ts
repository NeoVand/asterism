/**
 * Stage 4: assemble the knowledge graph from the parsed corpus, the per-chunk extractions,
 * the entity resolution map (optional) and the cross-chapter links (optional).
 *
 *   npx tsx scripts/kg/assemble.ts
 *
 * Output: data/kg/graph.json
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import type {
	EntityKind,
	FactKind,
	KGEdge,
	KGNode,
	KGraph,
	ParsedCorpus,
	RelType,
	TopicKey
} from '../../src/lib/kg/types';
import { CHAPTER_TITLES, CHAPTER_TOPIC, TOPICS } from '../../src/lib/kg/types';
import type { ExtractResult } from './extract';

const ROOT = new URL('../../', import.meta.url).pathname;
const DATA = `${ROOT}data/kg`;

export function entityKey(name: string): string {
	return name
		.toLowerCase()
		.replace(/[’']/g, '')
		.replace(/\b(iso|iec|sae|astm|en|as|bs|din)\s*\/\s*/g, '$1/')
		.replace(/:(19|20)\d\d\b/g, '')
		.replace(/\((draft|under revision|under publication)\)/g, '')
		.replace(/^the\s+/, '')
		.replace(/[^a-z0-9/.-]+/g, ' ')
		.trim();
}

export interface Resolution {
	/** entityKey → canonical { name, kind } or { term: termId } */
	map: Record<string, { name: string; kind: EntityKind } | { term: string }>;
}

export interface LinkResult {
	key: string;
	synopsis: string;
	relations: { a: string; b: string; type: 'same' | 'supports' | 'contradicts' | 'elaborates' | 'depends'; note: string }[];
}

function topicVote(votes: Map<TopicKey, number>, fallback: TopicKey): TopicKey {
	let best = fallback;
	let bestN = -1;
	for (const [k, n] of votes) {
		if (n > bestN) {
			best = k;
			bestN = n;
		}
	}
	return best;
}

function shortSourceLabel(authors: string, title: string, year: number | null) {
	let a = authors.replace(/\s*\(.*?\)\s*/g, ' ').trim();
	const first = a.split(/,| and /)[0].trim();
	if (a.length > 40) a = first + (a.includes(',') || a.includes(' and ') ? ' et al.' : '');
	const t = title.length > 70 ? title.slice(0, 68).trim() + '…' : title;
	return `${a ? a + (year ? ` (${year})` : '') + ' — ' : ''}${t}`;
}

export function assemble(): KGraph {
	const corpus: ParsedCorpus = JSON.parse(readFileSync(`${DATA}/parsed.json`, 'utf8'));
	const resolution: Resolution = existsSync(`${DATA}/entities.json`)
		? JSON.parse(readFileSync(`${DATA}/entities.json`, 'utf8'))
		: { map: {} };
	const nodes: KGNode[] = [];
	const edges: KGEdge[] = [];
	const byId = new Map<string, KGNode>();
	const edgeSet = new Set<string>();
	const add = (n: KGNode) => {
		nodes.push(n);
		byId.set(n.id, n);
		return n;
	};
	const link = (s: string, t: string, r: RelType, note?: string) => {
		if (s === t) return;
		const k = `${s}|${t}|${r}`;
		if (edgeSet.has(k)) return;
		edgeSet.add(k);
		edges.push(note ? { s, t, r, note } : { s, t, r });
	};

	// Documents and chapters ---------------------------------------------------
	add({ id: 'd1', type: 'doc', label: 'Research booklet', text: 'Virtual Validation of a Collision Mitigation System for Heavy Off-Road Machines — pre-project research: thirteen questions answered from the published evidence (October 2026).', topic: 'I', chapter: null, doc: 'booklet' });
	add({ id: 'd2', type: 'doc', label: 'Glossary & prerequisites', text: 'Glossary and Prerequisites — a plain-language companion to the research booklet: every term, acronym, standard, tool, method and organization explained from zero.', topic: 'B', chapter: null, doc: 'glossary' });
	for (let c = 0; c <= 13; c++) {
		add({
			id: `c${c}`,
			type: 'chapter',
			label: c ? `Chapter ${c}: ${CHAPTER_TITLES[c]}` : 'Introduction & synthesis',
			text: c ? `Chapter ${c} of the booklet: ${CHAPTER_TITLES[c]}.` : 'Booklet front matter: introduction, research map and cross-chapter synthesis.',
			topic: CHAPTER_TOPIC[c],
			chapter: c,
			doc: 'booklet'
		});
		link('d1', `c${c}`, 'contains');
	}
	for (const t of TOPICS) {
		add({ id: `g${t.key}`, type: 'chapter', label: `Glossary Part ${t.key}: ${t.name}`, text: `Glossary Part ${t.key}: ${t.name}.`, topic: t.key, chapter: null, doc: 'glossary', part: t.key });
		link('d2', `g${t.key}`, 'contains');
	}

	// Sections (booklet + glossary guide) -------------------------------------------
	const sectionNode = new Map<string, string>(); // parsed section id → node id
	for (const s of corpus.sections) {
		if (s.role === 'glossary-entry' || s.role === 'glossary-index' || s.role === 'sources') continue;
		if (s.level === 2 && s.doc === 'booklet' && /^Chapter \d+:|^Introduction$|^Research map$|^Cross-chapter synthesis$|^Part [IVX]+:/.test(s.title)) {
			sectionNode.set(s.id, s.chapter != null ? `c${s.chapter}` : 'd1');
			if (/^Introduction$|^Research map$|^Cross-chapter synthesis$/.test(s.title)) {
				add({ id: s.id, type: 'section', label: s.title, text: s.path.join(' › '), topic: 'I', chapter: 0, doc: 'booklet', path: s.path, role: s.role });
				sectionNode.set(s.id, s.id);
				link('c0', s.id, 'contains');
			}
			continue;
		}
		if (s.doc === 'glossary' && s.level === 2) {
			const part = /^Part ([A-I]):/.exec(s.title);
			if (part) {
				sectionNode.set(s.id, `g${part[1]}`);
				continue;
			}
		}
		const topic: TopicKey = s.doc === 'booklet' ? CHAPTER_TOPIC[s.chapter ?? 0] : (s.part ?? 'B');
		add({ id: s.id, type: 'section', label: s.title, text: s.path.join(' › '), topic, chapter: s.chapter, doc: s.doc, path: s.path, role: s.role });
		sectionNode.set(s.id, s.id);
		const parent = s.parentId ? sectionNode.get(s.parentId) : null;
		link(parent ?? (s.doc === 'booklet' ? `c${s.chapter ?? 0}` : 'd2'), s.id, 'contains');
	}

	// Terms ----------------------------------------------------------------------
	const termBySlug = new Map(corpus.terms.map((t) => [t.slug, t]));
	const termKey = new Map<string, string>();
	for (const t of corpus.terms) {
		add({
			id: t.id,
			type: 'term',
			label: t.title,
			text: t.oneSentence,
			topic: t.part,
			chapter: null,
			doc: 'glossary',
			aliases: t.aliases,
			part: t.part,
			sectionId: t.sectionId
		});
		link(`g${t.part}`, t.id, 'contains');
		termKey.set(entityKey(t.title), t.id);
		termKey.set(entityKey(t.title.replace(/\s*\(.*?\)\s*/g, ' ')), t.id);
		for (const a of t.aliases) if (a.length > 2) termKey.set(entityKey(a), t.id);
	}
	// A concept that bundles several things ("NIOSH, MSHA, BLS and CPWR", "Standards bodies (ISO,
	// IEC, …)") must not swallow its members: they stay entities linked with is_a.
	const groupTerm = new Set(
		corpus.terms
			.filter((t) => {
				const bare = t.title.replace(/\s*\(.*?\)\s*/g, ' ').trim();
				const parens = [...t.title.matchAll(/\(([^)]*)\)/g)].map((m) => m[1]).join(',');
				return /,| and /.test(bare) || /,/.test(parens);
			})
			.map((t) => t.id)
	);
	const titleKey = new Map(corpus.terms.map((t) => [t.id, entityKey(t.title.replace(/\s*\(.*?\)\s*/g, ' '))]));
	const mergesInto = (name: string, termId: string) => !groupTerm.has(termId) || entityKey(name) === titleKey.get(termId);
	for (const t of corpus.terms) {
		for (const slug of t.related) {
			const o = termBySlug.get(slug);
			if (o) link(t.id, o.id, 'related');
		}
		for (const c of t.chapterRefs) link(t.id, `c${c}`, 'discussed_in');
	}

	// Sources --------------------------------------------------------------------
	const sourceRef = new Map<string, string>(); // `${chapter}:${num}` → source id
	for (const s of corpus.sources) {
		add({
			id: s.id,
			type: 'source',
			label: shortSourceLabel(s.authors, s.title, s.year),
			text: s.text.replace(/\*\*/g, ''),
			topic: 'H',
			chapter: s.refs[0]?.chapter ?? null,
			doc: 'booklet',
			url: s.url,
			year: s.year,
			evidence: s.label,
			onRoad: s.qualifiers.some((q) => /on-road/i.test(q)),
			qualifiers: s.qualifiers
		});
		for (const r of s.refs) sourceRef.set(`${r.chapter}:${r.num}`, s.id);
	}

	// Facts ----------------------------------------------------------------------
	const chunkById = new Map(corpus.chunks.map((c) => [c.id, c]));
	const files = existsSync(`${DATA}/extract`) ? readdirSync(`${DATA}/extract`).filter((f) => f.endsWith('.json')) : [];
	files.sort((a, b) => Number(a.slice(1, -5)) - Number(b.slice(1, -5)));
	const entityNodes = new Map<string, KGNode>();
	const entityVotes = new Map<string, Map<TopicKey, number>>();
	const termOfEntry = new Map(corpus.terms.map((t) => [t.sectionId, t.id]));
	// Stable fact ids across rebuilds: chunk + text hash → id, persisted.
	const idFile = `${DATA}/fact-ids.json`;
	const factIds: Record<string, string> = existsSync(idFile) ? JSON.parse(readFileSync(idFile, 'utf8')) : {};
	let nextId = Object.values(factIds).reduce((m, id) => Math.max(m, Number(id.slice(1))), 0);
	const usedIds = new Set<string>();
	for (const f of files) {
		const res: ExtractResult = JSON.parse(readFileSync(`${DATA}/extract/${f}`, 'utf8'));
		const chunk = chunkById.get(res.chunkId);
		if (!chunk) continue;
		const entryTerm = chunk.role === 'glossary-entry' ? termOfEntry.get(chunk.sectionId) : undefined;
		for (const x of res.facts) {
			const fkey = `${res.chunkId}:${createHash('sha1').update(x.text).digest('hex').slice(0, 12)}`;
			let id = factIds[fkey];
			if (!id || usedIds.has(id)) factIds[fkey] = id = `f${++nextId}`;
			usedIds.add(id);
			// Topic vote: chapter prior, glossary part, then the concepts the fact uses.
			const votes = new Map<TopicKey, number>();
			const vote = (k: TopicKey | null | undefined, w: number) => k && votes.set(k, (votes.get(k) ?? 0) + w);
			if (chunk.doc === 'booklet') vote(CHAPTER_TOPIC[chunk.chapter ?? 0], chunk.chapter ? 1.6 : 0.5);
			if (chunk.part) vote(chunk.part, 3);
			x.terms.forEach((t, i) => vote(byId.get(t)?.topic, i === 0 ? 1.2 : 0.7));
			const topic = topicVote(votes, chunk.part ?? CHAPTER_TOPIC[chunk.chapter ?? 0]);
			const node = add({
				id,
				type: 'fact',
				label: x.text.length > 120 ? x.text.slice(0, 118).trim() + '…' : x.text,
				text: x.text,
				topic,
				chapter: chunk.chapter,
				doc: chunk.doc,
				kind: x.kind as FactKind,
				quote: x.quote,
				evidence: x.evidence,
				onRoad: x.onRoad,
				importance: x.importance,
				sectionId: chunk.sectionId
			});
			const sec = sectionNode.get(chunk.sectionId);
			if (entryTerm) link(entryTerm, id, 'states');
			else if (sec) link(sec, id, 'states');
			if (chunk.doc === 'booklet' && chunk.chapter != null) {
				for (const n of x.cites) {
					const s = sourceRef.get(`${chunk.chapter}:${n}`);
					if (s) link(id, s, 'cites');
				}
			}
			for (const c of x.chapters) if (c >= 0 && c <= 13 && (chunk.doc === 'glossary' || c !== chunk.chapter)) link(id, `c${c}`, 'discussed_in');
			const termsUsed = new Set(x.terms);
			if (entryTerm) termsUsed.add(entryTerm);
			for (const t of termsUsed) if (byId.has(t)) link(id, t, 'uses');
			for (const ent of x.entities) {
				const key = entityKey(ent.name);
				if (!key || key.length < 2) continue;
				const resolved = resolution.map[key];
				let isA: string | null = null;
				if (resolved && 'term' in resolved) {
					if (mergesInto(ent.name, resolved.term)) {
						link(id, resolved.term, 'uses');
						continue;
					}
					isA = resolved.term;
				} else if (!resolved && termKey.has(key)) {
					const tid = termKey.get(key)!;
					if (mergesInto(ent.name, tid)) {
						link(id, tid, 'uses');
						continue;
					}
					isA = tid;
				}
				const canonical = resolved && !('term' in resolved) ? resolved : { name: ent.name, kind: ent.kind as EntityKind };
				const ck = entityKey(canonical.name);
				let en = entityNodes.get(ck);
				if (!en) {
					en = add({
						id: `e${entityNodes.size + 1}`,
						type: 'entity',
						label: canonical.name,
						text: canonical.name,
						topic,
						chapter: null,
						entityKind: canonical.kind
					});
					entityNodes.set(ck, en);
					entityVotes.set(en.id, new Map());
					const tk = termKey.get(ck);
					if (tk) link(en.id, tk, 'is_a');
				}
				if (isA) link(en.id, isA, 'is_a');
				link(id, en.id, 'about');
				const ev = entityVotes.get(en.id)!;
				ev.set(topic, (ev.get(topic) ?? 0) + 1);
			}
		}
	}

	writeFileSync(idFile, JSON.stringify(factIds));

	// Entity and source topics by majority of their facts.
	for (const [eid, votes] of entityVotes) byId.get(eid)!.topic = topicVote(votes, byId.get(eid)!.topic);
	const srcVotes = new Map<string, Map<TopicKey, number>>();
	for (const e of edges) {
		if (e.r !== 'cites') continue;
		const f = byId.get(e.s)!;
		if (!srcVotes.has(e.t)) srcVotes.set(e.t, new Map());
		const v = srcVotes.get(e.t)!;
		v.set(f.topic, (v.get(f.topic) ?? 0) + 1);
	}
	for (const [sid, v] of srcVotes) byId.get(sid)!.topic = topicVote(v, 'H');

	// Cross-chapter links (stage 5) ------------------------------------------------------
	if (existsSync(`${DATA}/links`)) {
		for (const f of readdirSync(`${DATA}/links`)) {
			if (!f.endsWith('.json')) continue;
			const lr: LinkResult = JSON.parse(readFileSync(`${DATA}/links/${f}`, 'utf8'));
			const target = lr.key.startsWith('t') ? byId.get(lr.key) : [...entityNodes.values()].find((e) => entityKey(e.label) === lr.key.slice(2));
			if (target && lr.synopsis) target.synopsis = lr.synopsis;
			for (const r of lr.relations) if (byId.has(r.a) && byId.has(r.b)) link(r.a, r.b, r.type, r.note);
		}
	}

	// Drop structural sections that ended up empty (no facts, no children).
	const outDeg = new Map<string, number>();
	for (const e of edges) outDeg.set(e.s, (outDeg.get(e.s) ?? 0) + 1);
	const drop = new Set(nodes.filter((n) => n.type === 'section' && !outDeg.get(n.id)).map((n) => n.id));
	return {
		version: 1,
		builtAt: new Date().toISOString(),
		nodes: nodes.filter((n) => !drop.has(n.id)),
		edges: edges.filter((e) => !drop.has(e.s) && !drop.has(e.t))
	};
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const g = assemble();
	writeFileSync(`${DATA}/graph.json`, JSON.stringify(g));
	const types = new Map<string, number>();
	for (const n of g.nodes) types.set(n.type, (types.get(n.type) ?? 0) + 1);
	const rels = new Map<string, number>();
	for (const e of g.edges) rels.set(e.r, (rels.get(e.r) ?? 0) + 1);
	console.log(`nodes ${g.nodes.length}`, Object.fromEntries(types));
	console.log(`edges ${g.edges.length}`, Object.fromEntries(rels));
}
