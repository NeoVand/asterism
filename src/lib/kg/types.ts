/**
 * Shared knowledge-graph types, used by the build scripts (scripts/kg), the
 * server-side graph store and the client renderer.
 */

export type DocKey = 'booklet' | 'glossary' | 'upload';

/** The nine curated themes of the glossary (Parts A–I) double as graph topics. */
export const TOPICS = [
	{ key: 'A', name: 'Machines & job sites', short: 'Machines', chapters: [4, 1] },
	{ key: 'B', name: 'Safety engineering', short: 'Safety', chapters: [3, 13] },
	{ key: 'C', name: 'Sensors & perception', short: 'Sensors', chapters: [6, 7] },
	{ key: 'D', name: 'Simulation & X-in-the-loop', short: 'Simulation', chapters: [5, 7, 1] },
	{ key: 'E', name: 'Motion & braking', short: 'Braking', chapters: [8] },
	{ key: 'F', name: 'Test design & statistics', short: 'Statistics', chapters: [9] },
	{ key: 'G', name: 'Simulation credibility', short: 'Credibility', chapters: [10] },
	{ key: 'H', name: 'Standards & precedents', short: 'Standards', chapters: [3, 2] },
	{ key: 'I', name: 'Tools, cost & planning', short: 'Planning', chapters: [11, 12] }
] as const;

export type TopicKey = (typeof TOPICS)[number]['key'];

/** Primary topic of each booklet chapter (0 = front matter). */
export const CHAPTER_TOPIC: Record<number, TopicKey> = {
	0: 'I',
	1: 'D',
	2: 'H',
	3: 'H',
	4: 'A',
	5: 'D',
	6: 'C',
	7: 'C',
	8: 'E',
	9: 'F',
	10: 'G',
	11: 'I',
	12: 'I',
	13: 'B'
};

export const CHAPTER_TITLES: Record<number, string> = {
	0: 'Introduction & synthesis',
	1: 'The full range of options',
	2: 'Precedents and realistic timelines',
	3: 'Rules and acceptance criteria',
	4: 'Real accidents and operator behavior',
	5: 'Creating virtual job sites',
	6: 'Simulating sensors, weather, and light',
	7: 'Testing the old and the new system',
	8: 'Machine motion and brake timing',
	9: 'Covering the combinations and tuning',
	10: 'When simulation can be trusted',
	11: 'Tools, vendors, and cost',
	12: 'Planning and presenting the plan',
	13: "The skeptic's review"
};

/** Role of a section inside the booklet's fixed chapter skeleton. */
export type SectionRole =
	| 'front'
	| 'synthesis'
	| 'question'
	| 'evidence-about'
	| 'key-findings'
	| 'detailed'
	| 'tables'
	| 'established'
	| 'uncertain'
	| 'disagree'
	| 'blind-spots'
	| 'sources'
	| 'glossary-guide'
	| 'glossary-entry'
	| 'glossary-index'
	| 'other';

export interface ParsedSection {
	id: string;
	doc: DocKey;
	level: number;
	title: string;
	slug: string;
	parentId: string | null;
	/** Booklet chapter (0 = front matter); null for glossary sections. */
	chapter: number | null;
	/** Glossary part letter (A–I) for glossary entries. */
	part: TopicKey | null;
	role: SectionRole;
	path: string[];
	startLine: number;
	endLine: number;
}

export type BlockKind = 'p' | 'li' | 'table' | 'quote' | 'code' | 'figure';

export interface ParsedBlock {
	sectionId: string;
	kind: BlockKind;
	text: string;
	line: number;
}

export interface ParsedChunk {
	id: string;
	doc: DocKey;
	sectionId: string;
	chapter: number | null;
	part: TopicKey | null;
	role: SectionRole;
	headingPath: string[];
	text: string;
	line: number;
}

export type EvidenceLabel = 'Independent' | 'Vendor' | 'Expert opinion';

export interface ParsedSource {
	id: string;
	key: string;
	text: string;
	title: string;
	authors: string;
	url: string | null;
	year: number | null;
	label: EvidenceLabel | null;
	qualifiers: string[];
	refs: { chapter: number; num: number }[];
}

export interface ParsedTerm {
	id: string;
	title: string;
	slug: string;
	part: TopicKey;
	sectionId: string;
	oneSentence: string;
	explained: string;
	why: string;
	related: string[];
	chapterRefs: number[];
	aliases: string[];
}

export interface ParsedCorpus {
	sections: ParsedSection[];
	chunks: ParsedChunk[];
	sources: ParsedSource[];
	terms: ParsedTerm[];
}

/* ------------------------------------------------------------------------ */
/* Assembled graph                                                           */
/* ------------------------------------------------------------------------ */

export type NodeType = 'doc' | 'chapter' | 'section' | 'fact' | 'source' | 'term' | 'entity';

export type FactKind =
	| 'finding'
	| 'number'
	| 'definition'
	| 'requirement'
	| 'recommendation'
	| 'gap'
	| 'uncertain'
	| 'disagreement'
	| 'risk'
	| 'event'
	| 'method'
	| 'example';

export type EntityKind =
	| 'organization'
	| 'company'
	| 'standard'
	| 'regulation'
	| 'product'
	| 'tool'
	| 'method'
	| 'machine'
	| 'program'
	| 'place'
	| 'person'
	| 'dataset'
	| 'publication'
	| 'metric'
	| 'other';

export type RelType =
	| 'contains' // section/chapter/doc → child
	| 'states' // section → fact
	| 'cites' // fact → source
	| 'about' // fact → entity
	| 'uses' // fact → term
	| 'related' // term ↔ term (glossary "Related terms")
	| 'defined_in' // term → glossary section
	| 'discussed_in' // term → chapter
	| 'is_a' // entity → term
	| 'same' // fact ↔ fact (restates)
	| 'supports'
	| 'contradicts'
	| 'elaborates'
	| 'depends';

export interface KGNode {
	id: string;
	type: NodeType;
	label: string;
	text: string;
	topic: TopicKey;
	/** Booklet chapter (0 = front matter); null if not chapter-bound. */
	chapter: number | null;
	doc?: DocKey;
	/* fact */
	kind?: FactKind;
	quote?: string;
	evidence?: EvidenceLabel | null;
	onRoad?: boolean;
	importance?: number;
	sectionId?: string;
	/* source */
	by?: string;
	sourceKind?: string;
	url?: string | null;
	year?: number | null;
	qualifiers?: string[];
	/* term */
	aliases?: string[];
	part?: TopicKey;
	/* entity */
	entityKind?: EntityKind;
	/* section */
	path?: string[];
	role?: SectionRole;
	/** Synopsis written during linking (entities and terms). */
	synopsis?: string;
}

export interface KGEdge {
	s: string;
	t: string;
	r: RelType;
	/** Optional short note (fact↔fact relations). */
	note?: string;
}

/** An uploaded document as stored in data/kg/uploads/<id>/meta.json. */
export interface UploadMeta {
	id: string;
	name: string;
	createdAt: string;
	sections: { id: string; title: string; path: string[]; text: string }[];
	chunks: ParsedChunk[];
}

export interface KGraph {
	version: number;
	builtAt: string;
	nodes: KGNode[];
	edges: KGEdge[];
}
