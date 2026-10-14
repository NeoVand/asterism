/**
 * Asterism's graph database: an in-memory typed property graph with bidirectional adjacency,
 * a BM25 full-text index (MiniSearch) with light stemming and glossary-alias expansion,
 * path finding, and raw-section access into the reference documents.
 */
import MiniSearch from 'minisearch';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import type { KGEdge, KGNode, KGraph, NodeType, ParsedCorpus, ParsedSection, RelType } from '#lib/kg/types.ts';
import { CHAPTER_TITLES, TOPICS } from '#lib/kg/types.ts';
import type { GraphWire } from '#lib/graph/types.ts';

export interface Adj {
	id: string;
	r: RelType;
	/** true if the edge points from this node to `id` */
	out: boolean;
	note?: string;
}

export interface SearchHit {
	id: string;
	score: number;
	node: KGNode;
}

export interface SearchOptions {
	types?: NodeType[];
	chapters?: number[];
	kinds?: string[];
	limit?: number;
	/** Restrict results to the neighborhood of these node ids. */
	near?: string[];
}

const STOP = new Set(
	'a an and are as at be by for from has have in into is it its of on or that the their this to was were will with what which who how why when where does do did can could should would about over under than then there these those such any all not no'.split(
		' '
	)
);

/** Tiny suffix stemmer: good enough to match plural/verb forms without mangling acronyms. */
export function stem(word: string): string {
	let w = word.toLowerCase();
	if (w.length <= 3 || /\d/.test(w)) return w;
	if (/^[A-Z0-9-]+$/.test(word)) return w; // acronyms keep their form
	for (const [suf, rep] of [
		['ational', 'ate'],
		['ization', 'ize'],
		['fulness', 'ful'],
		['iveness', 'ive'],
		['ations', 'ate'],
		['ation', 'ate'],
		['ments', 'ment'],
		['ities', 'ity'],
		['ings', ''],
		['ing', ''],
		['ies', 'y'],
		['ied', 'y'],
		['sses', 'ss'],
		['ers', 'er'],
		['ed', ''],
		['es', 'e'],
		['s', '']
	] as const) {
		if (w.endsWith(suf) && w.length - suf.length >= 3) {
			if (suf === 's' && (w.endsWith('ss') || w.endsWith('us') || w.endsWith('is'))) break;
			w = w.slice(0, w.length - suf.length) + rep;
			break;
		}
	}
	return w;
}

function processTerm(term: string): string | null {
	const t = term.toLowerCase();
	if (STOP.has(t) || t.length < 2) return null;
	return stem(term);
}

/** Summary sections carry the booklet's conclusions; surface them a little earlier. */
const ROLE_BOOST: Record<string, number> = {
	synthesis: 1.3,
	'key-findings': 1.22,
	established: 1.08,
	uncertain: 1.08,
	disagree: 1.1,
	'blind-spots': 1.05
};

export class GraphStore {
	readonly root: string;
	graph!: KGraph;
	corpus!: ParsedCorpus;
	nodes: KGNode[] = [];
	byId = new Map<string, KGNode>();
	index = new Map<string, number>();
	adj = new Map<string, Adj[]>();
	private mini!: MiniSearch<KGNode>;
	private aliasIndex = new Map<string, string[]>();
	private sectionById = new Map<string, ParsedSection>();
	private raw: Record<string, string[]> = {};
	private wireCache: GraphWire | null = null;
	/** Booklet facts per chapter, in document order. */
	chapterFacts = new Map<number, KGNode[]>();
	loadedAt = 0;
	private mtime = 0;

	constructor(root = process.cwd()) {
		this.root = root;
		this.load();
	}

	get path() {
		return resolve(this.root, 'data/kg/graph.json');
	}

	/** Reload if the graph file changed on disk (after a rebuild or an upload). */
	refresh() {
		try {
			const m = statSync(this.path).mtimeMs;
			if (m !== this.mtime) this.load();
		} catch {
			/* keep current */
		}
	}

	load() {
		const path = this.path;
		if (!existsSync(path)) throw new Error(`knowledge graph not built: ${path}`);
		this.mtime = statSync(path).mtimeMs;
		this.graph = JSON.parse(readFileSync(path, 'utf8')) as KGraph;
		this.corpus = JSON.parse(readFileSync(resolve(this.root, 'data/kg/parsed.json'), 'utf8')) as ParsedCorpus;
		this.nodes = this.graph.nodes;
		this.byId.clear();
		this.index.clear();
		this.adj.clear();
		this.nodes.forEach((n, i) => {
			this.byId.set(n.id, n);
			this.index.set(n.id, i);
			this.adj.set(n.id, []);
		});
		for (const e of this.graph.edges) {
			this.adj.get(e.s)?.push({ id: e.t, r: e.r, out: true, note: e.note });
			this.adj.get(e.t)?.push({ id: e.s, r: e.r, out: false, note: e.note });
		}
		this.sectionById = new Map(this.corpus.sections.map((s) => [s.id, s]));
		this.chapterFacts.clear();
		for (const n of this.nodes) {
			if (n.type !== 'fact' || n.doc !== 'booklet' || n.chapter == null) continue;
			if (!this.chapterFacts.has(n.chapter)) this.chapterFacts.set(n.chapter, []);
			this.chapterFacts.get(n.chapter)!.push(n);
		}
		this.raw = {
			booklet: readFileSync(resolve(this.root, 'references/CMS-Research-Booklet.md'), 'utf8').split('\n'),
			glossary: readFileSync(resolve(this.root, 'references/CMS-Glossary-and-Prerequisites.md'), 'utf8').split('\n')
		};

		// Alias expansion: acronym or alternative name → the concept's title words.
		this.aliasIndex.clear();
		for (const n of this.nodes) {
			if (n.type !== 'term') continue;
			for (const a of n.aliases ?? []) {
				const k = a.toLowerCase();
				if (!this.aliasIndex.has(k)) this.aliasIndex.set(k, []);
				this.aliasIndex.get(k)!.push(n.id);
			}
		}

		this.mini = new MiniSearch<KGNode>({
			idField: 'id',
			fields: ['label', 'text', 'aliasText', 'quote', 'synopsis', 'context'],
			storeFields: [],
			processTerm,
			extractField: (doc, field) => {
				if (field === 'aliasText') return (doc.aliases ?? []).join(' ');
				if (field === 'context') return this.contextText(doc);
				if (field === 'label' && doc.type === 'fact') return '';
				const v = (doc as unknown as Record<string, unknown>)[field];
				return typeof v === 'string' ? v : '';
			},
			searchOptions: {
				boost: { label: 3, aliasText: 3, text: 1.2, synopsis: 0.8, quote: 0.4, context: 0.35 },
				prefix: (t) => t.length > 4,
				fuzzy: (t) => (t.length > 6 ? 0.15 : false),
				combineWith: 'OR'
			}
		});
		this.mini.addAll(this.nodes.filter((n) => n.type !== 'doc'));
		this.wireCache = null;
		this.loadedAt = Date.now();
	}

	private contextText(n: KGNode): string {
		if (n.type === 'fact' && n.sectionId) return this.sectionById.get(n.sectionId)?.path.slice(-2).join(' ') ?? '';
		if (n.type === 'section') return (n.path ?? []).join(' ');
		return '';
	}

	get(id: string) {
		return this.byId.get(id);
	}

	neighbors(id: string, filter?: { rels?: RelType[]; types?: NodeType[] }): Adj[] {
		const list = this.adj.get(id) ?? [];
		return list.filter(
			(a) =>
				(!filter?.rels || filter.rels.includes(a.r)) &&
				(!filter?.types || filter.types.includes(this.byId.get(a.id)!.type))
		);
	}

	degree(id: string) {
		return this.adj.get(id)?.length ?? 0;
	}

	/** Expand acronyms/aliases in a query with the matching concept's title. */
	expandQuery(q: string): string {
		const extra: string[] = [];
		const lower = q.toLowerCase();
		for (const [alias, ids] of this.aliasIndex) {
			if (alias.length < 2) continue;
			const re = new RegExp(`(^|[^a-z0-9])${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z0-9])`, 'i');
			if (re.test(lower)) for (const id of ids) extra.push(this.byId.get(id)!.label.replace(/\(.*?\)/g, ''));
		}
		return extra.length ? `${q} ${extra.join(' ')}` : q;
	}

	search(query: string, opts: SearchOptions = {}): SearchHit[] {
		const q = this.expandQuery(query);
		const near = opts.near?.length ? this.neighborhood(opts.near, 2) : null;
		const raw = this.mini.search(q, {
			filter: (r) => {
				const n = this.byId.get(r.id as string);
				if (!n) return false;
				if (opts.types && !opts.types.includes(n.type)) return false;
				if (opts.chapters && (n.chapter == null || !opts.chapters.includes(n.chapter))) return false;
				if (opts.kinds && (!n.kind || !opts.kinds.includes(n.kind))) return false;
				if (near && !near.has(n.id)) return false;
				return true;
			}
		});
		const hits = raw.map((r) => {
			const node = this.byId.get(r.id as string)!;
			let score = r.score;
			if (node.type === 'fact') {
				score *= 0.85 + 0.15 * (node.importance ?? 2);
				const role = node.sectionId ? this.sectionById.get(node.sectionId)?.role : undefined;
				if (role) score *= ROLE_BOOST[role] ?? 1;
			}
			if (node.type === 'section' || node.type === 'chapter') score *= 0.6;
			return { id: node.id, score, node };
		});
		hits.sort((a, b) => b.score - a.score);
		return hits.slice(0, opts.limit ?? 20);
	}

	/** Ids within `depth` hops of any seed. */
	neighborhood(seeds: string[], depth: number): Set<string> {
		const seen = new Set(seeds);
		let frontier = seeds;
		for (let d = 0; d < depth; d++) {
			const next: string[] = [];
			for (const id of frontier) {
				for (const a of this.adj.get(id) ?? []) {
					if (seen.has(a.id)) continue;
					// Do not walk through enormous hubs; they connect everything.
					if (this.degree(a.id) > 400 && d < depth - 1) {
						seen.add(a.id);
						continue;
					}
					seen.add(a.id);
					next.push(a.id);
				}
			}
			frontier = next;
		}
		return seen;
	}

	/**
	 * Shortest paths between two nodes (BFS), avoiding structural hubs so that paths go through
	 * meaningful links: shared concepts, entities, sources and fact relations.
	 */
	paths(a: string, b: string, maxLen = 5, k = 3): string[][] {
		if (!this.byId.has(a) || !this.byId.has(b)) return [];
		const results: string[][] = [];
		const banned = new Set<string>();
		for (let round = 0; round < k; round++) {
			const prev = new Map<string, string>([[a, '']]);
			const queue = [a];
			let found = false;
			while (queue.length && !found) {
				const cur = queue.shift()!;
				const depth = this.depthOf(prev, cur);
				if (depth >= maxLen) continue;
				for (const nb of this.adj.get(cur) ?? []) {
					if (prev.has(nb.id) || banned.has(nb.id)) continue;
					const n = this.byId.get(nb.id)!;
					if (nb.id !== b && (n.type === 'doc' || n.type === 'chapter' || (n.type === 'section' && this.degree(nb.id) > 60))) continue;
					prev.set(nb.id, cur);
					if (nb.id === b) {
						found = true;
						break;
					}
					queue.push(nb.id);
				}
			}
			if (!found) break;
			const path = [b];
			while (path[0] !== a) path.unshift(prev.get(path[0])!);
			results.push(path);
			// Ban the interior of this path to find a different one next round.
			for (const id of path.slice(1, -1)) banned.add(id);
			if (path.length === 2) break;
		}
		return results;
	}

	private depthOf(prev: Map<string, string>, id: string) {
		let d = 0;
		let cur = id;
		while (prev.get(cur)) {
			cur = prev.get(cur)!;
			d++;
		}
		return d;
	}

	edgeBetween(a: string, b: string): Adj | undefined {
		return this.adj.get(a)?.find((x) => x.id === b);
	}

	section(id: string) {
		return this.sectionById.get(id);
	}

	roleOf(n: KGNode) {
		return n.sectionId ? this.sectionById.get(n.sectionId)?.role : undefined;
	}

	/** Raw markdown of a section (with its subsections), paginated by characters. */
	sectionText(id: string, offset = 0, max = 6000): { text: string; total: number; next: number | null } {
		const s = this.sectionById.get(id);
		if (!s) return { text: '', total: 0, next: null };
		const lines = this.raw[s.doc].slice(s.startLine - 1, s.endLine);
		const full = lines.join('\n');
		const text = full.slice(offset, offset + max);
		return { text, total: full.length, next: offset + max < full.length ? offset + max : null };
	}

	/** Where a node lives, in words. */
	where(n: KGNode): string {
		if (n.type === 'fact') {
			const s = n.sectionId ? this.sectionById.get(n.sectionId) : null;
			if (n.doc === 'glossary') return `Glossary › ${s?.title ?? ''}`;
			const ch = n.chapter ? `Ch ${n.chapter}` : 'Front matter';
			return s ? `${ch} › ${s.path.slice(1).join(' › ') || s.title}` : ch;
		}
		if (n.type === 'section') return (n.path ?? []).join(' › ');
		if (n.type === 'source') return `Source (${this.sourceChapters(n.id).map((c) => `Ch ${c}`).join(', ')})`;
		return '';
	}

	sourceChapters(id: string): number[] {
		const s = this.corpus.sources.find((x) => x.id === id);
		return [...new Set(s?.refs.map((r) => r.chapter) ?? [])];
	}

	/** Compact client format; cached until the graph reloads. */
	wire(): GraphWire {
		if (this.wireCache) return this.wireCache;
		const rels: string[] = [];
		const relIdx = new Map<string, number>();
		const topicIdx = new Map(TOPICS.map((t, i) => [t.key as string, i]));
		const nodes: GraphWire['nodes'] = this.nodes.map((n) => {
			const w = n.type === 'fact' ? [0.75, 0.95, 1.3][(n.importance ?? 2) - 1] : 1;
			return [n.id, n.type, topicIdx.get(n.topic) ?? 0, n.label, n.chapter ?? -1, w];
		});
		const edges: GraphWire['edges'] = this.graph.edges.map((e) => {
			if (!relIdx.has(e.r)) {
				relIdx.set(e.r, rels.length);
				rels.push(e.r);
			}
			return [this.index.get(e.s)!, this.index.get(e.t)!, relIdx.get(e.r)!];
		});
		this.wireCache = { version: this.loadedAt, nodes, edges, rels };
		return this.wireCache;
	}

	stats() {
		const types: Record<string, number> = {};
		for (const n of this.nodes) types[n.type] = (types[n.type] ?? 0) + 1;
		return { nodes: this.nodes.length, edges: this.graph.edges.length, types, chapters: CHAPTER_TITLES };
	}
}

let store: GraphStore | null = null;
export function getStore(): GraphStore {
	if (!store) store = new GraphStore();
	else store.refresh();
	return store;
}

export type { KGEdge };
