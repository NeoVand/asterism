import { json } from '@sveltejs/kit';
import { getStore } from '#lib/server/kg/store.ts';
import { TOPICS, type NodeType } from '#lib/kg/types.ts';
import type { RequestHandler } from './$types';

const topicIndex = new Map(TOPICS.map((t, i) => [t.key as string, i]));

export const GET: RequestHandler = ({ url }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';
	if (!q) return json({ results: [] });
	const types = url.searchParams.get('types')?.split(',').filter(Boolean) as NodeType[] | undefined;
	const store = getStore();
	const hits = store.search(q, { limit: 24, types: types?.length ? types : ['fact', 'term', 'entity', 'source', 'section'] });
	return json({
		results: hits.map((h) => ({
			id: h.id,
			type: h.node.type,
			label: h.node.type === 'fact' ? h.node.text : h.node.label,
			where: store.where(h.node) || (h.node.type === 'term' ? `Glossary · Part ${h.node.part}` : ''),
			topic: topicIndex.get(h.node.topic) ?? 0,
			score: h.score
		}))
	});
};
