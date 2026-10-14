import type { NodeDetail } from '#lib/app/context.ts';
import { TOPICS } from '#lib/kg/types.ts';
import type { GraphStore } from './store.ts';

const topicIndex = new Map(TOPICS.map((t, i) => [t.key as string, i]));

export function nodeDetail(store: GraphStore, id: string): NodeDetail | null {
	const n = store.get(id);
	if (!n) return null;
	const nb = store.neighbors(id);
	const counts: Record<string, number> = {};
	for (const a of nb) counts[a.r] = (counts[a.r] ?? 0) + 1;
	const brief = (x: string) => {
		const m = store.get(x)!;
		return { id: m.id, label: m.label, topic: topicIndex.get(m.topic) ?? 0, chapter: m.chapter ?? -1 };
	};
	const sources = nb
		.filter((a) => a.r === 'cites' && a.out)
		.map((a) => store.get(a.id)!)
		.map((s) => ({ id: s.id, label: s.label, evidence: s.evidence ?? null, onRoad: !!s.onRoad, url: s.url ?? null, year: s.year ?? null }));
	const concepts = nb.filter((a) => a.r === 'uses' || a.r === 'related' || a.r === 'is_a').filter((a) => store.get(a.id)?.type === 'term').map((a) => brief(a.id));
	const entities = nb.filter((a) => a.r === 'about' && store.get(a.id)?.type === 'entity').map((a) => brief(a.id));
	// A relation can be stored in both directions; show each linked fact once.
	const seenLink = new Set<string>();
	const linked = nb
		.filter((a) => ['same', 'supports', 'contradicts', 'elaborates', 'depends'].includes(a.r))
		.filter((a) => !seenLink.has(a.id) && !!seenLink.add(a.id))
		.map((a) => ({ ...brief(a.id), rel: a.r, note: a.note }));
	return {
		id: n.id,
		type: n.type as NodeDetail['type'],
		label: n.label,
		topic: topicIndex.get(n.topic) ?? 0,
		chapter: n.chapter ?? -1,
		text: n.text,
		where: store.where(n),
		kind: n.kind,
		evidence: n.evidence ?? null,
		onRoad: n.onRoad,
		quote: n.quote,
		url: n.url ?? null,
		year: n.year ?? null,
		synopsis: n.synopsis,
		aliases: n.aliases,
		sources,
		concepts: concepts.slice(0, 12),
		entities: entities.slice(0, 12),
		linked: linked.slice(0, 12),
		degree: nb.length,
		counts
	};
}
