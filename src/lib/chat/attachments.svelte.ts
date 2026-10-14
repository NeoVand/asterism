/**
 * Context the user gathers for their next message: single stars, a star with its neighbours,
 * or every match of a search. Shown as chips in the composer and sent with the message.
 */
import type { Attachment } from './protocol.ts';

export type Chip = Attachment & { key: string };

const MAX = 8;

class Attachments {
	list = $state<Chip[]>([]);

	add(a: Attachment) {
		if (!a.ids.length) return;
		const key = `${a.kind}:${a.kind === 'search' ? a.label.toLowerCase() : a.ids[0]}`;
		// Adding the same thing again replaces it (a node, then the node with its neighbours).
		const rest = this.list.filter(
			(c) => c.key !== key && !(a.kind !== 'search' && c.kind !== 'search' && c.ids[0] === a.ids[0])
		);
		this.list = [...rest, { ...a, key }].slice(-MAX);
	}

	remove(key: string) {
		this.list = this.list.filter((c) => c.key !== key);
	}

	/** The chips for the message being sent (and an empty composer). */
	take(): Attachment[] {
		const out = this.list.map(({ kind, label, ids }) => ({ kind, label, ids }));
		this.list = [];
		return out;
	}
}

export const attachments = new Attachments();

/** "Volvo CE …", "ISO 26262 + 41 neighbours", "“Nvidia” · 23 matches". */
export function chipText(a: Attachment): { label: string; count: string } {
	if (a.kind === 'search')
		return {
			label: `“${a.label}”`,
			count: `${a.ids.length} ${a.ids.length === 1 ? 'match' : 'matches'}`
		};
	if (a.kind === 'neighbors') return { label: a.label, count: `+${a.ids.length - 1} neighbours` };
	return { label: a.label, count: '' };
}
