/**
 * Client chat state: threads (persisted in localStorage), streaming turns over SSE, and hooks
 * the page uses to light up the graph while the agent works.
 */
import type { Answers, Block, QuestionForm } from '#lib/blocks/schema.ts';
import type { ChatEvent, ChatRequest } from './protocol.ts';
import { settings } from './settings.svelte.ts';

export type Part =
	| { k: 'text'; text: string }
	| { k: 'note'; text: string }
	| { k: 'ui'; id: string; block: Block }
	| { k: 'form'; form: QuestionForm; answers?: Answers | 'skipped' };

export interface Step {
	id: string;
	name: string;
	args: Record<string, unknown>;
	summary?: string;
	agent: string;
	status: 'run' | 'done' | 'error';
	at: number;
	end?: number;
}

export interface TaskInfo {
	id: string;
	description: string;
	status: 'run' | 'done';
	at: number;
	end?: number;
}

export interface Todo {
	content: string;
	status: 'pending' | 'in_progress' | 'completed';
}

export interface Msg {
	id: string;
	role: 'user' | 'assistant';
	parts: Part[];
	status: 'streaming' | 'done' | 'error' | 'waiting' | 'stopped';
	steps: Step[];
	tasks: TaskInfo[];
	todos: Todo[];
	reasoning: string;
	touched: string[];
	read: string[];
	error?: string;
	startedAt: number;
	endedAt?: number;
	usage?: { input: number; output: number };
}

export interface Thread {
	id: string;
	title: string;
	createdAt: number;
	updatedAt: number;
	messages: Msg[];
}

export interface ChatHooks {
	turnStart?: (msg: Msg) => void;
	graph?: (mode: 'touch' | 'read', ids: string[]) => void;
	text?: (msg: Msg) => void;
	turnEnd?: (msg: Msg) => void;
}

const STORE_KEY = 'asterism.threads.v1';
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function messageText(m: Msg): string {
	return m.parts
		.filter((p): p is Extract<Part, { k: 'text' }> => p.k === 'text')
		.map((p) => p.text)
		.join('\n\n');
}

const CITE_RE = /\[((?:[fstecx]\d+)(?:\s*[,;]\s*[fstecx]\d+)*)\]/g;

/** Every cited id in a message, in order of first appearance (text and blocks). */
export function citedIds(m: Msg): string[] {
	const out: string[] = [];
	const add = (id: string) => {
		if (!out.includes(id)) out.push(id);
	};
	for (const p of m.parts) {
		if (p.k === 'text') {
			for (const match of p.text.matchAll(CITE_RE)) for (const id of match[1].split(/\s*[,;]\s*/)) add(id);
		} else if (p.k === 'ui') {
			for (const match of JSON.stringify(p.block).matchAll(/"([fstecx]\d+)"/g)) add(match[1]);
		}
	}
	return out;
}

class ChatStore {
	threads = $state<Thread[]>([]);
	currentId = $state<string | null>(null);
	busy = $state(false);
	hooks: ChatHooks = {};
	private controller: AbortController | null = null;
	private saveTimer: ReturnType<typeof setTimeout> | null = null;

	current = $derived(this.threads.find((t) => t.id === this.currentId) ?? null);

	load() {
		try {
			const raw = localStorage.getItem(STORE_KEY);
			if (raw) this.threads = JSON.parse(raw) as Thread[];
		} catch {
			this.threads = [];
		}
		// Unfinished turns from a previous session cannot resume their stream.
		for (const t of this.threads)
			for (const m of t.messages) if (m.status === 'streaming') m.status = 'stopped';
	}

	private save(now = false) {
		if (this.saveTimer) clearTimeout(this.saveTimer);
		const write = () => {
			try {
				localStorage.setItem(STORE_KEY, JSON.stringify($state.snapshot(this.threads).slice(0, 60)));
			} catch {
				/* quota or private mode */
			}
		};
		if (now) write();
		else this.saveTimer = setTimeout(write, 800);
	}

	newThread() {
		this.stop();
		this.currentId = null;
	}

	select(id: string) {
		if (this.busy) this.stop();
		this.currentId = id;
	}

	remove(id: string) {
		this.threads = this.threads.filter((t) => t.id !== id);
		if (this.currentId === id) this.currentId = null;
		this.save(true);
	}

	clearAll() {
		this.stop();
		this.threads = [];
		this.currentId = null;
		this.save(true);
	}

	stop() {
		this.controller?.abort();
		this.controller = null;
	}

	async send(text: string) {
		const message = text.trim();
		if (!message || this.busy) return;
		let thread = this.current;
		if (!thread) {
			thread = {
				id: uid(),
				title: message.length > 60 ? message.slice(0, 58).trimEnd() + '…' : message,
				createdAt: Date.now(),
				updatedAt: Date.now(),
				messages: []
			};
			this.threads = [thread, ...this.threads];
			this.currentId = thread.id;
			thread = this.threads[0];
		}
		const history = thread.messages
			.filter((m) => m.status !== 'error')
			.map((m) => ({ role: m.role, content: messageText(m) }))
			.filter((m) => m.content);
		thread.messages.push(this.blank('user', message));
		await this.run(thread, { threadId: thread.id, message, history });
	}

	async resume(answers: Answers | 'skipped') {
		const thread = this.current;
		if (!thread || this.busy) return;
		const last = thread.messages[thread.messages.length - 1];
		const form = last?.parts.findLast((p) => p.k === 'form');
		if (form && form.k === 'form') form.answers = answers;
		if (last) last.status = 'done';
		await this.run(thread, {
			threadId: thread.id,
			resume: answers === 'skipped' ? { skipped: true } : answers
		});
	}

	private blank(role: Msg['role'], text = ''): Msg {
		return {
			id: uid(),
			role,
			parts: text ? [{ k: 'text', text }] : [],
			status: role === 'user' ? 'done' : 'streaming',
			steps: [],
			tasks: [],
			todos: [],
			reasoning: '',
			touched: [],
			read: [],
			startedAt: Date.now()
		};
	}

	private async run(thread: Thread, req: ChatRequest) {
		this.busy = true;
		thread.messages.push(this.blank('assistant'));
		const msg = thread.messages[thread.messages.length - 1];
		thread.updatedAt = Date.now();
		this.hooks.turnStart?.(msg);
		const controller = new AbortController();
		this.controller = controller;
		const s = settings.value;
		try {
			const res = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					...req,
					settings: {
						apiKey: s.apiKey || undefined,
						model: s.model,
						systemPrompt: s.systemPrompt || undefined,
						effort: s.deep ? 'medium' : 'low'
					}
				} satisfies ChatRequest),
				signal: controller.signal
			});
			if (!res.ok || !res.body) {
				const body = await res.text().catch(() => '');
				let message = body;
				try {
					message = (JSON.parse(body) as { message?: string }).message ?? body;
				} catch {
					/* plain text */
				}
				throw new Error(message || `Request failed (${res.status})`);
			}
			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let buf = '';
			for (;;) {
				const { value, done } = await reader.read();
				if (done) break;
				buf += decoder.decode(value, { stream: true });
				let idx: number;
				while ((idx = buf.indexOf('\n\n')) >= 0) {
					const frame = buf.slice(0, idx);
					buf = buf.slice(idx + 2);
					const line = frame.split('\n').find((l) => l.startsWith('data: '));
					if (!line) continue;
					this.apply(msg, JSON.parse(line.slice(6)) as ChatEvent);
				}
			}
			if (msg.status === 'streaming') msg.status = 'done';
		} catch (e) {
			if (controller.signal.aborted) {
				msg.status = 'stopped';
			} else {
				msg.status = 'error';
				msg.error = e instanceof Error ? e.message : String(e);
			}
		} finally {
			for (const st of msg.steps) if (st.status === 'run') st.status = msg.status === 'error' ? 'error' : 'done';
			for (const t of msg.tasks) if (t.status === 'run') t.status = 'done';
			msg.endedAt ??= Date.now();
			this.busy = false;
			this.controller = null;
			thread.updatedAt = Date.now();
			this.save(true);
			this.hooks.turnEnd?.(msg);
		}
	}

	private apply(msg: Msg, ev: ChatEvent) {
		switch (ev.t) {
			case 'text': {
				const last = msg.parts[msg.parts.length - 1];
				if (last?.k === 'text') last.text += ev.delta;
				else msg.parts.push({ k: 'text', text: ev.delta });
				this.hooks.text?.(msg);
				break;
			}
			case 'reasoning':
				if (ev.agent === 'main') msg.reasoning += ev.delta;
				break;
			case 'tool': {
				// Text written before more research is an interim note, not the answer.
				const last = msg.parts[msg.parts.length - 1];
				if (last?.k === 'text' && ev.agent === 'main' && ev.name !== 'show_ui' && ev.name !== 'ask_user') {
					msg.parts[msg.parts.length - 1] = { k: 'note', text: last.text };
				}
				msg.steps.push({
					id: ev.id,
					name: ev.name,
					args: (ev.args ?? {}) as Record<string, unknown>,
					agent: ev.agent,
					status: 'run',
					at: Date.now()
				});
				break;
			}
			case 'tool_end': {
				const st = msg.steps.find((s) => s.id === ev.id);
				if (st) {
					st.status = ev.error ? 'error' : 'done';
					st.summary = ev.summary;
					st.end = Date.now();
				}
				break;
			}
			case 'graph': {
				const list = ev.mode === 'read' ? msg.read : msg.touched;
				for (const id of ev.ids) if (!list.includes(id)) list.push(id);
				this.hooks.graph?.(ev.mode, ev.ids);
				break;
			}
			case 'todos':
				msg.todos = ev.items;
				break;
			case 'task':
				if (ev.status === 'start') msg.tasks.push({ id: ev.id, description: ev.description, status: 'run', at: Date.now() });
				else {
					const t = msg.tasks.find((x) => x.id === ev.id);
					if (t) {
						t.status = 'done';
						t.end = Date.now();
					}
				}
				break;
			case 'ui':
				msg.parts.push({ k: 'ui', id: ev.id, block: ev.block });
				this.hooks.text?.(msg);
				break;
			case 'interrupt':
				msg.parts.push({ k: 'form', form: ev.form });
				msg.status = 'waiting';
				break;
			case 'error':
				msg.status = 'error';
				msg.error = ev.message;
				break;
			case 'done':
				msg.usage = ev.usage;
				msg.endedAt = Date.now();
				break;
		}
		this.save();
	}
}

export const chat = new ChatStore();
