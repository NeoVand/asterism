/** Fact-extraction prompt and schema, shared by the build scripts and live document ingestion. */
import { createHash } from 'node:crypto';
import type { ParsedChunk } from '#lib/kg/types.ts';
import { CHAPTER_TITLES } from '#lib/kg/types.ts';

export const EXTRACT_VERSION = 'x4';

export interface ExtractedFact {
	text: string;
	quote: string;
	kind: string;
	evidence: 'Independent' | 'Vendor' | 'Expert opinion' | null;
	onRoad: boolean;
	cites: number[];
	chapters: number[];
	entities: { name: string; kind: string }[];
	terms: string[];
	importance: number;
}

export interface ExtractResult {
	chunkId: string;
	hash: string;
	facts: ExtractedFact[];
}

const FACT_KINDS = [
	'finding',
	'number',
	'definition',
	'requirement',
	'recommendation',
	'gap',
	'uncertain',
	'disagreement',
	'risk',
	'event',
	'method',
	'example'
];
const ENTITY_KINDS = [
	'organization',
	'company',
	'standard',
	'regulation',
	'product',
	'tool',
	'method',
	'machine',
	'program',
	'place',
	'person',
	'dataset',
	'publication',
	'metric',
	'other'
];

export const SCHEMA = {
	type: 'object',
	additionalProperties: false,
	required: ['facts'],
	properties: {
		facts: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				required: [
					'text',
					'quote',
					'kind',
					'evidence',
					'onRoad',
					'cites',
					'chapters',
					'entities',
					'terms',
					'importance'
				],
				properties: {
					text: { type: 'string' },
					quote: { type: 'string' },
					kind: { type: 'string', enum: FACT_KINDS },
					evidence: { type: ['string', 'null'], enum: ['Independent', 'Vendor', 'Expert opinion', null] },
					onRoad: { type: 'boolean' },
					cites: { type: 'array', items: { type: 'integer' } },
					chapters: { type: 'array', items: { type: 'integer' } },
					entities: {
						type: 'array',
						items: {
							type: 'object',
							additionalProperties: false,
							required: ['name', 'kind'],
							properties: {
								name: { type: 'string' },
								kind: { type: 'string', enum: ENTITY_KINDS }
							}
						}
					},
					terms: { type: 'array', items: { type: 'string' } },
					importance: { type: 'integer', enum: [1, 2, 3] }
				}
			}
		}
	}
};

export function systemPrompt(terms: { id: string; title: string }[]): string {
	const vocab = terms.map((t) => `${t.id} ${t.title}`).join('\n');
	return `You build a fine-grained knowledge graph from a research booklet and its glossary.

The corpus: "Virtual Validation of a Collision Mitigation System for Heavy Off-Road Machines" (October 2026), thirteen chapters answering how to prove an automatic braking (collision mitigation) function on heavy off-road machines (wheel loaders, haul trucks, articulated haulers...) is safe, using simulation as much as possible before mid-2027; plus a plain-language glossary whose entries cite chapters like [Chapter 8].

Your task: turn ONE passage into ATOMIC, SELF-CONTAINED facts. A planner will later retrieve single facts out of context and stitch facts from different chapters together, so every fact must stand alone and keep every specific.

Rules for facts
- Cover the passage exhaustively: every claim, number, date, deadline, named standard/regulation/product/tool/organization, finding, recommendation, requirement, risk, gap ("not found"), uncertainty and disagreement. Table rows and list items are rich: one fact per meaningful claim in each row/item. Missing a specific is worse than an extra fact.
- One claim per fact, 1–2 sentences, plain English. Split "X and Y" only when X and Y are different claims that could be cited separately; keep a list of parallel items that belong to ONE claim together in one fact (a list of preconditions, countries, sensors, scenario types...).
- Self-contained: name the subject explicitly (no "it", "this approach", "the chapter"); keep scope, conditions, dates, units, numbers, ranges, versions and qualifiers ("on-road evidence", "draft", "not found", "vendor claim"). Use the passage's wording for technical names.
- Do not invent or generalize beyond the passage. Do not add outside knowledge.
- Skip: navigation text, the document's description of its own structure, everyday analogies used only to explain a term ("think of...", "picture..."), and pure repetition within the same passage.
- quote: copy the shortest contiguous span of the passage (verbatim, ≤ 300 characters) that supports the fact.
- kind: finding | number (a quantity, rate, date or measured figure is the point) | definition | requirement (what a standard/regulation/customer demands) | recommendation | gap (searched and not found / no evidence) | uncertain | disagreement | risk | event (a dated happening: publication, launch, entry into force) | method (how something is done) | example (a specific case or precedent).
- evidence: the evidence label the passage attaches to this claim (**Independent**, **Vendor**, **Expert opinion**) or null. onRoad: true if the label or text marks it as "(on-road evidence)" or the evidence is only from road vehicles.
- cites: the bracketed source numbers attached to this claim in the passage, e.g. [3, 7] → [3, 7]. Only numbers that appear in the passage; [] if none.
- chapters: booklet chapter numbers the passage explicitly attributes this claim to, e.g. "[Chapter 8]", "[Chapters 2, 3]", "(Chapter 5)"; use 0 for "[Introduction]". [] if none.
- entities: the specific named things the fact is about (max 8): organizations (ISO, MSHA, NIOSH, EMESRT...), companies (Volvo CE, Caterpillar, Epiroc...), standards (canonical number without the year: "ISO 21815-1"; "ISO/TS 21815-2"), regulations ("EU Machinery Regulation 2023/1230", "UN R152"), products/systems ("Cat Detect"), tools/simulators ("CARLA"), named methods ("importance sampling"), specific machine models ("Caterpillar 797F"), programs/projects ("ACARP C26028"), places (countries/regions), people, datasets, publications (named reports/papers), metrics. Use the most complete common name. Do not list generic nouns ("simulation", "sensors", "operators") as entities.
- terms: ids from the glossary vocabulary below (e.g. "t25") for concepts the fact substantially involves, best first, max 5. Use only ids from the list.
- importance: 3 = a central conclusion, a hard date/deadline, a key number or a decision-relevant gap a planner must know; 2 = supporting detail; 1 = minor detail.

Glossary vocabulary (id title):
${vocab}`;
}

export function userPrompt(chunk: ParsedChunk, docLabel?: string): string {
	const where = docLabel
		? `Uploaded document: ${docLabel}`
		: chunk.doc === 'booklet'
			? `Booklet, ${chunk.chapter ? `Chapter ${chunk.chapter}: ${CHAPTER_TITLES[chunk.chapter]}` : 'front matter (introduction, research map, cross-chapter synthesis)'}`
			: `Glossary, Part ${chunk.part ?? '-'}`;
	const roleHint: Record<string, string> = {
		uncertain: 'This passage lists what is UNCERTAIN: use kind "uncertain" unless a fact is clearly something else.',
		disagree: 'This passage lists where EXPERTS DISAGREE: use kind "disagreement" and state both positions.',
		'blind-spots': 'This passage lists BLIND SPOTS (what was not found or not asked): prefer kind "gap".',
		established: 'This passage lists what is WELL ESTABLISHED.',
		'key-findings': "This passage is the chapter's KEY FINDINGS: importance is usually 3.",
		'glossary-entry':
			'This is a glossary entry; the heading is the term itself. Extract one definition fact (kind "definition") and the substantive claims from "Explained" and "Why it matters here" (usually 4 to 12 facts): numbers, dates, named standards/tools/organizations, what the booklet concluded and why it matters for the program. Skip analogies, everyday comparisons and generic textbook explanation.'
	};
	return `Where: ${where}
Heading path: ${chunk.headingPath.join(' › ')}
${roleHint[chunk.role] ?? ''}

Passage:
"""
${chunk.text}
"""`;
}

export function chunkHash(chunk: ParsedChunk) {
	return createHash('sha1').update(EXTRACT_VERSION).update(chunk.text).update(chunk.headingPath.join('/')).digest('hex').slice(0, 16);
}

