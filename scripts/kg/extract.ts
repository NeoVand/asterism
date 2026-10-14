/**
 * Stage 2: LLM extraction of atomic facts from every chunk.
 *
 *   npx tsx scripts/kg/extract.ts [--ids k1,k2] [--limit 20] [--concurrency 16] [--force]
 *
 * Output: data/kg/extract/<chunkId>.json (cached by prompt version + chunk hash)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { ParsedCorpus } from '../../src/lib/kg/types';
import { SCHEMA, chunkHash, systemPrompt, userPrompt, type ExtractResult, type ExtractedFact } from '../../src/lib/server/kg/extraction.ts';
import { jsonCall, pool, usage } from './llm';

const ROOT = new URL('../../', import.meta.url).pathname;
const OUT = `${ROOT}data/kg/extract`;

async function main() {
	const args = process.argv.slice(2);
	const arg = (k: string) => {
		const i = args.indexOf(k);
		return i >= 0 ? args[i + 1] : undefined;
	};
	const corpus: ParsedCorpus = JSON.parse(readFileSync(`${ROOT}data/kg/parsed.json`, 'utf8'));
	mkdirSync(OUT, { recursive: true });
	let chunks = corpus.chunks;
	const ids = arg('--ids');
	if (ids) chunks = chunks.filter((c) => ids.split(',').includes(c.id));
	const limit = arg('--limit');
	if (limit) chunks = chunks.slice(0, Number(limit));
	const force = args.includes('--force');
	const effort = (arg('--effort') ?? 'low') as 'low' | 'medium';
	const model = arg('--model') ?? 'gpt-6.1-sol';
	const concurrency = Number(arg('--concurrency') ?? 16);
	const system = systemPrompt(corpus.terms);
	const termIds = new Set(corpus.terms.map((t) => t.id));

	const todo = chunks.filter((c) => {
		if (force) return true;
		const f = `${OUT}/${c.id}.json`;
		if (!existsSync(f)) return true;
		return (JSON.parse(readFileSync(f, 'utf8')) as ExtractResult).hash !== chunkHash(c);
	});
	console.log(`extracting ${todo.length}/${chunks.length} chunks with ${model} (${effort}), concurrency ${concurrency}`);
	const t0 = Date.now();
	let facts = 0;
	await pool(
		todo,
		concurrency,
		async (chunk) => {
			const res = await jsonCall<{ facts: ExtractedFact[] }>({
				model,
				system,
				user: userPrompt(chunk),
				schemaName: 'facts',
				schema: SCHEMA,
				effort
			});
			const cited = new Set([...chunk.text.matchAll(/\[(\d+(?:\s*,\s*\d+)*)\]/g)].flatMap((m) => m[1].split(/\s*,\s*/).map(Number)));
			for (const f of res.facts) {
				f.cites = f.cites.filter((n) => cited.has(n));
				f.terms = [...new Set(f.terms.filter((t) => termIds.has(t)))];
			}
			facts += res.facts.length;
			const out: ExtractResult = { chunkId: chunk.id, hash: chunkHash(chunk), facts: res.facts };
			writeFileSync(`${OUT}/${chunk.id}.json`, JSON.stringify(out, null, 1));
		},
		(done, total) => {
			if (done % 10 === 0 || done === total) {
				const s = (Date.now() - t0) / 1000;
				console.log(
					`  ${done}/${total} chunks, ${facts} facts, ${s.toFixed(0)}s, tokens in ${usage.input} (cached ${usage.cached}) out ${usage.output}`
				);
			}
		}
	);
}

if (import.meta.url === `file://${process.argv[1]}`) main();

export type { ExtractResult, ExtractedFact };
