/** Markdown → HTML for assistant text, with inline citation chips and no raw HTML passthrough. */
import { Marked } from 'marked';
import { TOPIC_COLORS } from '#lib/graph/palette.ts';
import type { NodeBrief } from '#lib/app/context.ts';

const CITE_RE = /\[((?:[fstecx]\d+)(?:\s*[,;]\s*[fstecx]\d+)*)\]/g;
const PARTIAL_TAIL = /\[[fstecx]?[\d\s,;fstecx]*$/;

const escapeHtml = (s: string) =>
	s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const marked = new Marked({
	gfm: true,
	breaks: false,
	renderer: {
		html({ text }) {
			return escapeHtml(text);
		},
		link({ href, text }) {
			const safe = /^https?:\/\//.test(href) ? href : '#';
			return `<a href="${escapeHtml(safe)}" target="_blank" rel="noreferrer">${text}</a>`;
		}
	}
});

export function renderMarkdown(
	text: string,
	opts: { streaming: boolean; number: (id: string) => number; brief: (id: string) => NodeBrief | null }
): string {
	let src = text;
	if (opts.streaming) src = src.replace(PARTIAL_TAIL, '');
	const chips: string[] = [];
	src = src.replace(CITE_RE, (_, group: string) => {
		const ids = group.split(/\s*[,;]\s*/);
		const html = ids
			.map((id) => {
				const b = opts.brief(id);
				if (!b) return '';
				const n = opts.number(id);
				const color = TOPIC_COLORS[b.topic] ?? '#9aa';
				return `<button type="button" class="cite-chip" data-id="${id}" style="--c:${color}" aria-label="Citation ${n}">${n}</button>`;
			})
			.join('');
		chips.push(html ? `<span class="cite-group">${html}</span>` : '');
		return `@@CITE${chips.length - 1}@@`;
	});
	let html = marked.parse(src, { async: false }) as string;
	html = html.replace(/@@CITE(\d+)@@/g, (_, i: string) => chips[Number(i)] ?? '');
	return html;
}
