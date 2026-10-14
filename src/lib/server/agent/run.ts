/**
 * Runs one agent turn and translates LangGraph's event stream into Asterism chat events.
 * Shared by /api/chat (SSE) and the eval harness.
 */
import { Command } from '@langchain/langgraph';
import { Block } from '#lib/blocks/schema.ts';
import type { ChatEvent, ChatRequest } from '#lib/chat/protocol.ts';
import { getAgent } from './agent.ts';
import { resetSeen } from './tools.ts';

interface StreamEvent {
	event: string;
	name: string;
	run_id: string;
	parent_ids?: string[];
	metadata?: Record<string, unknown>;
	data: { input?: unknown; output?: unknown; chunk?: unknown };
}

type ContentBlock = {
	type: string;
	text?: string;
	reasoning?: string;
	summary?: { text?: string }[];
};

function textOf(content: unknown): { text: string; reasoning: string } {
	if (typeof content === 'string') return { text: content, reasoning: '' };
	let text = '';
	let reasoning = '';
	if (Array.isArray(content)) {
		for (const b of content as ContentBlock[]) {
			if (b.type === 'text' || b.type === 'output_text') text += b.text ?? '';
			else if (b.type === 'reasoning') {
				if (typeof b.reasoning === 'string') reasoning += b.reasoning;
				for (const s of b.summary ?? []) reasoning += s.text ?? '';
			}
		}
	}
	return { text, reasoning };
}

function toolOutputText(out: unknown): string {
	if (typeof out === 'string') return out;
	const o = out as { content?: unknown; kwargs?: { content?: unknown }; update?: unknown } | null;
	const content = o?.content ?? o?.kwargs?.content;
	if (typeof content === 'string') return content;
	if (Array.isArray(content)) return content.map((c: ContentBlock) => c.text ?? '').join('');
	if (o?.update) {
		const msgs = (
			o.update as { messages?: { content?: unknown; kwargs?: { content?: unknown } }[] }
		).messages;
		const last = msgs?.[msgs.length - 1];
		const c = last?.content ?? last?.kwargs?.content;
		if (typeof c === 'string') return c;
		if (Array.isArray(c)) return c.map((x: ContentBlock) => x.text ?? '').join('');
	}
	return '';
}

function summarize(name: string, out: string): string {
	const first = out.split('\n')[0] ?? '';
	if (name === 'search_graph' || name === 'find_sources') {
		const line = out.split('\n').find((l) => /^\d+ (matches|sources) for/.test(l)) ?? first;
		return line.replace(/:$/, '');
	}
	if (name === 'read_file') return 'Read a skill';
	if (name === 'evidence_brief') return out.split('\n')[1] ?? first;
	if (name === 'task') return out.slice(0, 600);
	return first.slice(0, 160);
}

export async function* runTurn(
	req: ChatRequest,
	opts: { apiKey: string; model: string; signal?: AbortSignal }
): AsyncGenerator<ChatEvent> {
	const t0 = Date.now();
	const agent = await getAgent({
		apiKey: opts.apiKey,
		model: opts.model,
		systemPrompt: req.settings?.systemPrompt,
		effort: req.settings?.effort
	});
	const config = {
		configurable: { thread_id: req.threadId },
		recursionLimit: 160,
		version: 'v2' as const,
		signal: opts.signal
	};

	let input: unknown;
	const pendingInterrupt = async () => {
		const st = (await agent.getState({ configurable: { thread_id: req.threadId } })) as { tasks?: { interrupts?: unknown[] }[] } | undefined;
		return (st?.tasks ?? []).some((t) => (t.interrupts ?? []).length > 0);
	};
	if (req.resume && (await pendingInterrupt())) {
		input = new Command({ resume: req.resume });
	} else if (req.resume) {
		// The server lost the paused run (restart): carry on with the answers as a plain message.
		const answers = req.resume as Record<string, unknown>;
		const text =
			'skipped' in answers
				? 'I skipped your questions — go ahead with clearly stated assumptions.'
				: `My answers to your questions:\n${Object.entries(answers)
						.map(([k, v]) => `- ${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`)
						.join('\n')}`;
		const prior = req.history?.length ? req.history.map((m) => ({ role: m.role, content: m.content })) : [];
		input = { messages: [...prior, { role: 'user', content: text }] };
	} else {
		const state = (await agent.getState({ configurable: { thread_id: req.threadId } })) as
			{ values?: unknown } | undefined;
		const known = ((state?.values as { messages?: unknown[] })?.messages ?? []).length > 0;
		const prior =
			!known && req.history?.length
				? req.history.map((m) => ({ role: m.role, content: m.content }))
				: [];
		input = { messages: [...prior, { role: 'user', content: req.message ?? '' }] };
	}

	resetSeen(req.threadId);
	yield { t: 'start', threadId: req.threadId, runId: `${Date.now()}` };

	const tasks = new Map<string, string>(); // task tool run_id → task id
	const usage = { input: 0, output: 0 };
	const agentOf = (ev: StreamEvent): string => {
		for (const p of ev.parent_ids ?? []) if (tasks.has(p)) return tasks.get(p)!;
		if (ev.event === 'on_tool_start' || ev.event === 'on_tool_end') {
			if (tasks.has(ev.run_id) && ev.name !== 'task') return tasks.get(ev.run_id)!;
		}
		return 'main';
	};

	let tail = '';
	let nudged = false;
	try {
		for (let pass = 0; pass < 2; pass++) {
			const stream = agent.streamEvents(input as never, config) as AsyncIterable<StreamEvent>;
			for await (const ev of stream) {
				const who = agentOf(ev);
				switch (ev.event) {
					case 'on_chat_model_stream': {
						const chunk = ev.data.chunk as { content?: unknown; kwargs?: { content?: unknown } };
						const { text, reasoning } = textOf(chunk?.content ?? chunk?.kwargs?.content);
						if (reasoning) yield { t: 'reasoning', delta: reasoning, agent: who };
						if (text && who === 'main') {
							tail = (tail + text).slice(-200);
							yield { t: 'text', delta: text };
						}
						break;
					}
					case 'on_chat_model_end': {
						const out = ev.data.output as {
							usage_metadata?: { input_tokens?: number; output_tokens?: number };
						};
						usage.input += out?.usage_metadata?.input_tokens ?? 0;
						usage.output += out?.usage_metadata?.output_tokens ?? 0;
						break;
					}
					case 'on_tool_start': {
						if (who === 'main') tail = '';
						const args = (ev.data.input ?? {}) as Record<string, unknown>;
						if (ev.name === 'task') {
							const id = `task-${ev.run_id}`;
							tasks.set(ev.run_id, id);
							yield {
								t: 'task',
								id,
								status: 'start',
								description: String(args.description ?? ''),
								agentName: String(args.subagent_type ?? 'researcher')
							};
							break;
						}
						if (ev.name === 'write_todos') {
							const items = (args.todos ?? []) as {
								content: string;
								status: 'pending' | 'in_progress' | 'completed';
							}[];
							yield { t: 'todos', items };
						}
						yield { t: 'tool', id: ev.run_id, name: ev.name, args, agent: who };
						break;
					}
					case 'on_tool_end': {
						const out = toolOutputText(ev.data.output);
						if (ev.name === 'task') {
							const id = tasks.get(ev.run_id) ?? ev.run_id;
							const args = (ev.data.input ?? {}) as Record<string, unknown>;
							yield {
								t: 'task',
								id,
								status: 'end',
								description: String(args.description ?? ''),
								agentName: String(args.subagent_type ?? 'researcher')
							};
							break;
						}
						yield {
							t: 'tool_end',
							id: ev.run_id,
							name: ev.name,
							summary: summarize(ev.name, out),
							agent: who,
							error: /^(Block rejected|Form rejected|Unknown id|Error)/.test(out)
						};
						break;
					}
					case 'on_custom_event': {
						if (ev.name === 'graph') {
							const d = ev.data as unknown as { mode: 'touch' | 'read'; ids: string[] };
							yield { t: 'graph', mode: d.mode, ids: d.ids, agent: who, step: ev.run_id };
						} else if (ev.name === 'ui' && who === 'main') {
							const parsed = Block.safeParse((ev.data as unknown as { block?: unknown }).block);
							if (parsed.success) yield { t: 'ui', id: ev.run_id, block: parsed.data };
						}
						break;
					}
				}
			}
			// Safety net: reasoning models sometimes announce a block ("### How the options compare")
			// and end the turn before calling show_ui. Nudge once to finish.
			const stopped = /(^|\n)#{1,4} [^\n]*\s*$|:\s*$/.test(
				tail.trimEnd() + (tail.trimEnd().endsWith(':') ? '' : '')
			);
			if (pass === 0 && stopped && !nudged && !opts.signal?.aborted) {
				nudged = true;
				input = {
					messages: [
						{
							role: 'user',
							content:
								'(system) Your answer stopped right after a heading. Finish now: call show_ui for the block you announced if you intended one, then complete the answer text without repeating what you already wrote.'
						}
					]
				};
				yield { t: 'text', delta: '\n\n' };
				continue;
			}
			break;
		}
		const state = (await agent.getState({ configurable: { thread_id: req.threadId } })) as
			{ tasks?: { interrupts?: { value?: unknown }[] }[] } | undefined;
		const interrupts = (state?.tasks ?? []).flatMap(
			(t: { interrupts?: { value?: unknown }[] }) => t.interrupts ?? []
		);
		const q = interrupts.find(
			(i: { value?: unknown }) => (i.value as { type?: string })?.type === 'questions'
		);
		if (q) yield { t: 'interrupt', form: (q.value as { form: never }).form };
	} catch (e) {
		if (opts.signal?.aborted) return;
		const msg = e instanceof Error ? e.message : String(e);
		yield { t: 'error', message: friendlyError(msg) };
	}
	yield { t: 'done', usage, ms: Date.now() - t0 };
}

function friendlyError(msg: string): string {
	if (/401|invalid api key|Incorrect API key/i.test(msg))
		return 'The OpenAI API key was rejected. Check it in Settings.';
	if (/429|rate limit/i.test(msg)) return 'OpenAI rate limit reached. Wait a moment and try again.';
	if (/model.*(not found|does not exist)/i.test(msg))
		return 'That model is not available for this API key. Pick another in Settings.';
	return msg.length > 300 ? msg.slice(0, 300) + '…' : msg;
}
