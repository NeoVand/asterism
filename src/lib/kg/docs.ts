/** The reader's view of the documents, shared by the server (src/lib/server/kg/docs.ts) and the client. */
import type { DocKey, SectionRole } from './types.ts';

export interface DocSection {
	id: string;
	level: number;
	title: string;
	slug: string;
	/** The section's own markdown, without its heading and without its subsections. */
	md: string;
	role: SectionRole | null;
}

export interface DocUnitLink {
	id: string;
	title: string;
}

export interface DocUnit {
	id: string;
	doc: DocKey;
	title: string;
	/** Booklet chapter (0 = front matter); null elsewhere. */
	chapter: number | null;
	/** Where the unit sits, e.g. ["Research booklet", "Part I: Frame the problem"]. */
	crumbs: string[];
	prev: DocUnitLink | null;
	next: DocUnitLink | null;
	sections: DocSection[];
	/** Facts quoted from this unit: id, section id, verbatim quote. */
	facts: { id: string; s: string; q: string }[];
	/** Citation number → source, for this chapter's `[n]` markers. */
	sources: Record<number, { id: string; label: string }>;
}

export interface TocUnit {
	id: string;
	doc: DocKey;
	title: string;
	/** A part divider (booklet "Part I…") rather than a chapter. */
	part: boolean;
	chapter: number | null;
	/** The unit's level-3 sections, for jumping within it. */
	sections: DocUnitLink[];
}

export interface DocToc {
	docs: { key: DocKey; title: string; units: TocUnit[] }[];
	/** Heading slug → [unit id, section id], for the documents' own `#anchor` links. */
	slugs: Record<string, [string, string]>;
	/** Booklet chapter → unit id. */
	chapters: Record<number, string>;
}

export interface DocLocation {
	unit: string;
	section: string;
	/** A fact to highlight. */
	fact?: string;
	/** A citation number in the unit's source list. */
	source?: number;
}

export interface Diagram {
	id: string;
	doc: DocKey;
	unit: string;
	section: string;
	/** "Ch 1 › How the approaches are combined", for the agent and the chat. */
	where: string;
	caption: string;
	kind: string;
	/** Node labels, for search. */
	labels: string[];
	code: string;
}
