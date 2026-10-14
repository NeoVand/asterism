import { describe, expect, it } from 'vitest';
import { getStore } from './store.ts';
import { diagrams, docToc, docUnit, findDiagrams, locate, slugify } from './docs.ts';

const store = getStore();

describe('the documents as reading units', () => {
	it('splits the booklet into its chapters and the glossary into its parts', () => {
		const toc = docToc(store);
		const booklet = toc.docs.find((d) => d.key === 'booklet')!;
		const glossary = toc.docs.find((d) => d.key === 'glossary')!;
		expect(booklet.units.filter((u) => /^Chapter \d+:/.test(u.title))).toHaveLength(13);
		expect(booklet.units.filter((u) => u.part).map((u) => u.title)).toEqual([
			'Part I: Frame the problem',
			'Part II: The building blocks',
			'Part III: Make the plan hold up'
		]);
		expect(glossary.units.filter((u) => /^Part [A-I]:/.test(u.title))).toHaveLength(9);
		// The glossary's "Quick glossary" is not a parsed section but still readable.
		expect(glossary.units.some((u) => u.title === 'Quick glossary')).toBe(true);
		expect(Object.keys(toc.chapters).map(Number)).toEqual([...Array(14).keys()]);
	});

	it('gives each unit its sections, facts and citation numbers', () => {
		const u = docUnit(store, 'x24')!;
		expect(u.title).toBe('Chapter 1: The full range of options');
		expect(u.crumbs).toEqual(['Research booklet', 'Part I: Frame the problem']);
		expect(u.prev?.id).toBe('x23');
		expect(u.next?.id).toBe('x52');
		expect(u.sections[0].md).toMatch(/^\s*_What every documented way/);
		expect(u.sections.some((s) => s.role === 'sources')).toBe(true);
		expect(u.facts.length).toBeGreaterThan(800);
		expect(u.sources[1]?.id).toBe('s1');
		// A section's own text stops at its first subsection.
		for (const s of u.sections) expect(s.md).not.toMatch(/^#{2,6}\s/m);
	});

	it('covers every fact exactly once, quoted verbatim from its unit', () => {
		const seen = new Set<string>();
		const paraphrased: string[] = [];
		for (const d of docToc(store).docs)
			for (const t of d.units) {
				const u = docUnit(store, t.id)!;
				const text = u.sections.map((s) => s.md).join('\n');
				for (const f of u.facts) {
					expect(seen.has(f.id), f.id).toBe(false);
					seen.add(f.id);
					if (!text.includes(f.q)) paraphrased.push(f.id);
				}
			}
		expect(seen.size).toBe(store.nodes.filter((n) => n.type === 'fact').length);
		// A handful of extracted quotes span a heading or drop a colon; the rest are as written.
		expect(paraphrased.length).toBeLessThanOrEqual(4);
	});

	it('resolves the documents’ own anchor links', () => {
		const toc = docToc(store);
		for (const s of store.corpus.sections) expect(slugify(s.title), s.id).toBe(s.slug);
		const [unit, section] = toc.slugs['heavy-off-road-machine'];
		expect(unit).toBe('x473');
		expect(section).toBe('x474');
	});
});

describe('locate', () => {
	it('finds where each kind of node is written', () => {
		expect(locate(store, 'f1')).toEqual({ unit: 'x1', section: 'x2', fact: 'f1' });
		expect(locate(store, 't1')).toEqual({ unit: 'x473', section: 'x474' });
		expect(locate(store, 'c3')).toEqual({ unit: 'x80', section: 'x80' });
		expect(locate(store, 'gB')?.unit).toBe('x519');
		const src = locate(store, 's1')!;
		expect(src.unit).toBe('x24');
		expect(src.source).toBe(1);
		expect(store.section(src.section)?.role).toBe('sources');
		const ent = locate(store, 'e1')!;
		expect(ent.fact).toMatch(/^f\d+$/);
		expect(store.neighbors('e1').some((a) => a.id === ent.fact)).toBe(true);
	});

	it('places every fact, concept and chapter', () => {
		const facts = new Map<string, Set<string>>();
		for (const n of store.nodes) {
			if (!['fact', 'term', 'chapter', 'section'].includes(n.type)) continue;
			const at = locate(store, n.id);
			expect(at, n.id).not.toBeNull();
			if (n.type !== 'fact') continue;
			if (!facts.has(at!.unit))
				facts.set(at!.unit, new Set(docUnit(store, at!.unit)!.facts.map((f) => f.id)));
			expect(facts.get(at!.unit)!.has(n.id), n.id).toBe(true);
		}
	});
});

describe('diagrams', () => {
	it('indexes all 33 mermaid diagrams with a place and a caption', () => {
		const ds = diagrams(store);
		expect(ds).toHaveLength(33);
		for (const d of ds) {
			expect(d.unit, d.id).toBeTruthy();
			expect(d.caption.length, d.id).toBeGreaterThan(3);
			expect(d.code, d.id).toMatch(/^\s*(%%|flowchart|graph|gantt|stateDiagram|sequenceDiagram)/);
		}
	});

	it('finds diagrams by what they show', () => {
		const hits = findDiagrams(store, 'staged intervention ladder').map((d) => d.id);
		expect(hits.slice(0, 3)).toEqual(expect.arrayContaining(['m18']));
		expect(findDiagrams(store, 'gantt plan', 1).every((d) => d.unit === 'x24')).toBe(true);
	});
});
