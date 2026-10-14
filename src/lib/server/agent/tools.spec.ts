import { describe, expect, it } from 'vitest';
import { makeTools } from './tools.ts';

const t = makeTools();

describe('search_graph', () => {
	it('leads with the booklet’s own conclusions', async () => {
		const out: string = await t.searchGraph.invoke({ query: 'dust sensor simulation', limit: 6 });
		expect(out).toMatch(/^Booklet conclusions on this/);
		expect(out).toMatch(/\[(Synthesis|Ch\d+ key finding)/);
	});

	it('points at strong matches a chapter filter left out', async () => {
		const out: string = await t.searchGraph.invoke({
			query: 'Caterpillar',
			chapters: [2],
			limit: 6
		});
		const [inside, outside] = out.split(/Strong matches outside Ch2/);
		expect(outside).toBeDefined();
		expect(inside).not.toMatch(/\[Ch(?!2)\d+/);
		expect(outside).toMatch(/Caterpillar/);
	});
});

describe('diagrams', () => {
	it('find_diagrams returns ids with where they sit', async () => {
		const out: string = await t.findDiagrams.invoke({ query: 'warn or brake decision logic' });
		expect(out).toMatch(/^\d+ diagrams?/);
		expect(out).toContain('m26 · Glossary');
	});

	it('show_ui only accepts diagrams that exist', async () => {
		const bad: string = await t.showUi.invoke({ block: { type: 'diagram', id: 'm999' } });
		expect(bad).toMatch(/^Unknown diagram m999/);
		const ok: string = await t.showUi.invoke({ block: { type: 'diagram', id: 'm26' } });
		expect(ok).toMatch(/^Rendered the diagram block/);
	});
});
