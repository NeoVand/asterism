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
		const out: string = await t.searchGraph.invoke({ query: 'Caterpillar', chapters: [2], limit: 6 });
		const [inside, outside] = out.split(/Strong matches outside Ch2/);
		expect(outside).toBeDefined();
		expect(inside).not.toMatch(/\[Ch(?!2)\d+/);
		expect(outside).toMatch(/Caterpillar/);
	});
});
