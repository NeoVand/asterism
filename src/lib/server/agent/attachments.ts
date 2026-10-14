/**
 * Nodes the user attached to a message, written as a short note ahead of their text: what each
 * chip is and the ids (with labels) it holds, so the agent can read them before answering.
 */
import type { Attachment } from '#lib/chat/protocol.ts';
import type { GraphStore } from '../kg/store.ts';

/** Ids per chip and in all, so a broad search can't flood the context. */
const PER_CHIP = 60;
const TOTAL = 160;
/** How many ids per chip are listed with their labels (the rest by id only). */
const LABELLED = 24;

const TYPE: Record<string, string> = {
	fact: 'fact',
	term: 'concept',
	entity: 'entity',
	source: 'source',
	section: 'section',
	chapter: 'chapter',
	doc: 'document'
};

export function attachmentNote(
	store: GraphStore,
	attachments: Attachment[] | undefined
): { text: string; ids: string[] } {
	const all: string[] = [];
	const lines: string[] = [];
	for (const a of (attachments ?? []).slice(0, 8)) {
		const ids = [...new Set(a.ids)].filter((id) => store.get(id)).slice(0, PER_CHIP);
		const room = TOTAL - all.length;
		if (!ids.length || room <= 0) continue;
		const mine = ids.slice(0, room);
		all.push(...mine);
		const label = (id: string) => {
			const n = store.get(id)!;
			const text = n.type === 'fact' ? n.text : n.label;
			return `${id} ${text.length > 110 ? `${text.slice(0, 108)}…` : text}`;
		};
		const listed = mine.slice(0, LABELLED).map(label);
		const more = mine.length > LABELLED ? `; also ${mine.slice(LABELLED).join(', ')}` : '';
		const head = store.get(mine[0])!;
		const title = (a.label || '').slice(0, 120);
		if (a.kind === 'search')
			lines.push(`- Search “${title}” (${mine.length} matches): ${listed.join('; ')}${more}`);
		else if (a.kind === 'neighbors')
			lines.push(
				`- ${TYPE[head.type] ?? head.type} ${mine[0]} “${title}” with ${mine.length - 1} of its neighbours: ${listed.slice(1).join('; ')}${more}`
			);
		else lines.push(`- ${TYPE[head.type] ?? head.type} ${label(mine[0])}`);
	}
	if (!lines.length) return { text: '', ids: [] };
	return {
		text: `[The user attached these from the graph as context for this message. Read the ones that matter before answering, and treat them as the subject of the question.]\n${lines.join('\n')}`,
		ids: all
	};
}
