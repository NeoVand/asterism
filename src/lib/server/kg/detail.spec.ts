import { describe, expect, it } from 'vitest';
import { getStore } from './store.ts';
import { nodeDetail } from './detail.ts';

describe('nodeDetail', () => {
	it('lists each linked fact, concept, entity and source once (keyed lists in the card)', () => {
		const store = getStore();
		// Facts with the most restatement links are the likeliest to have two-way edges.
		const facts = store.nodes.filter((n) => n.type === 'fact').slice(0, 4000);
		for (const f of facts) {
			const d = nodeDetail(store, f.id);
			if (!d) continue;
			for (const list of [d.linked, d.concepts, d.entities, d.sources]) {
				const ids = list.map((l) => l.id);
				expect(new Set(ids).size, f.id).toBe(ids.length);
			}
		}
	});
});
