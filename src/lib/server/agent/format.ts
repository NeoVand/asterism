/** Compact, id-rich text renderings of graph nodes for the agent's tool results. */
import type { KGNode } from '#lib/kg/types.ts';
import { CHAPTER_TITLES, TOPICS } from '#lib/kg/types.ts';
import type { GraphStore } from '../kg/store.ts';

export function chapterTag(n: KGNode): string {
	if (n.doc === 'glossary') return n.part ? `Glossary ${n.part}` : 'Glossary';
	if (n.chapter == null) return '';
	return n.chapter === 0 ? 'Front' : `Ch${n.chapter}`;
}

/** Where a fact sits in the booklet's argument: synthesis, key finding, or plain detail. */
function roleTag(store: GraphStore, n: KGNode): string {
	const role = store.roleOf(n);
	if (role === 'synthesis') return 'Synthesis';
	if (role === 'key-findings') return `${chapterTag(n)} key finding`;
	if (role === 'disagree') return `${chapterTag(n)} disagreement`;
	if (role === 'uncertain') return `${chapterTag(n)} uncertain`;
	if (role === 'blind-spots') return `${chapterTag(n)} blind spot`;
	return chapterTag(n);
}

function evidenceTag(n: KGNode): string {
	if (!n.evidence && !n.onRoad) return '';
	const ev = n.evidence ? n.evidence.replace('Expert opinion', 'Expert') : '';
	return [ev, n.onRoad ? 'on-road' : ''].filter(Boolean).join(' ');
}

export function clip(s: string, max: number): string {
	return s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s;
}

/** One line per node. */
export function line(store: GraphStore, n: KGNode, max = 280): string {
	switch (n.type) {
		case 'fact': {
			const tags = [roleTag(store, n), n.kind, evidenceTag(n)].filter(Boolean).join(' · ');
			return `${n.id} [${tags}] ${clip(n.text, max)}`;
		}
		case 'term':
			return `${n.id} [concept · Part ${n.part}] ${n.label} — ${clip(n.text, Math.min(max, 200))}`;
		case 'entity': {
			const facts = store.neighbors(n.id, { rels: ['about'] }).length;
			return `${n.id} [entity · ${n.entityKind}] ${n.label} (${facts} facts)`;
		}
		case 'source': {
			const ev = [n.evidence, n.onRoad ? 'on-road' : '', n.year ?? ''].filter(Boolean).join(' · ');
			const cited = store.neighbors(n.id, { rels: ['cites'] }).length;
			return `${n.id} [source · ${ev}] ${clip(n.text, max)} (cited by ${cited} facts)`;
		}
		case 'section':
			return `${n.id} [section] ${(n.path ?? []).join(' › ')}`;
		case 'chapter':
			return `${n.id} [chapter] ${n.label}`;
		default:
			return `${n.id} [${n.type}] ${n.label}`;
	}
}

export function topicName(key: string) {
	return TOPICS.find((t) => t.key === key)?.name ?? key;
}

export function chapterName(c: number) {
	return c === 0 ? 'Front matter (introduction & synthesis)' : `Chapter ${c}: ${CHAPTER_TITLES[c]}`;
}

/** Sort facts: importance first, then booklet before glossary. */
export function byImportance(a: KGNode, b: KGNode) {
	return (b.importance ?? 0) - (a.importance ?? 0) || (a.doc === 'glossary' ? 1 : 0) - (b.doc === 'glossary' ? 1 : 0);
}

const WORD = /[a-z0-9]+(?:[.-][a-z0-9]+)*/g;
const tokenCache = new Map<string, Set<string>>();

function tokens(text: string): Set<string> {
	let t = tokenCache.get(text);
	if (!t) {
		t = new Set(text.toLowerCase().match(WORD) ?? []);
		if (tokenCache.size > 50000) tokenCache.clear();
		tokenCache.set(text, t);
	}
	return t;
}

/** Word-set Jaccard similarity, used to fold restatements of the same claim. */
export function similarity(a: string, b: string): number {
	const A = tokens(a);
	const B = tokens(b);
	let inter = 0;
	for (const w of A) if (B.has(w)) inter++;
	return inter / (A.size + B.size - inter || 1);
}

/**
 * Fold restated facts into the first (best-ranked) one: same-edges or near-identical wording.
 * Returns the kept nodes with the ids folded into each.
 */
export function foldDuplicates(store: GraphStore, nodes: KGNode[], limit: number): { node: KGNode; also: KGNode[] }[] {
	const kept: { node: KGNode; also: KGNode[] }[] = [];
	for (const n of nodes) {
		if (n.type === 'fact') {
			const dup = kept.find(
				(k) =>
					k.node.type === 'fact' &&
					(store.edgeBetween(k.node.id, n.id)?.r === 'same' || similarity(k.node.text, n.text) >= 0.72)
			);
			if (dup) {
				dup.also.push(n);
				continue;
			}
		}
		if (kept.length < limit) kept.push({ node: n, also: [] });
	}
	return kept;
}

export function alsoNote(also: KGNode[]): string {
	if (!also.length) return '';
	return ` (also stated in: ${also
		.slice(0, 6)
		.map((a) => `${a.id} ${chapterTag(a)}`)
		.join(', ')})`;
}
