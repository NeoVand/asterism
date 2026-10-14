import { describe, expect, it } from 'vitest';
import { getStore } from '../kg/store.ts';
import { attachmentNote } from './attachments.ts';

const store = getStore();

describe('attachmentNote', () => {
	it('describes each chip with ids and labels, ahead of the user’s words', () => {
		const facts = store.nodes.filter((n) => n.type === 'fact').slice(0, 90);
		const { text, ids } = attachmentNote(store, [
			{ kind: 'node', label: 'ISO 19014-1', ids: ['e1'] },
			{ kind: 'neighbors', label: 'Heavy off-road machine', ids: ['t1', 'f1', 'nope'] },
			{ kind: 'search', label: 'Nvidia', ids: facts.map((f) => f.id) }
		]);
		expect(text).toMatch(/^\[The user attached these from the graph/);
		expect(text).toContain('- entity e1 ISO 19014-1');
		expect(text).toContain('concept t1 “Heavy off-road machine” with 1 of its neighbours: f1 ');
		expect(text).toMatch(/- Search “Nvidia” \(60 matches\)/);
		expect(text).not.toContain('nope');
		// Capped per chip; unknown ids dropped.
		expect(ids).toHaveLength(1 + 2 + 60);
	});

	it('is empty without attachments', () => {
		expect(attachmentNote(store, undefined)).toEqual({ text: '', ids: [] });
		expect(attachmentNote(store, [{ kind: 'node', label: 'x', ids: ['nope'] }]).text).toBe('');
	});
});
