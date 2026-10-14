import { describe, expect, it } from 'vitest';
import { citeNumbers, flattenQuote, renderSection } from './markdown.ts';

const ctx = () => ({
	sources: { 3: { id: 's3', label: 'ICMM — Principles' }, 4: { id: 's4', label: 'RAND' } },
	chapters: { 0: 'x1', 8: 'x240' },
	diagrams: [] as string[]
});

describe('reader markdown', () => {
	it('expands citation groups and ranges', () => {
		expect(citeNumbers('1, 4–6')).toEqual([1, 4, 5, 6]);
		expect(citeNumbers('12')).toEqual([12]);
	});

	it('turns the documents’ conventions into interactive pieces', () => {
		const c = ctx();
		const html = renderSection(
			[
				'Claim. **Expert opinion** [3, 4] and [9].',
				'',
				'See [Chapter 8] and the [entry](#wheel-loader) <script>x</script>.',
				'',
				'![Figure 4.1. A haul truck](images/ch4.jpg)',
				'',
				'```mermaid',
				'flowchart LR',
				'  A --> B',
				'```',
				'',
				'| a | b |',
				'|---|---|',
				'| 1 | 2 |'
			].join('\n'),
			c
		);
		expect(html).toContain('class="r-ev" data-ev="expert-opinion"');
		expect(html).toContain('data-src="s3"');
		expect(html).toContain('data-src="s4"');
		expect(html).toContain('r-cite-off">9<');
		expect(html).toContain('data-unit="x240"');
		expect(html).toContain('data-slug="wheel-loader"');
		expect(html).toContain('&lt;script&gt;');
		expect(html).not.toContain('<script>');
		expect(html).toContain('class="r-photo" data-skip');
		expect(html).toContain('Figure 4.1. A haul truck');
		expect(html).toContain('class="r-diagram" data-skip data-m="0"');
		expect(c.diagrams).toEqual(['flowchart LR\n  A --> B']);
		expect(html).toContain('<div class="r-table"><table>');
	});

	it('reduces a quote to the characters the page shows', () => {
		expect(flattenQuote('- **No single approach** compresses _validation_ [1, 2].')).toBe(
			'Nosingleapproachcompressesvalidation.'
		);
		expect(flattenQuote('TTC is [Chapter 8] `distance / speed`')).toBe('TTCisdistance/speed');
		expect(flattenQuote('| A | B |\n|---|---|\n| 1 | 2 |')).toBe('AB12');
		expect(flattenQuote('see [the entry](#x) and snake_case_names')).toBe(
			'seetheentryandsnake_case_names'
		);
	});
});
