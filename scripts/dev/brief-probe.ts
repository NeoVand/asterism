/** Run one question and print the evidence_brief output and the answer. */
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
let text = '';
for await (const ev of agent.streamEvents(
	{ messages: [{ role: 'user', content: process.argv[2] }] },
	{ version: 'v2', configurable: { thread_id: `bp-${Date.now()}` }, recursionLimit: 150 }
)) {
	if (ev.event === 'on_tool_end' && ev.name === 'evidence_brief') {
		const o = ev.data.output;
		console.log(
			'=== BRIEF ===\n' + (typeof o === 'string' ? o : (o?.content ?? o?.kwargs?.content))
		);
	}
	if (ev.event === 'on_tool_start' && ev.name === 'evidence_brief')
		console.log('brief question:', JSON.stringify(ev.data.input));
	if (ev.event === 'on_chat_model_stream') {
		const c = ev.data.chunk?.content;
		if (typeof c === 'string') text += c;
		else if (Array.isArray(c))
			text += c
				.map((b: { type: string; text?: string }) => (b.type === 'text' ? (b.text ?? '') : ''))
				.join('');
	}
}
console.log('=== ANSWER ===\n' + text);
