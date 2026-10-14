/**
 * Markdown → HTML for the reader. The documents' own conventions become interactive:
 * `[3, 83]` citations turn into chips for the chapter's sources, the glossary's `[Chapter 8]`
 * references into links to the booklet, evidence labels into quiet badges, mermaid blocks into
 * diagram figures (drawn later) and photographs into captions. Raw HTML is never passed through.
 *
 * Everything that is not the document's running text carries `data-skip`, so fact quotes can be
 * matched against the text alone.
 */
import { Marked, type Tokens } from 'marked';

export interface RenderContext {
	/** Citation number → source, for this unit's chapter. */
	sources: Record<number, { id: string; label: string }>;
	/** Booklet chapter → unit id. */
	chapters: Record<number, string>;
	/** Collects the mermaid sources; each figure carries its index. */
	diagrams: string[];
}

const esc = (s: string) =>
	s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** `[3]`, `[1, 4]`, `[5–7]`: the booklet's numbered citations. */
export const CITE_RE = /^\[(\d+(?:\s*[–-]\s*\d+)?(?:\s*,\s*\d+(?:\s*[–-]\s*\d+)?)*)\](?!\()/;
/** `[Chapter 8]`, `[Chapters 2, 3]`, `[Introduction]`: the glossary's pointers into the booklet. */
export const CHREF_RE = /^\[(Chapters?\s+\d+(?:\s*(?:,|and|&)\s*\d+)*|Introduction)\](?!\()/;

export function citeNumbers(group: string): number[] {
	const out: number[] = [];
	for (const part of group.split(/\s*,\s*/)) {
		const m = /^(\d+)(?:\s*[–-]\s*(\d+))?$/.exec(part.trim());
		if (!m) continue;
		const a = Number(m[1]);
		const b = m[2] ? Number(m[2]) : a;
		for (let n = a; n <= Math.min(b, a + 40); n++) out.push(n);
	}
	return out;
}

const EVIDENCE =
	/^(Independent|Vendor|Expert opinion)(\s*\((?:on-road evidence|[^)]{0,40})\))?\.?$/i;

let ctx: RenderContext = { sources: {}, chapters: {}, diagrams: [] };

const marked = new Marked({
	gfm: true,
	breaks: false,
	extensions: [
		{
			name: 'cite',
			level: 'inline',
			start: (src: string) => src.match(/\[\d/)?.index,
			tokenizer(src: string) {
				const m = CITE_RE.exec(src);
				if (m) return { type: 'cite', raw: m[0], nums: citeNumbers(m[1]) };
			},
			renderer(t) {
				const chips = (t.nums as number[])
					.map((n) => {
						const s = ctx.sources[n];
						return s
							? `<button type="button" class="r-cite" data-src="${esc(s.id)}" data-label="${esc(s.label)}">${n}</button>`
							: `<span class="r-cite r-cite-off">${n}</span>`;
					})
					.join('');
				return `<span class="r-cites" data-skip>${chips}</span>`;
			}
		},
		{
			name: 'chref',
			level: 'inline',
			start: (src: string) => src.match(/\[(Chapters?\s|Introduction\])/)?.index,
			tokenizer(src: string) {
				const m = CHREF_RE.exec(src);
				if (m) {
					const nums = /^Intro/.test(m[1]) ? [0] : (m[1].match(/\d+/g) ?? []).map(Number);
					return { type: 'chref', raw: m[0], nums };
				}
			},
			renderer(t) {
				const chips = (t.nums as number[])
					.map((n) => {
						const unit = ctx.chapters[n];
						const label = n === 0 ? 'Intro' : `Ch ${n}`;
						return unit
							? `<button type="button" class="r-chref" data-unit="${esc(unit)}" data-label="${n === 0 ? 'Introduction' : `Booklet chapter ${n}`}">${label}</button>`
							: `<span class="r-chref">${label}</span>`;
					})
					.join('');
				return `<span class="r-cites" data-skip>${chips}</span>`;
			}
		}
	],
	renderer: {
		html({ text }: Tokens.HTML | Tokens.Tag) {
			return esc(text);
		},
		code({ text, lang }: Tokens.Code) {
			if (lang === 'mermaid') {
				ctx.diagrams.push(text);
				return `<figure class="r-diagram" data-skip data-m="${ctx.diagrams.length - 1}"><div class="r-diagram-svg"></div><button type="button" class="r-diagram-expand" aria-label="View the diagram full size"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg></button></figure>`;
			}
			return `<pre class="r-code" data-skip><code>${esc(text)}</code></pre>`;
		},
		image({ text }: Tokens.Image) {
			return `<span class="r-photo" data-skip><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="m21 16-5-5-9 9"/></svg><span>${esc(text)}<em>Photograph in the original booklet</em></span></span>`;
		},
		strong(this: { parser: { parseInline(t: Tokens.Generic[]): string } }, t: Tokens.Strong) {
			const inner = this.parser.parseInline(t.tokens);
			const ev = EVIDENCE.exec(t.text.trim());
			if (ev)
				return `<strong class="r-ev" data-ev="${ev[1].toLowerCase().replace(/\s+/g, '-')}">${inner}</strong>`;
			return `<strong>${inner}</strong>`;
		},
		link(this: { parser: { parseInline(t: Tokens.Generic[]): string } }, t: Tokens.Link) {
			const inner = this.parser.parseInline(t.tokens);
			if (t.href.startsWith('#'))
				return `<a href="${esc(t.href)}" class="r-xref" data-slug="${esc(t.href.slice(1))}">${inner}</a>`;
			const safe = /^https?:\/\//.test(t.href) ? t.href : '#';
			return `<a href="${esc(safe)}" target="_blank" rel="noreferrer">${inner}</a>`;
		}
	}
});

/** Render one section's markdown. */
export function renderSection(md: string, context: RenderContext): string {
	ctx = context;
	const html = marked.parse(md, { async: false }) as string;
	return html
		.replace(/<table>/g, '<div class="r-table"><table>')
		.replace(/<\/table>/g, '</table></div>');
}

/* ------------------------------------------------------------------------ */
/* Matching fact quotes against the rendered text                            */
/* ------------------------------------------------------------------------ */

/**
 * A quote (verbatim markdown) reduced to the characters the reader shows: no markdown syntax,
 * no citation markers, no whitespace. The rendered text is reduced the same way (whitespace
 * dropped, `data-skip` elements left out), so the two can be compared with indexOf.
 */
export function flattenQuote(q: string): string {
	return q
		.replace(/^\s{0,3}(?:[-*+]|\d+[.)])\s+/gm, '')
		.replace(/^#{1,6}\s+/gm, '')
		.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
		.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/\[\d+(?:\s*[–-]\s*\d+)?(?:\s*,\s*\d+(?:\s*[–-]\s*\d+)?)*\]/g, '')
		.replace(/\[(?:Chapters?\s+\d+(?:\s*(?:,|and|&)\s*\d+)*|Introduction)\]/g, '')
		.replace(/\*\*|__|`/g, '')
		.replace(/(^|[\s([{"'“‘])[*_](?=\S)/g, '$1')
		.replace(/(\S)[*_](?=[\s)\]}.,;:!?"'”’]|$)/g, '$1')
		.replace(/\\([\\`*_{}[\]()#+\-.!|>])/g, '$1')
		.replace(/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/gm, '')
		.replace(/\|/g, '')
		.replace(/\s+/g, '');
}

export interface TextIndex {
	/** The text without whitespace. */
	flat: string;
	nodes: Text[];
	/** Flat offset where each text node starts. */
	starts: number[];
}

/** Index the visible running text under `root` (skipping `data-skip` subtrees). */
export function indexText(root: HTMLElement): TextIndex {
	const nodes: Text[] = [];
	const starts: number[] = [];
	let flat = '';
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
		acceptNode(n) {
			if (n.nodeType === 1)
				return (n as Element).hasAttribute('data-skip')
					? NodeFilter.FILTER_REJECT
					: NodeFilter.FILTER_SKIP;
			return NodeFilter.FILTER_ACCEPT;
		}
	});
	for (let n = walker.nextNode(); n; n = walker.nextNode()) {
		const t = n as Text;
		nodes.push(t);
		starts.push(flat.length);
		flat += t.data.replace(/\s+/g, '');
	}
	return { flat, nodes, starts };
}

/** Flat offset of a DOM position (a text node and an offset in it), or -1. */
export function flatOffset(ix: TextIndex, node: Node, offset: number): number {
	if (node.nodeType !== 3) return -1;
	const k = ix.nodes.indexOf(node as Text);
	if (k < 0) return -1;
	return ix.starts[k] + (node as Text).data.slice(0, offset).replace(/\s+/g, '').length;
}

/** The text node and offset of the character at a flat offset. */
function charAt(ix: TextIndex, pos: number): [Text, number] | null {
	let lo = 0;
	let hi = ix.starts.length - 1;
	let k = -1;
	while (lo <= hi) {
		const mid = (lo + hi) >> 1;
		if (ix.starts[mid] <= pos) {
			k = mid;
			lo = mid + 1;
		} else hi = mid - 1;
	}
	if (k < 0) return null;
	const t = ix.nodes[k];
	let need = pos - ix.starts[k];
	for (let i = 0; i < t.data.length; i++) {
		if (/\s/.test(t.data[i])) continue;
		if (need-- === 0) return [t, i];
	}
	return null;
}

/** The DOM range covering flat offsets [start, end). */
export function rangeOf(ix: TextIndex, start: number, end: number): Range | null {
	const a = charAt(ix, start);
	const b = charAt(ix, end - 1);
	if (!a || !b) return null;
	const r = document.createRange();
	r.setStart(a[0], a[1]);
	r.setEnd(b[0], b[1] + 1);
	return r;
}

export interface FactSpan {
	id: string;
	start: number;
	end: number;
}

/**
 * Where each fact's quote sits in the indexed text. Searches from its section's start first,
 * then the whole unit; long quotes that don't match whole fall back to their opening words.
 */
export function locateFacts(
	ix: TextIndex,
	facts: { id: string; s: string; q: string }[],
	sectionStart: (sid: string) => number
): FactSpan[] {
	const out: FactSpan[] = [];
	for (const f of facts) {
		const q = flattenQuote(f.q);
		if (q.length < 8) continue;
		const from = Math.max(0, sectionStart(f.s));
		let at = ix.flat.indexOf(q, from);
		if (at < 0) at = ix.flat.indexOf(q);
		if (at >= 0) {
			out.push({ id: f.id, start: at, end: at + q.length });
			continue;
		}
		const head = q.slice(0, 48);
		const tail = q.slice(-32);
		const h = ix.flat.indexOf(head, from);
		if (h < 0) continue;
		const t = ix.flat.indexOf(tail, h + head.length);
		const end = t >= 0 && t - h < q.length * 2 ? t + tail.length : h + head.length;
		out.push({ id: f.id, start: h, end });
	}
	return out.sort((a, b) => a.start - b.start);
}
