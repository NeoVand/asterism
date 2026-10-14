/**
 * The bridge between chat UI and the 3D graph. Components get it with `useAsterism()` and use it
 * to describe node ids, light nodes on hover and fly to a node on click.
 */
import { getContext, setContext } from 'svelte';
import type { ClientNodeType } from '#lib/graph/palette.ts';

export interface NodeBrief {
	id: string;
	type: ClientNodeType;
	label: string;
	/** Topic index 0–8 (Parts A–I), for color. */
	topic: number;
	chapter: number;
}

export interface NodeDetail extends NodeBrief {
	text: string;
	where: string;
	kind?: string;
	evidence?: string | null;
	onRoad?: boolean;
	quote?: string;
	url?: string | null;
	year?: number | null;
	synopsis?: string;
	aliases?: string[];
	sources: {
		id: string;
		label: string;
		evidence: string | null;
		onRoad: boolean;
		url: string | null;
		year: number | null;
	}[];
	concepts: { id: string; label: string; topic: number }[];
	entities: { id: string; label: string; topic: number }[];
	linked: {
		id: string;
		rel: string;
		label: string;
		note?: string;
		topic: number;
		chapter: number;
	}[];
	degree: number;
	counts: Record<string, number>;
}

export interface AsterismContext {
	/** Brief info about a node id, or null if unknown. */
	brief(id: string): NodeBrief | null;
	/** Full detail (fetched lazily, cached). */
	detail(id: string): Promise<NodeDetail | null>;
	/** Temporarily spotlight nodes in the graph (null clears). */
	spotlight(ids: string[] | null): void;
	/** Fly to a node and open its card. */
	select(id: string): void;
	/** Ask the agent something (fills and sends the composer). */
	ask(text: string): void;
}

const KEY = Symbol('asterism');

export function provideAsterism(ctx: AsterismContext): AsterismContext {
	setContext(KEY, ctx);
	return ctx;
}

export function useAsterism(): AsterismContext {
	return getContext<AsterismContext>(KEY);
}

/** Per-message citation numbering shared by text chips and UI blocks. */
export interface CiteNumbering {
	number(id: string): number;
}

const CITE_KEY = Symbol('cite-numbering');

export function provideCiteNumbering(n: CiteNumbering) {
	setContext(CITE_KEY, n);
}

export function useCiteNumbering(): CiteNumbering | undefined {
	return getContext<CiteNumbering>(CITE_KEY);
}
