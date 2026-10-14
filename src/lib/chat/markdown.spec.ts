import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './markdown.ts';

const brief = (id: string) =>
	id.startsWith('f') ? { id, type: 'fact' as const, label: id, topic: 2, chapter: 3 } : null;
const order: string[] = [];
const number = (id: string) => {
	if (!order.includes(id)) order.push(id);
	return order.indexOf(id) + 1;
};

describe('renderMarkdown', () => {
	it('turns citation brackets into numbered chips', () => {
		const html = renderMarkdown('Applies from 20 January 2027 [f12, f40].', {
			streaming: false,
			number,
			brief
		});
		expect(html).toContain('class="cite-chip"');
		expect(html).toContain('data-id="f12"');
		expect(html).toContain('data-id="f40"');
		expect(html).not.toContain('[f12');
	});

	it('drops unknown ids instead of rendering broken chips', () => {
		const html = renderMarkdown('Claim [x99].', { streaming: false, number, brief });
		expect(html).not.toContain('cite-chip');
	});

	it('escapes raw HTML from the model', () => {
		const html = renderMarkdown('<img src=x onerror=alert(1)> hi', {
			streaming: false,
			number,
			brief
		});
		expect(html).not.toContain('<img');
	});

	it('hides a half-written citation while streaming', () => {
		const html = renderMarkdown('The date is fixed [f1', { streaming: true, number, brief });
		expect(html).not.toContain('[f1');
	});

	it('only allows http(s) links', () => {
		const html = renderMarkdown('[x](javascript:alert(1)) [y](https://iso.org)', {
			streaming: false,
			number,
			brief
		});
		expect(html).not.toContain('javascript:');
		expect(html).toContain('https://iso.org');
	});
});
