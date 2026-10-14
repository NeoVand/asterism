/** Topic hues (Parts A–I) and node-type styling shared by the renderer and the UI. */
export const TOPIC_COLORS = [
	'#f6b93b', // A Machines & job sites — amber
	'#ff6b81', // B Safety engineering — coral
	'#34d3ee', // C Sensors & perception — cyan
	'#a78bfa', // D Simulation & XiL — violet
	'#ff9f43', // E Motion & braking — orange
	'#9be15d', // F Test design & statistics — lime
	'#2ee6a8', // G Simulation credibility — mint
	'#5b9dff', // H Standards & precedents — blue
	'#f472d0' // I Tools, cost & planning — magenta
] as const;

export const NODE_TYPES = ['doc', 'chapter', 'section', 'fact', 'source', 'term', 'entity'] as const;
export type ClientNodeType = (typeof NODE_TYPES)[number];

export const TYPE_INDEX: Record<ClientNodeType, number> = {
	doc: 0,
	chapter: 1,
	section: 2,
	fact: 3,
	source: 4,
	term: 5,
	entity: 6
};

export const TYPE_LABEL: Record<ClientNodeType, string> = {
	doc: 'Document',
	chapter: 'Chapter',
	section: 'Section',
	fact: 'Fact',
	source: 'Source',
	term: 'Concept',
	entity: 'Entity'
};

export function hexToRgb(hex: string): [number, number, number] {
	const n = parseInt(hex.slice(1), 16);
	return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
