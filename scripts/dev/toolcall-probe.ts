/** Print every main-agent model end: tool calls, invalid tool calls, finish reason. */
import { readFileSync } from 'node:fs';
import { getAgent } from '../../src/lib/server/agent/agent.ts';

const env = Object.fromEntries(
	readFileSync(new URL('../../.env', import.meta.url), 'utf8')
		.split('\n')
		.filter((l) => l.includes('='))
		.map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const q = process.argv[2];
const agent = await getAgent({ apiKey: env.OPENAI_API_KEY, model: 'gpt-6.1-sol' });
for await (const ev of agent.streamEvents(
	{ messages: [{ role: 'user', content: q }] },
	{ version: 'v2', configurable: { thread_id: `tc-${Date.now()}` }, recursionLimit: 150 }
)) {
	if (ev.event === 'on_chat_model_end') {
		const o = ev.data.output;
		const k = o?.kwargs ?? o;
		console.log(
			'MODEL END',
			JSON.stringify({
				tool_calls: (k.tool_calls ?? []).map((t: { name: string }) => t.name),
				invalid: (k.invalid_tool_calls ?? []).map(
					(t: { name: string; error?: string; args?: string }) => ({
						name: t.name,
						error: t.error,
						args: String(t.args).slice(0, 200),
						len: String(t.args).length
					})
				),
				meta: k.response_metadata?.status ?? k.response_metadata?.finish_reason,
				incomplete: k.response_metadata?.incomplete_details,
				usage: k.usage_metadata
			}).slice(0, 1500)
		);
	}
	if (ev.event === 'on_tool_start') console.log('TOOL', ev.name);
}
