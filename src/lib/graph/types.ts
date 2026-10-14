import type { ClientNodeType } from './palette';

/** Columnar graph shipped to the browser (see /api/graph). */
export interface ClientGraph {
	ids: string[];
	types: ClientNodeType[];
	topics: Uint8Array;
	labels: string[];
	chapters: Int8Array;
	/** Visual weight, ~1 for an ordinary node. */
	weights: Float32Array;
	edgeSrc: Uint32Array;
	edgeDst: Uint32Array;
	edgeRel: Uint8Array;
	relNames: string[];
}

/** Wire format of /api/graph (compact JSON). */
export interface GraphWire {
	version: number;
	nodes: [
		id: string,
		type: ClientNodeType,
		topic: number,
		label: string,
		chapter: number,
		weight: number
	][];
	edges: [s: number, t: number, r: number][];
	rels: string[];
}

export function decodeGraph(w: GraphWire): ClientGraph {
	const n = w.nodes.length;
	const g: ClientGraph = {
		ids: new Array(n),
		types: new Array(n),
		topics: new Uint8Array(n),
		labels: new Array(n),
		chapters: new Int8Array(n),
		weights: new Float32Array(n),
		edgeSrc: new Uint32Array(w.edges.length),
		edgeDst: new Uint32Array(w.edges.length),
		edgeRel: new Uint8Array(w.edges.length),
		relNames: w.rels
	};
	w.nodes.forEach(([id, type, topic, label, chapter, weight], i) => {
		g.ids[i] = id;
		g.types[i] = type;
		g.topics[i] = topic;
		g.labels[i] = label;
		g.chapters[i] = chapter;
		g.weights[i] = weight;
	});
	w.edges.forEach(([s, t, r], i) => {
		g.edgeSrc[i] = s;
		g.edgeDst[i] = t;
		g.edgeRel[i] = r;
	});
	return g;
}

/** How strongly a node is lit by agent activity. Higher wins. */
export const LIT = { none: 0, touched: 1, read: 2, cited: 3, focus: 4 } as const;
export type LitKind = keyof typeof LIT;
