/**
 * Retrieval + generation evals for the Asterism agent.
 *
 *   npx tsx evals/run.ts [--ids a,b] [--concurrency 4] [--model gpt-6.1-sol] [--effort low] [--tag name]
 *
 * For each case the real agent answers (same code path as /api/chat). A judge model then scores:
 *  - answer recall: gold claims present in the answer
 *  - retrieval recall: gold claims present in the facts the agent actually read/saw
 *  - citation precision: cited facts that support the sentence citing them
 *  - unsupported claims in the answer
 * Reports land in evals/out/<timestamp>-<tag>.json and a summary prints to the console.
 */
process.env.ASTERISM_EVAL = '1';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { runTurn } from '../src/lib/server/agent/run.ts';
import { getStore } from '../src/lib/server/kg/store.ts';
import { jsonCall, pool } from '../scripts/kg/llm.ts';
import type { ChatEvent } from '../src/lib/chat/protocol.ts';
import { blockToMarkdown } from '../src/lib/blocks/markdown.ts';

interface Case {
	id: string;
	q: string;
	must: { claim: string; re: string }[];
}

const ROOT = new URL('../', import.meta.url).pathname;
const env = Object.fromEntries(
	readFileSync(`${ROOT}.env`, 'utf8')
		.split('\n')
		.filter((l) => l.includes('='))
		.map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const args = process.argv.slice(2);
const arg = (k: string) => {
	const i = args.indexOf(k);
	return i >= 0 ? args[i + 1] : undefined;
};

const CITE_RE = /\[((?:[fstecx]\d+)(?:\s*[,;]\s*[fstecx]\d+)*)\]/g;

const JUDGE_SCHEMA = {
	type: 'object',
	additionalProperties: false,
	required: ['claims', 'citations', 'unsupported', 'score', 'notes'],
	properties: {
		claims: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['i', 'in_answer', 'in_retrieved'],
				properties: {
					i: { type: 'integer' },
					in_answer: { type: 'string', enum: ['full', 'partial', 'no'] },
					in_retrieved: { type: 'boolean' }
				}
			}
		},
		citations: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['id', 'supported'],
				properties: { id: { type: 'string' }, supported: { type: 'boolean' } }
			}
		},
		unsupported: { type: 'array', items: { type: 'string' } },
		score: { type: 'integer', enum: [1, 2, 3, 4, 5] },
		notes: { type: 'string' }
	}
};

async function main() {
	const cases: Case[] = JSON.parse(readFileSync(`${ROOT}evals/cases.json`, 'utf8'));
	const ids = arg('--ids')?.split(',');
	const selected = ids ? cases.filter((c) => ids.includes(c.id)) : cases;
	const model = arg('--model') ?? 'gpt-6.1-sol';
	const effort = (arg('--effort') ?? 'low') as 'low' | 'medium';
	const tag = arg('--tag') ?? 'run';
	const store = getStore();
	const results: Record<string, unknown>[] = [];

	await pool(selected, Number(arg('--concurrency') ?? 4), async (c) => {
		const t0 = Date.now();
		let text = '';
		const read = new Set<string>();
		const touched = new Set<string>();
		const tools: string[] = [];
		const steps: string[] = [];
		const blocks: string[] = [];
		let error = '';
		let usage = { input: 0, output: 0 };
		for await (const ev of runTurn(
			{ threadId: `eval-${c.id}-${Date.now()}`, message: c.q, settings: { effort } },
			{ apiKey: env.OPENAI_API_KEY, model }
		) as AsyncGenerator<ChatEvent>) {
			if (ev.t === 'text') text += ev.delta;
			else if (ev.t === 'graph')
				for (const id of ev.ids) (ev.mode === 'read' ? read : touched).add(id);
			else if (ev.t === 'tool') {
				if (ev.agent === 'main' && ev.name !== 'show_ui' && ev.name !== 'ask_user') text = '';
				tools.push(ev.name);
				steps.push(
					`${ev.agent === 'main' ? '' : '  '}${ev.name} ${JSON.stringify(ev.args).slice(0, 160)}`
				);
			} else if (ev.t === 'error') error = ev.message;
			else if (ev.t === 'done') usage = ev.usage;
			else if (ev.t === 'interrupt') text += '\n[asked the user questions]';
			else if (ev.t === 'ui') blocks.push(blockToMarkdown(ev.block));
		}
		const ms = Date.now() - t0;
		if (blocks.length) text += `\n\n${blocks.join('\n\n')}`;
		const cited = [
			...new Set([...text.matchAll(CITE_RE)].flatMap((m) => m[1].split(/\s*[,;]\s*/)))
		];
		const factText = (id: string) => {
			const n = store.get(id);
			return n ? `${id}: ${n.text}` : `${id}: (unknown id)`;
		};
		// What the agent saw: read facts plus touched facts (search results it looked at).
		const seen = [...new Set([...read, ...touched])]
			.filter((id) => store.get(id)?.type === 'fact')
			.slice(0, 400);
		const judge = await jsonCall<{
			claims: { i: number; in_answer: 'full' | 'partial' | 'no'; in_retrieved: boolean }[];
			citations: { id: string; supported: boolean }[];
			unsupported: string[];
			score: number;
			notes: string;
		}>({
			system: `You grade a research assistant's answer about a booklet on validating a collision mitigation system for heavy off-road machines. Be strict and literal.
For each gold claim (by index): in_answer = "full" if the answer states the claim's point with its key numbers and names (paraphrase OK, numbers must match), "partial" if it states the main point but leaves out a secondary detail (a date, an edition, one of several examples), "no" otherwise; in_retrieved = at least one of the RETRIEVED FACTS states it.
For each cited id: supported = the cited fact supports the sentence(s) where the answer cites it.
unsupported: answer claims (short quotes) that no cited or retrieved fact supports (ignore generic framing).
score 1–5: overall quality for a planner (completeness on gold claims, correctness, grounding, clarity).`,
			user: `QUESTION: ${c.q}

GOLD CLAIMS:
${c.must.map((m, i) => `${i}. ${m.claim}`).join('\n')}

ANSWER:
${text || '(empty)'}

CITED FACTS:
${cited.map(factText).join('\n') || '(none)'}

RETRIEVED FACTS (seen by the agent):
${seen.map(factText).join('\n') || '(none)'}`,
			schemaName: 'grade',
			schema: JUDGE_SCHEMA,
			effort: 'low'
		});
		// Partial coverage earns half credit; `fullRecall` keeps the strict all-or-nothing figure.
		const answerRecall =
			judge.claims.reduce(
				(n, x) => n + (x.in_answer === 'full' ? 1 : x.in_answer === 'partial' ? 0.5 : 0),
				0
			) / c.must.length;
		const fullRecall = judge.claims.filter((x) => x.in_answer === 'full').length / c.must.length;
		const retrievalRecall = judge.claims.filter((x) => x.in_retrieved).length / c.must.length;
		const citePrecision = judge.citations.length
			? judge.citations.filter((x) => x.supported).length / judge.citations.length
			: 0;
		const regexHits = c.must.filter((m) => new RegExp(m.re, 'i').test(text)).length / c.must.length;
		const r = {
			id: c.id,
			ms,
			tools: tools.length,
			toolNames: tools,
			steps,
			usage,
			cited: cited.length,
			answerRecall,
			retrievalRecall,
			citePrecision,
			regexHits,
			score: judge.score,
			fullRecall,
			missed: judge.claims
				.filter((x) => x.in_answer !== 'full')
				.map((x) => `${x.in_answer === 'partial' ? '(partial) ' : ''}${c.must[x.i]?.claim}`),
			notRetrieved: judge.claims.filter((x) => !x.in_retrieved).map((x) => c.must[x.i]?.claim),
			unsupported: judge.unsupported,
			badCites: judge.citations.filter((x) => !x.supported).map((x) => x.id),
			notes: judge.notes,
			error,
			answer: text
		};
		results.push(r);
		console.log(
			`${c.id.padEnd(24)} score ${r.score}  ans ${(answerRecall * 100).toFixed(0).padStart(3)}%  ret ${(retrievalRecall * 100).toFixed(0).padStart(3)}%  cite ${(citePrecision * 100).toFixed(0).padStart(3)}%  ${(ms / 1000).toFixed(0)}s  ${tools.length} tools${error ? '  ERROR ' + error : ''}`
		);
	});

	const avg = (k: string) => results.reduce((s, r) => s + (r[k] as number), 0) / results.length;
	const summary = {
		tag,
		model,
		effort,
		n: results.length,
		score: avg('score'),
		answerRecall: avg('answerRecall'),
		fullRecall: avg('fullRecall'),
		retrievalRecall: avg('retrievalRecall'),
		citePrecision: avg('citePrecision'),
		seconds: avg('ms') / 1000,
		tools: avg('tools')
	};
	console.log('\nSUMMARY', JSON.stringify(summary, null, 1));
	mkdirSync(`${ROOT}evals/out`, { recursive: true });
	const file = `${ROOT}evals/out/${new Date().toISOString().replace(/[:.]/g, '-')}-${tag}.json`;
	writeFileSync(file, JSON.stringify({ summary, results }, null, 1));
	console.log(`report: ${file}`);
}

main();
