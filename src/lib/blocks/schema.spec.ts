import { describe, expect, it } from 'vitest';
import { Block, QuestionForm } from './schema.ts';
import { SAMPLE_BLOCKS } from './samples.ts';
import { blockToMarkdown } from './markdown.ts';
import { citedIds, type Msg } from '../chat/chat.svelte.ts';

describe('blocks', () => {
	it('accepts every sample block and renders it as markdown', () => {
		for (const b of SAMPLE_BLOCKS) {
			expect(Block.safeParse(b).success).toBe(true);
			expect(blockToMarkdown(b).length).toBeGreaterThan(20);
		}
	});

	it('rejects malformed blocks with a useful path', () => {
		const r = Block.safeParse({ type: 'risks', title: 'x', items: [{ risk: 'r', likelihood: 5, impact: 1, mitigation: 'm' }] });
		expect(r.success).toBe(false);
		expect(r.error?.issues[0].path.join('.')).toContain('likelihood');
	});

	it('validates question forms', () => {
		expect(QuestionForm.safeParse({ title: 'Scope', questions: [{ id: 'm', label: 'Machines?', kind: 'multi', options: ['Loaders'] }] }).success).toBe(true);
		expect(QuestionForm.safeParse({ title: 'Scope', questions: [] }).success).toBe(false);
	});
});

describe('citedIds', () => {
	it('orders citations by first appearance across text and blocks', () => {
		const msg = {
			parts: [
				{ k: 'text', text: 'A [f3] and B [f1, f3].' },
				{ k: 'ui', id: 'u', block: { type: 'metrics', items: [{ value: '1', label: 'x', cites: ['f2', 'f1'] }] } }
			]
		} as unknown as Msg;
		expect(citedIds(msg)).toEqual(['f3', 'f1', 'f2']);
	});
});
