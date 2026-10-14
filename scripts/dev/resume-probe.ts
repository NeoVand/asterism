/** Does a run interrupted mid-way continue from its last checkpoint when streamed with null input? */
import { readFileSync } from 'node:fs';
import { getAgent } from '../../src/lib/server/agent/agent.ts';
process.env.ASTERISM_EVAL = '1';
const env = Object.fromEntries(
	readFileSync(new URL('../../.env', import.meta.url), 'utf8')
		.split('\n')
		.filter((l) => l.includes('='))
		.map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const agent = await getAgent({ apiKey: env.OPENAI_API_KEY, model: 'gpt-6.1-sol' });
const thread = `resume-${Date.now()}`;
const ac = new AbortController();
const before: string[] = [];
try {
	for await (const ev of agent.streamEvents(
		{
			messages: [
				{
					role: 'user',
					content: 'Is automatic braking legally required anywhere for mining machines?'
				}
			]
		},
		{ version: 'v2', configurable: { thread_id: thread }, recursionLimit: 150, signal: ac.signal }
	)) {
		if (ev.event === 'on_tool_end' && ev.metadata?.lc_agent_name === 'asterism') {
			before.push(ev.name);
			if (before.length === 2) ac.abort();
		}
	}
} catch (e) {
	console.log(
		'first run stopped:',
		(e as Error).message.slice(0, 60),
		'| tools before:',
		before.join(', ')
	);
}
const after: string[] = [];
let text = '';
for await (const ev of agent.streamEvents(null as never, {
	version: 'v2',
	configurable: { thread_id: thread },
	recursionLimit: 150
})) {
	if (ev.event === 'on_tool_start' && ev.metadata?.lc_agent_name === 'asterism')
		after.push(ev.name);
	if (ev.event === 'on_chat_model_stream' && ev.metadata?.lc_agent_name === 'asterism') {
		const c = ev.data.chunk?.content;
		if (typeof c === 'string') text += c;
		else if (Array.isArray(c))
			text += c
				.map((b: { type: string; text?: string }) => (b.type === 'text' ? (b.text ?? '') : ''))
				.join('');
	}
}
console.log('resumed tools:', after.join(', '));
console.log('answer chars:', text.length, '|', text.slice(0, 200).replace(/\n/g, ' '));
