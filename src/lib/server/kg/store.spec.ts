import { beforeAll, describe, expect, it } from 'vitest';
import { GraphStore, stem } from './store.ts';
import { foldDuplicates, similarity } from '../agent/format.ts';

let store: GraphStore;
beforeAll(() => {
	store = new GraphStore(process.cwd());
});

describe('stemming', () => {
	it('folds plurals and verb forms but keeps acronyms and numbers', () => {
		expect(stem('trials')).toBe(stem('trial'));
		expect(stem('braking')).toBe(stem('brake'.replace(/e$/, '')));
		expect(stem('ISO')).toBe('iso');
		expect(stem('21815-3')).toBe('21815-3');
	});
});

describe('search', () => {
	it('matches hyphenated words written closed ("overfitting" → "over-fitting")', () => {
		const hits = store.search('overfitting', { types: ['fact'], limit: 30 });
		expect(hits.some((h) => /over-fitting/i.test(h.node.text))).toBe(true);
	});

	it('matches British and American spellings', () => {
		const us = store.search('optimize behavior', { types: ['fact'], limit: 10 }).map((h) => h.id);
		const uk = store.search('optimise behaviour', { types: ['fact'], limit: 10 }).map((h) => h.id);
		expect(us.filter((id) => uk.includes(id)).length).toBeGreaterThan(3);
	});

	it('expands acronyms through glossary aliases', () => {
		const hits = store.search('AEB', { types: ['term'], limit: 5 });
		expect(hits[0]?.node.label).toMatch(/Automatic Emergency Braking/);
	});

	it('finds the nine levels of control for "Level 9"', () => {
		const hits = store.search('Level 9 intervention', { types: ['term'], limit: 3 });
		expect(hits.map((h) => h.node.label)).toContain('Nine levels of control');
	});

	it('keeps standard numbers intact', () => {
		const hits = store.search('ISO 21815-3', { types: ['fact'], limit: 10 });
		expect(hits.filter((h) => h.node.text.includes('21815-3')).length).toBeGreaterThan(5);
	});

	it('filters by chapter and kind', () => {
		const hits = store.search('not found', { types: ['fact'], chapters: [8], kinds: ['gap'], limit: 10 });
		expect(hits.length).toBeGreaterThan(0);
		expect(hits.every((h) => h.node.chapter === 8 && h.node.kind === 'gap')).toBe(true);
	});
});

describe('graph structure', () => {
	it('has every node type and cross-chapter fact relations', () => {
		const s = store.stats();
		for (const t of ['fact', 'term', 'entity', 'source', 'section', 'chapter']) expect(s.types[t]).toBeGreaterThan(0);
		const rels = new Set(store.graph.edges.map((e) => e.r));
		for (const r of ['cites', 'uses', 'about', 'related', 'same', 'contradicts']) expect(rels.has(r as never)).toBe(true);
	});

	it('connects two concepts through meaningful paths', () => {
		const a = store.search('EU Machinery Regulation', { types: ['entity'], limit: 1 })[0];
		const b = store.search('notified body', { types: ['term'], limit: 1 })[0];
		const paths = store.paths(a.id, b.id, 5, 2);
		expect(paths.length).toBeGreaterThan(0);
		expect(paths[0][0]).toBe(a.id);
		expect(paths[0].at(-1)).toBe(b.id);
	});

	it('reads raw section markdown with pagination', () => {
		const fact = store.nodes.find((n) => n.type === 'fact' && n.sectionId)!;
		const sec = store.sectionText(fact.sectionId!, 0, 200);
		expect(sec.text.length).toBeGreaterThan(20);
		expect(sec.total).toBeGreaterThanOrEqual(sec.text.length);
	});

	it('produces a consistent wire format', () => {
		const w = store.wire();
		expect(w.nodes.length).toBe(store.nodes.length);
		const n = w.nodes.length;
		expect(w.edges.every(([s, t, r]) => s < n && t < n && r < w.rels.length)).toBe(true);
	});
});

describe('duplicate folding', () => {
	it('folds restatements of the same claim', () => {
		expect(similarity('The Machinery Regulation applies from 20 January 2027.', 'EU Machinery Regulation applies from 20 January 2027.')).toBeGreaterThan(0.72);
		const facts = store.search('Machinery Regulation applies 20 January 2027', { types: ['fact'], limit: 20 }).map((h) => h.node);
		const folded = foldDuplicates(store, facts, 20);
		expect(folded.length).toBeLessThan(facts.length);
		expect(folded.some((f) => f.also.length > 0)).toBe(true);
	});
});
