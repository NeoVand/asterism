/**
 * Stage 5: connect the dots. For every concept or entity discussed in more than one place, an
 * LLM reads all its facts and (a) writes a cited synopsis of what the corpus says across chapters,
 * (b) links facts that restate, support, contradict, elaborate or depend on each other.
 *
 *   npx tsx scripts/kg/link.ts [--limit N] [--force] [--concurrency 20]
 *
 * Reads data/kg/graph.json (assembled without links), writes data/kg/links/<hub>.json
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { KGNode, KGraph } from '../../src/lib/kg/types';
import { CHAPTER_TITLES } from '../../src/lib/kg/types';
import { entityKey, type LinkResult } from './assemble';
import { jsonCall, pool, usage } from './llm';

const ROOT = new URL('../../', import.meta.url).pathname;
const DATA = `${ROOT}data/kg`;
const OUT = `${DATA}/links`;
const VERSION = 'l2';
const MAX_FACTS = 56;

const SCHEMA = {
	type: 'object',
	additionalProperties: false,
	required: ['synopsis', 'relations'],
	properties: {
		synopsis: { type: 'string' },
		relations: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['a', 'b', 'type', 'note'],
				properties: {
					a: { type: 'string' },
					b: { type: 'string' },
					type: { type: 'string', enum: ['same', 'supports', 'contradicts', 'elaborates', 'depends'] },
					note: { type: 'string' }
				}
			}
		}
	}
};

const SYSTEM = `You connect facts in a knowledge graph built from a research booklet (13 chapters, October 2026) on virtually validating a collision mitigation / automatic braking system for heavy off-road machines, and its plain-language glossary.

You get one hub (a glossary concept or a named entity) and the facts that mention it, each with an id and where it appears. Do two things:

1. synopsis: 3–6 sentences a planner can rely on, summarizing what the corpus says about this hub ACROSS chapters — the main conclusions, key numbers and dates, and any tension, uncertainty or gap. Cite fact ids in square brackets after each claim, e.g. "... applies from 20 January 2027 [f12, f88]". Use only the facts given; no outside knowledge.

2. relations between pairs of facts, preferring pairs from DIFFERENT locations (that is the point: stitching chapters together):
   - same: the two facts state the same claim (restatement, possibly with different detail). Also use for duplicates within one location.
   - supports: one gives evidence or a reason for the other.
   - contradicts: they disagree or are in tension (different numbers, different conclusions, "found" vs "not found").
   - elaborates: one adds detail, scope or a number to the other.
   - depends: one is a precondition or consequence of the other (e.g. a deadline drives a planning recommendation).
   "a" and "b" are fact ids; "note" is ≤ 15 words saying what links them. Return up to 18 of the most useful relations; every "same" duplicate is useful. Do not relate facts that merely share the hub.`;

function loc(n: KGNode) {
	if (n.doc === 'glossary') return 'Glossary';
	return n.chapter ? `Ch ${n.chapter} (${CHAPTER_TITLES[n.chapter]})` : 'Intro/synthesis';
}

async function main() {
	const args = process.argv.slice(2);
	const arg = (k: string) => {
		const i = args.indexOf(k);
		return i >= 0 ? args[i + 1] : undefined;
	};
	const g: KGraph = JSON.parse(readFileSync(`${DATA}/graph.json`, 'utf8'));
	const byId = new Map(g.nodes.map((n) => [n.id, n]));
	const factsOf = new Map<string, string[]>();
	for (const e of g.edges) {
		if (e.r !== 'uses' && e.r !== 'about') continue;
		if (byId.get(e.s)?.type !== 'fact') continue;
		if (!factsOf.has(e.t)) factsOf.set(e.t, []);
		factsOf.get(e.t)!.push(e.s);
	}
	mkdirSync(OUT, { recursive: true });
	const hubs = [...factsOf.entries()]
		.map(([id, fs]) => ({ hub: byId.get(id)!, facts: fs.map((f) => byId.get(f)!) }))
		.filter(({ hub, facts }) => (hub.type === 'term' || hub.type === 'entity') && facts.length >= 3 && new Set(facts.map(loc)).size >= 2)
		.sort((a, b) => b.facts.length - a.facts.length);
	let todo = hubs;
	const limit = arg('--limit');
	if (limit) todo = todo.slice(0, Number(limit));
	const force = args.includes('--force');

	const key = (hub: KGNode) => (hub.type === 'term' ? hub.id : `e:${entityKey(hub.label)}`);
	const file = (hub: KGNode) => `${OUT}/${key(hub).replace(/[^a-z0-9:_-]+/gi, '_').slice(0, 80)}.json`;

	const jobs = todo
		.map(({ hub, facts }) => {
			// Keep the most important facts while giving every location a voice.
			const byLoc = new Map<string, KGNode[]>();
			for (const f of facts) {
				const l = loc(f);
				if (!byLoc.has(l)) byLoc.set(l, []);
				byLoc.get(l)!.push(f);
			}
			for (const list of byLoc.values()) list.sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0));
			const picked: KGNode[] = [];
			let round = 0;
			while (picked.length < Math.min(MAX_FACTS, facts.length)) {
				let added = false;
				for (const list of byLoc.values()) {
					if (list[round] && picked.length < MAX_FACTS) {
						picked.push(list[round]);
						added = true;
					}
				}
				if (!added) break;
				round++;
			}
			const user = `Hub: ${hub.label} (${hub.type === 'term' ? 'glossary concept' : `entity, ${hub.entityKind}`})${hub.type === 'term' ? `\nDefinition: ${hub.text}` : ''}\n\nFacts (${picked.length} of ${facts.length}):\n${picked
				.map((f) => `${f.id} [${loc(f)}${f.kind ? `, ${f.kind}` : ''}${f.evidence ? `, ${f.evidence}` : ''}${f.onRoad ? ', on-road' : ''}] ${f.text}`)
				.join('\n')}`;
			const hash = createHash('sha1').update(VERSION + user).digest('hex').slice(0, 16);
			return { hub, user, hash, ids: new Set(picked.map((p) => p.id)) };
		})
		.filter((j) => {
			if (force || !existsSync(file(j.hub))) return true;
			return (JSON.parse(readFileSync(file(j.hub), 'utf8')) as LinkResult & { hash?: string }).hash !== j.hash;
		});

	console.log(`linking ${jobs.length} of ${hubs.length} hubs`);
	const t0 = Date.now();
	let rels = 0;
	await pool(
		jobs,
		Number(arg('--concurrency') ?? 20),
		async (j) => {
			const res = await jsonCall<{ synopsis: string; relations: LinkResult['relations'] }>({
				system: SYSTEM,
				user: j.user,
				schemaName: 'links',
				schema: SCHEMA,
				effort: 'low'
			});
			const relations = res.relations.filter((r) => j.ids.has(r.a) && j.ids.has(r.b) && r.a !== r.b);
			rels += relations.length;
			writeFileSync(file(j.hub), JSON.stringify({ key: key(j.hub), hash: j.hash, synopsis: res.synopsis, relations }, null, 1));
		},
		(done, total) => {
			if (done % 20 === 0 || done === total)
				console.log(`  ${done}/${total} hubs, ${rels} relations, ${((Date.now() - t0) / 1000).toFixed(0)}s, tokens in ${usage.input} out ${usage.output}`);
		}
	);
}

main();
