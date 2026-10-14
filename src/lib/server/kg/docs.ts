/**
 * The documents as a reader sees them: the booklet and the glossary split into units (one per
 * `##` heading: a chapter, a part, a guide), each with its sections' own markdown, the facts
 * quoted from it and the sources its citation numbers point at. Also finds where any graph node
 * lives in the text, and indexes the mermaid diagrams so the agent can show them.
 */
import type { DocKey, KGNode, ParsedSection } from '#lib/kg/types.ts';
import type { Diagram, DocLocation, DocSection, DocToc, DocUnit, TocUnit } from '#lib/kg/docs.ts';
import { stem, type GraphStore } from './store.ts';

interface Heading {
	line: number;
	level: number;
	title: string;
}

interface Built {
	units: (TocUnit & { start: number; end: number; crumbs: string[]; sectionIds: string[] })[];
	sections: Map<string, DocSection & { unit: string; doc: DocKey }>;
	unitOfSection: Map<string, string>;
	toc: DocToc;
	diagrams: Diagram[];
}

const DOC_TITLES: Record<DocKey, string> = {
	booklet: 'Research booklet',
	glossary: 'Glossary',
	upload: 'Uploads'
};

/** GitHub-style heading slug (what the documents' own `#anchor` links use). */
export function slugify(title: string): string {
	return title
		.toLowerCase()
		.trim()
		.replace(/[^\p{L}\p{N}\s_-]/gu, '')
		.replace(/\s/g, '-');
}

function headings(lines: string[]): Heading[] {
	const out: Heading[] = [];
	let fence = false;
	lines.forEach((l, i) => {
		if (/^```/.test(l)) fence = !fence;
		const m = !fence && /^(#{2,6})\s+(.*?)\s*$/.exec(l);
		if (m) out.push({ line: i + 1, level: m[1].length, title: m[2] });
	});
	return out;
}

/** Strip trailing blank lines and horizontal rules. */
function trimEnd(lines: string[]) {
	let n = lines.length;
	while (n && /^\s*(---+)?\s*$/.test(lines[n - 1])) n--;
	return lines.slice(0, n);
}

const cache = new WeakMap<GraphStore, { at: number; built: Built }>();

function build(store: GraphStore): Built {
	const hit = cache.get(store);
	if (hit && hit.at === store.loadedAt) return hit.built;
	const raw = store.rawLines();
	const parsedAt = new Map<string, ParsedSection>();
	for (const s of store.corpus.sections) parsedAt.set(`${s.doc}:${s.startLine}`, s);

	const units: Built['units'] = [];
	const sections: Built['sections'] = new Map();
	const unitOfSection = new Map<string, string>();
	const slugs: DocToc['slugs'] = {};
	const chapters: DocToc['chapters'] = {};

	for (const doc of ['booklet', 'glossary'] as const) {
		const lines = raw[doc];
		const hs = headings(lines);
		let part: string | null = null;
		hs.forEach((h, k) => {
			if (h.level !== 2 || /^contents$/i.test(h.title)) return;
			let endIdx = hs.findIndex((x, j) => j > k && x.level <= 2);
			if (endIdx < 0) endIdx = hs.length;
			const end = endIdx < hs.length ? hs[endIdx].line - 1 : lines.length;
			const parsed = parsedAt.get(`${doc}:${h.line}`);
			const id = parsed?.id ?? `${doc[0]}L${h.line}`;
			const isPart = doc === 'booklet' && /^Part [IVX]+:/.test(h.title);
			if (isPart) part = h.title;
			if (doc === 'booklet' && /^Image credits$/i.test(h.title)) part = null;
			const chapter = doc === 'booklet' ? (parsed?.chapter ?? null) : null;
			if (doc === 'booklet' && chapter != null && /^Chapter \d+/.test(h.title))
				chapters[chapter] = id;
			if (doc === 'booklet' && chapter === 0 && chapters[0] == null) chapters[0] = id;
			const unit: Built['units'][number] = {
				id,
				doc,
				title: h.title,
				part: isPart,
				chapter,
				sections: [],
				start: h.line,
				end,
				crumbs: [DOC_TITLES[doc], ...(part && !isPart && /^Chapter/.test(h.title) ? [part] : [])],
				sectionIds: []
			};
			for (let j = k; j < endIdx; j++) {
				const s = hs[j];
				const next = j + 1 < hs.length ? hs[j + 1].line - 1 : lines.length;
				const ps = parsedAt.get(`${doc}:${s.line}`);
				const sid = ps?.id ?? `${doc[0]}L${s.line}`;
				const md = trimEnd(lines.slice(s.line, Math.min(next, end))).join('\n');
				const slug = ps?.slug ?? slugify(s.title);
				sections.set(sid, {
					id: sid,
					level: s.level,
					title: s.title,
					slug,
					md,
					role: ps?.role ?? null,
					unit: id,
					doc
				});
				unitOfSection.set(sid, id);
				unit.sectionIds.push(sid);
				if (s.level === 3) unit.sections.push({ id: sid, title: s.title });
				if (!slugs[slug]) slugs[slug] = [id, sid];
			}
			units.push(unit);
		});
	}

	// Uploaded documents: one unit each.
	const uploads = new Map<string, { title: string; ids: string[] }>();
	for (const n of store.nodes) {
		if (n.type !== 'section' || n.doc !== 'upload') continue;
		const up = n.id.replace(/-s\d+$/, '');
		if (!uploads.has(up)) uploads.set(up, { title: n.path?.[0] ?? n.label, ids: [] });
		uploads.get(up)!.ids.push(n.id);
	}
	for (const [uid, u] of uploads) {
		const unit: Built['units'][number] = {
			id: uid,
			doc: 'upload',
			title: u.title,
			part: false,
			chapter: null,
			sections: [],
			start: 0,
			end: 0,
			crumbs: [DOC_TITLES.upload],
			sectionIds: []
		};
		for (const sid of u.ids) {
			const s = store.section(sid);
			const md = store.uploadSections.get(sid) ?? '';
			const level = Math.min(6, Math.max(2, (s?.path.length ?? 1) + 1));
			const title = s?.title ?? sid;
			sections.set(sid, {
				id: sid,
				level,
				title,
				slug: slugify(title),
				md,
				role: null,
				unit: uid,
				doc: 'upload'
			});
			unitOfSection.set(sid, uid);
			unit.sectionIds.push(sid);
			if (level === 3) unit.sections.push({ id: sid, title });
		}
		units.push(unit);
	}

	const toc: DocToc = {
		docs: (['booklet', 'glossary', 'upload'] as const)
			.map((key) => ({
				key,
				title: DOC_TITLES[key],
				units: units
					.filter((u) => u.doc === key)
					.map(({ id, doc, title, part, chapter, sections }) => ({
						id,
						doc,
						title,
						part,
						chapter,
						sections
					}))
			}))
			.filter((d) => d.units.length),
		slugs,
		chapters
	};
	const built: Built = { units, sections, unitOfSection, toc, diagrams: [] };
	built.diagrams = indexDiagrams(store, built);
	cache.set(store, { at: store.loadedAt, built });
	return built;
}

export function docToc(store: GraphStore): DocToc {
	return build(store).toc;
}

export function docUnit(store: GraphStore, id: string): DocUnit | null {
	const b = build(store);
	const k = b.units.findIndex((u) => u.id === id);
	if (k < 0) return null;
	const u = b.units[k];
	const ids = new Set(u.sectionIds);
	const facts: DocUnit['facts'] = [];
	for (const n of store.nodes) {
		if (n.type === 'fact' && n.quote && n.sectionId && ids.has(n.sectionId))
			facts.push({ id: n.id, s: n.sectionId, q: n.quote });
	}
	const sources: DocUnit['sources'] = {};
	if (u.doc === 'booklet' && u.chapter != null) {
		const bySourceKey = new Map<string, KGNode>();
		for (const n of store.nodes) if (n.type === 'source') bySourceKey.set(n.id, n);
		for (const s of store.corpus.sources) {
			const ref = s.refs.find((r) => r.chapter === u.chapter);
			const node = bySourceKey.get(s.id);
			if (ref && node)
				sources[ref.num] = {
					id: node.id,
					label: node.by ? `${node.by} — ${node.label}` : node.label
				};
		}
	}
	const link = (x: Built['units'][number] | undefined) =>
		x && x.doc === u.doc ? { id: x.id, title: x.title } : null;
	return {
		id: u.id,
		doc: u.doc,
		title: u.title,
		chapter: u.chapter,
		crumbs: u.crumbs,
		prev: link(b.units[k - 1]),
		next: link(b.units[k + 1]),
		sections: u.sectionIds.map((sid) => {
			const { id, level, title, slug, md, role } = b.sections.get(sid)!;
			return { id, level, title, slug, md, role };
		}),
		facts,
		sources
	};
}

/** Where a graph node can be read: its passage, entry, chapter or bibliography line. */
export function locate(store: GraphStore, id: string): DocLocation | null {
	const b = build(store);
	const n = store.get(id);
	if (!n) return null;
	const at = (section: string, extra: Partial<DocLocation> = {}): DocLocation | null => {
		const unit = b.unitOfSection.get(section);
		return unit ? { unit, section, ...extra } : null;
	};
	const firstOf = (unitId: string | undefined) => {
		const u = b.units.find((x) => x.id === unitId);
		return u ? { unit: u.id, section: u.sectionIds[0] } : null;
	};
	switch (n.type) {
		case 'fact':
			return n.sectionId ? at(n.sectionId, { fact: n.id }) : null;
		case 'section':
			return at(n.id);
		case 'term':
			return n.sectionId ? at(n.sectionId) : null;
		case 'doc':
			return firstOf(b.units.find((u) => u.doc === n.doc)?.id);
		case 'chapter': {
			if (n.doc === 'booklet' && n.chapter != null) return firstOf(b.toc.chapters[n.chapter]);
			const letter = /^g([A-I])$/.exec(n.id)?.[1];
			return firstOf(
				b.units.find((u) => u.doc === 'glossary' && u.title.startsWith(`Part ${letter}:`))?.id
			);
		}
		case 'source': {
			const ref = store.corpus.sources.find((s) => s.id === n.id)?.refs[0];
			const unitId = ref ? b.toc.chapters[ref.chapter] : undefined;
			const u = b.units.find((x) => x.id === unitId);
			if (!u || !ref) return null;
			const list = [...u.sectionIds]
				.reverse()
				.find((sid) => b.sections.get(sid)?.role === 'sources');
			return { unit: u.id, section: list ?? u.sectionIds[0], source: ref.num };
		}
		case 'entity': {
			// Its most important fact, preferring the booklet and earlier chapters.
			let best: KGNode | null = null;
			let bestScore = -Infinity;
			for (const a of store.neighbors(n.id, { rels: ['about'], types: ['fact'] })) {
				const f = store.get(a.id);
				if (!f?.sectionId) continue;
				const score =
					(f.importance ?? 1) * 10 + (f.doc === 'booklet' ? 5 : 0) - (f.chapter ?? 14) * 0.1;
				if (score > bestScore) {
					bestScore = score;
					best = f;
				}
			}
			return best?.sectionId ? at(best.sectionId, { fact: best.id }) : null;
		}
	}
	return null;
}

/* ------------------------------------------------------------------------ */
/* Diagrams                                                                  */
/* ------------------------------------------------------------------------ */

function indexDiagrams(store: GraphStore, b: Built): Diagram[] {
	const raw = store.rawLines();
	const out: Diagram[] = [];
	for (const doc of ['booklet', 'glossary'] as const) {
		const lines = raw[doc];
		const hs = headings(lines);
		for (let i = 0; i < lines.length; i++) {
			if (!/^```mermaid\s*$/.test(lines[i])) continue;
			let j = i + 1;
			while (j < lines.length && !/^```\s*$/.test(lines[j])) j++;
			const code = lines.slice(i + 1, j).join('\n');
			const line = i + 1;
			const h = [...hs].reverse().find((x) => x.line < line);
			const ps = h && store.corpus.sections.find((s) => s.doc === doc && s.startLine === h.line);
			const section = ps?.id ?? (h ? `${doc[0]}L${h.line}` : '');
			const unit = b.unitOfSection.get(section) ?? '';
			const u = b.units.find((x) => x.id === unit);
			const heading = h && h.title !== u?.title ? h.title.replace(/^\d+\.\s+/, '') : null;
			const cap = caption(lines, i, j, code) ?? heading ?? u?.title ?? 'Diagram';
			const where = [
				doc === 'glossary' ? 'Glossary' : u?.chapter ? `Ch ${u.chapter}` : u?.title,
				heading && heading !== cap ? heading : null
			]
				.filter(Boolean)
				.join(' › ');
			out.push({
				id: `m${out.length + 1}`,
				doc,
				unit,
				section,
				where,
				caption: cap,
				kind: /^\s*(\w+)/m.exec(code.replace(/^%%.*$/gm, ''))?.[1] ?? 'diagram',
				labels: labelsOf(code),
				code
			});
			i = j;
		}
	}
	return out;
}

const STOP = new Set(
	'the and for with from that this what which how into are was were its their of to in on a an by or as at be is it diagram diagrams chart figure show'.split(
		' '
	)
);

const clean = (s: string) =>
	s
		.replace(/\*\*|__|`/g, '')
		.replace(/^[_*]|[_*]$/g, '')
		.replace(/\s*\[[\d,\s–-]+\]\s*$/, '')
		.trim();

/**
 * The diagram's own title, a figure caption below it, or the bold lead-in of the paragraph
 * above it.
 */
function caption(lines: string[], open: number, close: number, code: string): string | null {
	const title = /^\s*title\s+(.+)$/m.exec(code);
	if (title) return clean(title[1]);
	let k = close + 1;
	while (k < lines.length && !lines[k].trim()) k++;
	const after = lines[k] ?? '';
	if (/^[_*](Figure|The |This )/.test(after)) {
		const c = clean(after).replace(/^Figure:\s*/, '');
		return c[0].toUpperCase() + c.slice(1);
	}
	k = open - 1;
	while (k >= 0 && !lines[k].trim()) k--;
	const lead = /^\*\*(.+?)\*\*/.exec(lines[k] ?? '');
	if (lead) return clean(lead[1]).replace(/[.:]$/, '');
	return null;
}

function labelsOf(code: string): string[] {
	const out: string[] = [];
	for (const m of code.matchAll(/\[\s*"?`?([^\]"`]+)`?"?\s*\]|\(\s*"?([^)"]+)"?\s*\)|"([^"]+)"/g)) {
		const t = clean((m[1] ?? m[2] ?? m[3] ?? '').replace(/\s+/g, ' '));
		if (t.length > 2 && !out.includes(t)) out.push(t);
	}
	return out;
}

export function diagrams(store: GraphStore): Diagram[] {
	return build(store).diagrams;
}

export function diagram(store: GraphStore, id: string): Diagram | null {
	return build(store).diagrams.find((d) => d.id === id) ?? null;
}

/** Diagrams matching a query (words in the caption, the section and the boxes), best first. */
export function findDiagrams(store: GraphStore, query: string, chapter?: number): Diagram[] {
	const stems = (t: string) =>
		new Set(
			t
				.split(/[^\p{L}\p{N}]+/u)
				.filter((w) => w.length > 2 && !STOP.has(w.toLowerCase()))
				.map(stem)
		);
	const words = [...stems(query)];
	const b = build(store);
	return b.diagrams
		.filter((d) => chapter == null || b.units.find((u) => u.id === d.unit)?.chapter === chapter)
		.map((d) => {
			const hay = stems(`${d.caption} ${d.where}`);
			const body = stems(d.labels.join(' '));
			const score = words.reduce((s, w) => s + (hay.has(w) ? 3 : 0) + (body.has(w) ? 1 : 0), 0);
			return { d, score };
		})
		.filter((x) => !words.length || x.score > 0)
		.sort((a, b) => b.score - a.score)
		.map((x) => x.d);
}
