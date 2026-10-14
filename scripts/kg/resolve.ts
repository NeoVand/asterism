/**
 * Stage 3: entity resolution. Merges name variants of the same entity and maps entities that
 * are really glossary concepts onto those concepts.
 *
 *   npx tsx scripts/kg/resolve.ts
 *
 * Output: data/kg/entities.json ({ map: { entityKey: {name, kind} | {term} } })
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import type { ParsedCorpus } from '../../src/lib/kg/types';
import { entityKey, type Resolution } from '../../src/lib/server/kg/assemble.ts';
import type { ExtractResult } from '../../src/lib/server/kg/extraction.ts';
import { jsonCall, pool, usage } from './llm';

const ROOT = new URL('../../', import.meta.url).pathname;
const DATA = `${ROOT}data/kg`;

const GROUPS: { name: string; kinds: string[] }[] = [
	{ name: 'organizations, companies, programs, places, people', kinds: ['organization', 'company', 'program', 'place', 'person'] },
	{ name: 'standards, regulations, publications, datasets', kinds: ['standard', 'regulation', 'publication', 'dataset'] },
	{ name: 'products, tools, methods, machines, metrics, other', kinds: ['product', 'tool', 'method', 'machine', 'metric', 'other'] }
];

const SCHEMA = {
	type: 'object',
	additionalProperties: false,
	required: ['groups'],
	properties: {
		groups: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['canonical', 'kind', 'members', 'term'],
				properties: {
					canonical: { type: 'string' },
					kind: {
						type: 'string',
						enum: ['organization', 'company', 'standard', 'regulation', 'product', 'tool', 'method', 'machine', 'program', 'place', 'person', 'dataset', 'publication', 'metric', 'other']
					},
					members: { type: 'array', items: { type: 'string' } },
					term: { type: ['string', 'null'] }
				}
			}
		}
	}
};

async function main() {
	const corpus: ParsedCorpus = JSON.parse(readFileSync(`${DATA}/parsed.json`, 'utf8'));
	const names = new Map<string, { name: string; kinds: Map<string, number>; count: number }>();
	for (const f of readdirSync(`${DATA}/extract`)) {
		const r: ExtractResult = JSON.parse(readFileSync(`${DATA}/extract/${f}`, 'utf8'));
		for (const x of r.facts)
			for (const e of x.entities) {
				const k = entityKey(e.name);
				if (!k) continue;
				const v = names.get(k) ?? { name: e.name, kinds: new Map(), count: 0 };
				v.count++;
				v.kinds.set(e.kind, (v.kinds.get(e.kind) ?? 0) + 1);
				if (e.name.length > v.name.length && e.name.toLowerCase() === v.name.toLowerCase()) v.name = e.name;
				names.set(k, v);
			}
	}
	const kindOf = (v: { kinds: Map<string, number> }) => [...v.kinds.entries()].sort((a, b) => b[1] - a[1])[0][0];
	const vocab = corpus.terms.map((t) => `${t.id} ${t.title}${t.aliases.length ? ` [${t.aliases.slice(0, 6).join('; ')}]` : ''}`).join('\n');
	const system = `You resolve named entities extracted from a research booklet on validating a collision mitigation (automatic braking) system for heavy off-road machines, and its glossary.

Given a list of entity names (with their kind and mention count), return GROUPS:
1. Merge groups: names that refer to the SAME real-world thing (abbreviation vs full name, spelling variants, with/without "Inc."/"the", singular/plural, a standard with and without its year or part formatting). Do NOT merge different parts of a standard series (ISO 21815-1 ≠ ISO 21815-3 ≠ the ISO 21815 series), different products of one company, a company and its product, or a country and its regulator. "members" lists the exact input names; "canonical" is the clearest full common name (e.g. "MSHA (Mine Safety and Health Administration)" style is not wanted — use the form the booklet uses most, usually the acronym for agencies and standards).
2. Concept mapping: if a name IS one of the glossary concepts below (same thing, not merely related), set "term" to that concept id; otherwise null. Examples: "importance sampling" → the importance-sampling concept; "SOTIF" → the SOTIF concept; "ISO 21815" (the series) → the ISO 21815 series concept. Do not map a single part of a standard to a series concept, nor a company to a concept.
Only output groups that merge ≥2 names or that map to a concept. Names not mentioned stay as they are.

Glossary concepts (id title [aliases]):
${vocab}`;

	const map: Resolution['map'] = {};
	await pool(GROUPS, 3, async (g) => {
		const list = [...names.entries()]
			.filter(([, v]) => g.kinds.includes(kindOf(v)))
			.sort((a, b) => a[0].localeCompare(b[0]));
		console.log(`resolving ${list.length} ${g.name}`);
		const res = await jsonCall<{ groups: { canonical: string; kind: string; members: string[]; term: string | null }[] }>({
			system,
			user: `Entities (${g.name}):\n${list.map(([, v]) => `${v.name} (${kindOf(v)}, ${v.count})`).join('\n')}`,
			schemaName: 'resolution',
			schema: SCHEMA,
			effort: 'medium',
			maxOutputTokens: 60000
		});
		const termIds = new Set(corpus.terms.map((t) => t.id));
		for (const grp of res.groups) {
			for (const m of grp.members) {
				const k = entityKey(m);
				if (!names.has(k)) continue;
				map[k] = grp.term && termIds.has(grp.term) ? { term: grp.term } : { name: grp.canonical, kind: grp.kind as never };
			}
		}
		console.log(`  ${g.name}: ${res.groups.length} groups`);
	});
	writeFileSync(`${DATA}/entities.json`, JSON.stringify({ map } satisfies Resolution, null, 1));
	const toTerm = Object.values(map).filter((v) => 'term' in v).length;
	console.log(`resolved ${Object.keys(map).length} names (${toTerm} → concepts); tokens in ${usage.input} out ${usage.output}`);
}

main();
