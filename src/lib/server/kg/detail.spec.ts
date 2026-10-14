import { describe, expect, it } from 'vitest';
import { getStore } from './store.ts';
import { nodeDetail } from './detail.ts';

describe('nodeDetail', () => {
	it('every node card lists each linked fact, concept, entity and source once (keyed lists)', () => {
		const store = getStore();
		for (const f of store.nodes) {
			const d = nodeDetail(store, f.id);
			if (!d) continue;
			for (const list of [d.linked, d.concepts, d.entities, d.sources]) {
				const ids = list.map((l) => l.id);
				expect(new Set(ids).size, f.id).toBe(ids.length);
			}
		}
	});
});
