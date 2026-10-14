/**
 * Stage 1: deterministic parse of the two reference documents into sections,
 * extraction chunks, canonical sources and glossary terms.
 *
 *   npx tsx scripts/kg/parse.ts
 *
 * Output: data/kg/parsed.json
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import type {
	DocKey,
	EvidenceLabel,
	ParsedBlock,
	ParsedChunk,
	ParsedCorpus,
	ParsedSection,
	ParsedSource,
	ParsedTerm,
	SectionRole,
	TopicKey
} from '../../src/lib/kg/types';

const ROOT = new URL('../../', import.meta.url).pathname;
const FILES: Record<DocKey, string> = {
	booklet: `${ROOT}references/CMS-Research-Booklet.md`,
	glossary: `${ROOT}references/CMS-Glossary-and-Prerequisites.md`
};

export function slugify(title: string): string {
	return title
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s_-]/gu, '')
		.replace(/\s/g, '-');
}

const ROLE_BY_TITLE: [RegExp, SectionRole][] = [
	[/^The research question/i, 'question'],
	[/^About the evidence/i, 'evidence-about'],
	[/^Key findings/i, 'key-findings'],
	[/^Detailed findings/i, 'detailed'],
	[/^Comparison tables/i, 'tables'],
	[/^Well established/i, 'established'],
	[/^Uncertain/i, 'uncertain'],
	[/^Where experts disagree/i, 'disagree'],
	[/^Blind spots/i, 'blind-spots'],
	[/^Sources$/i, 'sources']
];

/** Top-level (##) sections that carry no knowledge of their own. */
const SKIP_TOP = [/^Contents$/i, /^Image credits$/i, /^Quick glossary$/i];

interface Line {
	n: number;
	text: string;
}

function parseDoc(doc: DocKey, sectionsOut: ParsedSection[], blocksOut: ParsedBlock[]) {
	const raw = readFileSync(FILES[doc], 'utf8').split('\n');
	const stack: ParsedSection[] = [];
	let current: ParsedSection | null = null;
	let pending: Line[] = [];
	let inFence = false;
	let skipping = false;

	const flush = () => {
		if (current && !skipping && pending.length) splitBlocks(current, pending, blocksOut);
		pending = [];
	};

	for (let i = 0; i < raw.length; i++) {
		const text = raw[i];
		if (/^```/.test(text)) inFence = !inFence;
		const m = !inFence && /^(#{1,6})\s+(.*)$/.exec(text);
		if (!m || m[1].length === 1) {
			if (m && m[1].length === 1) continue; // document title
			pending.push({ n: i + 1, text });
			continue;
		}
		flush();
		const level = m[1].length;
		const title = m[2].trim();
		while (stack.length && stack[stack.length - 1].level >= level) {
			stack.pop()!.endLine = i;
		}
		const parent = stack[stack.length - 1] ?? null;
		if (level === 2) skipping = SKIP_TOP.some((r) => r.test(title));
		const sec: ParsedSection = {
			id: `x${sectionsOut.length + 1}`,
			doc,
			level,
			title,
			slug: slugify(title),
			parentId: parent?.id ?? null,
			chapter: null,
			part: null,
			role: 'other',
			path: [...(parent?.path ?? []), title],
			startLine: i + 1,
			endLine: raw.length
		};
		if (doc === 'booklet') {
			const ch = /^Chapter (\d+):/.exec(title);
			if (level === 2) sec.chapter = ch ? Number(ch[1]) : 0;
			else sec.chapter = parent?.chapter ?? 0;
			const role = ROLE_BY_TITLE.find(([r]) => r.test(title))?.[1];
			if (role) sec.role = role;
			else if (parent && parent.role !== 'other' && parent.level >= 3) sec.role = parent.role;
			else if (sec.chapter === 0) sec.role = /synthesis/i.test(sec.path[0]) ? 'synthesis' : 'front';
			else if (parent?.role && parent.role !== 'other') sec.role = parent.role;
			// Children of "Detailed findings"/"Comparison tables" inherit through the chain above.
		} else {
			const part = /^Part ([A-I]):/.exec(title);
			if (level === 2) sec.part = part ? (part[1] as TopicKey) : null;
			else sec.part = parent?.part ?? null;
			if (level === 2 && /^A to Z index/i.test(title)) sec.role = 'glossary-index';
			else if (parent?.role === 'glossary-index') sec.role = 'glossary-index';
			else if (sec.part && level === 3) sec.role = 'glossary-entry';
			else sec.role = 'glossary-guide';
		}
		if (skipping) sec.role = 'other';
		stack.push(sec);
		if (!skipping) sectionsOut.push(sec);
		current = sec;
	}
	flush();
	while (stack.length) stack.pop()!.endLine = raw.length;
}

function splitBlocks(sec: ParsedSection, lines: Line[], out: ParsedBlock[]) {
	let i = 0;
	const push = (kind: ParsedBlock['kind'], text: string, line: number) => {
		const t = text.trim();
		if (t) out.push({ sectionId: sec.id, kind, text: t, line });
	};
	while (i < lines.length) {
		const { text, n } = lines[i];
		if (!text.trim() || /^---\s*$/.test(text)) {
			i++;
			continue;
		}
		if (/^```/.test(text)) {
			const buf = [text];
			i++;
			while (i < lines.length && !/^```/.test(lines[i].text)) buf.push(lines[i++].text);
			buf.push('```');
			i++;
			push('code', buf.join('\n'), n);
			continue;
		}
		if (/^\|/.test(text)) {
			const buf: string[] = [];
			while (i < lines.length && /^\|/.test(lines[i].text)) buf.push(lines[i++].text);
			push('table', buf.join('\n'), n);
			continue;
		}
		if (/^!\[/.test(text)) {
			push('figure', text.replace(/^!\[([^\]]*)\].*$/, '$1'), n);
			i++;
			continue;
		}
		if (/^>/.test(text)) {
			const buf: string[] = [];
			while (i < lines.length && /^>/.test(lines[i].text)) buf.push(lines[i++].text.replace(/^>\s?/, ''));
			push('quote', buf.join(' '), n);
			continue;
		}
		if (/^\s*([-*]|\d+\.)\s+/.test(text)) {
			const buf = [text.replace(/^\s*([-*]|\d+\.)\s+/, '')];
			i++;
			while (
				i < lines.length &&
				lines[i].text.trim() &&
				!/^\s*([-*]|\d+\.)\s+/.test(lines[i].text) &&
				/^\s+/.test(lines[i].text)
			) {
				buf.push(lines[i++].text.trim());
			}
			// Nested list items (indented bullets) attach to their parent item.
			while (i < lines.length && /^\s{2,}([-*]|\d+\.)\s+/.test(lines[i].text)) {
				buf.push('  - ' + lines[i++].text.replace(/^\s*([-*]|\d+\.)\s+/, ''));
			}
			push('li', buf.join('\n'), n);
			continue;
		}
		const buf = [text];
		i++;
		while (
			i < lines.length &&
			lines[i].text.trim() &&
			!/^(\||```|>|!\[|\s*([-*]|\d+\.)\s+)/.test(lines[i].text)
		) {
			buf.push(lines[i++].text);
		}
		push('p', buf.join(' '), n);
	}
}

/* ---------------------------------------------------------------------- */
/* Sources                                                                 */
/* ---------------------------------------------------------------------- */

const LABEL_RE = /\*\*(Independent|Vendor|Expert opinion)(?:\s*\(([^)]*)\))?\*\*/g;

export function normalizeUrl(url: string): string {
	return url
		.replace(/[.,;)]+$/, '')
		.replace(/^https?:\/\//, '')
		.replace(/^www\./, '')
		.replace(/#.*$/, '')
		.replace(/\/$/, '')
		.toLowerCase();
}

function parseSourceLine(text: string) {
	const urlMatch = /https?:\/\/[^\s]+/.exec(text);
	const url = urlMatch ? urlMatch[0].replace(/[.,;]+$/, '') : null;
	let label: EvidenceLabel | null = null;
	const qualifiers = new Set<string>();
	for (const m of text.matchAll(LABEL_RE)) {
		label ??= m[1] as EvidenceLabel;
		if (m[2]) m[2].split(/[;,]\s*/).forEach((q) => qualifiers.add(q.trim()));
	}
	const body = text.replace(LABEL_RE, '').replace(/https?:\/\/[^\s]+/g, '').trim();
	const segs = body.split(/\.\s+(?=[A-Z0-9"'“(])/).map((s) => s.trim());
	let authors = '';
	let title = segs[0] ?? body;
	if (segs.length > 1 && segs[0].length < 140) {
		authors = segs[0];
		title = segs[1];
	}
	const years = [...body.matchAll(/\b(19[5-9]\d|20[0-3]\d)\b/g)].map((m) => Number(m[1]));
	const year = years.length ? years[years.length - 1] : null;
	return { url, label, qualifiers: [...qualifiers], authors, title: title.replace(/\.$/, ''), year };
}

/* ---------------------------------------------------------------------- */
/* Main                                                                    */
/* ---------------------------------------------------------------------- */

export function parseCorpus(): ParsedCorpus {
	const sections: ParsedSection[] = [];
	const blocks: ParsedBlock[] = [];
	parseDoc('booklet', sections, blocks);
	parseDoc('glossary', sections, blocks);
	const byId = new Map(sections.map((s) => [s.id, s]));

	// Sources ---------------------------------------------------------------
	const sources: ParsedSource[] = [];
	const sourceByKey = new Map<string, ParsedSource>();
	for (const b of blocks) {
		const sec = byId.get(b.sectionId)!;
		if (sec.role !== 'sources' || b.kind !== 'li' || sec.chapter == null) continue;
		const line = readLineNumber(b);
		if (line == null) continue;
		const p = parseSourceLine(b.text);
		const key = p.url
			? normalizeUrl(p.url)
			: 'title:' +
				(p.authors + ' ' + p.title)
					.toLowerCase()
					.replace(/[^a-z0-9]+/g, ' ')
					.trim()
					.slice(0, 120);
		let src = sourceByKey.get(key);
		if (!src) {
			src = {
				id: `s${sources.length + 1}`,
				key,
				text: b.text,
				title: p.title,
				authors: p.authors,
				url: p.url,
				year: p.year,
				label: p.label,
				qualifiers: p.qualifiers,
				refs: []
			};
			sources.push(src);
			sourceByKey.set(key, src);
		}
		src.refs.push({ chapter: sec.chapter, num: line });
		if (!src.label && p.label) src.label = p.label;
		for (const q of p.qualifiers) if (!src.qualifiers.includes(q)) src.qualifiers.push(q);
	}

	// Glossary terms -----------------------------------------------------------
	const terms: ParsedTerm[] = [];
	const termBySlug = new Map<string, ParsedTerm>();
	for (const sec of sections) {
		if (sec.role !== 'glossary-entry' || !sec.part) continue;
		const own = blocks.filter((b) => b.sectionId === sec.id);
		const field = (label: string) => {
			const b = own.find((x) => x.text.startsWith(`**${label}.**`));
			if (!b) return '';
			const idx = own.indexOf(b);
			const parts = [b.text.replace(`**${label}.**`, '').trim()];
			for (let k = idx + 1; k < own.length && !/^\*\*[A-Z][^*]*\.\*\*/.test(own[k].text); k++) {
				parts.push(own[k].text);
			}
			return parts.join('\n\n');
		};
		const relatedText = field('Related terms');
		const all = own.map((b) => b.text).join('\n');
		const chapterRefs = new Set<number>();
		for (const m of all.matchAll(/\[(?:Chapters?|Ch\.?)\s+([^\]]+)\]/g)) {
			for (const n of m[1].matchAll(/\d+/g)) chapterRefs.add(Number(n[0]));
		}
		if (/\[(Introduction|Synthesis|Cross-chapter synthesis)\]/i.test(all)) chapterRefs.add(0);
		const term: ParsedTerm = {
			id: `t${terms.length + 1}`,
			title: sec.title,
			slug: sec.slug,
			part: sec.part,
			sectionId: sec.id,
			oneSentence: field('In one sentence'),
			explained: field('Explained'),
			why: field('Why it matters here'),
			related: [...relatedText.matchAll(/\]\(#([^)]+)\)/g)].map((m) => m[1]),
			chapterRefs: [...chapterRefs].sort((a, b) => a - b),
			aliases: []
		};
		// Acronyms and alternative names in the heading's parentheses.
		for (const m of sec.title.matchAll(/\(([^)]+)\)/g)) {
			for (const a of m[1].split(/,\s*|\s+and\s+/)) if (a.length <= 40) term.aliases.push(a.trim());
		}
		terms.push(term);
		termBySlug.set(term.slug, term);
	}
	// A to Z index aliases
	for (const b of blocks) {
		const sec = byId.get(b.sectionId)!;
		if (sec.role !== 'glossary-index' || b.kind !== 'li') continue;
		const m = /^\*\*(.+?)\*\*:\s*\[[^\]]*\]\(#([^)]+)\)/.exec(b.text);
		if (!m) continue;
		const t = termBySlug.get(m[2]);
		const alias = m[1].replace(/^The\s+/, '').trim();
		if (t && alias.toLowerCase() !== t.title.toLowerCase() && !t.aliases.includes(alias)) {
			t.aliases.push(alias);
		}
	}

	// Chunks -----------------------------------------------------------------
	const chunks: ParsedChunk[] = [];
	const MAX = 4200;
	const bySection = new Map<string, ParsedBlock[]>();
	for (const b of blocks) {
		if (!bySection.has(b.sectionId)) bySection.set(b.sectionId, []);
		bySection.get(b.sectionId)!.push(b);
	}
	for (const sec of sections) {
		if (sec.role === 'sources' || sec.role === 'glossary-index' || sec.role === 'other' && sec.doc === 'glossary') continue;
		let own = (bySection.get(sec.id) ?? []).filter((b) => b.kind !== 'figure');
		if (sec.role === 'glossary-entry') {
			own = own.filter((b) => !b.text.startsWith('**Related terms.**'));
		}
		if (!own.length) continue;
		// Split very large tables by rows (keeping the header).
		const units: ParsedBlock[] = [];
		for (const b of own) {
			if (b.kind === 'table' && b.text.length > MAX) {
				const rows = b.text.split('\n');
				const head = rows.slice(0, 2);
				let buf: string[] = [];
				for (const r of rows.slice(2)) {
					if ((head.join('\n') + buf.join('\n') + r).length > MAX && buf.length) {
						units.push({ ...b, text: [...head, ...buf].join('\n') });
						buf = [];
					}
					buf.push(r);
				}
				if (buf.length) units.push({ ...b, text: [...head, ...buf].join('\n') });
			} else units.push(b);
		}
		let buf: ParsedBlock[] = [];
		const emit = () => {
			if (!buf.length) return;
			chunks.push({
				id: `k${chunks.length + 1}`,
				doc: sec.doc,
				sectionId: sec.id,
				chapter: sec.chapter,
				part: sec.part,
				role: sec.role,
				headingPath: sec.path,
				text: buf.map((b) => b.text).join('\n\n'),
				line: buf[0].line
			});
			buf = [];
		};
		for (const u of units) {
			const size = buf.reduce((n, b) => n + b.text.length, 0);
			if (buf.length && size + u.text.length > MAX && sec.role !== 'glossary-entry') emit();
			buf.push(u);
		}
		emit();
	}

	return { sections, chunks, sources, terms };
}

/** Numbered list items keep their number in the raw line; recover it. */
function readLineNumber(b: ParsedBlock): number | null {
	const raw = rawLines()[b.line - 1] ?? '';
	const m = /^(\d+)\.\s/.exec(raw);
	return m ? Number(m[1]) : null;
}
let _raw: string[] | null = null;
function rawLines() {
	return (_raw ??= readFileSync(FILES.booklet, 'utf8').split('\n'));
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const corpus = parseCorpus();
	mkdirSync(`${ROOT}data/kg`, { recursive: true });
	writeFileSync(`${ROOT}data/kg/parsed.json`, JSON.stringify(corpus));
	const roles = new Map<string, number>();
	for (const c of corpus.chunks) roles.set(c.role, (roles.get(c.role) ?? 0) + 1);
	const chars = corpus.chunks.reduce((n, c) => n + c.text.length, 0);
	console.log(
		`sections ${corpus.sections.length}, chunks ${corpus.chunks.length} (${(chars / 1e6).toFixed(2)} M chars), sources ${corpus.sources.length} (refs ${corpus.sources.reduce((n, s) => n + s.refs.length, 0)}), terms ${corpus.terms.length} (aliases ${corpus.terms.reduce((n, t) => n + t.aliases.length, 0)})`
	);
	console.log('chunks by role', Object.fromEntries(roles));
}
