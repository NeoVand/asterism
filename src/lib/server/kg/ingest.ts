/**
 * Weave a new document into the graph: chunk it by headings, extract atomic facts with the same
 * prompt as the booklet, store it under data/kg/uploads/<id>, re-assemble and reload the store.
 * New facts connect through shared glossary concepts, entities (resolved against the existing
 * graph) and their own sections.
 */
import OpenAI from 'openai';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ParsedChunk, ParsedCorpus, UploadMeta } from '#lib/kg/types.ts';
import {
	SCHEMA,
	chunkHash,
	systemPrompt,
	userPrompt,
	type ExtractResult,
	type ExtractedFact
} from './extraction.ts';
import { writeAssembled } from './assemble.ts';
import { getStore } from './store.ts';

export type IngestEvent =
	| { t: 'stage'; stage: 'chunking' | 'extracting' | 'weaving' | 'done'; detail?: string }
	| { t: 'progress'; done: number; total: number; facts: number }
	| { t: 'done'; docId: string; name: string; facts: string[]; entities: number; concepts: number }
	| { t: 'error'; message: string };

const DATA = resolve(process.cwd(), 'data/kg');
const MAX_CHARS = 4200;

/** Markdown (or plain text) → sections by heading, chunks of whole blocks up to MAX_CHARS. */
export function chunkDocument(
	id: string,
	name: string,
	text: string
): Pick<UploadMeta, 'sections' | 'chunks'> {
	const lines = text.replace(/\r\n?/g, '\n').split('\n');
	const sections: UploadMeta['sections'] = [];
	const stack: { level: number; title: string }[] = [];
	let cur = { title: name, path: [name], body: [] as string[] };
	const flush = () => {
		const body = cur.body.join('\n').trim();
		if (body)
			sections.push({
				id: `${id}-s${sections.length + 1}`,
				title: cur.title,
				path: cur.path,
				text: body
			});
	};
	let fence = false;
	for (const line of lines) {
		if (/^```/.test(line)) fence = !fence;
		const m = !fence && /^(#{1,6})\s+(.*)$/.exec(line);
		if (m) {
			flush();
			const level = m[1].length;
			while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
			stack.push({ level, title: m[2].trim() });
			cur = { title: m[2].trim(), path: [name, ...stack.map((s) => s.title)], body: [] };
		} else cur.body.push(line);
	}
	flush();

	const chunks: ParsedChunk[] = [];
	for (const sec of sections) {
		const blocks = sec.text
			.split(/\n\s*\n/)
			.map((b) => b.trim())
			.filter(Boolean);
		let buf: string[] = [];
		const emit = () => {
			if (!buf.length) return;
			chunks.push({
				id: `${id}-k${chunks.length + 1}`,
				doc: 'upload',
				sectionId: sec.id,
				chapter: null,
				part: null,
				role: 'detailed',
				headingPath: sec.path,
				text: buf.join('\n\n'),
				line: 0
			});
			buf = [];
		};
		for (const b of blocks) {
			const size = buf.reduce((n, x) => n + x.length, 0);
			if (buf.length && size + b.length > MAX_CHARS) emit();
			// Very long blocks (no blank lines) are split on sentence boundaries.
			if (b.length > MAX_CHARS) {
				for (const piece of b.match(new RegExp(`[\\s\\S]{1,${MAX_CHARS}}(?=\\.\\s|$)`, 'g')) ?? [
					b
				]) {
					buf.push(piece.trim());
					emit();
				}
				continue;
			}
			buf.push(b);
		}
		emit();
	}
	return { sections, chunks };
}

async function extractChunk(
	client: OpenAI,
	model: string,
	system: string,
	chunk: ParsedChunk,
	name: string
): Promise<ExtractedFact[]> {
	for (let attempt = 0; ; attempt++) {
		try {
			const r = (await client.responses.create({
				model,
				instructions: system,
				input: userPrompt(chunk, name),
				reasoning: { effort: 'low' },
				text: { format: { type: 'json_schema', name: 'facts', strict: true, schema: SCHEMA } }
			} as never)) as unknown as { output_text: string };
			return (JSON.parse(r.output_text) as { facts: ExtractedFact[] }).facts;
		} catch (e) {
			if (attempt >= 3) throw e;
			await new Promise((res) => setTimeout(res, 1500 * 2 ** attempt));
		}
	}
}

export async function* ingest(
	name: string,
	text: string,
	opts: { apiKey: string; model?: string }
): AsyncGenerator<IngestEvent> {
	const clean = name.replace(/\.(md|markdown|txt)$/i, '').slice(0, 80) || 'Document';
	if (text.trim().length < 80) {
		yield { t: 'error', message: 'The document is too short to extract facts from.' };
		return;
	}
	if (text.length > 600_000) {
		yield { t: 'error', message: 'The document is larger than 600k characters; split it first.' };
		return;
	}
	const id = `u${Date.now().toString(36)}`;
	const dir = `${DATA}/uploads/${id}`;
	mkdirSync(`${dir}/extract`, { recursive: true });

	yield { t: 'stage', stage: 'chunking' };
	const { sections, chunks } = chunkDocument(id, clean, text);
	const meta: UploadMeta = {
		id,
		name: clean,
		createdAt: new Date().toISOString(),
		sections,
		chunks
	};

	yield { t: 'stage', stage: 'extracting', detail: `${chunks.length} passages` };
	const corpus = JSON.parse(readFileSync(`${DATA}/parsed.json`, 'utf8')) as ParsedCorpus;
	const termIds = new Set(corpus.terms.map((t) => t.id));
	const system = systemPrompt(corpus.terms);
	const client = new OpenAI({ apiKey: opts.apiKey });
	const model = opts.model ?? 'gpt-6.1-sol';
	let done = 0;
	let facts = 0;
	const queue = [...chunks];
	const events: IngestEvent[] = [];
	let failure: unknown = null;
	const workers = Array.from({ length: Math.min(8, queue.length) }, async () => {
		while (queue.length && !failure) {
			const chunk = queue.shift()!;
			try {
				const extracted = await extractChunk(client, model, system, chunk, clean);
				for (const f of extracted) {
					f.cites = [];
					f.terms = [...new Set(f.terms.filter((t) => termIds.has(t)))];
				}
				const res: ExtractResult = { chunkId: chunk.id, hash: chunkHash(chunk), facts: extracted };
				writeFileSync(`${dir}/extract/${chunk.id}.json`, JSON.stringify(res));
				facts += extracted.length;
			} catch (e) {
				failure = e;
			}
			done++;
			events.push({ t: 'progress', done, total: chunks.length, facts });
		}
	});
	const all = Promise.all(workers);
	let settled = false;
	all.finally(() => (settled = true));
	while (!settled || events.length) {
		while (events.length) yield events.shift()!;
		if (!settled) await new Promise((r) => setTimeout(r, 150));
	}
	if (failure) {
		yield { t: 'error', message: failure instanceof Error ? failure.message : String(failure) };
		return;
	}

	yield { t: 'stage', stage: 'weaving' };
	writeFileSync(`${dir}/meta.json`, JSON.stringify(meta));
	writeAssembled();
	const store = getStore();
	const factIds = store.nodes
		.filter((n) => n.type === 'fact' && n.doc === 'upload' && n.sectionId?.startsWith(`${id}-`))
		.map((n) => n.id);
	const hubs = new Set<string>();
	let entities = 0;
	for (const f of factIds)
		for (const a of store.neighbors(f, { rels: ['uses', 'about'] })) {
			if (!hubs.has(a.id) && store.get(a.id)?.type === 'entity') entities++;
			hubs.add(a.id);
		}
	yield { t: 'stage', stage: 'done' };
	yield {
		t: 'done',
		docId: id,
		name: clean,
		facts: factIds,
		entities,
		concepts: [...hubs].filter((h) => store.get(h)?.type === 'term').length
	};
}
