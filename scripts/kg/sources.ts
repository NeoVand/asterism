/**
 * Clean, human-readable labels for the ~1,200 cited sources (title, short author/publisher,
 * year, kind) — the raw citation strings are too irregular to split reliably by rule.
 *
 *   npx tsx scripts/kg/sources.ts
 *
 * Output: data/kg/sources.json { [sourceId]: { title, by, year, kind } }
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import type { ParsedCorpus } from '../../src/lib/kg/types';
import { jsonCall, pool, usage } from './llm';

const ROOT = new URL('../../', import.meta.url).pathname;
const DATA = `${ROOT}data/kg`;
const OUT = `${DATA}/sources.json`;

export interface SourceMeta {
	title: string;
	by: string;
	year: number | null;
	kind: string;
}

const SCHEMA = {
	type: 'object',
	additionalProperties: false,
	required: ['items'],
	properties: {
		items: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['id', 'title', 'by', 'year', 'kind'],
				properties: {
					id: { type: 'string' },
					title: { type: 'string' },
					by: { type: 'string' },
					year: { type: ['integer', 'null'] },
					kind: {
						type: 'string',
						enum: ['paper', 'standard', 'regulation', 'report', 'guidance', 'vendor', 'press', 'web', 'dataset', 'thesis', 'book', 'other']
					}
				}
			}
		}
	}
};

async function main() {
	const corpus: ParsedCorpus = JSON.parse(readFileSync(`${DATA}/parsed.json`, 'utf8'));
	const done: Record<string, SourceMeta> = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
	const todo = corpus.sources.filter((s) => !done[s.id]);
	const batches: (typeof todo)[] = [];
	for (let i = 0; i < todo.length; i += 40) batches.push(todo.slice(i, i + 40));
	console.log(`normalizing ${todo.length} sources in ${batches.length} batches`);
	await pool(batches, 12, async (batch) => {
		const res = await jsonCall<{ items: (SourceMeta & { id: string })[] }>({
			system: `You turn raw bibliography entries into clean labels for a UI. For each entry return:
- title: the work's own title, cleaned (no authors, no venue, no URL, no evidence label), ≤ 110 chars; for standards "ISO 21815-1:2022 — Collision warning and avoidance, Part 1: General requirements" style; for web pages the page title.
- by: short attribution ≤ 40 chars: "Kalra & Paddock (RAND)", "Hrica et al. (NIOSH)", "ISO", "Volvo CE", "European Commission".
- year: publication year if stated, else null.
- kind: paper | standard | regulation | report | guidance | vendor | press | web | dataset | thesis | book | other.
Keep ids unchanged.`,
			user: batch.map((s) => `${s.id}: ${s.text.replace(/\*\*/g, '')}`).join('\n'),
			schemaName: 'sources',
			schema: SCHEMA,
			effort: 'low'
		});
		for (const it of res.items) {
			if (batch.some((s) => s.id === it.id)) done[it.id] = { title: it.title, by: it.by, year: it.year, kind: it.kind };
		}
		writeFileSync(OUT, JSON.stringify(done, null, 1));
	});
	console.log(`done: ${Object.keys(done).length} sources; tokens in ${usage.input} out ${usage.output}`);
}

main();
