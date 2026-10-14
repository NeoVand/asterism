/** Client state for weaving uploaded documents into the graph. */
import { settings } from './settings.svelte.ts';

export interface UploadState {
	name: string;
	stage: 'reading' | 'chunking' | 'extracting' | 'weaving' | 'done' | 'error';
	detail?: string;
	done: number;
	total: number;
	facts: number;
	result?: { docId: string; name: string; facts: string[]; entities: number; concepts: number };
	error?: string;
}

export const ACCEPT = '.md,.markdown,.txt,text/markdown,text/plain';
/** About 100 pages; larger documents should be split. Mirrored on the server. */
export const MAX_CHARS = 400_000;

class Uploads {
	current = $state<UploadState | null>(null);
	onDone: ((r: NonNullable<UploadState['result']>) => void) | null = null;

	get busy() {
		const s = this.current?.stage;
		return !!s && s !== 'done' && s !== 'error';
	}

	dismiss() {
		if (!this.busy) this.current = null;
	}

	async upload(file: File) {
		if (this.busy) return;
		if (!/\.(md|markdown|txt)$/i.test(file.name) && !/^text\//.test(file.type)) {
			this.current = {
				name: file.name,
				stage: 'error',
				done: 0,
				total: 0,
				facts: 0,
				error: 'Only Markdown or plain-text files can be woven in for now.'
			};
			return;
		}
		this.current = { name: file.name, stage: 'reading', done: 0, total: 0, facts: 0 };
		const state = this.current;
		try {
			const text = await file.text();
			if (!text.trim()) throw new Error('The file is empty.');
			if (text.length > MAX_CHARS)
				throw new Error(
					`This file is too long to weave in at once (about ${Math.round(text.length / 4000)} pages; the limit is about 100). Split it into parts.`
				);
			const res = await fetch('/api/upload', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					name: file.name,
					text,
					apiKey: settings.value.apiKey || undefined,
					model: settings.value.model
				})
			});
			if (!res.ok || !res.body) {
				const body = await res.text();
				let message = body;
				try {
					message = (JSON.parse(body) as { message?: string }).message ?? body;
				} catch {
					// plain-text error body
				}
				throw new Error(message || `Upload failed (${res.status})`);
			}
			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let buf = '';
			for (;;) {
				const { value, done } = await reader.read();
				if (done) break;
				buf += decoder.decode(value, { stream: true });
				let i: number;
				while ((i = buf.indexOf('\n\n')) >= 0) {
					const line = buf
						.slice(0, i)
						.split('\n')
						.find((l) => l.startsWith('data: '));
					buf = buf.slice(i + 2);
					if (!line) continue;
					const ev = JSON.parse(line.slice(6));
					if (ev.t === 'stage') {
						if (ev.stage !== 'done') state.stage = ev.stage;
						state.detail = ev.detail;
					} else if (ev.t === 'progress') {
						state.done = ev.done;
						state.total = ev.total;
						state.facts = ev.facts;
					} else if (ev.t === 'done') {
						state.stage = 'done';
						state.result = {
							docId: ev.docId,
							name: ev.name,
							facts: ev.facts,
							entities: ev.entities,
							concepts: ev.concepts
						};
						this.onDone?.(state.result);
					} else if (ev.t === 'error') {
						state.stage = 'error';
						state.error = ev.message;
					}
				}
			}
			if (state.stage !== 'done' && state.stage !== 'error') {
				state.stage = 'error';
				state.error = 'The upload stopped before finishing.';
			}
		} catch (e) {
			state.stage = 'error';
			state.error = e instanceof Error ? e.message : String(e);
		}
	}
}

export const uploads = new Uploads();
